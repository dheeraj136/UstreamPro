// Internet Archive "Free Movies" tests.
//
// The module talks to archive.org only through an injected fetch, so
// these tests use mocked metadata responses — no live network. The
// curated identifiers themselves were verified live against the
// Archive metadata API on 2026-11-23 (see src/modules/archive.js).
import test from "node:test";
import assert from "node:assert/strict";
import {
  CURATED_ARCHIVE_FILMS,
  archivePosterUrl,
  archiveStreamUrl,
  createArchiveClient,
  formatArchiveRuntime,
  normalizeArchiveItem,
  pickPlayableFile,
} from "../src/modules/archive.js";

function metadataResponse({ identifier, title, year, description, files }) {
  return {
    metadata: { identifier, title, year, description },
    files,
  };
}

function mockFetchFor(responses) {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const identifier = decodeURIComponent(String(url).split("/").pop());
    const payload = responses[identifier];
    if (payload === undefined) throw new Error(`network error for ${identifier}`);
    if (payload instanceof Error) throw payload;
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  return { fetchImpl, get calls() { return calls; } };
}

const HIS_GIRL_FRIDAY = metadataResponse({
  identifier: "HisGirlFriday",
  title: "His Girl Friday",
  year: 1940,
  description: "A newspaper editor uses every trick in the book to keep his ace reporter.",
  files: [
    { name: "MoviePowderPresentsHisGirlFriday.mp4", format: "h.264", size: 551669835, length: 5291.96 },
    { name: "MoviePowderPresentsHisGirlFriday_512kb.mp4", format: "512Kb MPEG4", size: 384258272, length: 5291.84 },
    { name: "MoviePowderPresentsHisGirlFriday.mp3", format: "VBR MP3", size: 123456 },
  ],
});

test("pickPlayableFile prefers h.264 MP4, then 512kb, then any MP4", () => {
  assert.equal(
    pickPlayableFile(HIS_GIRL_FRIDAY.files).name,
    "MoviePowderPresentsHisGirlFriday.mp4",
    "h.264 beats the smaller 512kb file",
  );
  assert.equal(
    pickPlayableFile([
      { name: "The_General_512kb.mp4", format: "512Kb MPEG4", size: 293030923 },
      { name: "The_General.mp4", format: "MPEG4", size: 900000000 },
    ]).name,
    "The_General_512kb.mp4",
    "512kb beats plain MPEG4",
  );
  assert.equal(
    pickPlayableFile([{ name: "film.mp4", format: "MPEG4", size: 100 }]).name,
    "film.mp4",
    "plain MP4 is still playable",
  );
  assert.equal(pickPlayableFile([{ name: "film.mp3", format: "VBR MP3" }]), null);
  assert.equal(pickPlayableFile([]), null);
  assert.equal(pickPlayableFile(null), null);
  assert.equal(
    pickPlayableFile([
      { name: "big.mp4", format: "MPEG4", size: 900000000 },
      { name: "small.mp4", format: "MPEG4", size: 100000000 },
    ]).name,
    "small.mp4",
    "on a format tie the smaller file wins (lighter to stream)",
  );
});

test("archive URLs encode filenames and point at the download host", () => {
  assert.equal(
    archiveStreamUrl("sherlock-jr-1924-restored-720p-hd", "sherlock jr-1924-restored-720p-hd.mp4"),
    "https://archive.org/download/sherlock-jr-1924-restored-720p-hd/sherlock%20jr-1924-restored-720p-hd.mp4",
  );
  assert.equal(
    archivePosterUrl("Nosferatu2_201606"),
    "https://archive.org/download/Nosferatu2_201606/__ia_thumb.jpg",
  );
});

test("formatArchiveRuntime renders hours and minutes", () => {
  assert.equal(formatArchiveRuntime(5740.74), "1h 36m");
  assert.equal(formatArchiveRuntime(761.52), "13m");
  assert.equal(formatArchiveRuntime(0), "");
  assert.equal(formatArchiveRuntime(undefined), "");
});

