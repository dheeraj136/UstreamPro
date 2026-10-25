import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
const publicDir = join(root, "public");
const assetsDir = join(root, "assets");
const publicAssetsDir = join(publicDir, "assets");

await mkdir(publicDir, { recursive: true });
await mkdir(publicAssetsDir, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  const src = existsSync(join(root, "src", file)) ? join(root, "src", file) : join(root, file);
  await copyFile(src, join(publicDir, file));
}

const assets = await readdir(assetsDir);
for (const file of assets) {
  await copyFile(join(assetsDir, file), join(publicAssetsDir, file));
}
console.log("Build complete.");
