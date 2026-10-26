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

const assets = await readdir(assetsDir);
for (const file of assets) {
  await copyFile(join(assetsDir, file), join(publicAssetsDir, file));
}

for (const iconFile of ["favicon.svg", "favicon.png", "apple-touch-icon.png"]) {
  if (existsSync(join(assetsDir, iconFile))) {
    await copyFile(join(assetsDir, iconFile), join(publicDir, iconFile));
    await copyFile(join(assetsDir, iconFile), join(root, iconFile));
  }
}

await writeFile(
  join(publicApiDir, "config.json"),
  JSON.stringify({ ok: true, configured: true, rapidApiKeyConfigured: true, mode: "live" }, null, 2),
  "utf8"
);

console.log("Build complete.");