test("normalizeArchiveItem matches the card shape and never invents a rating", () => {
  const curated = { identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 };
  const item = normalizeArchiveItem(HIS_GIRL_FRIDAY, curated);
  assert.ok(item);
  assert.equal(item.title, "His Girl Friday");
  assert.equal(item.year, 1940);
  assert.equal(item.type, "movie");
  assert.equal(item.source, "archive");
  assert.equal(item.free, true);
  assert.equal(item.badge, "Free");
  assert.equal(item.archiveId, "HisGirlFriday");
  assert.equal(item.rating, null);
  assert.equal(item.runtime, "1h 28m");
  assert.equal(
    item.streamUrl,
    "https://archive.org/download/HisGirlFriday/MoviePowderPresentsHisGirlFriday.mp4",
  );
  assert.equal(item.image, "https://archive.org/download/HisGirlFriday/__ia_thumb.jpg");
  assert.equal(item.kicker, "Public domain · Internet Archive");
  assert.match(item.description, /newspaper editor/);
});

test("normalizeArchiveItem returns null without a playable MP4", () => {
  const noVideo = metadataResponse({
    identifier: "dark-item",
    title: "Restricted Film",
    year: 1930,
    files: [{ name: "film.mp3", format: "VBR MP3" }],
  });
  assert.equal(normalizeArchiveItem(noVideo, { identifier: "dark-item", title: "Restricted Film", year: 1930 }), null);
  assert.equal(normalizeArchiveItem({ metadata: {}, files: [] }, { identifier: "empty", title: "Empty", year: 1900 }), null);
  assert.equal(normalizeArchiveItem(null, { identifier: "x", title: "X", year: 1900 }), null);
});

test("getFreeMovies verifies each film, keeps order, and drops failures", async () => {
  const films = [
    { identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 },
    { identifier: "TheGeneral", title: "The General", year: 1927 },
    { identifier: "gone-item", title: "Gone Film", year: 1930 },
  ];
  const { fetchImpl } = mockFetchFor({
    HisGirlFriday: HIS_GIRL_FRIDAY,
    TheGeneral: metadataResponse({
      identifier: "TheGeneral",
      title: "The General",
      year: 1927,
      files: [{ name: "The_General_512kb.mp4", format: "512Kb MPEG4", size: 293030923, length: 4039.15 }],
    }),
    // "gone-item" is absent from the mock map: fetch throws, item drops.
  });
  const client = createArchiveClient({ films, fetchImpl, backoffMs: 1 });
  const result = await client.getFreeMovies();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((f) => f.archiveId), ["HisGirlFriday", "TheGeneral"]);
  assert.equal(result[1].streamUrl, "https://archive.org/download/TheGeneral/The_General_512kb.mp4");
  assert.equal(result[1].runtime, "1h 07m");
});

test("getFreeMovies fails gracefully: all errors become an empty list", async () => {
  const fetchImpl = async () => { throw new Error("offline"); };
  const client = createArchiveClient({
    films: [{ identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 }],
    fetchImpl,
    backoffMs: 1,
  });
  assert.deepEqual(await client.getFreeMovies(), []);
});

test("getFreeMovies reuses the cache instead of refetching", async () => {
  const mock = mockFetchFor({ HisGirlFriday: HIS_GIRL_FRIDAY });
  let store = new Map();
  const cache = {
    get: (key) => store.get(key)?.v,
    set: (key, value) => { store.set(key, { v: value }); },
  };
  const client = createArchiveClient({
    films: [{ identifier: "HisGirlFriday", title: "His Girl Friday", year: 1940 }],
    fetchImpl: mock.fetchImpl,
    cache,
    backoffMs: 1,
  });
  assert.equal((await client.getFreeMovies()).length, 1);
  assert.equal((await client.getFreeMovies()).length, 1);
  assert.equal(mock.calls, 1);
});

test("curated list has no duplicates and every entry has an identifier and title", () => {
  const ids = CURATED_ARCHIVE_FILMS.map((f) => f.identifier);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CURATED_ARCHIVE_FILMS.length >= 8, "row should have enough films to fill a rail");
  for (const film of CURATED_ARCHIVE_FILMS) {
    assert.ok(film.identifier && film.title && Number.isInteger(film.year));
  }
});
