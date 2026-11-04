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

for (const file of ["index.html", "styles.css", "app.js"]) {
  const src = existsSync(join(root, "src", file)) ? join(root, "src", file) : join(root, file);
  await copyFile(src, join(publicDir, file));
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

await writeFile(
  join(publicApiDir, "catalog.json"),
  JSON.stringify({ ok: true, results: [] }, null, 2),
  "utf8"
);

await writeFile(
  join(publicApiDir, "search.json"),
  JSON.stringify({ ok: true, results: [] }, null, 2),
  "utf8"
);

await writeFile(
  join(publicApiDir, "videos.json"),
  JSON.stringify({ ok: true, videos: [] }, null, 2),
  "utf8"
);

// Fetch latest Live Sports Catalog and build static sports.json for high-availability CDN delivery
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  const sportsRes = await fetch("https://bintvjson.lovable.app/api/public/bintvjson", {
    signal: controller.signal,
    headers: { "Accept": "application/json" }
  }).catch(() => null);
  clearTimeout(timer);

  if (sportsRes?.ok) {
    const sportsData = await sportsRes.json();
    await writeFile(join(publicApiDir, "sports.json"), JSON.stringify(sportsData), "utf8");
    console.log("Cached sports.json successfully.");
  }
} catch (e) {
  console.warn("Could not cache live sports during build:", e.message);
}

console.log("Build complete.");
