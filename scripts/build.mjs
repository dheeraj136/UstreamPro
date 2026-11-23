import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
const publicDir = join(root, "public");
const assetsDir = join(root, "assets");
const publicAssetsDir = join(publicDir, "assets");
const publicApiDir = join(publicDir, "api");

await mkdir(publicDir, { recursive: true });
await mkdir(publicAssetsDir, { recursive: true });
await mkdir(publicApiDir, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js", "robots.txt", "sitemap.xml", "manifest.webmanifest"]) {
  const src = existsSync(join(root, "src", file)) ? join(root, "src", file) : join(root, file);
  if (existsSync(src)) {
    await copyFile(src, join(publicDir, file));
  }
}

// Cache-busting: emit content-hashed copies of styles.css and app.js
// (e.g. app.3f9a1c2b.js) and point index.html at them, so vercel.json
// can serve them with "immutable". Plain copies are kept as a fallback.
// NOTE: do NOT delete old hashed files here. Vercel's build output
// collection traces public/ and fails the whole deployment with
// ENOENT when a file it saw is deleted mid-build (observed 2026-11-22:
// both Prompt 5 deployments failed with ENOENT for the old hashed app
// file after the hash changed). Old hashed files are unreferenced and
// harmless; they are cleaned up in git, not in the build.

const hashedNames = {};
for (const name of ["styles.css", "app.js"]) {
  const plainPath = join(publicDir, name);
  if (!existsSync(plainPath)) continue;
  const buf = await readFile(plainPath);
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 8);
  const dot = name.lastIndexOf(".");
  const hashed = `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
  await writeFile(join(publicDir, hashed), buf);
  hashedNames[name] = hashed;
}

const indexPath = join(publicDir, "index.html");
if (existsSync(indexPath)) {
  let html = await readFile(indexPath, "utf8");
  for (const [name, hashed] of Object.entries(hashedNames)) {
    const escaped = name.replace(/\./g, "\\.");
    // Matches "./app.js", "/app.js", "app.js", with or without ?v=...
    const re = new RegExp(`(["'])(\\./|/)?${escaped}(\\?[^"']*)?\\1`, "g");
    let count = 0;
    html = html.replace(re, (_m, quote, prefix) => {
      count++;
      return `${quote}${prefix || ""}${hashed}${quote}`;
    });
    if (count === 0) {
      throw new Error(`build: no references to ${name} found in index.html`);
    }
    console.log(`  ${name} -> ${hashed} (${count} reference${count === 1 ? "" : "s"})`);
  }
  await writeFile(indexPath, html, "utf8");
}

const modulesSrcDir = join(root, "src", "modules");
const publicModulesDir = join(publicDir, "modules");
if (existsSync(modulesSrcDir)) {
  await mkdir(publicModulesDir, { recursive: true });
  const moduleFiles = await readdir(modulesSrcDir);
  for (const modFile of moduleFiles) {
    await copyFile(join(modulesSrcDir, modFile), join(publicModulesDir, modFile));
  }
}

const assets = await readdir(assetsDir);
for (const file of assets) {
  await copyFile(join(assetsDir, file), join(publicAssetsDir, file));
}

for (const iconFile of ["favicon.svg", "favicon.png", "apple-touch-icon.png"]) {
  if (existsSync(join(assetsDir, iconFile))) {
    await copyFile(join(assetsDir, iconFile), join(publicDir, iconFile));
  }
}

const tmdbKeyConfigured = Boolean(String(process.env.TMDB_API_KEY || "").trim());
await writeFile(
  join(publicApiDir, "config.json"),
  JSON.stringify({
    ok: true,
    configured: tmdbKeyConfigured,
    tmdbApiKeyConfigured: tmdbKeyConfigured,
    mode: tmdbKeyConfigured ? "live" : "browser-fallback",
  }, null, 2),
  "utf8"
);

await writeFile(
  join(publicApiDir, "health.json"),
  JSON.stringify({ ok: true, status: "healthy", service: "ustream" }, null, 2),
  "utf8"
);

// Bug 6 residual: the build used to overwrite the checked-in api JSON
// with empty stubs on every build, so /api/catalog returned nothing
// and live totals depended entirely on direct TMDB fetches. Only write
// a stub when the file is missing or empty; preserve real data.
const writeApiStubIfMissing = async (name, content) => {
  const target = join(publicApiDir, name);
  try {
    const existing = await import("node:fs/promises").then((m) => m.readFile(target, "utf8"));
    if (existing.trim().length > 40) return;
  } catch {}
  await writeFile(target, content, "utf8");
};
await writeApiStubIfMissing("catalog.json", JSON.stringify({ ok: true, results: [] }, null, 2));
await writeApiStubIfMissing("search.json", JSON.stringify({ ok: true, results: [] }, null, 2));
await writeApiStubIfMissing("videos.json", JSON.stringify({ ok: true, videos: [] }, null, 2));

console.log("Build complete.");
