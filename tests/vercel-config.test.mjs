import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("vercel.json pins the Other preset so api/ deploys as functions", () => {
  // null selects Vercel's "Other" preset and overrides the dashboard
  // setting, so a backend preset cannot pick src/app.js (the browser
  // bundle) as a single /index function.
  assert.ok(Object.hasOwn(config, "framework"), "framework must be set explicitly");
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, "public");
  assert.equal(config.buildCommand, "node scripts/build.mjs");
  assert.equal(config.builds, undefined, "legacy builds would disable zero-config api/ functions");
});

test("functions config matches real api handlers", () => {
  const apiFiles = readdirSync(new URL("../api/", import.meta.url)).filter((f) => f.endsWith(".js")).sort();
  assert.deepEqual(apiFiles, ["config.js", "tmdb.js"]);
  assert.ok(config.functions?.["api/*.js"], "functions pattern for api/*.js is required");
  const rewrites = config.rewrites || [];
  for (const route of ["/api/tmdb", "/api/config", "/api/(.*)", "/(.*)"]) {
    assert.equal(rewrites.some((r) => r.source === route), false, `rewrite must not shadow ${route}`);
  }
});

test("api handlers load without a browser DOM", async () => {
  assert.equal(typeof globalThis.document, "undefined");
  const tmdb = await import("../api/tmdb.js");
  const cfg = await import("../api/config.js");
  assert.equal(typeof tmdb.default, "function");
  assert.equal(typeof cfg.default, "function");
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
