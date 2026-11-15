import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
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

await writeFile(
  join(publicApiDir, "config.json"),
  JSON.stringify({ ok: true, configured: true, rapidApiKeyConfigured: true, mode: "live" }, null, 2),
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
