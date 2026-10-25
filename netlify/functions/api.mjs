const RAPID_API_BASE = process.env.RAPID_API_BASE || "https://moviebox-api.p.rapidapi.com";
const RAPID_API_HOST = process.env.RAPID_API_HOST || "moviebox-api.p.rapidapi.com";

// In-memory rate limiting store (sliding window per client IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;
const ipRequestCounts = new Map();

const cleanRateLimitStore = () => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
      ipRequestCounts.delete(ip);
    }
  }
};

const checkRateLimit = (clientIp) => {
  cleanRateLimitStore();
  const now = Date.now();
  const record = ipRequestCounts.get(clientIp);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    ipRequestCounts.set(clientIp, { count: 1, startTime: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
};

const json = (statusCode, payload, headers = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    ...headers,
  },
  body: JSON.stringify(payload),
});

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
    description: "A master swordsman bound by an ancient temporal curse relives the final battle of the empire to break the calamity.",
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

const getRapidApiKey = () => (process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "").trim();

const rapidFetch = async (path) => {
  const apiKey = getRapidApiKey();
  if (!apiKey) {
    const error = new Error("RAPIDAPI_KEY environment variable is not configured");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${RAPID_API_BASE}${path}`, {
    headers: {
      "x-rapidapi-host": RAPID_API_HOST,
      "x-rapidapi-key": apiKey,
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
    console.error(`[RapidAPI Netlify Function Error] HTTP ${response.status} for ${path}:`, body);
    const error = new Error(`RapidAPI request failed with HTTP ${response.status}`);
    error.statusCode = response.status;
    error.payload = payload;
    error.rawBody = body;
    throw error;
  }
  return payload;
};

const catalogParams = (query) => {
  const rawCategory = query.get("category") || query.get("endpoint") || "tv";
  const category = ["tv", "anime", "movie"].includes(rawCategory) ? rawCategory : "tv";
  const rawPage = Number.parseInt(query.get("page") || "1", 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100 ? String(rawPage) : "1";
  const rawSort = query.get("sort") || "ForYou";
  const sort = ["ForYou", "Latest", "Hottest"].includes(rawSort) ? rawSort : "ForYou";

  const params = new URLSearchParams({ category, page, sort });
  for (const key of ["genre", "country", "year", "classify", "rate"]) {
    const value = query.get(key);
    if (value && value !== "All") params.set(key, value.slice(0, 50));
  }
  return params;
};

const extractQueryParams = (event) => {
  const params = new URLSearchParams();
  if (event.queryStringParameters && typeof event.queryStringParameters === "object") {
    for (const [key, val] of Object.entries(event.queryStringParameters)) {
      if (val !== undefined && val !== null) params.set(key, String(val));
    }
  }
  if (!params.toString() && event.rawQuery) {
    const parsed = new URLSearchParams(event.rawQuery);
    for (const [key, val] of parsed.entries()) params.set(key, val);
  }
  return params;
};

const resolveAction = (event, query) => {
  const rawPath = event.path || "/api";
  const functionPrefix = "/.netlify/functions/api";
  let path = rawPath.startsWith(functionPrefix) ? rawPath.slice(functionPrefix.length) || "/" : rawPath;

  // Check query parameter ?endpoint=...
  const queryEndpoint = query.get("endpoint") || query.get("action");
  if (queryEndpoint) {
    if (["movies", "movie"].includes(queryEndpoint)) return { action: "catalog", category: "movie" };
    if (["series", "tv"].includes(queryEndpoint)) return { action: "catalog", category: "tv" };
    if (["anime"].includes(queryEndpoint)) return { action: "catalog", category: "anime" };
    if (queryEndpoint === "catalog") return { action: "catalog", category: query.get("category") || "tv" };
    if (queryEndpoint === "search") return { action: "search" };
    if (queryEndpoint === "details") return { action: "details", id: query.get("id") || query.get("subjectId") };
    if (queryEndpoint === "episodes") return { action: "episodes", id: query.get("id") || query.get("subjectId") };
    if (queryEndpoint === "healthz") return { action: "healthz" };
    if (queryEndpoint === "config") return { action: "config" };
  }

  // Path-based actions
  if (path === "/healthz" || path === "/api/healthz") return { action: "healthz" };
  if (path === "/config" || path === "/api/config") return { action: "config" };
  if (path === "/catalog" || path === "/api/catalog") return { action: "catalog", category: query.get("category") || "tv" };
  if (path === "/search" || path === "/api/search") return { action: "search" };

  const detailsMatch = path.match(/^(?:\/api)?\/details\/([^/]+)$/);
  if (detailsMatch) return { action: "details", id: decodeURIComponent(detailsMatch[1]) };

  const episodesMatch = path.match(/^(?:\/api)?\/episodes\/([^/]+)$/);
  if (episodesMatch) return { action: "episodes", id: decodeURIComponent(episodesMatch[1]) };

  return { action: "unknown" };
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return json(405, { error: "Method not allowed. Only GET and HEAD requests are permitted." });
  }

  // Extract client IP for rate limiting
  const clientIp =
    event.headers?.["x-nf-client-connection-ip"] ||
    event.headers?.["client-ip"] ||
    (event.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    "client";

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return json(429, {
      error: "Too Many Requests",
      message: `Rate limit of ${MAX_REQUESTS_PER_WINDOW} requests/min exceeded. Please try again in ${rateCheck.retryAfter}s.`,
      retryAfter: rateCheck.retryAfter,
    }, { "retry-after": String(rateCheck.retryAfter) });
  }

  const query = extractQueryParams(event);
  const route = resolveAction(event, query);
  const hasApiKey = !!getRapidApiKey();

  try {
    if (route.action === "healthz") {
      return json(200, {
        ok: true,
        service: "ustream-proxy",
        mode: hasApiKey ? "live" : "demo",
        configured: hasApiKey,
        rapidApiConfigured: hasApiKey,
        rateLimit: { remaining: rateCheck.remaining, windowSec: 60 },
      });
    }

    if (route.action === "config") {
      return json(200, {
        ok: true,
        mode: hasApiKey ? "live" : "demo",
        configured: hasApiKey,
        rapidApiConfigured: hasApiKey,
      });
    }

    if (route.action === "catalog") {
      const category = route.category || query.get("category") || "tv";
      if (hasApiKey) {
        try {
          return json(200, await rapidFetch(`/movie-or-tv/list?${catalogParams(query)}`));
        } catch (err) {
          console.warn("[Netlify Proxy] Upstream catalog failed; serving fallback dataset:", err.message);
        }
      }
      const filtered = DEMO_ITEMS.filter((item) => (category === "all" ? true : item.category === category));
      return json(200, {
        code: 0,
        message: "ok (fallback catalog)",
        demo: true,
        data: { items: filtered.length ? filtered : DEMO_ITEMS },
      });
    }

    if (route.action === "search") {
      const q = (query.get("query") || "").toLowerCase().trim();
      if (q.length > 100) {
        return json(400, { error: "Bad Request", message: "Search query exceeds 100 character limit" });
      }
      if (hasApiKey) {
        try {
          const params = new URLSearchParams({
            query: q,
            page: query.get("page") || "1",
            tabId: query.get("tabId") || "TV",
          });
          return json(200, await rapidFetch(`/Search?${params}`));
        } catch (err) {
          console.warn("[Netlify Proxy] Upstream search failed; searching fallback dataset:", err.message);
        }
      }
      const results = DEMO_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(query)
      );
      return json(200, {
        code: 0,
        message: "ok (fallback search)",
        demo: true,
        data: { items: results },
      });
    }

    if (route.action === "details") {
      const subjectId = route.id;
      if (!subjectId || subjectId.length > 128) {
        return json(400, { error: "Bad Request", message: "Invalid or missing subjectId" });
      }
      if (hasApiKey && !subjectId.startsWith("demo-") && !subjectId.startsWith("fallback-")) {
        try {
          return json(200, await rapidFetch(`/preview/${encodeURIComponent(subjectId)}`));
        } catch (err) {
          console.warn("[Netlify Proxy] Upstream details failed; serving fallback details:", err.message);
        }
      }
      return json(200, getDemoDetails(subjectId));
    }

    if (route.action === "episodes") {
      const subjectId = route.id;
      if (!subjectId || subjectId.length > 128) {
        return json(400, { error: "Bad Request", message: "Invalid or missing subjectId" });
      }
      if (hasApiKey && !subjectId.startsWith("demo-") && !subjectId.startsWith("fallback-")) {
        try {
          const rawResolution = query.get("resolution") || "360";
          const resolution = ["360", "480", "720", "1080"].includes(rawResolution) ? rawResolution : "360";
          const params = new URLSearchParams({
            resolution,
            startPosition: query.get("startPosition") || "1",
            endPosition: query.get("endPosition") || "1",
          });
          return json(200, await rapidFetch(`/preview/${encodeURIComponent(subjectId)}/episode-list?${params}`));
        } catch (err) {
          console.warn("[Netlify Proxy] Upstream episodes failed; serving fallback episodes:", err.message);
        }
      }
      return json(200, getDemoEpisodes(subjectId));
    }

    return json(404, { error: "Not Found", message: `Unrecognized API route or endpoint` });
  } catch (error) {
    console.error("[Netlify Proxy Exception]", error);
    return json(Number(error.statusCode) || 502, {
      error: error.message || "RapidAPI proxy request failed",
      details: error.payload?.message || error.rawBody || undefined,
    });
  }
};
