import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../lib/db.js";
import {
  validateVideoUpload,
  createVideo,
  getVideoById,
  listVideos,
  updateVideoStatus,
  incrementVideoViews,
  deleteVideo,
  generateThumbnailSvg,
  MAX_VIDEO_SIZE
} from "../lib/video-service.js";
import { handleVideoRoute } from "../lib/video-routes.js";
import { registerUser, createSession } from "../lib/auth-service.js";

function makeMockReqRes(options = {}) {
  const reqListeners = {};
  const req = {
    method: options.method || "GET",
    url: options.url || "/",
    headers: options.headers || {},
    on: (event, handler) => {
      reqListeners[event] = handler;
      if (event === "end") {
        process.nextTick(() => {
          if (options.rawBody && reqListeners["data"]) {
            reqListeners["data"](Buffer.isBuffer(options.rawBody) ? options.rawBody : Buffer.from(options.rawBody));
          }
          if (reqListeners["end"]) {
            reqListeners["end"]();
          }
        });
      }
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    body: null,
    setHeader: (name, value) => {
      res.headers[name.toLowerCase()] = value;
    },
    writeHead: (status, headers = {}) => {
      res.statusCode = status;
      for (const [k, v] of Object.entries(headers)) {
        res.headers[k.toLowerCase()] = v;
      }
    },
    end: (chunk) => {
      res.ended = true;
      if (chunk) res.body = chunk;
      return res;
    },
    json: (obj) => {
      res.ended = true;
      res.body = JSON.stringify(obj);
      return res;
    }
  };

  return { req, res };
}

test("1. Video Upload Validation checks", () => {
  // Empty title
  assert.equal(validateVideoUpload({ title: "", originalFilename: "test.mp4" }).valid, false);

  // Unsupported extension
  assert.equal(validateVideoUpload({ title: "My Video", originalFilename: "malware.exe" }).valid, false);

  // Supported extensions
  assert.equal(validateVideoUpload({ title: "My Video", originalFilename: "clip.mp4" }).valid, true);
  assert.equal(validateVideoUpload({ title: "My Video", originalFilename: "clip.webm" }).valid, true);
  assert.equal(validateVideoUpload({ title: "My Video", originalFilename: "clip.mov" }).valid, true);

  // File size limit
  assert.equal(validateVideoUpload({ title: "Valid", originalFilename: "test.mp4", size: MAX_VIDEO_SIZE + 100 }).valid, false);
  assert.equal(validateVideoUpload({ title: "Valid", originalFilename: "test.mp4", size: 10 * 1024 * 1024 }).valid, true);
});

test("2. Video creation, listing, view incrementing, and status tracking", async () => {
  const db = createDatabase(":memory:");
  const { user } = await registerUser(db, {
    email: "video-user@ustream.tv",
    password: "Password123!",
    name: "Video User"
  });

  const video = createVideo(db, {
    userId: user.id,
    title: "Nature Documentary 4K",
    description: "Stunning wildlife in HDR",
    category: "movies",
    originalFilename: "nature.mp4",
    filePath: "/data/uploads/nature.mp4",
    fileSize: 45000000,
    mimeType: "video/mp4",
    duration: 360,
    status: "ready"
  });

  assert.ok(video.id.startsWith("user-video-"));
  assert.equal(video.title, "Nature Documentary 4K");
  assert.equal(video.category, "movies");
  assert.equal(video.duration, "6m 0s");
  assert.equal(video.views, 0);

  // Increment views
  incrementVideoViews(db, video.id);
  const updated = getVideoById(db, video.id);
  assert.equal(updated.views, 1);

  // Update status
  updateVideoStatus(db, video.id, "processing");
  assert.equal(getVideoById(db, video.id).status, "processing");

  // List videos
  const allVideos = listVideos(db, { category: "all", status: "all" });
  assert.equal(allVideos.length, 1);
  assert.equal(allVideos[0].id, video.id);
});

test("3. Deletion permissions and ownership checks", async () => {
  const db = createDatabase(":memory:");
  const { user: owner } = await registerUser(db, {
    email: "owner@ustream.tv",
    password: "Password123!",
    name: "Owner User"
  });
  const { user: intruder } = await registerUser(db, {
    email: "intruder@ustream.tv",
    password: "Password123!",
    name: "Intruder User"
  });

  const video = createVideo(db, {
    userId: owner.id,
    title: "Exclusive Video",
    category: "movies",
    originalFilename: "exclusive.mp4",
    filePath: "/data/uploads/exclusive.mp4",
    fileSize: 1024,
    mimeType: "video/mp4"
  });

  // Non-owner cannot delete
  assert.throws(() => {
    deleteVideo(db, video.id, intruder.id);
  }, /permission/);

  // Owner can delete
  const success = deleteVideo(db, video.id, owner.id);
  assert.equal(success, true);
  assert.equal(getVideoById(db, video.id), null);
});

test("4. SVG Thumbnail generator produces valid SVG markup", () => {
  const svg = generateThumbnailSvg("Cyberpunk 2077 Night City", "anime");
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("Cyberpunk 2077 Night City"));
  assert.ok(svg.includes("ANIME"));
  assert.ok(svg.includes("</svg>"));
});

test("5. Video Routes Integration (Authentication & Upload)", async () => {
  const db = createDatabase(":memory:");

  // Register a user and create session
  const { user } = await registerUser(db, {
    email: "creator@ustream.tv",
    password: "SecurePassword123!",
    name: "Video Creator"
  });
  const session = createSession(db, user.id, { rememberMe: true });

  // Unauthenticated upload must fail with 401
  const unauth = makeMockReqRes({
    method: "POST",
    url: "/api/videos/upload",
    headers: {
      "x-filename": "test.mp4",
      "x-title": "Unauthenticated test"
    },
    rawBody: Buffer.from("fake-video-bytes")
  });
  await handleVideoRoute(unauth.req, unauth.res, "/api/videos/upload", db);
  assert.equal(unauth.res.statusCode, 401);

  // Authenticated upload succeeds with 201
  const authUpload = makeMockReqRes({
    method: "POST",
    url: "/api/videos/upload",
    headers: {
      authorization: `Bearer ${session.token}`,
      "x-filename": "showcase.mp4",
      "x-title": "Creator Showcase",
      "x-category": "movies",
      "content-type": "video/mp4"
    },
    rawBody: Buffer.from("mock-streamable-mp4-data")
  });
  await handleVideoRoute(authUpload.req, authUpload.res, "/api/videos/upload", db);
  assert.equal(authUpload.res.statusCode, 201);
  const uploadPayload = JSON.parse(authUpload.res.body);
  assert.equal(uploadPayload.ok, true);
  assert.equal(uploadPayload.video.title, "Creator Showcase");

  // Listing returns the newly uploaded video
  const listReq = makeMockReqRes({
    method: "GET",
    url: "/api/videos"
  });
  await handleVideoRoute(listReq.req, listReq.res, "/api/videos", db);
  assert.equal(listReq.res.statusCode, 200);
  const listPayload = JSON.parse(listReq.res.body);
  assert.equal(listPayload.ok, true);
  assert.ok(listPayload.videos.some(v => v.title === "Creator Showcase"));
});
