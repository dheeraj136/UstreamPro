import fs from "fs";
import path from "path";
import { DEMO_ITEMS, EPISODE_MAP } from "./catalog_data.mjs";

const root = process.cwd();

// 1. Update api/server.js
const serverJsPath = path.join(root, "api", "server.js");
let serverJs = fs.readFileSync(serverJsPath, "utf-8");

// Set default RapidAPI Key
serverJs = serverJs.replace(
  /let rapidApiKey = \(process\.env\.RAPIDAPI_KEY \|\| process\.env\.RAPID_API_KEY \|\| ""\)\.trim\(\);/,
  `let rapidApiKey = (process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "68d9a25612msh6bb2c17daf102cdp1fe4fbjsnc2adc8510c22").trim();`
);

// Replace DEMO_ITEMS in server.js
const demoItemsCode = `export const DEMO_ITEMS = ${JSON.stringify(DEMO_ITEMS, null, 2)};\n\nexport const EPISODE_MAP = ${JSON.stringify(EPISODE_MAP, null, 2)};`;

const demoStart = serverJs.indexOf("export const DEMO_ITEMS = [");
const demoEnd = serverJs.indexOf("const getDemoDetails = (subjectId) =>");
if (demoStart !== -1 && demoEnd !== -1) {
  serverJs = serverJs.slice(0, demoStart) + demoItemsCode + "\n\n" + serverJs.slice(demoEnd);
} else {
  console.error("Could not find DEMO_ITEMS boundaries in api/server.js");
}

// Update getDemoEpisodes in server.js to use EPISODE_MAP
const oldEpisodesCode = `const getDemoEpisodes = (subjectId) => {
  const item = DEMO_ITEMS.find((it) => it.subjectId === subjectId) || DEMO_ITEMS[0];
  const isMovie = item.category === "movie";
  if (isMovie) {
    return {
      code: 0,
      message: "ok",
      data: {
        items: [
          { ep: 1, season: 1, name: "Feature Film", resourceLink: item.playUrl.url, resolution: 1080 },
        ],
      },
    };
  }
  return {
    code: 0,
    message: "ok",
    data: {
      items: [
        { ep: 1, season: 1, name: "Episode 1: Awakening", resourceLink: item.playUrl.url, resolution: 1080 },
        { ep: 2, season: 1, name: "Episode 2: The Signal", resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", resolution: 1080 },
        { ep: 3, season: 1, name: "Episode 3: Divergence", resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", resolution: 1080 },
        { ep: 4, season: 1, name: "Episode 4: Zero Hour", resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", resolution: 1080 },
      ],
    },
  };
};`;

const newEpisodesCode = `const getDemoEpisodes = (subjectId) => {
  if (EPISODE_MAP[subjectId]) {
    return {
      code: 0,
      message: "ok",
      data: {
        items: EPISODE_MAP[subjectId],
      },
    };
  }
  const item = DEMO_ITEMS.find((it) => it.subjectId === subjectId) || DEMO_ITEMS[0];
  const isMovie = item.category === "movie" || item.type === "movie";
  if (isMovie) {
    return {
      code: 0,
      message: "ok",
      data: {
        items: [
          { ep: 1, season: 1, name: "Feature Film", resourceLink: item.playUrl?.url || item.video, resolution: 1080 },
        ],
      },
    };
  }
  return {
    code: 0,
    message: "ok",
    data: {
      items: [
        { ep: 1, season: 1, name: \`\${item.title} - Episode 1\`, resourceLink: item.playUrl?.url || item.video, resolution: 1080 },
        { ep: 2, season: 1, name: \`\${item.title} - Episode 2\`, resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", resolution: 1080 },
        { ep: 3, season: 1, name: \`\${item.title} - Episode 3\`, resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", resolution: 1080 },
      ],
    },
  };
};`;

if (serverJs.includes(oldEpisodesCode)) {
  serverJs = serverJs.replace(oldEpisodesCode, newEpisodesCode);
}

// RapidAPI headers in rapidFetch: add both keys
serverJs = serverJs.replace(
  /"x-rapidapi-key": rapidApiKey,/,
  `"x-rapidapi-key": rapidApiKey,\n      "x-api-key": rapidApiKey,`
);

// Normalize path in handler
const oldHandlerPath = `    const headers = req.headers || {};
    let rawPath = headers["x-matched-path"] || headers["x-vercel-original-url"] || req.url || "/";
    if (req.url && req.url.startsWith("/api/") && !req.url.startsWith("/api/server") && !req.url.startsWith("/api/index")) {
      rawPath = req.url;
    }
    const host = headers.host || "localhost";
    const requestUrl = new URL(rawPath, \`http://\${host}\`);
    
    if (requestUrl.pathname === "/api" || requestUrl.pathname === "/api/" || requestUrl.pathname === "/api/server.js" || requestUrl.pathname === "/api/index.js") {
      const endpoint = requestUrl.searchParams.get("endpoint") || requestUrl.searchParams.get("path");
      if (endpoint) {
        requestUrl.pathname = endpoint.startsWith("/") ? \`/api\${endpoint}\` : \`/api/\${endpoint}\`;
      }
    }
    if (requestUrl.pathname.startsWith("/api/api/")) {
      requestUrl.pathname = requestUrl.pathname.replace(/^\\/api\\/api\\//, "/api/");
    }`;

