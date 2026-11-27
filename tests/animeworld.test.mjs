import { test } from "node:test";
import assert from "node:assert/strict";
import animeworldHandler, {
  parseStreamHtml,
  parseSearchHtml,
  parseHomeHtml,
} from "../api/animeworld.js";

function mockReqRes({ method = "GET", url = "/" } = {}) {
  const req = {
    method,
    url,
    headers: { host: "localhost:3000" },
  };
  let statusCode = 200;
  const headers = {};
  let body = null;

  const res = {
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
      return res;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      body = data;
      return res;
    },
    end() {
      return res;
    },
    get _status() {
      return statusCode;
    },
    get _headers() {
      return headers;
    },
    get _body() {
      return body;
    },
  };

  return { req, res };
}

test("parseStreamHtml extracts video iframe and metadata", () => {
  const html = `
    <div class="video-embed">
      <iframe src="https://megacloud.tv/embed-2/e-1/abc?autoPlay=1" allowfullscreen></iframe>
    </div>
    <div class="archive-link-wrap">
      <a href="https://dl.example.com/ep1.mp4">Download</a>
    </div>
    <h1 class="anime-title">Jujutsu Kaisen</h1>
    <h1 class="episode-title">Episode 1 - Ryomen Sukuna</h1>
    <p class="ep-overview">Yuji Itadori encounters a cursed talisman.</p>
  `;
  const result = parseStreamHtml(html, { episodeId: "jjk-ep-1" });
  assert.equal(result.success, true);
  assert.equal(result.type, "episode");
  assert.equal(result.stream.streamLink, "https://megacloud.tv/embed-2/e-1/abc?autoPlay=1");
  assert.equal(result.stream.file, "https://dl.example.com/ep1.mp4");
  assert.equal(result.series.title, "Jujutsu Kaisen");
  assert.equal(result.current.title, "Episode 1 - Ryomen Sukuna");
});

test("parseSearchHtml extracts anime titles and IDs", () => {
  const html = `
    <ul class="results">
      <li class="status-publish">
        <a class="lnk-blk" href="https://animeworld-india.me/series/naruto-shippuden-hindi/">
          <h2 class="entry-title">Naruto: Shippuden</h2>
          <img src="https://example.com/naruto.jpg" />
          <span class="year">2007</span>
          <span class="vote">8.7</span>
        </a>
      </li>
    </ul>
  `;
  const result = parseSearchHtml(html, "naruto", 1);
  assert.equal(result.success, true);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].title, "Naruto: Shippuden");
  assert.equal(result.results[0].type, "series");
  assert.equal(result.results[0].seriesId, "naruto-shippuden-hindi");
});

test("handler serves home endpoint with latest anime series and movies", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=home" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.ok(Array.isArray(res._body.latest_series));
  assert.ok(res._body.latest_series.length > 0);
});

test("handler serves search endpoint with query results", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=search&query=naruto" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.equal(res._body.query, "naruto");
  assert.ok(Array.isArray(res._body.results));
  assert.ok(res._body.results.length > 0);
});

test("handler serves stream endpoint with playable streamLink", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=stream&episodeId=naruto-ep-1" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.ok(res._body.stream.streamLink, "streamLink must be populated");
  assert.match(res._body.stream.streamLink, /^https?:\/\//);
});

test("handler supports legacy path query like stream.php", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?path=stream.php&episodeId=naruto-ep-1" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.ok(res._body.stream.streamLink);
});

test("handler returns 400 for stream without episodeId or movieId", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=stream" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 400);
  assert.equal(res._body.success, false);
});

test("handler search returns empty results for unknown title without falling back to Naruto", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=search&query=Spirited%20Away%20XYZ" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.deepEqual(res._body.results, []);
});

test("handler streams TMDB movie correctly without anime hijacking", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=stream&title=Spirited%20Away&tmdbId=129&type=movie" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.equal(res._body.source, "ustream-streaming-engine");
  assert.match(res._body.stream.streamLink, /2embed\.cc\/embed\/129/);
});

test("handler streams genuine anime with Abyss HD player", async () => {
  const { req, res } = mockReqRes({ url: "/api/animeworld?action=stream&title=Naruto&type=series" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 200);
  assert.equal(res._body.success, true);
  assert.equal(res._body.source, "animeworld-india");
  assert.match(res._body.stream.streamLink, /abyssplayer\.com/);
  assert.equal(res._body.series.title, "Naruto");
});

test("handler handles OPTIONS for CORS preflight", async () => {
  const { req, res } = mockReqRes({ method: "OPTIONS", url: "/api/animeworld" });
  await animeworldHandler(req, res);
  assert.equal(res._status, 204);
});
