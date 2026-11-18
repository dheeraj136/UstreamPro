import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const appSrc = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app.js"),
  "utf8"
);

// Extract rewriteM3u8WithQueryParams
const fnMatch = appSrc.match(/export function rewriteM3u8WithQueryParams[\s\S]*?^}/m);
if (!fnMatch) {
  throw new Error("Could not find rewriteM3u8WithQueryParams in src/app.js");
}

const sandbox = { URL, console };
vm.createContext(sandbox);
vm.runInContext(fnMatch[0].replace(/^export\s+/, ""), sandbox);
const { rewriteM3u8WithQueryParams } = sandbox;

test("1. rewriteM3u8WithQueryParams preserves query parameters across audio tracks", () => {
  const masterUrl = "https://img.rousav.tech/media/84ba08366bab854da1bf/index.m3u8?api_key=0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac";
  const sampleM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",LANGUAGE="deu",NAME="1. German",DEFAULT=NO,URI="track_german.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",LANGUAGE="eng",NAME="2. English",DEFAULT=YES,URI="track_english.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=2000000,AUDIO="aac",RESOLUTION=1280x720
video_720p.m3u8`;

  const rewritten = rewriteM3u8WithQueryParams(sampleM3u8, masterUrl);

  assert.ok(rewritten.includes('URI="https://img.rousav.tech/media/84ba08366bab854da1bf/track_german.m3u8?api_key=0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac"'));
  assert.ok(rewritten.includes('URI="https://img.rousav.tech/media/84ba08366bab854da1bf/track_english.m3u8?api_key=0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac"'));
  assert.ok(rewritten.includes('https://img.rousav.tech/media/84ba08366bab854da1bf/video_720p.m3u8?api_key=0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac'));
});

test("2. rewriteM3u8WithQueryParams returns unmodified text when master URL has no query parameters", () => {
  const masterUrl = "https://example.com/stream/index.m3u8";
  const sampleM3u8 = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",LANGUAGE="eng",NAME="English",DEFAULT=YES,URI="track_english.m3u8"
video_720p.m3u8`;

  const rewritten = rewriteM3u8WithQueryParams(sampleM3u8, masterUrl);
  assert.equal(rewritten, sampleM3u8);
});

test("3. gaiaflix-movie-source serverless function sets CORS headers and validates id", async () => {
  const handlerModule = await import("../api/gaiaflix-movie-source.js");
  const handler = handlerModule.default;
  let statusCode = 0;
  const headers = {};
  let responseData = null;

  const mockRes = {
    setHeader: (key, val) => { headers[key] = val; },
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; },
        end: () => {}
      };
    }
  };

  // Test missing id
  await handler({ query: {} }, mockRes);
  assert.equal(statusCode, 400);
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.equal(headers["Access-Control-Allow-Methods"], "GET, OPTIONS");

  // Test OPTIONS preflight
  statusCode = 0;
  await handler({ method: "OPTIONS" }, mockRes);
  assert.equal(statusCode, 200);
});
