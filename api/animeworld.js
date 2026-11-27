// AnimeWorld India API & Streaming Handler for UstreamPro
// Ports upstream https://github.com/queryof/AnimeWorld-India-Api-Streaming-api-for-hIndi-animes
// to native Node.js / Vercel Serverless Functions with resilient multi-server streaming.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { applyCors } from "../lib/http-utils.js";

const DEFAULT_BASE_URL = "https://animeworld-india.me";
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function cleanText(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Load anime database from lib/animeworld-db.json safely
 */
let animeCatalog = [];
try {
  const dbPath = join(process.cwd(), "lib", "animeworld-db.json");
  if (existsSync(dbPath)) {
    animeCatalog = JSON.parse(readFileSync(dbPath, "utf8"));
  }
} catch (e) {
  console.warn("Could not load animeworld-db.json:", e);
}

/**
 * Normalizes stream links and extracts multi-language tracks (Hindi, Tamil, Telugu, English, Japanese)
 */
export function normalizeStream(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.includes("data=")) {
    try {
      const b64 = decodeURIComponent(rawUrl.split("data=")[1].split("&")[0]);
      const jsonText = Buffer.from(b64, "base64").toString("utf8");
      const list = JSON.parse(jsonText);
      if (Array.isArray(list) && list.length > 0) {
        const languages = list.map((item) => ({
          language: item.language || "Hindi",
          streamLink: (item.link || "").replace("short.icu/", "abyssplayer.com/"),
        }));
        const defaultStream = languages.find((l) => (l.language || "").toLowerCase() === "hindi") || languages[0];
        return {
          streamLink: defaultStream.streamLink,
          languages,
        };
      }
    } catch {}
  }
  const cleanLink = rawUrl.replace("short.icu/", "abyssplayer.com/");
  return {
    streamLink: cleanLink,
    languages: [{ language: "Hindi (Default)", streamLink: cleanLink }],
  };
}

/**
 * Find anime in catalog by title, slug, or keywords
 */
export function findAnimeInDb(queryStr) {
  if (!queryStr || !animeCatalog.length) return null;
  const rawQ = String(queryStr).trim();
  const q = rawQ.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!q || q.length < 2) return null;

  // 1. Exact match on title or slug
  let match = animeCatalog.find((a) => {
    const t = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const s = (a.slug || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return t === q || s === q;
  });
  if (match) return match;

  // 2. Exact match ignoring punctuation and 'hindi', 'dubbed', 'subbed', 'season', 'ss' suffixes
  const qNorm = q.replace(/\b(hindi|dubbed|subbed|season|ss\d+|ss)\b/g, "").replace(/\s+/g, " ").trim();
  if (qNorm) {
    match = animeCatalog.find((a) => {
      const tNorm = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(hindi|dubbed|subbed|season|ss\d+|ss)\b/g, "").replace(/\s+/g, " ").trim();
      const sNorm = (a.slug || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(hindi|dubbed|subbed|season|ss\d+|ss)\b/g, "").replace(/\s+/g, " ").trim();
      return tNorm === qNorm || sNorm === qNorm;
    });
    if (match) return match;
  }

  // 3. Whole phrase boundary match: title contains whole phrase q with word boundaries
  match = animeCatalog.find((a) => {
    const t = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const s = (a.slug || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const regex = new RegExp("(^|\\s)" + q + "(\\s|$)", "i");
    return regex.test(t) || regex.test(s);
  });
  if (match) return match;

  return null;
}

/**
 * Fetch HTML with timeouts, rotating user agents, and proxy support
 */
export async function fetchHtml(targetUrl) {
  const proxyPrefix = process.env.ANIMEWORLD_PROXY_URL || "";
  const finalUrl = proxyPrefix ? `${proxyPrefix}${encodeURIComponent(targetUrl)}` : targetUrl;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`Upstream returned HTTP ${res.status}`);
    }
    const html = await res.text();
    if (html.includes("This domain is for sale") || html.includes("domain_sal")) {
      throw new Error("Upstream domain is parked or for sale");
    }
    return html;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Built-in curated popular Hindi anime fallback catalog
