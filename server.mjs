import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {
  // .env file not found or not required
}

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";
const RAPID_API_BASE = process.env.RAPID_API_BASE || "https://moviebox-api.p.rapidapi.com";
const RAPID_API_HOST = process.env.RAPID_API_HOST || "moviebox-api.p.rapidapi.com";
let rapidApiKey = (process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "").trim();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
};

const json = (res, status, payload, req = null) => {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
  });
  if (req?.method === "HEAD") return res.end();
  res.end(JSON.stringify(payload));
};

export const DEMO_ITEMS = [
  // 10 MOVIES
  {
    subjectId: "fallback-movie-1",
    title: "Paper Moons",
    category: "movie",
    genre: "Drama, Romance",
    countryName: "France",
    releaseDate: "2026-02-14",
    imdbRatingValue: "9.1",
    duration: "1h 54m",
    cover: { url: "/assets/paper-moons.svg" },
    hasResource: true,
    description: "Two kindred souls meet on the final night train out of Paris, sharing unspoken memories beneath an eclipse.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-2",
    title: "Moonlit Market",
    category: "movie",
    genre: "Comedy, Fantasy, Romance",
    countryName: "Korea",
    releaseDate: "2025-09-15",
    imdbRatingValue: "8.6",
    duration: "1h 48m",
    cover: { url: "/assets/moonlit-market.svg" },
    hasResource: true,
    description: "A hidden midnight bazaar opens only on full moons, selling forgotten dreams, vintage spells, and warm street food in Seoul.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-3",
    title: "Sintel: Dragon's Path",
    category: "movie",
    genre: "Fantasy, Adventure, Animation",
    countryName: "Netherlands",
    releaseDate: "2024-05-18",
    imdbRatingValue: "8.4",
    duration: "1h 35m",
    cover: { url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A determined wanderer embarks on a dangerous mountain odyssey searching for her companion dragon.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-4",
    title: "Tears of Steel: Neo-Amsterdam",
    category: "movie",
    genre: "Sci-Fi, Action",
    countryName: "Netherlands",
    releaseDate: "2025-07-22",
    imdbRatingValue: "8.7",
    duration: "1h 50m",
    cover: { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "In a dystopian Amsterdam overrun by rogue cyborgs, scientists stage a desperate temporal rescue mission.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-5",
    title: "The Zenith Eclipse",
    category: "movie",
    genre: "Sci-Fi, Mystery, Thriller",
    countryName: "United States",
    releaseDate: "2025-10-12",
    imdbRatingValue: "8.9",
    duration: "2h 08m",
    cover: { url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "An observatory team in the Atacama Desert discovers an artificial megastructure approaching in the solar shadow.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-6",
    title: "Cyber Noir: Neon Mirage",
    category: "movie",
    genre: "Crime, Thriller, Sci-Fi",
    countryName: "United Kingdom",
    releaseDate: "2026-03-01",
    imdbRatingValue: "8.5",
    duration: "1h 58m",
    cover: { url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A cynical neural detective investigates a disappearance tied to an illicit biometric syndication network.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-7",
    title: "Cosmos Laundromat",
    category: "movie",
    genre: "Comedy, Fantasy, Sci-Fi",
    countryName: "France",
    releaseDate: "2024-11-04",
    imdbRatingValue: "8.2",
    duration: "1h 42m",
    cover: { url: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A despondent sheep on a lonely cliff meets an eccentric traveler offering voyages through multiverse wash cycles.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-8",
    title: "Midnight Boulevard",
    category: "movie",
    genre: "Drama, Mystery",
    countryName: "United States",
    releaseDate: "2025-06-18",
    imdbRatingValue: "8.8",
    duration: "2h 02m",
    cover: { url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A night-shift taxi driver becomes the only protector of an escaped key witness hunted through Los Angeles.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-9",
    title: "Solstice Requiem",
    category: "movie",
    genre: "Drama, History, Music",
    countryName: "Germany",
    releaseDate: "2026-01-20",
    imdbRatingValue: "9.0",
    duration: "2h 15m",
    cover: { url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "An orchestral virtuoso uncovers an encoded score hidden inside a historic concert grand piano.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4" },
    seNum: 0,
  },
  {
    subjectId: "fallback-movie-10",
    title: "The Velvet Heist",
    category: "movie",
    genre: "Action, Comedy, Crime",
    countryName: "United States",
    releaseDate: "2025-08-30",
    imdbRatingValue: "8.3",
    duration: "1h 46m",
    cover: { url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A retired master thief is lured into an impossible Monaco diamond extraction amidst an international Grand Prix.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4" },
    seNum: 0,
  },

  // 5 SERIES
  {
    subjectId: "fallback-series-1",
    title: "The Quiet Orbit",
    category: "tv",
    genre: "Drama, Sci-Fi, Mystery",
    countryName: "United States",
    releaseDate: "2025-11-20",
    imdbRatingValue: "8.9",
    duration: "8 Episodes · Mini-series",
    cover: { url: "/assets/quiet-orbit.svg" },
    hasResource: true,
    description: "Deep space research vessel Kepler-9 falls silent after detecting an anomalous resonant signal from Jupiter's shadow.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
    seNum: 1,
  },
  {
    subjectId: "fallback-series-2",
    title: "Zero Hour Club",
    category: "tv",
    genre: "Drama, Mystery, Thriller",
    countryName: "United Kingdom",
    releaseDate: "2026-01-05",
    imdbRatingValue: "9.0",
    duration: "2 Seasons · 16 Episodes",
    cover: { url: "/assets/zero-hour-club.svg" },
    hasResource: true,
    description: "A clandestine syndicate of cryptographers coordinate high-stakes exposes against an authoritarian surveillance network.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4" },
    seNum: 2,
  },
  {
    subjectId: "fallback-series-3",
    title: "Blue Static",
    category: "tv",
    genre: "Drama, Mystery, Sci-Fi",
    countryName: "United States",
    releaseDate: "2024-10-31",
    imdbRatingValue: "8.7",
    duration: "1 Season · 10 Episodes",
    cover: { url: "/assets/blue-static.svg" },
    hasResource: true,
    description: "An analog radio host in a coastal town picks up broadcast frequencies that predict local occurrences before they happen.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
    seNum: 1,
  },
  {
    subjectId: "fallback-series-4",
    title: "Silicon Deep",
    category: "tv",
    genre: "Drama, Sci-Fi, Thriller",
    countryName: "United States",
    releaseDate: "2025-04-14",
    imdbRatingValue: "8.8",
    duration: "3 Seasons · 24 Episodes",
    cover: { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "Subsea server hubs power global autonomous economies until a rogue submarine cuts the Atlantic deep-water trunk cable.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    seNum: 3,
  },
  {
    subjectId: "fallback-series-5",
    title: "Sovereign Protocol",
    category: "tv",
    genre: "Action, Thriller, Crime",
    countryName: "Germany",
    releaseDate: "2026-02-28",
    imdbRatingValue: "9.2",
    duration: "1 Season · 8 Episodes",
    cover: { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "An elite cybersecurity unit is dispatched across Europe when automated diplomatic systems issue conflicting state ultimatums.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
    seNum: 1,
  },

  // 5 ANIME
  {
    subjectId: "fallback-anime-1",
    title: "Neon Yokai",
    category: "anime",
    genre: "Anime, Action, Sci-Fi",
    countryName: "Japan",
    releaseDate: "2026-04-10",
    imdbRatingValue: "9.4",
    duration: "24m · 12 Episodes",
    cover: { url: "/assets/neon-yokai.svg" },
    hasResource: true,
    description: "In a rain-soaked neo-Tokyo, a rogue cyber-exorcist hunts rogue AI spirits glitching across the power grid.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    seNum: 1,
  },
  {
    subjectId: "fallback-anime-2",
    title: "Byte Knights",
    category: "anime",
    genre: "Anime, Action, Sci-Fi",
    countryName: "Japan",
    releaseDate: "2025-08-18",
    imdbRatingValue: "8.5",
    duration: "24 Episodes",
    cover: { url: "/assets/byte-knights.svg" },
    hasResource: true,
    description: "Elite neural gladiators compete in subterranean cyber tournaments where virtual defeats trigger real consequences.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
    seNum: 2,
  },
  {
    subjectId: "fallback-anime-3",
    title: "Skybound Runners",
    category: "anime",
    genre: "Anime, Action, Comedy, Adventure",
    countryName: "Japan",
    releaseDate: "2026-03-12",
    imdbRatingValue: "8.8",
    duration: "Season 2 · 12 Episodes",
    cover: { url: "/assets/skybound-runners.svg" },
    hasResource: true,
    description: "Daredevil sky-sailors navigate treacherous cloud currents and ancient floating ruins in pursuit of the Zenith Horizon.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
    seNum: 2,
  },
  {
    subjectId: "fallback-anime-4",
    title: "Chrono Blade: Zero",
    category: "anime",
    genre: "Anime, Fantasy, Action",
    countryName: "Japan",
    releaseDate: "2025-05-19",
    imdbRatingValue: "9.1",
    duration: "26 Episodes",
    cover: { url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "A master swordsman bound by an ancient temporal curse relives the final battle of the empire to break the cycle of calamity.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
    seNum: 1,
  },
  {
    subjectId: "fallback-anime-5",
    title: "Ghost Horizon",
    category: "anime",
    genre: "Anime, Sci-Fi, Mystery",
    countryName: "Japan",
    releaseDate: "2026-02-11",
    imdbRatingValue: "8.9",
    duration: "12 Episodes",
    cover: { url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80" },
    hasResource: true,
    description: "Pilots stationed at the edge of known space begin experiencing shared apparitions transmitting warnings from beyond the void.",
    playUrl: { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
    seNum: 1,
  },
];

const getDemoDetails = (subjectId) => {
  const item = DEMO_ITEMS.find((it) => it.subjectId === subjectId) || DEMO_ITEMS[0];
  const url = item.playUrl.url;
  return {
    code: 0,
    message: "ok",
    data: {
      subjectId: item.subjectId,
      title: item.title,
      description: item.description,
      subtitles: "English, Japanese, Spanish",
      dub: [
        { subjectId: `${item.subjectId}-eng`, lanName: "English Dub", type: 0 },
        { subjectId: `${item.subjectId}-jpn`, lanName: "Japanese Original", type: 0 },
      ],
      resourceDetectors: [
        { resolution: 1080, definition: 1080, resourceLink: url },
        { resolution: 720, definition: 720, resourceLink: url },
        { resolution: 480, definition: 480, resourceLink: url },
      ],
      playUrl: { url },
    },
  };
};

const getDemoEpisodes = (subjectId) => {
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
};

const rapidFetch = async (path) => {
  if (!rapidApiKey) {
    const error = new Error("RAPID_API_KEY is not configured on the server");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(`${RAPID_API_BASE}${path}`, {
    headers: {
      "x-rapidapi-host": RAPID_API_HOST,
      "x-rapidapi-key": rapidApiKey,
      accept: "application/json",
    },
  });
  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = { code: response.status, message: body.slice(0, 300) };
  }
  if (!response.ok) {
    console.error(`[RapidAPI Server Error] Status: ${response.status}, Path: ${path}, Body:`, body);
    const error = new Error(`RapidAPI request failed with HTTP ${response.status}`);
    error.statusCode = response.status;
    error.payload = payload;
    error.rawBody = body;
    throw error;
  }
  return payload;
};

const isAllowedMediaUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "bcdn.hakunaymatata.com" || url.hostname.endsWith(".hakunaymatata.com"));
  } catch {
    return false;
  }
};

const proxyMedia = async (request, response, mediaUrl) => {
  if (!isAllowedMediaUrl(mediaUrl)) return json(response, 400, { error: "Unsupported media host" }, request);
  const upstream = await fetch(mediaUrl, {
    headers: {
      range: request.headers.range || "bytes=0-",
      "user-agent": "Ustream/1.0",
      accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  const headers = {
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "content-type": upstream.headers.get("content-type") || "video/mp4",
    ...(upstream.headers.get("content-length") ? { "content-length": upstream.headers.get("content-length") } : {}),
    ...(upstream.headers.get("content-range") ? { "content-range": upstream.headers.get("content-range") } : {}),
    ...(upstream.headers.get("accept-ranges") ? { "accept-ranges": upstream.headers.get("accept-ranges") } : { "accept-ranges": "bytes" }),
  };
  response.writeHead(upstream.status, headers);
  if (!upstream.body) return response.end();
  for await (const chunk of upstream.body) response.write(chunk);
  response.end();
};

const catalogParams = (query) => {
  const params = new URLSearchParams({
    category: ["tv", "anime", "movie"].includes(query.get("category") || "") ? query.get("category") : "tv",
    page: query.get("page") || "1",
    sort: query.get("sort") || "ForYou",
  });
  for (const key of ["genre", "country", "year", "classify", "rate"]) {
    const value = query.get(key);
    if (value && value !== "All") params.set(key, value);
  }
  return params;
};

const serveStatic = async (req, res, pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const requested = decoded === "/" ? "/index.html" : decoded;
  const file = resolve(ROOT, `.${requested}`);
  const rel = relative(ROOT, file);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return json(res, 403, { error: "Forbidden" }, req);
  }
  try {
    const contents = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME_TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "content-length": contents.length,
      "cache-control": "no-cache",
      "access-control-allow-origin": "*",
    });
    if (req.method === "HEAD") return res.end();
    res.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") return json(res, 404, { error: "Not found" }, req);
    return json(res, 500, { error: "Unable to read static asset" }, req);
  }
};

const readRequestBody = (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
    });
    return res.end();
  }

  try {
    if (req.method === "POST" && requestUrl.pathname === "/api/config") {
      const body = await readRequestBody(req);
      if (typeof body.rapidApiKey === "string") {
        rapidApiKey = body.rapidApiKey.trim();
        process.env.RAPID_API_KEY = rapidApiKey;
      }
      return json(res, 200, {
        ok: true,
        rapidApiKeyConfigured: !!rapidApiKey,
        mode: rapidApiKey ? "live" : "demo",
      }, req);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return json(res, 405, { error: "Method not allowed. Only GET, HEAD, and POST are supported" }, req);
    }

    if (requestUrl.pathname === "/healthz") {
      return json(res, 200, {
        ok: true,
        service: "ustream",
        mode: rapidApiKey ? "live" : "demo",
        configured: !!rapidApiKey,
        rapidApiConfigured: !!rapidApiKey,
      }, req);
    }

    if (requestUrl.pathname === "/api/config") {
      return json(res, 200, {
        ok: true,
        configured: !!rapidApiKey,
        rapidApiKeyConfigured: !!rapidApiKey,
        mode: rapidApiKey ? "live" : "demo",
      }, req);
    }

    if (requestUrl.pathname === "/api/catalog") {
      const category = requestUrl.searchParams.get("category") || "tv";
      if (rapidApiKey) {
        try {
          const liveData = await rapidFetch(`/movie-or-tv/list?${catalogParams(requestUrl.searchParams)}`);
          return json(res, 200, liveData, req);
        } catch (err) {
          console.warn("RapidAPI request failed, falling back to demo catalog:", err.message);
        }
      }
      // Demo catalog fallback
      const filtered = DEMO_ITEMS.filter((item) => {
        if (category === "all") return true;
        return item.category === category;
      });
      return json(res, 200, {
        code: 0,
        message: "ok (demo catalog)",
        demo: true,
        data: { items: filtered.length ? filtered : DEMO_ITEMS },
      }, req);
    }

    if (requestUrl.pathname === "/api/search") {
      const query = (requestUrl.searchParams.get("query") || "").toLowerCase().trim();
      if (rapidApiKey) {
        try {
          const params = new URLSearchParams({
            query,
            page: requestUrl.searchParams.get("page") || "1",
            tabId: requestUrl.searchParams.get("tabId") || "TV",
          });
          const searchData = await rapidFetch(`/Search?${params}`);
          return json(res, 200, searchData, req);
        } catch (err) {
          console.warn("RapidAPI search failed, falling back to demo search:", err.message);
        }
      }
      // Demo search fallback
      const results = DEMO_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(query) ||
        item.genre.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
      return json(res, 200, {
        code: 0,
        message: "ok (demo search)",
        demo: true,
        data: { items: results },
      }, req);
    }

    const detailsMatch = requestUrl.pathname.match(/^\/api\/details\/([^/]+)$/);
    if (detailsMatch) {
      const subjectId = decodeURIComponent(detailsMatch[1]);
      if (rapidApiKey && !subjectId.startsWith("demo-") && !subjectId.startsWith("fallback-")) {
        try {
          return json(res, 200, await rapidFetch(`/preview/${encodeURIComponent(subjectId)}`), req);
        } catch (err) {
          console.warn("RapidAPI details failed, falling back:", err.message);
        }
      }
      return json(res, 200, getDemoDetails(subjectId), req);
    }

    const episodesMatch = requestUrl.pathname.match(/^\/api\/episodes\/([^/]+)$/);
    if (episodesMatch) {
      const subjectId = decodeURIComponent(episodesMatch[1]);
      if (rapidApiKey && !subjectId.startsWith("demo-") && !subjectId.startsWith("fallback-")) {
        try {
          const params = new URLSearchParams({
            resolution: requestUrl.searchParams.get("resolution") || "360",
            startPosition: requestUrl.searchParams.get("startPosition") || "1",
            endPosition: requestUrl.searchParams.get("endPosition") || "1",
          });
          return json(res, 200, await rapidFetch(`/preview/${encodeURIComponent(subjectId)}/episode-list?${params}`), req);
        } catch (err) {
          console.warn("RapidAPI episodes failed, falling back:", err.message);
        }
      }
      return json(res, 200, getDemoEpisodes(subjectId), req);
    }

    if (requestUrl.pathname === "/api/media") {
      const mediaUrl = requestUrl.searchParams.get("url");
      if (!mediaUrl) return json(res, 400, { error: "Missing media URL" }, req);
      return await proxyMedia(req, res, mediaUrl);
    }

    return serveStatic(req, res, requestUrl.pathname);
  } catch (error) {
    const status = Number(error.statusCode) || 502;
    console.error(`[Server Request Error] Status: ${status}, Message:`, error.message, error.rawBody || "");
    return json(res, status, { error: error.message || "RapidAPI request failed", details: error.payload?.message || error.rawBody || undefined }, req);
  }
});

export default server;

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith("server.mjs") ||
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
);

if (isDirectRun && !process.env.VERCEL && !process.env.VERCEL_ENV) {
  server.listen(PORT, HOST, () => {
    console.log(`Ustream running at http://${HOST}:${PORT}`);
    console.log(`Content mode: ${rapidApiKey ? "RapidAPI Live" : "Demo Catalog Active (RapidAPI key not configured)"}`);
  });
}