const newHandlerPath = `    const headers = req.headers || {};
    let rawPath = headers["x-matched-path"] || headers["x-vercel-original-url"] || req.url || "/";
    if (req.url && (req.url.startsWith("/api/") || req.url.startsWith("/catalog") || req.url.startsWith("/search") || req.url.startsWith("/details") || req.url.startsWith("/episodes") || req.url.startsWith("/config"))) {
      rawPath = req.url;
    }
    const host = headers.host || "localhost";
    const requestUrl = new URL(rawPath, \`http://\${host}\`);
    
    // Normalize pathname
    if (!requestUrl.pathname.startsWith("/api")) {
      requestUrl.pathname = \`/api\${requestUrl.pathname.startsWith("/") ? "" : "/"}\${requestUrl.pathname}\`;
    }
    if (requestUrl.pathname.startsWith("/api/api/")) {
      requestUrl.pathname = requestUrl.pathname.replace(/^\\/api\\/api\\//, "/api/");
    }
    requestUrl.pathname = requestUrl.pathname.replace(/\\.js$/, "");

    if (requestUrl.pathname === "/api" || requestUrl.pathname === "/api/") {
      const endpoint = requestUrl.searchParams.get("endpoint") || requestUrl.searchParams.get("path");
      if (endpoint) {
        requestUrl.pathname = endpoint.startsWith("/") ? \`/api\${endpoint}\` : \`/api/\${endpoint}\`;
      }
    }`;

if (serverJs.includes(oldHandlerPath)) {
  serverJs = serverJs.replace(oldHandlerPath, newHandlerPath);
}

// Update detailsMatch and episodesMatch to also support ?id=
serverJs = serverJs.replace(
  /const detailsMatch = requestUrl\.pathname\.match\(\/\^\\\/api\\\/details\\\/(\[\^\/\]\+)\$\/\);[\s\S]*?if \(detailsMatch\) {[\s\S]*?const subjectId = decodeURIComponent\(detailsMatch\[1\]\);/,
  `const detailsMatch = requestUrl.pathname.match(/^\\/api\\/details(?:\\/([^/]+))?$/);
    if (detailsMatch && (detailsMatch[1] || requestUrl.searchParams.get("id") || requestUrl.searchParams.get("subjectId"))) {
      const subjectId = decodeURIComponent(detailsMatch[1] || requestUrl.searchParams.get("id") || requestUrl.searchParams.get("subjectId"));`
);

serverJs = serverJs.replace(
  /const episodesMatch = requestUrl\.pathname\.match\(\/\^\\\/api\\\/episodes\\\/(\[\^\/\]\+)\$\/\);[\s\S]*?if \(episodesMatch\) {[\s\S]*?const subjectId = decodeURIComponent\(episodesMatch\[1\]\);/,
  `const episodesMatch = requestUrl.pathname.match(/^\\/api\\/episodes(?:\\/([^/]+))?$/);
    if (episodesMatch && (episodesMatch[1] || requestUrl.searchParams.get("id") || requestUrl.searchParams.get("subjectId"))) {
      const subjectId = decodeURIComponent(episodesMatch[1] || requestUrl.searchParams.get("id") || requestUrl.searchParams.get("subjectId"));`
);

fs.writeFileSync(serverJsPath, serverJs, "utf-8");
console.log("Updated api/server.js successfully");

// 2. Update src/app.js
const appJsPath = path.join(root, "src", "app.js");
let appJs = fs.readFileSync(appJsPath, "utf-8");

const appDemoStart = appJs.indexOf("const DEMO_ITEMS = [");
const appDemoEnd = appJs.indexOf("function loadWatchlist() {");
if (appDemoStart !== -1 && appDemoEnd !== -1) {
  const appDemoCode = `const DEMO_ITEMS = ${JSON.stringify(DEMO_ITEMS, null, 2)};\n\nconst EPISODE_MAP = ${JSON.stringify(EPISODE_MAP, null, 2)};\n\n`;
  appJs = appJs.slice(0, appDemoStart) + appDemoCode + appJs.slice(appDemoEnd);
} else {
  console.error("Could not find DEMO_ITEMS boundaries in src/app.js");
}

// Update toast in loadShowcaseCatalog
appJs = appJs.replace(
  /showToast\(`Loaded \${DEMO_ITEMS\.length} showcase titles \(10 Movies, 5 Series, 5 Anime\)`\);/,
  `showToast(\`Loaded \${DEMO_ITEMS.length} curated titles (10 Movies, 5 Series, 5 Anime)\`);`
);

// Update status label to say Curated instead of Showcase
appJs = appJs.replace(
  /if \(label\) label\.textContent = isLive \? "Live" : "Showcase";/,
  `if (label) label.textContent = isLive ? "Live" : "Curated";`
);
appJs = appJs.replace(
  /if \(settingsTitle\) settingsTitle\.textContent = isLive \? "Live Streaming Active" : "Showcase Catalog";/,
  `if (settingsTitle) settingsTitle.textContent = isLive ? "Live Streaming Active" : "Curated Catalog";`
);

fs.writeFileSync(appJsPath, appJs, "utf-8");
console.log("Updated src/app.js successfully");