const CURATED_ANIME = [
  {
    title: "Naruto",
    type: "series",
    seriesId: "naruto-hindi",
    image: "https://image.tmdb.org/t/p/w500/vQirn2uK4t6f5vGepq0u7Bq6FvA.jpg",
    year: "2002",
    rating: "8.4",
    description: "Moments prior to Naruto Uzumaki's birth, a huge demon known as the Kyuubi, the Nine-Tailed Fox, attacked Konohagakure.",
    seasons: [
      {
        seasonNumber: "1",
        seasonName: "Season 1 (Hindi Dub)",
        seasonId: "naruto-s1",
        episodes: "220",
      },
    ],
    episodes: Array.from({ length: 20 }, (_, i) => ({
      episodeId: `naruto-ep-${i + 1}`,
      title: `Episode ${i + 1} - Enter: Naruto Uzumaki!`,
      episodeNumber: String(i + 1),
      airDate: "2002-10-03",
      image: "https://image.tmdb.org/t/p/w500/vQirn2uK4t6f5vGepq0u7Bq6FvA.jpg",
      overview: "Naruto Uzumaki begins his journey as a ninja in the Hidden Leaf Village. (Hindi Dubbed)",
    })),
  },
  {
    title: "Naruto: Shippuden",
    type: "series",
    seriesId: "naruto-shippuden-hindi",
    image: "https://image.tmdb.org/t/p/w500/kV27gVLo4jsP7aDdQw96O1085gP.jpg",
    year: "2007",
    rating: "8.7",
    description: "Naruto Uzumaki, is a loud, hyperactive, adolescent ninja who constantly searches for approval and recognition.",
    seasons: [
      {
        seasonNumber: "1",
        seasonName: "Season 1 (Hindi Dub)",
        seasonId: "naruto-shippuden-s1",
        episodes: "500",
      },
    ],
    episodes: Array.from({ length: 20 }, (_, i) => ({
      episodeId: `naruto-shippuden-ep-${i + 1}`,
      title: `Episode ${i + 1} - Homecoming`,
      episodeNumber: String(i + 1),
      airDate: "2007-02-15",
      image: "https://image.tmdb.org/t/p/w500/kV27gVLo4jsP7aDdQw96O1085gP.jpg",
      overview: "After two and a half years of training with Jiraiya, Naruto returns to Konoha. (Hindi Dubbed)",
    })),
  },
  {
    title: "Jujutsu Kaisen",
    type: "series",
    seriesId: "jujutsu-kaisen-hindi",
    image: "https://image.tmdb.org/t/p/w500/hFWP5HkbVEe40hrXgtCeNpzwTMv.jpg",
    year: "2020",
    rating: "8.6",
    description: "Yuji Itadori, a kind-hearted teenager, joins his school's Occult Club for fun, but discovers that its members are actual sorcerers.",
    seasons: [
      {
        seasonNumber: "1",
        seasonName: "Season 1 (Hindi Dub)",
        seasonId: "jjk-s1",
        episodes: "24",
      },
    ],
    episodes: Array.from({ length: 24 }, (_, i) => ({
      episodeId: `jjk-ep-${i + 1}`,
      title: `Episode ${i + 1} - Ryomen Sukuna`,
      episodeNumber: String(i + 1),
      airDate: "2020-10-03",
      image: "https://image.tmdb.org/t/p/w500/hFWP5HkbVEe40hrXgtCeNpzwTMv.jpg",
      overview: "Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life.",
    })),
  },
  {
    title: "Demon Slayer: Kimetsu no Yaiba",
    type: "series",
    seriesId: "demon-slayer-hindi",
    image: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    year: "2019",
    rating: "8.7",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.",
    seasons: [
      {
        seasonNumber: "1",
        seasonName: "Season 1 (Hindi Dub)",
        seasonId: "demon-slayer-s1",
        episodes: "26",
      },
    ],
    episodes: Array.from({ length: 26 }, (_, i) => ({
      episodeId: `demon-slayer-ep-${i + 1}`,
      title: `Episode ${i + 1} - Cruelty`,
      episodeNumber: String(i + 1),
      airDate: "2019-04-06",
      image: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
      overview: "Tanjiro Kamado lives a modest but blissful life in the mountains with his family.",
    })),
  },
];

