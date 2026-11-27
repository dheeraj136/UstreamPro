import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("vercel.json pins the Other preset so api/ deploys as functions", () => {
  assert.ok(Object.hasOwn(config, "framework"), "framework must be set explicitly");
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, "public");
  assert.equal(config.buildCommand, "node scripts/build.mjs");
  assert.equal(config.builds, undefined, "legacy builds would disable zero-config api/ functions");
});

test("functions config matches real api handlers and rewrites route auth/videos to api/router", () => {
  const apiFiles = readdirSync(new URL("../api/", import.meta.url)).filter((f) => f.endsWith(".js")).sort();
  assert.deepEqual(apiFiles, ["animeworld.js", "archive.js", "config.js", "health.js", "router.js", "tmdb.js"]);
  assert.ok(config.functions?.["api/*.js"], "functions pattern for api/*.js is required");
  const rewrites = config.rewrites || [];
  for (const route of ["/api/tmdb", "/api/config", "/api/health", "/api/archive", "/api/(.*)", "/(.*)"]) {
    assert.equal(rewrites.some((r) => r.source === route), false, `rewrite must not shadow ${route}`);
  }
  for (const route of ["/api/auth/(.*)", "/api/profiles", "/api/profiles/(.*)", "/api/profile/(.*)", "/api/videos", "/api/videos/(.*)"]) {
    const match = rewrites.find((r) => r.source === route);
    assert.ok(match, `rewrite for ${route} is required`);
    assert.match(match.destination, /^\/api\/router\?endpoint=/);
  }
});

test("CSP allows Internet Archive metadata, posters, and media streams", () => {
  const rootHeaderBlock = (config.headers || []).find((h) => h.source === "/(.*)");
  const csp = rootHeaderBlock?.headers?.find((h) => h.key === "Content-Security-Policy-Report-Only")?.value || "";
  assert.match(csp, /img-src[^;]*https:\/\/archive\.org/);
  assert.match(csp, /media-src[^;]*https:\/\/\*\.archive\.org/);
  assert.match(csp, /connect-src[^;]*https:\/\/archive\.org/);
});

test("gitignore ignores secret env files while keeping .env.example", () => {
  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});

test("api handlers load without a browser DOM", async () => {
  assert.equal(typeof globalThis.document, "undefined");
  const tmdb = await import("../api/tmdb.js");
  const cfg = await import("../api/config.js");
  const health = await import("../api/health.js");
  const archive = await import("../api/archive.js");
  const animeworld = await import("../api/animeworld.js");
  const router = await import("../api/router.js");
  assert.equal(typeof tmdb.default, "function");
  assert.equal(typeof cfg.default, "function");
  assert.equal(typeof health.default, "function");
  assert.equal(typeof archive.default, "function");
  assert.equal(typeof animeworld.default, "function");
  assert.equal(typeof router.default, "function");
});

test("no root-level server entry that a backend preset could pick", () => {
  for (const name of ["app", "index", "server"]) {
    for (const ext of ["js", "mjs", "cjs", "ts"]) {
      assert.equal(existsSync(new URL(`../${name}.${ext}`, import.meta.url)), false, `${name}.${ext} at repo root`);
    }
  }
});

test("legacy embed source file is gone from api/", () => {
  assert.equal(existsSync(new URL("../api/gaiaflix-movie-source.js", import.meta.url)), false);
});