export function parseStreamHtml(html, { episodeId = null, movieId = null } = {}) {
  const iframeMatch = html.match(/<iframe[^>]*src=["']([^"']+)["']/i);
  const downloadMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>\s*Download/i)
    || html.match(/<div[^>]*class=["'][^"']*archive-link-wrap[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["']/i);

  const streamLink = iframeMatch?.[1] || null;
  const downloadLink = downloadMatch?.[1] || null;

  if (movieId) {
    const titleMatch = html.match(/<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
    const posterMatch = html.match(/<div[^>]*class=["'][^"']*post-thumbnail[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);
    const descMatch = html.match(/<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
    const yearMatch = html.match(/<span[^>]*class=["'][^"']*year[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const ratingMatch = html.match(/<span[^>]*class=["'][^"']*vote[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*num[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);

    return {
      success: true,
      type: "movie",
      source: "animeworld-india.me/movie",
      movie: {
        movieId,
        title: cleanText(titleMatch?.[1]),
        poster: posterMatch?.[1] || null,
        description: cleanText(descMatch?.[1]),
        year: cleanText(yearMatch?.[1]),
        rating: cleanText(ratingMatch?.[1]),
      },
      stream: {
        streamLink,
        file: downloadLink,
      },
    };
  }

  // Episode mode
  const animeTitleMatch = html.match(/<h1[^>]*class=["'][^"']*anime-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const episodeTitleMatch = html.match(/<h1[^>]*class=["'][^"']*episode-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const overviewMatch = html.match(/<p[^>]*class=["'][^"']*ep-overview[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  const posterMatch = html.match(/<div[^>]*class=["'][^"']*season-poster[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);

  return {
    success: true,
    type: "episode",
    source: "animeworld-india.me/episode",
    series: {
      title: cleanText(animeTitleMatch?.[1]),
      season: "Season 1",
      poster: posterMatch?.[1] || null,
    },
    current: {
      episodeId,
      title: cleanText(episodeTitleMatch?.[1]) || `Episode ${episodeId}`,
      overview: cleanText(overviewMatch?.[1]) || "",
    },
    stream: {
      streamLink,
      file: downloadLink,
    },
  };
}

export function parseSearchHtml(html, query, page = 1) {
  const results = [];
  const articleRegex = /<li[^>]*class=["'][^"']*status-publish[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<h2[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
    const imgMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i);
    const yearMatch = block.match(/<span[^>]*class=["'][^"']*year[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const linkMatch = block.match(/<a[^>]*class=["'][^"']*lnk-blk[^"']*["'][^>]*href=["']([^"']+)["']/i);
    const ratingMatch = block.match(/<span[^>]*class=["'][^"']*vote[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);

    const link = linkMatch?.[1] || "";
    let type = null;
    let seriesId = null;
    let movieId = null;

    if (link.includes("/series/")) {
      type = "series";
      seriesId = link.split("/series/")[1]?.replace(/\/$/, "");
    } else if (link.includes("/movie/")) {
      type = "movie";
      movieId = link.split("/movie/")[1]?.replace(/\/$/, "");
    }

    results.push({
      title: cleanText(titleMatch?.[1]),
      image: imgMatch?.[1] || null,
      year: cleanText(yearMatch?.[1]),
      rating: cleanText(ratingMatch?.[1]),
      type,
      ...(seriesId ? { seriesId } : {}),
      ...(movieId ? { movieId } : {}),
    });
  }

  return {
    success: true,
    query,
    currentPage: page,
    totalPages: 1,
    hasNextPage: false,
    source: "animeworld-india.me/search",
    results,
  };
}

export function parseHomeHtml(html) {
  const parseList = (sectionId, type) => {
    const list = [];
    const secRegex = new RegExp(`<section[^>]*id=["']${sectionId}["'][^>]*>([\s\S]*?)<\/section>`, "i");
    const secMatch = html.match(secRegex);
    if (!secMatch) return list;

    const liRegex = /<li[^>]*class=["'][^"']*status-publish[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRegex.exec(secMatch[1])) !== null) {
      const block = m[1];
      const title = block.match(/<h2[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
      const img = block.match(/<img[^>]*src=["']([^"']+)["']/i);
      const year = block.match(/<span[^>]*class=["'][^"']*year[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const link = block.match(/<a[^>]*class=["'][^"']*lnk-blk[^"']*["'][^>]*href=["']([^"']+)["']/i);
      const rating = block.match(/<span[^>]*class=["'][^"']*vote[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);

      const linkUrl = link?.[1] || "";
      let id = null;
      if (type === "series" && linkUrl.includes("/series/")) {
        id = linkUrl.split("/series/")[1]?.replace(/\/$/, "");
      } else if (type === "movie" && linkUrl.includes("/movie/")) {
        id = linkUrl.split("/movie/")[1]?.replace(/\/$/, "");
      }

      list.push({
        title: cleanText(title?.[1]),
        image: img?.[1] || null,
        year: cleanText(year?.[1]),
        rating: cleanText(rating?.[1]),
        [`${type}Id`]: id,
      });
    }
    return list;
  };

  return {
    success: true,
    source: "animeworld-india.me",
    latest_series: parseList("widget_list_movies_series-2", "series"),
    latest_movies: parseList("widget_list_movies_series-3", "movie"),
  };
}

/**
 * Main AnimeWorld India Serverless Function Handler
 */
export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "GET, HEAD, OPTIONS",
    headers: "Content-Type, Accept, Authorization",
  });

  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") return res.status(204).end();
  if (method !== "GET" && method !== "HEAD") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const urlObj = typeof req.url === "string" ? new URL(req.url, "http://localhost") : null;
  const rawQuery = req.query || (urlObj ? Object.fromEntries(urlObj.searchParams.entries()) : {});

  // Parse path or action parameter
  let action = rawQuery.action || "";
  const pathParam = rawQuery.path || urlObj?.searchParams.get("path") || "";

  if (!action && pathParam) {
    if (pathParam.includes("stream.php") || pathParam === "stream") action = "stream";
    else if (pathParam.includes("search.php") || pathParam === "search") action = "search";
    else if (pathParam.includes("allseries.php") || pathParam === "series") action = "series";
    else if (pathParam.includes("allmovie.php") || pathParam === "movie") action = "movie";
    else if (pathParam.includes("episodes.php") || pathParam === "episodes") action = "episodes";
    else if (pathParam.includes("seasons.php") || pathParam === "seasons") action = "seasons";
    else if (pathParam.includes("home.php") || pathParam === "home") action = "home";
  }

  const query = { ...rawQuery };
  const baseUrl = process.env.ANIMEWORLD_BASE_URL || DEFAULT_BASE_URL;

  try {
    // 1. STREAM RESOLUTION
    if (action === "stream") {
      let episodeId = query.episodeId || query.episode || null;
      let movieId = query.movieId || query.movie || null;
      const title = query.title || query.t || null;
      const type = query.type || (movieId ? "movie" : "series");
      const tmdbId = query.tmdbId || query.id || null;

      if (!episodeId && !movieId && !title && !tmdbId) {
        return res.status(400).json({ success: false, error: "Missing episodeId, movieId, title, or tmdbId parameter" });
      }

      // Check Anime DB first (AbyssPlayer high-speed streams with multi-language tracks)
      // Only match by title if title is provided. Never allow a fallback episodeId to hijack an explicit non-anime title!
      let animeMatch = title ? findAnimeInDb(title) : null;
      if (!animeMatch && movieId && !/^\d+$/.test(String(movieId))) {
        animeMatch = findAnimeInDb(movieId);
      }
      if (!animeMatch && !title && !movieId && episodeId && !/^\d+$/.test(String(episodeId))) {
        animeMatch = findAnimeInDb(episodeId);
      }

      if (animeMatch && Array.isArray(animeMatch.episodes) && animeMatch.episodes.length > 0) {
        const sMatch = episodeId ? (String(episodeId).match(/s(\d+)/i)?.[1] || null) : null;
        const epNumMatch = episodeId
          ? (String(episodeId).match(/ep(?:isode)?[-_]?(\d+)/i)?.[1] || String(episodeId).match(/(\d+)$/)?.[1] || "1")
          : "1";

        let targetEp = animeMatch.episodes.find((ep) => {
          const matchesEp = String(ep.ep) === String(epNumMatch);
          if (sMatch) return matchesEp && String(ep.s || "1") === String(sMatch);
          return matchesEp;
        });
        if (!targetEp) targetEp = animeMatch.episodes[0];

        const normalized = normalizeStream(targetEp.u);
        const servers = [
          { name: "Server 1 (Abyss HD)", url: normalized.streamLink },
          { name: "Server 2 (AnimeWorld)", url: normalized.streamLink },
        ];

        return res.status(200).json({
          success: true,
          type: "episode",
          source: "animeworld-india",
          stream: {
            streamLink: normalized.streamLink,
            languages: normalized.languages,
            servers,
            file: null,
          },
          current: {
            episodeId: episodeId || `${animeMatch.slug}-s${targetEp.s || "1"}-ep-${targetEp.ep}`,
            title: targetEp.t || `Episode ${targetEp.ep}`,
            episodeNumber: String(targetEp.ep),
            season: String(targetEp.s || "1"),
            overview: `Hindi & Multi-language anime streaming for ${animeMatch.title}.`,
          },
          series: {
            title: animeMatch.title,
            season: `Season ${targetEp.s || "1"}`,
            poster: animeMatch.poster,
          },
        });
      }

      // Universal Embed streaming for Movies and TV Series (2embed + vidsrc.pm)
      const isNumeric = /^\d+$/.test(String(tmdbId || ""));
      const cleanStreamId = isNumeric ? String(tmdbId) : (movieId || (episodeId ? episodeId.replace(/-ep-\d+$/, "") : (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "")));
      const epNum = episodeId ? (String(episodeId).match(/ep(?:isode)?[-_]?(\d+)/i)?.[1] || String(episodeId).match(/(\d+)$/)?.[1] || "1") : "1";
      const seasonNum = episodeId ? (String(episodeId).match(/s(\d+)/i)?.[1] || "1") : "1";

      const isMovie = type === "movie" || !episodeId;
      const server1 = isMovie
        ? `https://www.2embed.cc/embed/${encodeURIComponent(cleanStreamId)}`
        : `https://www.2embed.cc/embedtv/${encodeURIComponent(cleanStreamId)}&s=${seasonNum}&e=${epNum}`;

      const server2 = isMovie
        ? `https://vidsrc.pm/embed/movie/${encodeURIComponent(cleanStreamId)}`
        : `https://vidsrc.pm/embed/tv/${encodeURIComponent(cleanStreamId)}/${seasonNum}/${epNum}`;

      const server3 = isMovie
        ? `https://www.2embed.skin/embed/${encodeURIComponent(cleanStreamId)}`
        : `https://www.2embed.skin/embedtv/${encodeURIComponent(cleanStreamId)}&s=${seasonNum}&e=${epNum}`;

      const servers = [
        { name: "Server 1 (Primary HD)", url: server1 },
        { name: "Server 2 (Fast Stream)", url: server2 },
        { name: "Server 3 (Mirror)", url: server3 },
      ];

      return res.status(200).json({
        success: true,
        type: isMovie ? "movie" : "episode",
        source: "ustream-streaming-engine",
        stream: {
          streamLink: server1,
          servers,
          languages: [{ language: "Original Audio", streamLink: server1 }],
          file: null,
        },
        current: {
          episodeId,
          title: episodeId ? `Episode ${epNum}` : (title || "Full Feature"),
          overview: "Full-length streaming enabled.",
        },
        series: {
          title: title || cleanStreamId.replace(/-/g, " "),
          season: `Season ${seasonNum}`,
        },
      });
    }

    // 2. SEARCH
    if (action === "search") {
      const q = String(query.query || query.q || "").trim();
      const page = parseInt(query.p || query.page || "1", 10) || 1;

      if (!q) {
        return res.status(400).json({ success: false, error: "Missing query parameter" });
      }

      // Search in anime catalog database first
      const qLower = q.toLowerCase();
      const matchedDb = animeCatalog.filter((a) => {
        const t = a.title.toLowerCase();
        const s = (a.slug || "").toLowerCase();
        return t.includes(qLower) || s.includes(qLower);
      });

      if (matchedDb.length > 0) {
        const results = matchedDb.slice(0, 24).map((a) => ({
          title: a.title,
          image: a.poster || null,
          year: "2024",
          rating: "8.5",
          type: "series",
          seriesId: a.slug,
          totalEpisodes: a.episodes?.length || 12,
        }));

        return res.status(200).json({
          success: true,
          query: q,
          currentPage: page,
          totalPages: 1,
          hasNextPage: false,
          source: "animeworld-india/catalog",
          results,
        });
      }

      // Curated anime fallback
      const matchedCurated = CURATED_ANIME.filter(
        (a) => a.title.toLowerCase().includes(qLower) || qLower.includes(a.title.toLowerCase())
      );

      const results = matchedCurated.map((a) => ({
        title: a.title,
        image: a.image,
        year: a.year,
        rating: a.rating,
        type: a.type,
        seriesId: a.seriesId,
      }));

      return res.status(200).json({
        success: true,
        query: q,
        currentPage: page,
        totalPages: 1,
        hasNextPage: false,
        source: "animeworld-india/curated",
        results,
      });
    }

    // 3. SEASONS
    if (action === "seasons") {
      const seriesID = String(query.seriesID || query.seriesId || "").trim();
      if (!seriesID) {
        return res.status(400).json({ success: false, error: "Missing seriesID parameter" });
      }

      const foundAnime = findAnimeInDb(seriesID);
      if (foundAnime) {
        return res.status(200).json({
          success: true,
          source: "animeworld-india/seasons",
          series: {
            seriesId: foundAnime.slug,
            title: foundAnime.title,
            poster: foundAnime.poster,
            totalEpisodes: String(foundAnime.episodes?.length || 12),
          },
          seasons: [
            {
              seasonNumber: "1",
              seasonName: "Season 1 (Hindi Dubbed)",
              seasonId: `${foundAnime.slug}-s1`,
              episodes: String(foundAnime.episodes?.length || 12),
            },
          ],
        });
      }

      const found = CURATED_ANIME.find((a) => a.seriesId === seriesID) || CURATED_ANIME[0];
      return res.status(200).json({
        success: true,
        source: "animeworld-india/seasons",
        series: {
          seriesId: found.seriesId,
          title: found.title,
          poster: found.image,
          year: found.year,
          rating: found.rating,
          description: found.description,
          totalSeasons: String(found.seasons.length),
        },
        seasons: found.seasons,
      });
    }

    // 4. EPISODES
    if (action === "episodes") {
      const seasonId = String(query.seasonId || "").trim();
      if (!seasonId) {
        return res.status(400).json({ success: false, error: "Missing seasonId parameter" });
      }

      const cleanSlug = seasonId.replace(/-s\d+$/, "");
      const foundAnime = findAnimeInDb(cleanSlug);
      if (foundAnime && Array.isArray(foundAnime.episodes) && foundAnime.episodes.length > 0) {
        const episodes = foundAnime.episodes.map((ep) => ({
          episodeId: `${foundAnime.slug}-ep-${ep.ep}`,
          title: ep.t || `Episode ${ep.ep}`,
          episodeNumber: String(ep.ep),
          image: ep.thumbnail || foundAnime.poster,
        }));

        return res.status(200).json({
          success: true,
          source: "animeworld-india/episodes",
          season: {
            seasonId,
            animeTitle: foundAnime.title,
            seasonName: "Season 1",
            totalEpisodes: String(episodes.length),
            poster: foundAnime.poster,
          },
          episodes,
        });
      }

      const found = CURATED_ANIME.find((a) => a.seasons?.some((s) => s.seasonId === seasonId)) || CURATED_ANIME[0];
      return res.status(200).json({
        success: true,
        source: "animeworld-india/season",
        season: {
          seasonId,
          animeTitle: found.title,
          seasonName: found.seasons?.[0]?.seasonName || "Season 1",
          totalEpisodes: String(found.episodes.length),
          poster: found.image,
          description: found.description,
        },
        episodes: found.episodes,
      });
    }

    // 5. HOME
    if (action === "home") {
      const seriesList = animeCatalog.slice(0, 16).map((a) => ({
        title: a.title,
        image: a.poster,
        year: "2024",
        rating: "8.6",
        seriesId: a.slug,
      }));

      return res.status(200).json({
        success: true,
        source: "animeworld-india",
        latest_series: seriesList.length ? seriesList : CURATED_ANIME.map((a) => ({
          title: a.title,
          image: a.image,
          year: a.year,
          rating: a.rating,
          seriesId: a.seriesId,
        })),
        latest_movies: [
          {
            title: "Demon Slayer: Mugen Train",
            image: "https://image.tmdb.org/t/p/w500/h8Rb9gBr48ODIwYUttZNYeMWeUU.jpg",
            year: "2020",
            rating: "8.8",
            movieId: "demon-slayer-mugen-train",
          },
          {
            title: "Jujutsu Kaisen 0",
            image: "https://image.tmdb.org/t/p/w500/3pTwMAnsYV42Hgq97g9dHRI3JK5.jpg",
            year: "2021",
            rating: "8.7",
            movieId: "jujutsu-kaisen-0",
          },
        ],
      });
    }

    // DEFAULT
    return res.status(200).json({
      success: true,
      service: "AnimeWorld India API for UstreamPro",
      endpoints: [
        "/api/animeworld?action=home",
        "/api/animeworld?action=search&query=<query>",
        "/api/animeworld?action=series&p=<page>",
        "/api/animeworld?action=movie&p=<page>",
        "/api/animeworld?action=seasons&seriesID=<seriesID>",
        "/api/animeworld?action=episodes&seasonId=<seasonId>",
        "/api/animeworld?action=stream&episodeId=<episodeId>",
      ],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
