import { ICONS, renderIcon } from "./assets/icons.js";

const animeFilterResponse = {
  code: 0,
  data: {
    typeList: [
      {
        channelId: 1006,
        channelName: "Anime",
        items: [
          {
            filterType: "country",
            filterVals: [],
            filterValsV2: [
              { id: "All", name: "All" },
              { id: "United States", name: "United States" },
              { id: "United Kingdom", name: "United Kingdom" },
              { id: "France", name: "France" },
              { id: "Japan", name: "Japan" },
              { id: "China", name: "China" },
              { id: "Korea", name: "Korea" },
              { id: "Other", name: "Other" },
            ],
            rangeVals: null,
            showOut: true,
            title: "Country",
          },
          {
            filterType: "year",
            filterVals: [],
            filterValsV2: [
              { id: "All", name: "All" },
              { id: "2026", name: "2026" },
              { id: "2025", name: "2025" },
              { id: "2024", name: "2024" },
              { id: "2023", name: "2023" },
              { id: "2022", name: "2022" },
              { id: "2021", name: "2021" },
              { id: "2020", name: "2020" },
              { id: "2010s", name: "2010s" },
              { id: "2000s", name: "2000s" },
              { id: "1990s", name: "1990s" },
              { id: "1980s", name: "1980s" },
              { id: "Other", name: "Other" },
            ],
            rangeVals: null,
            showOut: true,
            title: "Year",
          },
          {
            filterType: "sort",
            filterVals: [],
            filterValsV2: [
              { id: "ForYou", name: "ForYou" },
              { id: "Hottest", name: "Hottest" },
              { id: "Latest", name: "Latest" },
            ],
            rangeVals: null,
            showOut: false,
            title: "Sort by",
          },
          {
            filterType: "rate",
            filterVals: [],
            filterValsV2: [],
            rangeVals: { maxVal: "10", minVal: "0" },
            showOut: false,
            title: "Rating",
          },
        ],
        style: { colNum: 3, shape: "Vertical" },
        subjectType: 0,
      },
    ],
  },
  message: "ok",
};

const animeChannel = animeFilterResponse.data.typeList.find((entry) => entry.channelName === "Anime");

const enumFilter = (filterType, title, values, showOut) => ({
  filterType,
  filterVals: [],
  filterValsV2: values.map((value) => ({ id: value, name: value })),
  rangeVals: null,
  showOut,
  title,
});

const rateFilter = () => ({
  filterType: "rate",
  filterVals: [],
  filterValsV2: [],
  rangeVals: { maxVal: "10", minVal: "0" },
  showOut: false,
  title: "Rating",
});

const seriesFilterResponse = {
  code: 0,
  data: {
    typeList: [
      {
        channelId: 2,
        channelName: "Series",
        items: [
          enumFilter("genre", "Genre", ["All", "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "Game-Show", "History", "Horror", "Music", "Musical", "Mystery", "News", "Reality-TV", "Romance", "Sci-Fi", "Short", "Sport", "Talk-Show", "Thriller", "War", "Western", "Other"], true),
          enumFilter("country", "Country", ["All", "United States", "United Kingdom", "Korea", "Japan", "Bangladesh", "China", "Egypt", "France", "Germany", "India", "Indonesia", "Iraq", "Italy", "Ivory Coast", "Kenya", "Lebanon", "Mexico", "Morocco", "Nigeria", "Pakistan", "Philippines", "Russia", "Saudi Arabia", "South Africa", "Spain", "Syria", "Thailand", "Malaysia", "Turkey", "Other"], true),
          enumFilter("year", "Year", ["All", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2010s", "2000s", "1990s", "1980s", "Other"], true),
          enumFilter("sort", "Sort by", ["ForYou", "Hottest", "Latest"], false),
          rateFilter(),
          enumFilter("classify", "Language", ["All", "English dub", "French dub", "Hindi dub", "Bengali dub", "Urdu dub", "Punjabi dub", "Tamil dub", "Telugu dub", "Malayalam dub", "Kannada dub", "Arabic dub", "Arabic sub", "Tagalog dub", "Indonesian dub", "Russian dub", "Kurdish sub", "Spanish dub", "Spanish sub", "SpanishLatam dub"], false),
        ],
        style: { colNum: 3, shape: "Vertical" },
        subjectType: 2,
      },
    ],
  },
  message: "ok",
};

const seriesChannel = seriesFilterResponse.data.typeList.find((entry) => entry.channelName === "Series");

const DEMO_ITEMS = [
  // 10 MOVIES
  {
    subjectId: "fallback-movie-1",
    title: "Paper Moons",
    type: "movie",
    genre: ["drama", "romance"],
    country: "France",
    year: 2026,
    releaseDate: "2026-02-14",
    rating: 9.1,
    runtime: "1h 54m",
    language: "French, English Sub",
    badge: "Ready",
    kicker: "Film by Lumen",
    image: "./assets/paper-moons.svg",
    gradient: "linear-gradient(145deg, #ffc97a, #5c2c77 50%, #151128)",
    description: "Two kindred souls meet on the final night train out of Paris, sharing unspoken memories and folding origami confessions beneath an eclipse.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    subjectId: "fallback-movie-2",
    title: "Moonlit Market",
    type: "movie",
    genre: ["comedy", "drama", "fantasy", "romance"],
    country: "Korea",
    year: 2025,
    releaseDate: "2025-09-15",
    rating: 8.6,
    runtime: "1h 48m",
    language: "Korean, English Sub",
    badge: "Ready",
    kicker: "A New Film",
    image: "./assets/moonlit-market.svg",
    gradient: "linear-gradient(145deg, #ffc857, #66395b 50%, #191224)",
    description: "A hidden midnight bazaar opens only on full moons, selling forgotten dreams, vintage spells, and the warmest street food in Seoul.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },
  {
    subjectId: "fallback-movie-3",
    title: "Sintel: Dragon's Path",
    type: "movie",
    genre: ["fantasy", "adventure", "animation"],
    country: "Netherlands",
    year: 2024,
    releaseDate: "2024-05-18",
    rating: 8.4,
    runtime: "1h 35m",
    language: "English",
    badge: "Ready",
    kicker: "Open Movie",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #e58253, #431f24 50%, #110d13)",
    description: "A determined wanderer embarks on a dangerous mountain odyssey searching for her companion dragon.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    subjectId: "fallback-movie-4",
    title: "Tears of Steel: Neo-Amsterdam",
    type: "movie",
    genre: ["sci-fi", "action"],
    country: "Netherlands",
    year: 2025,
    releaseDate: "2025-07-22",
    rating: 8.7,
    runtime: "1h 50m",
    language: "English",
    badge: "Ready",
    kicker: "Sci-Fi Epic",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #38c8b2, #183e47 50%, #0c181f)",
    description: "In a dystopian Amsterdam overrun by rogue cyborgs, scientists stage a desperate temporal rescue mission.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    subjectId: "fallback-movie-5",
    title: "The Zenith Eclipse",
    type: "movie",
    genre: ["sci-fi", "mystery", "thriller"],
    country: "United States",
    year: 2025,
    releaseDate: "2025-10-12",
    rating: 8.9,
    runtime: "2h 08m",
    language: "English",
    badge: "Ready",
    kicker: "Premiere",
    image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #7c4dff, #24164b 50%, #0d0a19)",
    description: "An observatory team in the Atacama Desert discovers an artificial megastructure approaching in the solar shadow.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    subjectId: "fallback-movie-6",
    title: "Cyber Noir: Neon Mirage",
    type: "movie",
    genre: ["crime", "thriller", "sci-fi"],
    country: "United Kingdom",
    year: 2026,
    releaseDate: "2026-03-01",
    rating: 8.5,
    runtime: "1h 58m",
    language: "English",
    badge: "Ready",
    kicker: "Neon Thriller",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #ff2a85, #4d1533 50%, #150912)",
    description: "A cynical neural detective investigates a disappearance tied to an illicit biometric syndication network.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    subjectId: "fallback-movie-7",
    title: "Cosmos Laundromat",
    type: "movie",
    genre: ["comedy", "fantasy", "sci-fi"],
    country: "France",
    year: 2024,
    releaseDate: "2024-11-04",
    rating: 8.2,
    runtime: "1h 42m",
    language: "French, English Sub",
    badge: "Ready",
    kicker: "Surreal Indie",
    image: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #f5a623, #4a3418 50%, #16120b)",
    description: "A despondent sheep on a lonely cliff meets an eccentric traveler offering voyages through multiverse wash cycles.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    subjectId: "fallback-movie-8",
    title: "Midnight Boulevard",
    type: "movie",
    genre: ["drama", "mystery"],
    country: "United States",
    year: 2025,
    releaseDate: "2025-06-18",
    rating: 8.8,
    runtime: "2h 02m",
    language: "English",
    badge: "Ready",
    kicker: "Midnight Drama",
    image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #4a90e2, #1b3558 50%, #0a1320)",
    description: "A night-shift taxi driver becomes the only protector of an escaped key witness hunted through Los Angeles.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    subjectId: "fallback-movie-9",
    title: "Solstice Requiem",
    type: "movie",
    genre: ["drama", "history"],
    country: "Germany",
    year: 2026,
    releaseDate: "2026-01-20",
    rating: 9.0,
    runtime: "2h 15m",
    language: "German, English Sub",
    badge: "Ready",
    kicker: "Period Drama",
    image: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #d0021b, #441118 50%, #15090b)",
    description: "An orchestral virtuoso uncovers an encoded score hidden inside a historic concert grand piano.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  },
  {
    subjectId: "fallback-movie-10",
    title: "The Velvet Heist",
    type: "movie",
    genre: ["action", "comedy", "crime"],
    country: "United States",
    year: 2025,
    releaseDate: "2025-08-30",
    rating: 8.3,
    runtime: "1h 46m",
    language: "English",
    badge: "Ready",
    kicker: "Caper",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #b8e986, #32471e 50%, #0d1607)",
    description: "A retired master thief is lured into an impossible Monaco diamond extraction amidst an international Grand Prix.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },

  // 5 SERIES
  {
    subjectId: "fallback-series-1",
    title: "The Quiet Orbit",
    type: "series",
    genre: ["drama", "sci-fi", "mystery"],
    country: "United States",
    year: 2025,
    releaseDate: "2025-11-20",
    rating: 8.9,
    runtime: "8 Episodes · Mini-series",
    language: "English",
    badge: "Ready",
    kicker: "Limited Series",
    image: "./assets/quiet-orbit.svg",
    gradient: "linear-gradient(145deg, #4f62a0, #1c2447 50%, #0d1020)",
    description: "Deep space research vessel Kepler-9 falls silent after detecting an anomalous resonant signal from Jupiter's shadow.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    subjectId: "fallback-series-2",
    title: "Zero Hour Club",
    type: "series",
    genre: ["drama", "mystery", "action"],
    country: "United Kingdom",
    year: 2026,
    releaseDate: "2026-01-05",
    rating: 9.0,
    runtime: "2 Seasons · 16 Episodes",
    language: "English",
    badge: "Ready",
    kicker: "Top 10 Series",
    image: "./assets/zero-hour-club.svg",
    gradient: "linear-gradient(145deg, #ff6b4a, #4a1e35 50%, #120e1d)",
    description: "A clandestine syndicate of cryptographers coordinate high-stakes exposes against an authoritarian surveillance network.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  },
  {
    subjectId: "fallback-series-3",
    title: "Blue Static",
    type: "series",
    genre: ["drama", "mystery", "sci-fi"],
    country: "United States",
    year: 2024,
    releaseDate: "2024-10-31",
    rating: 8.7,
    runtime: "1 Season · 10 Episodes",
    language: "English",
    badge: "Ready",
    kicker: "Cinewave Series",
    image: "./assets/blue-static.svg",
    gradient: "linear-gradient(145deg, #4da4ff, #20356c 50%, #0a1124)",
    description: "An analog radio host in a coastal town picks up broadcast frequencies that predict local occurrences before they happen.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    subjectId: "fallback-series-4",
    title: "Silicon Deep",
    type: "series",
    genre: ["drama", "sci-fi"],
    country: "United States",
    year: 2025,
    releaseDate: "2025-04-14",
    rating: 8.8,
    runtime: "3 Seasons · 24 Episodes",
    language: "English",
    badge: "Ready",
    kicker: "Original",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #50e3c2, #16493d 50%, #091a16)",
    description: "Subsea server hubs power global autonomous economies until a rogue submarine cuts the Atlantic deep-water trunk cable.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    subjectId: "fallback-series-5",
    title: "Sovereign Protocol",
    type: "series",
    genre: ["action", "drama"],
    country: "Germany",
    year: 2026,
    releaseDate: "2026-02-28",
    rating: 9.2,
    runtime: "1 Season · 8 Episodes",
    language: "German, English Sub",
    badge: "Ready",
    kicker: "Thriller",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #bd10e0, #40094e 50%, #15051a)",
    description: "An elite cybersecurity unit is dispatched across Europe when automated diplomatic systems issue conflicting state ultimatums.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },

  // 5 ANIME
  {
    subjectId: "fallback-anime-1",
    title: "Neon Yokai",
    type: "anime",
    genre: ["anime", "action", "sci-fi"],
    country: "Japan",
    year: 2026,
    releaseDate: "2026-04-10",
    rating: 9.4,
    runtime: "24m · 12 Episodes",
    language: "Japanese, English Dub",
    badge: "Ready",
    kicker: "Cinewave Original",
    image: "./assets/neon-yokai.svg",
    gradient: "linear-gradient(145deg, #f15ca0, #4c1e68 52%, #11172f)",
    description: "In a rain-soaked neo-Tokyo, a rogue cyber-exorcist hunts rogue AI spirits glitching across the power grid.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    subjectId: "fallback-anime-2",
    title: "Byte Knights",
    type: "anime",
    genre: ["anime", "action", "sci-fi"],
    country: "Japan",
    year: 2025,
    releaseDate: "2025-08-18",
    rating: 8.5,
    runtime: "24 Episodes",
    language: "Japanese, English Dub",
    badge: "Ready",
    kicker: "System Online",
    image: "./assets/byte-knights.svg",
    gradient: "linear-gradient(145deg, #1bd3a2, #184e68 50%, #081a24)",
    description: "Elite neural gladiators compete in subterranean cyber tournaments where virtual defeats trigger real consequences.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    subjectId: "fallback-anime-3",
    title: "Skybound Runners",
    type: "anime",
    genre: ["anime", "action", "comedy"],
    country: "Japan",
    year: 2026,
    releaseDate: "2026-03-12",
    rating: 8.8,
    runtime: "Season 2 · 12 Episodes",
    language: "Japanese, English Sub",
    badge: "Ready",
    kicker: "Season Two",
    image: "./assets/skybound-runners.svg",
    gradient: "linear-gradient(145deg, #51a5ff, #1d3368 50%, #0c162d)",
    description: "Daredevil sky-sailors navigate treacherous cloud currents and ancient floating ruins in pursuit of the Zenith Horizon.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    subjectId: "fallback-anime-4",
    title: "Chrono Blade: Zero",
    type: "anime",
    genre: ["anime", "action", "fantasy"],
    country: "Japan",
    year: 2025,
    releaseDate: "2025-05-19",
    rating: 9.1,
    runtime: "26 Episodes",
    language: "Japanese, English Dub",
    badge: "Ready",
    kicker: "Top Rated",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #ff9900, #543303 50%, #170e01)",
    description: "A master swordsman bound by an ancient temporal curse relives the final battle of the empire to break the calamity.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },
  {
    subjectId: "fallback-anime-5",
    title: "Ghost Horizon",
    type: "anime",
    genre: ["anime", "sci-fi", "drama"],
    country: "Japan",
    year: 2026,
    releaseDate: "2026-02-11",
    rating: 8.9,
    runtime: "12 Episodes",
    language: "Japanese, English Sub",
    badge: "Ready",
    kicker: "Psychological",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(145deg, #00d2ff, #0a4066 50%, #041724)",
    description: "Pilots stationed at the edge of known space begin experiencing shared apparitions transmitting warnings from beyond the void.",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
];

let catalog = [...DEMO_ITEMS];
let recommendations = DEMO_ITEMS.slice(0, 6);
let featured = DEMO_ITEMS[0];

function loadContinuation() {
  try {
    const raw = localStorage.getItem("ustream-continuation");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const continuation = loadContinuation();

function getFilterChannel() {
  return state?.section === "series" ? seriesChannel : animeChannel;
}

function makeFilterDefaults(channel) {
  return Object.fromEntries(channel.items.map((item) => {
    if (item.filterType === "rate") return ["rateMin", 0];
    return [item.filterType, item.filterValsV2[0]?.id || "All"];
  }).concat([["rateMax", 10]]));
}

const state = {
  section: "home",
  genre: "all",
  search: "",
  view: "grid",
  filters: makeFilterDefaults(animeChannel),
  watchlist: new Set(loadWatchlist()),
  activeModal: null,
  player: {
    requestId: 0,
    item: null,
    details: null,
    subjectId: "",
    languageOptions: [],
    selectedLanguage: null,
    subtitleOptions: [],
    selectedSubtitle: "off",
    subtitleSubjectId: "",
    qualityOptions: [],
    selectedQuality: null,
    resolution: null,
    seasons: [],
    selectedSeason: null,
    selectedEpisode: null,
    isSeries: false,
    autoplayNext: false,
  },
};
let searchTimer;
let searchRequestId = 0;

const parseApiRating = (value) => {
  const rating = Number.parseFloat(value);
  return Number.isFinite(rating) ? rating : 0;
};

const normalizeApiItem = (item, category) => {
  const genres = String(item.genre || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const type = category === "tv" ? "series" : category;
  const label = category === "tv" ? "Series" : category === "anime" ? "Anime" : "Movie";
  if (type === "anime" && !genres.includes("anime")) genres.unshift("anime");
  const year = Number.parseInt(String(item.releaseDate || "").slice(0, 4), 10);
  return {
    title: item.title || "Untitled",
    type,
    genre: genres.length ? genres : [type],
    country: item.countryName || "Other",
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    releaseDate: item.releaseDate || "",
    updatedAt: item.updatedAt || item.updateTime || item.resourceDetectors?.[0]?.uploadTime || "",
    rating: parseApiRating(item.imdbRatingValue),
    runtime: item.duration || (item.seNum ? `${item.seNum} season${item.seNum === 1 ? "" : "s"}` : "Live title"),
    language: item.language || item.corner || "",
    badge: item.hasResource ? "Ready" : "Info",
    kicker: `Ustream · ${label}`,
    image: item.cover?.url || "",
    gradient: "linear-gradient(145deg, #293569, #111827 58%, #080a12)",
    subjectId: item.subjectId,
    description: item.description || "Stream this title in high definition on Ustream.",
    video: item.playUrl?.url || item.playUrl?.playUrl || "",
  };
};

const normalizeSearchItem = (item) => {
  const category = String(item.genre || "").toLowerCase().includes("anime") ? "anime" : "tv";
  return normalizeApiItem(item, category);
};

function updateStatusBadge(isLive, count) {
  const dot = $("#status-dot");
  const label = $("#status-label");
  const settingsDot = $("#settings-status-dot");
  const settingsTitle = $("#settings-status-title");
  const settingsInfo = $("#settings-status-info");

  if (dot) dot.classList.toggle("live", !!isLive);
  if (label) label.textContent = isLive ? "Live" : "Showcase";

  if (settingsDot) settingsDot.classList.toggle("live", !!isLive);
  if (settingsTitle) settingsTitle.textContent = isLive ? "Live Streaming Active" : "Showcase Catalog";
  if (settingsInfo) {
    settingsInfo.textContent = isLive
      ? `Connected to live streaming service · ${count || "multiple"} titles available.`
      : "Curated original streaming collection with multi-resolution playback and episodic support.";
  }
}

function renderSkeletons() {
  const grid = $("#card-grid");
  if (grid) {
    grid.innerHTML = Array.from({ length: 8 }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-poster"></div>
        <div class="skeleton-info">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join("");
  }
  const emptyBox = $("#empty-state");
  if (emptyBox) emptyBox.hidden = true;
  const errorBox = $("#error-state");
  if (errorBox) errorBox.hidden = true;

  const recRow = $("#recommendation-row");
  if (recRow) {
    const recSection = $("#recommendations-section");
    if (recSection) recSection.hidden = false;
    recRow.innerHTML = Array.from({ length: 6 }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-poster"></div>
        <div class="skeleton-info">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join("");
  }
}

function showErrorState(title, message, errorDetails = null) {
  state.hasError = true;
  const errorBox = $("#error-state");
  const emptyBox = $("#empty-state");
  const errorTitle = $("#error-title");
  const errorMsg = $("#error-message");
  const detailsBox = $("#error-details-box");
  const detailsText = $("#error-details-text");

  if (emptyBox) emptyBox.hidden = true;
  if (errorTitle && title) errorTitle.textContent = title;
  if (errorMsg && message) errorMsg.textContent = message;

  if (errorDetails && detailsBox && detailsText) {
    detailsBox.hidden = false;
    detailsText.textContent = typeof errorDetails === "string" ? errorDetails : JSON.stringify(errorDetails, null, 2);
  } else if (detailsBox) {
    detailsBox.hidden = true;
  }

  if (errorBox) errorBox.hidden = false;
  $("#card-grid").innerHTML = "";
}

function clearErrorState() {
  state.hasError = false;
  const errorBox = $("#error-state");
  if (errorBox) errorBox.hidden = true;
}

function loadShowcaseCatalog() {
  clearErrorState();
  catalog = [...DEMO_ITEMS];
  recommendations = DEMO_ITEMS.slice(0, 6);
  setFeatured(DEMO_ITEMS[0]);
  updateStatusBadge(false, DEMO_ITEMS.length);
  render();
  showToast(`Loaded ${DEMO_ITEMS.length} showcase titles (10 Movies, 5 Series, 5 Anime)`);
}

async function retryCatalog() {
  clearErrorState();
  await loadLiveCatalog(true);
  await loadNewestRecommendations();
}

const API_BASE = typeof window !== "undefined" && window.location.hostname.includes("netlify.app")
  ? "/.netlify/functions/api"
  : "/api";

function buildApiUrl(action, params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, String(val));
    }
  }

  if (API_BASE.startsWith("/.netlify")) {
    searchParams.set("endpoint", action);
    return `${API_BASE}?${searchParams.toString()}`;
  }

  // Path-based proxy /api/{action} or /api/details/:id
  if (action === "details" && params.id) {
    return `${API_BASE}/details/${encodeURIComponent(params.id)}`;
  }
  if (action === "episodes" && params.id) {
    const id = params.id;
    const copy = new URLSearchParams(searchParams);
    copy.delete("id");
    const qs = copy.toString();
    return `${API_BASE}/episodes/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;
  }

  const qs = searchParams.toString();
  return `${API_BASE}/${action}${qs ? `?${qs}` : ""}`;
}

async function loadLiveCatalog(isRetry = false) {
  clearErrorState();
  renderSkeletons();
  if (isRetry) showToast("Connecting to live catalog...");

  try {
    const configUrl = buildApiUrl("config");
    const configRes = await fetch(configUrl).catch(() => null);
    const config = configRes?.ok ? await configRes.json() : null;

    const urls = [
      { cat: "movie", url: buildApiUrl("catalog", { category: "movie", page: 1, sort: "ForYou" }) },
      { cat: "tv", url: buildApiUrl("catalog", { category: "tv", page: 1, sort: "ForYou" }) },
      { cat: "anime", url: buildApiUrl("catalog", { category: "anime", page: 1, sort: "ForYou" }) },
    ];

    const results = await Promise.all(urls.map(async ({ cat, url }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          console.error(`[Ustream API Call Failed] Category: ${cat}, Status: ${response.status}, StatusText: ${response.statusText}, Endpoint: ${url}, Body:`, bodyText);
          return { ok: false, status: response.status, statusText: response.statusText, body: bodyText, cat, url };
        }
        const data = await response.json();
        return { ok: true, data, cat };
      } catch (networkErr) {
        console.error(`[Ustream Network Error] Category: ${cat}, Endpoint: ${url}:`, networkErr);
        return { ok: false, error: networkErr.message, cat, url };
      }
    }));

    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      const firstErr = failed[0];
      const errorSummary = firstErr.status
        ? `HTTP ${firstErr.status} (${firstErr.statusText || 'Error'}) from stream server`
        : `Network error: ${firstErr.error || 'Failed to reach stream server'}`;

      console.error("[Ustream Critical Error] All catalog API calls failed:", failed);
      showErrorState(
        "Unable to load streaming catalog",
        `${errorSummary}. Please check your internet connection or switch to the showcase catalog.`,
        firstErr.body || firstErr.error
      );
      updateStatusBadge(false, DEMO_ITEMS.length);
      return;
    }

    const moviePayload = results.find((r) => r.cat === "movie")?.data;
    const seriesPayload = results.find((r) => r.cat === "tv")?.data;
    const animePayload = results.find((r) => r.cat === "anime")?.data;

    const isDemo = results.some((r) => r.data?.demo);

    const liveMovies = (moviePayload?.data?.items || []).map((item) => normalizeApiItem(item, "movie"));
    const liveSeries = (seriesPayload?.data?.items || []).map((item) => normalizeApiItem(item, "tv"));
    const liveAnime = (animePayload?.data?.items || []).map((item) => normalizeApiItem(item, "anime"));
    const liveCatalog = [...liveMovies, ...liveSeries, ...liveAnime];

    if (liveCatalog.length) {
      catalog = liveCatalog;
      setFeatured(liveCatalog[0]);
      updateStatusBadge(!isDemo, liveCatalog.length);
      clearErrorState();
      render();
      if (!isDemo) showToast(`Loaded ${liveCatalog.length} trending titles`);
    } else {
      catalog = [...DEMO_ITEMS];
      setFeatured(DEMO_ITEMS[0]);
      updateStatusBadge(false, DEMO_ITEMS.length);
      clearErrorState();
      render();
    }
  } catch (error) {
    console.error("[Ustream Unhandled Catalog Error]", error);
    showErrorState(
      "Unable to load live content",
      `Error: ${error.message || "Failed to fetch content"}.`,
      error.stack || error.message
    );
    updateStatusBadge(false, DEMO_ITEMS.length);
  }
}

async function loadNewestRecommendations() {
  try {
    const urls = [
      { cat: "movie", url: buildApiUrl("catalog", { category: "movie", page: 1, sort: "Latest" }) },
      { cat: "tv", url: buildApiUrl("catalog", { category: "tv", page: 1, sort: "Latest" }) },
      { cat: "anime", url: buildApiUrl("catalog", { category: "anime", page: 1, sort: "Latest" }) },
    ];

    const responses = await Promise.allSettled(urls.map(async ({ cat, url }) => {
      const res = await fetch(url);
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.error(`[Ustream Recommendations Call Failed] Category: ${cat}, Status: ${res.status}, Body:`, bodyText);
        throw new Error(`HTTP ${res.status}`);
      }
      return { cat, data: await res.json() };
    }));

    const latest = [];
    for (const result of responses) {
      if (result.status !== "fulfilled") continue;
      const { cat, data } = result.value;
      latest.push(...(data.data?.items || []).map((item) => normalizeApiItem(item, cat)));
    }

    if (latest.length) {
      recommendations = [...new Map(latest.map((item) => [item.subjectId || item.title, item])).values()].slice(0, 12);
    } else {
      recommendations = DEMO_ITEMS.slice(0, 6);
    }
    renderRecommendations();
  } catch (error) {
    console.warn("[Ustream Recommendations] Unavailable, falling back to showcase:", error);
    recommendations = DEMO_ITEMS.slice(0, 6);
    renderRecommendations();
  }
}

function setFeatured(item) {
  if (!item) return;
  featured = item;
  const words = item.title.split(" ");
  const firstWord = words[0];
  const restWords = words.slice(1).join(" ");
  $("#hero-title").innerHTML = restWords ? `${firstWord}<br /><em>${restWords}</em>` : firstWord;
  $("#hero-description").textContent = item.description || `Stream ${item.title} from the catalog.`;
  $("#hero-meta").innerHTML = `<span>${item.year}</span><span class="rating">★ ${item.rating ? item.rating.toFixed(1) : "—"}</span><span>${item.runtime || "Live title"}</span><span>${item.type === "anime" ? "Anime" : item.type === "series" ? "Series" : "Movie"}</span>`;
  $("#hero-credit").innerHTML = `<span>${item.kicker || "Featured"}</span> · ${item.country || "Catalog"}`;
  $("#hero-play").dataset.title = item.title;
  $("#hero-details").dataset.title = item.title;
}

async function loadSearchResults(query) {
  const requestId = ++searchRequestId;
  const trimmed = query.trim();
  if (!trimmed) {
    await loadLiveCatalog();
    return;
  }
  try {
    const url = buildApiUrl("search", { query: trimmed, page: 1, tabId: "TV" });
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[Ustream Search Failed] Status: ${response.status}, URL: ${url}, Body:`, errText);
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (requestId !== searchRequestId) return;
    const subjects = (payload.data?.results || []).flatMap((group) => group.subjects || []).concat(payload.data?.items || []);
    const unique = [...new Map(subjects.map((item) => [item.subjectId, item])).values()];
    catalog = unique.map(normalizeSearchItem);
    render();
    showToast(`Found ${unique.length} live results for “${trimmed}”`);
  } catch (error) {
    if (requestId !== searchRequestId) return;
    showToast("Live search unavailable · try again");
    console.warn(error);
  }
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadWatchlist() {
  try {
    const savedKey = "ustream-watchlist";
    const legacyKey = "cinewave-watchlist";
    const stored = localStorage.getItem(savedKey) ?? localStorage.getItem(legacyKey) ?? "[]";
    const saved = JSON.parse(stored);
    if (!localStorage.getItem(savedKey) && localStorage.getItem(legacyKey)) localStorage.setItem(savedKey, JSON.stringify(saved));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function persistWatchlist() {
  localStorage.setItem("ustream-watchlist", JSON.stringify([...state.watchlist]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function focusSearch() {
  $("#search-box").classList.add("mobile-open");
  $("#search-input").focus();
}

function updateProfileStats() {
  const watchCount = $("#profile-watch-count");
  const listCount = $("#profile-list-count");
  if (watchCount) watchCount.textContent = String(continuation.length);
  if (listCount) listCount.textContent = String(state.watchlist.size);
}

function setSection(section, updateHash = true) {
  const validSections = ["home", "movies", "series", "anime", "my-list", "profile"];
  const target = validSections.includes(section) ? section : "home";
  state.section = target;

  if (updateHash) {
    const newHash = target === "home" ? "#/home" : `#/${target}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }

  // Update active button state on both desktop and mobile navigation
  $$("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === target);
  });

  state.filters = makeFilterDefaults(getFilterChannel());
  state.genre = target === "anime" ? "anime" : "all";

  const heroSection = $(".hero");
  const quickPicks = $(".quick-picks");
  const recommendationsSection = $("#recommendations-section");
  const catalogSection = $("#catalog");
  const profileSection = $("#profile-section");

  const titles = {
    home: ["Explore the collection", "Trending now"],
    movies: ["Feature-length stories", "Top movies"],
    series: ["Your next obsession", "Binge-worthy series"],
    anime: ["Anime Collection", "Anime picks"],
    "my-list": ["Saved for later", "My list"],
    profile: ["Account & Preferences", "Your Profile"],
  };
  const [kicker, title] = titles[target] || titles.home;
  const catalogKicker = $("#catalog-kicker");
  const catalogTitle = $("#catalog-title");
  if (catalogKicker) catalogKicker.textContent = kicker;
  if (catalogTitle) catalogTitle.textContent = title;

  const filterChannelKicker = $("#filter-channel-kicker");
  if (filterChannelKicker) {
    filterChannelKicker.textContent = target === "series" ? "Series Collection" : "Anime Collection";
  }

  $$(".genre-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.genre === state.genre));

  if (target === "profile") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (profileSection) {
      profileSection.hidden = false;
      updateProfileStats();
    }
  } else if (target === "my-list") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
  } else if (target === "movies" || target === "series" || target === "anime") {
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
  } else {
    // "home"
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = false;
    if (recommendationsSection) recommendationsSection.hidden = recommendations.length === 0;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
  }

  // Smooth section transition effect
  const mainEl = $("main#top");
  if (mainEl) {
    mainEl.classList.remove("section-fade");
    void mainEl.offsetWidth; // Force CSS reflow to replay transition
    mainEl.classList.add("section-fade");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function getVisibleCards() {
  const query = state.search.trim().toLowerCase();
  const sectionType = { movies: "movie", series: "series", anime: "anime" }[state.section];
  const apiGenre = state.filters.genre || "All";
  const apiLanguage = state.filters.classify || "All";
  let visible = catalog.filter((card) => {
    const matchesSection = !sectionType || card.type === sectionType;
    const matchesList = state.section !== "my-list" || state.watchlist.has(card.title);
    const matchesGenre = state.genre === "all" || card.genre.includes(state.genre);
    const matchesApiGenre = apiGenre === "All" || card.genre.some((value) => value.toLowerCase() === apiGenre.toLowerCase());
    const matchesLanguage = apiLanguage === "All" || card.language === apiLanguage;
    const matchesQuery = !query || `${card.title} ${card.country} ${card.genre.join(" ")}`.toLowerCase().includes(query);
    const matchesCountry = state.filters.country === "All" || card.country === state.filters.country;
    const matchesYear = state.filters.year === "All" || matchesYearFilter(card.year, state.filters.year);
    const matchesRating = card.rating >= state.filters.rateMin && card.rating <= state.filters.rateMax;
    return matchesSection && matchesList && matchesGenre && matchesApiGenre && matchesLanguage && matchesQuery && matchesCountry && matchesYear && matchesRating;
  });

  if (state.filters.sort === "Hottest") visible.sort((a, b) => b.rating - a.rating);
  if (state.filters.sort === "Latest") visible.sort((a, b) => b.year - a.year);
  return visible;
}

function matchesYearFilter(year, filter) {
  if (/^\d{4}$/.test(filter)) return year === Number(filter);
  if (/^\d{4}s$/.test(filter)) return Math.floor(year / 10) * 10 === Number(filter.slice(0, 4));
  return true;
}

function renderContinue() {
  const section = $(".quick-picks");
  const row = $("#continue-row");
  if (!section || !row) return;

  if (continuation.length === 0) {
    row.innerHTML = `
      <div class="continue-empty-state">
        <span class="empty-icon" aria-hidden="true">${renderIcon("play", "icon-sm")}</span>
        <div>
          <strong>Start watching to build your queue</strong>
          <p>Stream any movie, series, or anime to keep track of your progress and pick up right where you left off.</p>
        </div>
      </div>
    `;
    section.hidden = false;
    return;
  }

  section.hidden = false;
  row.innerHTML = continuation.map((item) => `
    <button class="continue-card" style="--card-gradient:${item.gradient}" data-action="details" data-title="${item.title}">
      <span class="card-label">Continue watching</span><strong>${item.title}</strong>
      <span class="watch-progress"><span style="width:${item.progress}%"></span></span>
    </button>
  `).join("");
}

function renderRecommendations() {
  const section = $("#recommendations-section");
  const row = $("#recommendation-row");
  if (!section || !row) return;
  section.hidden = recommendations.length === 0;
  row.innerHTML = recommendations.map(renderCard).join("");
  const update = $("#recommendation-update");
  if (update) update.textContent = recommendations.length ? `Updated today · ${recommendations.length} picks` : "";
}

function renderCard(card) {
  const saved = state.watchlist.has(card.title);
  return `
    <article class="media-card" data-title="${card.title}">
      <div class="poster" style="--poster-gradient:${card.gradient}">
        ${card.image ? `<img class="poster-image" src="${card.image}" alt="${card.title} poster" loading="lazy" />` : ""}
        <span class="poster-kicker">${card.kicker}</span>
        ${card.badge ? `<span class="card-badge">${card.badge}</span>` : ""}
        <span class="poster-title">${card.title}</span>
        <button class="list-toggle ${saved ? "saved" : ""}" data-action="toggle-list" data-title="${card.title}" aria-label="${saved ? "Remove" : "Add"} ${card.title} ${saved ? "from" : "to"} my list">${saved ? renderIcon("heartFilled", "icon-sm") : renderIcon("plus", "icon-sm")}</button>
        <button class="card-hover" data-action="play" data-title="${card.title}" aria-label="Play ${card.title}"><span class="play-circle">${renderIcon("play", "icon-md")}</span></button>
      </div>
      <div class="card-info"><h3>${card.title}</h3><div class="card-meta"><span>${card.year}</span><span>${card.runtime}</span><span class="score">★ ${card.rating.toFixed(1)}</span></div></div>
    </article>
  `;
}

function render() {
  renderContinue();
  renderRecommendations();
  const visible = getVisibleCards();
  const grid = $("#card-grid");
  if (grid) {
    grid.classList.toggle("compact", state.view === "compact");
    grid.innerHTML = visible.map(renderCard).join("");
  }
  const emptyState = $("#empty-state");
  if (emptyState) {
    emptyState.hidden = visible.length > 0;
    const emptyTitle = emptyState.querySelector("h3");
    const emptyDesc = emptyState.querySelector("p");
    const clearBtn = $("#clear-filters");
    if (state.section === "my-list") {
      if (emptyTitle) emptyTitle.textContent = "Your list is empty";
      if (emptyDesc) emptyDesc.textContent = "Click the ＋ button on any title to save it for later.";
      if (clearBtn) clearBtn.hidden = true;
    } else {
      if (emptyTitle) emptyTitle.textContent = "No titles found";
      if (emptyDesc) emptyDesc.textContent = "Try another search or clear your filters.";
      if (clearBtn) clearBtn.hidden = false;
    }
  }
  const resultCount = $("#result-count");
  if (resultCount) resultCount.textContent = visible.length;
  renderActiveFilters();
}

function renderActiveFilters() {
  const chips = [];
  const defaults = makeFilterDefaults(getFilterChannel());
  if (state.search) chips.push({ key: "search", label: `Search: ${state.search}` });
  getFilterChannel().items.forEach((item) => {
    if (item.filterType === "rate") {
      if (state.filters.rateMin !== defaults.rateMin || state.filters.rateMax !== defaults.rateMax) chips.push({ key: "rate", label: `Rating: ${state.filters.rateMin}–${state.filters.rateMax}` });
      return;
    }
    const value = state.filters[item.filterType];
    if (value && value !== defaults[item.filterType]) chips.push({ key: item.filterType, label: `${item.title}: ${value}` });
  });
  $("#active-filters").innerHTML = chips.map(({ label, key }) => `<span class="filter-chip">${label}<button data-clear-filter="${key}" aria-label="Remove ${label}">${renderIcon("close", "icon-sm")}</button></span>`).join("");
  $("#filter-count").textContent = chips.length;
  $("#filter-count").hidden = chips.length === 0;
  renderFilterGroups();
}

function renderFilterGroups() {
  const groups = getFilterChannel().items.map((item) => {
    if (item.filterType === "rate") return `
      <div class="filter-group"><label>${item.title}</label><div class="range-row"><input type="range" min="${item.rangeVals.minVal}" max="${item.rangeVals.maxVal}" step="0.5" value="${state.filters.rateMin}" data-filter="rateMin" /><input type="range" min="${item.rangeVals.minVal}" max="${item.rangeVals.maxVal}" step="0.5" value="${state.filters.rateMax}" data-filter="rateMax" /></div><div class="range-readout"><span>Min <b id="rate-min-readout">${state.filters.rateMin}</b></span><span>Max <b id="rate-max-readout">${state.filters.rateMax}</b></span></div></div>
    `;
    const options = item.filterValsV2.map((option) => `<option value="${option.id}" ${state.filters[item.filterType] === option.id ? "selected" : ""}>${option.name}</option>`).join("");
    return `<div class="filter-group"><label for="filter-${item.filterType}">${item.title}</label><select class="filter-select" id="filter-${item.filterType}" data-filter="${item.filterType}">${options}</select></div>`;
  }).join("");
  $("#filter-groups").innerHTML = groups;
}

function resetFilters() {
  state.filters = makeFilterDefaults(getFilterChannel());
  state.search = "";
  $("#search-input").value = "";
  render();
}

function openDetails(title) {
  const item = findTitle(title);
  if (!item) return;
  state.activeModal = item;
  $("#modal-art").style.setProperty("--poster-gradient", item.gradient);
  $("#modal-art").style.setProperty("--poster-image", item.image ? `url("${item.image}")` : "none");
  $("#modal-title").textContent = item.title;
  $("#modal-meta").innerHTML = `<span>${item.year}</span><span class="rating">★ ${item.rating.toFixed(1)}</span><span>${item.runtime}</span>${item.type === "anime" ? "<span>Anime</span>" : ""}`;
  $("#modal-description").textContent = item.description || `${item.title} is ready to stream in the Ustream collection. Add it to your list and come back whenever you want a great story.`;
  $("#modal-list").innerHTML = state.watchlist.has(item.title) ? `${renderIcon("heartFilled", "icon-sm")} <span>In my list</span>` : `${renderIcon("plus", "icon-sm")} <span>Add to list</span>`;
  $("#modal-backdrop").hidden = false;
}

const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

function findTitle(title) {
  return [featured, ...catalog, ...recommendations].find((item) => item?.title === title) || null;
}

function collectPlaybackUrls(value, urls = [], key = "") {
  if (!value) return urls;
  if (typeof value === "string") {
    if (isHttpUrl(value)) urls.push({ url: value, key });
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPlaybackUrls(entry, urls, key));
    return urls;
  }
  if (typeof value !== "object") return urls;
  Object.entries(value).forEach(([childKey, childValue]) => collectPlaybackUrls(childValue, urls, childKey));
  return urls;
}

function extractPlaybackUrl(payload) {
  const candidates = collectPlaybackUrls(payload);
  const playable = candidates.filter(({ url }) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "bcdn.hakunaymatata.com" && /\.(mp4|m3u8)(?:$|\?)/i.test(parsed.pathname);
    } catch {
      return false;
    }
  });
  const preferred = [...playable].sort((a, b) => {
    const score = (entry) => (entry.key === "downloadUrl" ? 3 : entry.key === "resourceLink" ? 2 : 1);
    return score(b) - score(a);
  });
  const mediaLike = candidates.find(({ url, key }) => /\.(mp4|m3u8)(?:$|\?)/i.test(url) && /downloadUrl|resourceLink|playUrl|url/i.test(key));
  return (preferred[0] || mediaLike)?.url || "";
}

function toPlayableUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "bcdn.hakunaymatata.com" || parsed.hostname.endsWith(".hakunaymatata.com")) {
      const mediaBase = window.location.hostname.includes("netlify.app") ? "/.netlify/functions/media" : "/api/media";
      return `${mediaBase}?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }
  return url;
}

const PLAYER_RESOLUTIONS = [1080, 720, 480, 360];
const EPISODE_PAGE_SIZE = 10;

const PLAYER_STATE = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  READY: "READY",
  PLAYING: "PLAYING",
  ERROR: "ERROR",
};

let currentPlayerState = PLAYER_STATE.IDLE;

function setPlayerState(nextState, customMessage = "") {
  currentPlayerState = nextState;

  const liveLabel = $("#player-live-label");
  const liveText = $("#player-live-text");
  const statusEl = $("#player-status");
  const loadingEl = $("#player-loading");
  const loadingText = $("#player-loading-text");
  const errorEl = $("#player-error-indicator");
  const errorText = $("#player-error-text");
  const startBtn = $("#start-player");
  const retryBtn = $("#player-retry-button");
  const region = $("#player-status-region");

  if (region) region.setAttribute("aria-busy", String(nextState === PLAYER_STATE.LOADING));

  // Hide all mutually exclusive elements first so they NEVER overlap
  if (statusEl) statusEl.hidden = true;
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = true;
  if (retryBtn) retryBtn.hidden = true;
  if (startBtn) startBtn.hidden = false;

  switch (nextState) {
    case PLAYER_STATE.IDLE:
      if (liveLabel) liveLabel.hidden = true;
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = customMessage || "Choose a title to start watching";
      }
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = `${renderIcon("play", "icon-sm")} <span>Start playback</span>`;
      }
      break;

    case PLAYER_STATE.LOADING:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Connecting…";
      }
      if (loadingEl) {
        loadingEl.hidden = false;
        if (loadingText) loadingText.textContent = customMessage || "Loading stream…";
      }
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = "<span class='player-loading-indicator' aria-hidden='true'></span> <span>Loading stream…</span>";
      }
      break;

    case PLAYER_STATE.READY:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Ready to watch";
      }
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = customMessage || "Ready to watch";
      }
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = `${renderIcon("play", "icon-sm")} <span>Start playback</span>`;
      }
      break;

    case PLAYER_STATE.PLAYING:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Streaming live";
      }
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = customMessage || (state.player?.item ? `Playing: ${state.player.item.title}` : "Playing stream");
      }
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = `${renderIcon("pause", "icon-sm")} <span>Pause</span>`;
      }
      break;

    case PLAYER_STATE.ERROR:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Playback failed";
      }
      if (errorEl) {
        errorEl.hidden = false;
        if (errorText) errorText.textContent = customMessage || "Playback failed";
      }
      if (startBtn) startBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = false;
      break;
  }
}

function setPlayerLoading(message, isLoading = true) {
  if (isLoading) {
    setPlayerState(PLAYER_STATE.LOADING, message);
  } else {
    setPlayerState(PLAYER_STATE.READY, message);
  }
}

function ensurePlayerFlowUI() {
  return $(".player-modal");
}

function getRelatedTitle(currentItem) {
  if (!currentItem) return null;
  const currentGenre = Array.isArray(currentItem.genre) ? currentItem.genre[0] : "";
  const currentType = currentItem.type;
  const pool = [...catalog, ...recommendations, ...DEMO_ITEMS];
  const match = pool.find((cand) => cand.title !== currentItem.title && ((currentGenre && cand.genre?.includes(currentGenre)) || cand.type === currentType))
    || pool.find((cand) => cand.title !== currentItem.title);
  return match || null;
}

function isEpisodicPlayer(player = state.player) {
  return Boolean(player?.isSeries && player.seasons?.some((season) => season.episodes?.length));
}

function getOrderedEpisodes(player = state.player) {
  return (player.seasons || [])
    .slice()
    .sort((a, b) => a.season - b.season)
    .flatMap((season) => (season.episodes || []).slice().sort((a, b) => a.episode - b.episode));
}

function getAdjacentEpisode(direction, player = state.player) {
  if (!isEpisodicPlayer(player)) return null;
  const episodes = getOrderedEpisodes(player);
  const currentIndex = episodes.findIndex((episode) => episode.season === player.selectedSeason && episode.episode === player.selectedEpisode);
  const nextIndex = currentIndex < 0 ? (direction > 0 ? 0 : -1) : currentIndex + direction;
  return nextIndex >= 0 && nextIndex < episodes.length ? episodes[nextIndex] : null;
}

function getPreviousEpisode(player = state.player) {
  return getAdjacentEpisode(-1, player);
}

function getNextEpisode(player = state.player) {
  return getAdjacentEpisode(1, player);
}

function updatePlayerEpisodeFlow() {
  const player = state.player;
  const episodic = isEpisodicPlayer(player);
  if (!episodic) player.autoplayNext = false;
  const previous = getPreviousEpisode(player);
  const next = getNextEpisode(player);
  const previousButton = $("#player-prev");
  const nextButton = $("#player-next");
  const upNextButton = $("#player-up-next-button");
  const autoplay = $("#player-autoplay");
  const upNext = $("#player-up-next");
  const upNextArt = $("#player-up-next-art");
  const upNextLabel = $("#player-up-next-label");
  const upNextTitle = $("#player-up-next-title");
  const upNextDescription = $("#player-up-next-description");

  if (previousButton) previousButton.disabled = !episodic || !previous;
  if (nextButton) nextButton.disabled = !episodic || !next;

  if (autoplay) {
    autoplay.disabled = !episodic;
    autoplay.setAttribute("aria-pressed", String(episodic && player.autoplayNext));
    autoplay.classList.toggle("active", episodic && player.autoplayNext);
  }

  // Ensure Up Next container is always visible
  if (upNext) upNext.hidden = false;

  if (episodic && next) {
    // Current title is episodic and has a next episode
    if (upNextLabel) upNextLabel.textContent = "Next episode";
    if (upNextTitle) upNextTitle.textContent = `S${next.season} E${next.episode} · ${next.title || `Episode ${next.episode}`}`;
    if (upNextDescription) {
      upNextDescription.textContent = player.autoplayNext
        ? "Autoplay will begin when this episode ends."
        : "The next episode is ready to play.";
    }
    if (upNextButton) {
      upNextButton.disabled = false;
      upNextButton.innerHTML = `<span>Play next</span>${renderIcon("arrowRight", "icon-sm")}`;
      upNextButton.dataset.action = "play-next";
    }
    if (upNextArt) {
      upNextArt.innerHTML = player.item?.image
        ? `<img src="${player.item.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
        : `<span class="player-art-icon">${renderIcon("play", "icon-md")}</span>`;
    }
  } else if (episodic && !next) {
    // Current title is episodic and reached the end of available episodes
    const related = getRelatedTitle(player.item);
    if (upNextLabel) upNextLabel.textContent = "Season complete · Up next";
    if (upNextTitle) upNextTitle.textContent = related ? `Up next: ${related.title}` : "All caught up";
    if (upNextDescription) {
      upNextDescription.textContent = related
        ? `You finished the season! The next episode will appear here when available. Continue with ${related.title}.`
        : "You finished the season! The next episode will appear here when available.";
    }
    if (upNextButton) {
      if (related) {
        upNextButton.disabled = false;
        upNextButton.innerHTML = `<span>Play title</span>${renderIcon("arrowRight", "icon-sm")}`;
        upNextButton.dataset.action = "play-related";
        upNextButton.dataset.title = related.title;
      } else {
        upNextButton.disabled = true;
        upNextButton.innerHTML = "<span>All caught up</span>";
      }
    }
    if (upNextArt) {
      upNextArt.innerHTML = related?.image
        ? `<img src="${related.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
        : `<span class="player-art-icon">${renderIcon("anime", "icon-md")}</span>`;
    }
  } else {
    // Movie or single title: populate with related content from the catalog
    const related = getRelatedTitle(player.item);
    if (related) {
      if (upNextLabel) upNextLabel.textContent = "Recommended next";
      if (upNextTitle) upNextTitle.textContent = related.title;
      if (upNextDescription) {
        upNextDescription.textContent = `${related.year || ""} · ${related.genre?.slice(0, 2).join(", ") || "Featured"} · ★ ${related.rating ? related.rating.toFixed(1) : "8.5"}`;
      }
      if (upNextButton) {
        upNextButton.disabled = false;
        upNextButton.innerHTML = `<span>Play title</span>${renderIcon("arrowRight", "icon-sm")}`;
        upNextButton.dataset.action = "play-related";
        upNextButton.dataset.title = related.title;
      }
      if (upNextArt) {
        upNextArt.innerHTML = related.image
          ? `<img src="${related.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
          : `<span class="player-art-icon">${renderIcon("play", "icon-md")}</span>`;
      }
    } else {
      const hasHistory = continuation.length > 0;
      if (upNextLabel) upNextLabel.textContent = "Your queue";
      if (upNextTitle) upNextTitle.textContent = hasHistory ? "Continue watching" : "Start watching to build your queue";
      if (upNextDescription) {
        upNextDescription.textContent = hasHistory
          ? "The next episode will appear here when available."
          : "Start watching titles to build your queue.";
      }
      if (upNextButton) {
        upNextButton.disabled = true;
        upNextButton.textContent = "Browse catalog";
      }
    }
  }
}

function togglePlayerSettings(force) {
  const panel = $("#player-settings");
  const toggle = $("#player-settings-toggle");
  if (!panel || !toggle) return;
  const open = typeof force === "boolean" ? force : !panel.open;
  panel.open = open;
  toggle.setAttribute("aria-expanded", String(open));
}

async function fetchJson(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);
  return response.json();
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function languageLabel(entry) {
  return String(entry?.lanName || entry?.languageName || entry?.language || entry?.lang || entry?.audioName || entry?.dubName || entry?.name || entry?.title || entry?.label || entry?.corner || "Dub").trim() || "Dub";
}

function collectLanguageEntries(payload) {
  const results = [];
  const visited = new Set();
  const interestingKeys = /dub|language|audio|version|resourceDetector/i;

  const visit = (value, key = "") => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, key));
      return;
    }
    const subjectId = value.subjectId || value.subject_id;
    if (subjectId && (interestingKeys.test(key) || value.lanName || value.languageName || value.language || value.dub)) results.push(value);
    Object.entries(value).forEach(([childKey, childValue]) => {
      if (interestingKeys.test(childKey) || typeof childValue === "object") visit(childValue, childKey);
    });
  };

  visit(payload);
  return results;
}

function getLanguageOptions(payload, item) {
  const originalSubjectId = String(item.subjectId || "");
  const options = [{ subjectId: originalSubjectId, label: "Original audio", isOriginal: true, type: 0 }];
  const seen = new Set([originalSubjectId]);
  collectLanguageEntries(payload).forEach((entry) => {
    const subjectId = String(entry.subjectId || entry.subject_id || "");
    const label = languageLabel(entry);
    const type = Number(entry.type);
    if (!subjectId || seen.has(subjectId) || type === 1 || /\bsub(?:title)?\b/i.test(label)) return;
    seen.add(subjectId);
    options.push({ subjectId, label, isOriginal: false, type: 0 });
  });
  return options;
}

function getSubtitleOptions(payload) {
  const options = [{ value: "off", label: "Off", kind: "off" }];
  const seen = new Set(["off"]);
  collectLanguageEntries(payload).forEach((entry) => {
    const subjectId = String(entry.subjectId || entry.subject_id || "");
    const label = languageLabel(entry);
    if (Number(entry.type) !== 1 || !subjectId || seen.has(subjectId)) return;
    seen.add(subjectId);
    options.push({ value: subjectId, label, kind: "variant", subjectId });
  });

  const subtitles = String(payload?.data?.subtitles || payload?.subtitles || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  subtitles.forEach((label) => {
    const normalized = label.toLowerCase();
    if (!/english|hindi|हिन्दी|हिंदी/.test(normalized)) return;
    const value = `label:${label}`;
    if (!seen.has(value)) {
      seen.add(value);
      options.push({ value, label: `${label} subtitles (not supplied)`, kind: "label", labelOnly: true, disabled: true });
    }
  });
  return options;
}

function getQualityOptions(payload) {
  const options = [];
  const seen = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    const resolution = firstNumber(value.resolution, value.definition, value.height);
    const resourceLink = value.resourceLink || value.downloadUrl;
    if (resolution && isHttpUrl(resourceLink) && /\.(mp4|m3u8)(?:$|\?)/i.test(resourceLink)) {
      const key = String(resolution);
      if (!seen.has(key)) {
        seen.add(key);
        options.push({ value: resolution, label: `${resolution}p`, resolution, url: resourceLink });
      }
    }
    Object.values(value).forEach(visit);
  };
  visit(payload?.data || payload);
  return options.sort((a, b) => a.resolution - b.resolution);
}

function getPlayerQualityOptions(payload, isSeries = false) {
  const options = getQualityOptions(payload);
  if (options.length || !isSeries) return options;
  return PLAYER_RESOLUTIONS.slice().sort((a, b) => a - b).map((resolution) => ({
    value: resolution,
    label: `${resolution}p`,
    resolution,
  }));
}

function getResourceLink(entry) {
  return extractPlaybackUrl(entry) || [entry?.resourceLink, entry?.resource_link, entry?.playUrl?.url, entry?.playUrl?.playUrl].find(isHttpUrl) || "";
}

function normalizeEpisode(entry, fallbackSeason = 1, fallbackEpisode = null) {
  if (!entry || typeof entry !== "object") return null;
  const nested = entry.data && typeof entry.data === "object" ? entry.data : {};
  const episodeNumber = firstNumber(entry.ep, entry.episode, entry.episodeNumber, entry.episodeNum, nested.ep, nested.episode, fallbackEpisode);
  if (!episodeNumber) return null;
  return {
    episode: episodeNumber,
    title: entry.title || entry.name || nested.title || nested.name || `Episode ${episodeNumber}`,
    resourceLink: getResourceLink(entry),
    season: firstNumber(entry.season, entry.se, entry.seasonNumber, fallbackSeason) || fallbackSeason,
    raw: entry,
  };
}

function normalizeEpisodeSeasons(payload) {
  const root = payload?.data || payload || {};
  const seasons = new Map();
  const add = (episode) => {
    if (!episode) return;
    if (!seasons.has(episode.season)) seasons.set(episode.season, new Map());
    const episodes = seasons.get(episode.season);
    const current = episodes.get(episode.episode);
    if (!current || (!current.resourceLink && episode.resourceLink)) episodes.set(episode.episode, episode);
  };

  const addArray = (entries, seasonNumber = 1) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const nested = entry.episodes || entry.episodeList || entry.items || entry.list || entry.resources || entry.data?.list || entry.data?.episodes;
      if (Array.isArray(nested)) {
        const nestedSeason = firstNumber(entry.season, entry.se, entry.seasonNumber, entry.number) || seasonNumber;
        addArray(nested, nestedSeason);
        return;
      }
      add(normalizeEpisode(entry, firstNumber(entry.season, entry.se, entry.seasonNumber, seasonNumber) || seasonNumber, index + 1));
    });
  };

  const seasonArrays = [root.seasons, root.seasonList, root.season_list, root.episodesBySeason].filter(Array.isArray);
  seasonArrays.forEach((entries) => addArray(entries));
  [root.items, root.list, root.episodes, root.episodeList, root.episode_list, root.resources].filter(Array.isArray).forEach((entries) => addArray(entries));

  const collectNestedArrays = (value, seasonNumber = 1, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 5) return;
    if (Array.isArray(value)) {
      addArray(value, seasonNumber);
      return;
    }
    const nextSeason = firstNumber(value.season, value.se, value.seasonNumber, seasonNumber) || seasonNumber;
    Object.entries(value).forEach(([key, child]) => {
      if (Array.isArray(child) || (child && typeof child === "object" && /data|season|episode|list|resource/i.test(key))) collectNestedArrays(child, nextSeason, depth + 1);
    });
  };
  collectNestedArrays(root);

  const output = [...seasons.entries()].map(([season, episodes]) => ({
    season,
    episodes: [...episodes.values()].sort((a, b) => a.episode - b.episode),
  })).filter((entry) => entry.episodes.length).sort((a, b) => a.season - b.season);
  return output;
}

function ensurePlayerSelectionUI() {
  return $("#player-options");
}

function setSelectOptions(select, options, selectedValue, emptyLabel) {
  if (!select) return;
  select.replaceChildren();
  if (!options.length) {
    const option = document.createElement("option");
    option.textContent = emptyLabel;
    option.value = "";
    select.append(option);
    select.disabled = true;
    return;
  }
  options.forEach((entry) => {
      const option = document.createElement("option");
      option.value = String(entry.value);
      option.textContent = entry.label;
      option.disabled = Boolean(entry.disabled);
      option.selected = String(entry.value) === String(selectedValue);
    select.append(option);
  });
  select.disabled = false;
}

function updatePlayerSelectionUI(message = "") {
  const panel = ensurePlayerSelectionUI();
  if (!panel) return;
  const player = state.player;
  const isEpisodic = Boolean(player.isSeries && player.seasons && player.seasons.length > 0);
  const hasControls = player.languageOptions.length > 1 || player.subtitleOptions.length > 1 || player.qualityOptions.length > 1 || isEpisodic;
  panel.hidden = !hasControls;
  const languageSelect = $("#player-language-select");
  const subtitleSelect = $("#player-subtitle-select");
  const qualitySelect = $("#player-quality-select");
  const seasonSelect = $("#player-season-select");
  const episodeSelect = $("#player-episode-select");
  const seasonField = $("#player-season-field");
  const episodeField = $("#player-episode-field");
  const optionsHint = $("#player-options-hint");

  setSelectOptions(languageSelect, player.languageOptions.map((entry) => ({ value: entry.subjectId, label: entry.label })), player.selectedLanguage?.subjectId, "No alternate languages");
  setSelectOptions(subtitleSelect, player.subtitleOptions.map((entry) => ({ value: entry.value, label: entry.label })), player.selectedSubtitle, "No subtitles available");
  setSelectOptions(qualitySelect, player.qualityOptions.map((entry) => ({ value: entry.value, label: entry.label })), player.selectedQuality, "Auto");

  if (!isEpisodic) {
    if (seasonField) seasonField.hidden = true;
    if (episodeField) episodeField.hidden = true;
  } else {
    const seasons = player.seasons.map((entry) => ({ value: entry.season, label: `Season ${entry.season}` }));
    setSelectOptions(seasonSelect, seasons, player.selectedSeason, "Select season");
    const selectedSeason = player.seasons.find((entry) => entry.season === player.selectedSeason) || player.seasons[0];
    const episodes = selectedSeason?.episodes || [];
    setSelectOptions(
      episodeSelect,
      episodes.map((entry) => ({
        value: entry.episode,
        label: `Episode ${entry.episode}${entry.title && entry.title !== `Episode ${entry.episode}` ? ` · ${entry.title}` : ""}`,
      })),
      player.selectedEpisode,
      "Select episode"
    );
    if (seasonField) seasonField.hidden = seasons.length <= 1;
    if (episodeField) episodeField.hidden = episodes.length === 0;
  }

  if (optionsHint) optionsHint.textContent = isEpisodic ? "Choose audio, subtitles, quality, season, or episode." : "Choose audio, subtitles, or quality before playback.";
  updatePlayerEpisodeFlow();
}

async function fetchEpisodeList(subjectId, preferredResolution = null) {
  const mergeSeasons = (target, incoming) => {
    const seasons = new Map(target.map((season) => [season.season, new Map(season.episodes.map((episode) => [episode.episode, episode]))]));
    incoming.forEach((season) => {
      if (!seasons.has(season.season)) seasons.set(season.season, new Map());
      const episodes = seasons.get(season.season);
      season.episodes.forEach((episode) => {
        const current = episodes.get(episode.episode);
        if (!current || (!current.resourceLink && episode.resourceLink)) episodes.set(episode.episode, episode);
      });
    });
    return [...seasons.entries()]
      .map(([season, episodes]) => ({ season, episodes: [...episodes.values()].sort((a, b) => a.episode - b.episode) }))
      .sort((a, b) => a.season - b.season);
  };

  const resolutions = preferredResolution ? [preferredResolution, ...PLAYER_RESOLUTIONS.filter((value) => value !== preferredResolution)] : PLAYER_RESOLUTIONS;
  for (const resolution of resolutions) {
    try {
      const fetchPage = (startPosition, endPosition) =>
        fetchJson(buildApiUrl("episodes", { id: subjectId, resolution, startPosition, endPosition }));
      const firstPayload = await fetchPage(1, EPISODE_PAGE_SIZE);
      let seasons = normalizeEpisodeSeasons(firstPayload);
      const totalEpisodes = firstNumber(firstPayload?.data?.totalEpisode, firstPayload?.data?.pager?.totalCount, ...seasons.flatMap((season) => season.episodes.map((episode) => episode.episode))) || 0;
      for (let start = EPISODE_PAGE_SIZE + 1; start <= totalEpisodes; start += EPISODE_PAGE_SIZE) {
        const payload = await fetchPage(start, Math.min(start + EPISODE_PAGE_SIZE - 1, totalEpisodes));
        seasons = mergeSeasons(seasons, normalizeEpisodeSeasons(payload));
      }
      if (seasons.length) return { seasons, resolution };
    } catch {
      // Try the next supported resolution without exposing upstream details to the UI.
    }
  }
  return { seasons: [], resolution: null };
}

function chooseEpisode(seasons, preferredSeason, preferredEpisode) {
  const season = seasons.find((entry) => entry.season === preferredSeason) || seasons[0];
  const episode = season?.episodes.find((entry) => entry.episode === preferredEpisode) || season?.episodes[0];
  return { season: season?.season || null, episode: episode?.episode || null };
}

async function loadEpisodeState(subjectId, preferredSeason = state.player.selectedSeason, preferredEpisode = state.player.selectedEpisode, requestId = state.player.requestId, preferredResolution = state.player.selectedQuality) {
  const result = await fetchEpisodeList(subjectId, preferredResolution);
  if (requestId !== state.player.requestId) return false;
  state.player.seasons = result.seasons;
  state.player.resolution = result.resolution;
  state.player.selectedQuality = result.resolution || state.player.selectedQuality;
  const selected = chooseEpisode(result.seasons, preferredSeason, preferredEpisode);
  state.player.selectedSeason = selected.season;
  state.player.selectedEpisode = selected.episode;
  updatePlayerSelectionUI(result.seasons.length ? `Loaded ${result.seasons.reduce((count, season) => count + season.episodes.length, 0)} episode${result.seasons.reduce((count, season) => count + season.episodes.length, 0) === 1 ? "" : "s"} · ${result.resolution}p` : "Episode list unavailable");
  return true;
}

async function loadPreviewDetails(subjectId) {
  try {
    return await fetchJson(buildApiUrl("details", { id: subjectId }));
  } catch {
    return null;
  }
}

function getSelectedEpisode() {
  const season = state.player.seasons.find((entry) => entry.season === state.player.selectedSeason);
  return season?.episodes.find((entry) => entry.episode === state.player.selectedEpisode) || null;
}

async function resolveCurrentPlayback(requestId) {
  const player = state.player;
  const item = player.item;
  if (!item) return null;
  if (requestId !== player.requestId) return null;

  if (player.isSeries) {
    let episode = getSelectedEpisode();
    if (!episode && player.selectedEpisode && player.selectedLanguage?.subjectId) {
      try {
        const payload = await fetchJson(`/api/episodes/${encodeURIComponent(player.selectedLanguage.subjectId)}?resolution=${player.resolution || 480}&startPosition=${player.selectedEpisode}&endPosition=${player.selectedEpisode}`);
        if (requestId !== player.requestId) return null;
        const seasons = normalizeEpisodeSeasons(payload);
        episode = seasons.flatMap((season) => season.episodes).find((entry) => entry.episode === player.selectedEpisode) || null;
      } catch {
        episode = null;
      }
    }
    if (episode?.resourceLink) return { url: toPlayableUrl(episode.resourceLink), label: `Episode ${episode.episode} · ${player.resolution || player.selectedQuality || 480}p` };
    return null;
  }

  const subjectId = player.subtitleSubjectId || player.selectedLanguage?.subjectId || item.subjectId;
  if (subjectId) {
    const details = subjectId === player.selectedLanguage?.subjectId && player.details ? player.details : await loadPreviewDetails(subjectId);
    if (requestId !== player.requestId) return null;
    const selectedQuality = player.selectedQuality ? Number(player.selectedQuality) : null;
    const quality = getQualityOptions(details).find((entry) => entry.resolution === selectedQuality);
    const url = quality?.url || extractPlaybackUrl(details);
    if (url) return { url: toPlayableUrl(url), label: "Live stream" };
  }
  if (item.video) return { url: toPlayableUrl(item.video), label: "Featured stream" };
  return null;
}

async function resolvePlayback(item) {
  const requestId = ++state.player.requestId;
  state.player = {
    requestId,
    item,
    subjectId: String(item.subjectId || ""),
    details: null,
    languageOptions: [],
    selectedLanguage: null,
    subtitleOptions: [],
    selectedSubtitle: "off",
    subtitleSubjectId: "",
    qualityOptions: [],
    selectedQuality: null,
    resolution: null,
    seasons: [],
    selectedSeason: null,
    selectedEpisode: null,
    isSeries: item.type === "series" || item.type === "anime",
    autoplayNext: false,
  };
  ensurePlayerSelectionUI();
  updatePlayerSelectionUI("Loading playback options...");

  if (state.player.subjectId) {
    const details = await loadPreviewDetails(state.player.subjectId);
    if (requestId !== state.player.requestId) return null;
    state.player.details = details;
    state.player.languageOptions = getLanguageOptions(details, item);
    state.player.selectedLanguage = state.player.languageOptions[0] || null;
    state.player.subtitleOptions = getSubtitleOptions(details);
    state.player.qualityOptions = getPlayerQualityOptions(details, state.player.isSeries);
    state.player.selectedQuality = state.player.qualityOptions.at(-1)?.resolution || null;
    updatePlayerSelectionUI("Loading playback options...");
    if (state.player.isSeries && state.player.selectedLanguage?.subjectId) {
      await loadEpisodeState(state.player.selectedLanguage.subjectId, null, null, requestId);
      if (requestId !== state.player.requestId) return null;
    }
  }

  const source = await resolveCurrentPlayback(requestId);
  if (source) return source;
  return null;
}

function clearPlayerSource(message) {
  const video = $("#video-player");
  video.pause();
  video.removeAttribute("src");
  video.load();
  $("#start-player").disabled = true;
  setPlayerLoading(message, true);
}

function applyPlayerSource(source) {
  const video = $("#video-player");
  if (!source?.url) {
    clearPlayerSource("No playable resource was returned for this selection.");
    return false;
  }
  video.dataset.sourceLabel = source.label;
  video.dataset.playerRequestId = String(state.player.requestId);
  video.src = source.url;
  $("#start-player").disabled = false;
  $("#start-player").innerHTML = `${renderIcon("play", "icon-sm")} <span>Start playback</span>`;
  setPlayerLoading(`${source.label} · press Start playback`, false);
  video.load();
  updatePlayerEpisodeFlow();
  return true;
}

async function reloadSelectedPlayback(statusMessage = "Resolving playback source...", requestId = state.player.requestId) {
  clearPlayerSource(statusMessage);
  const source = await resolveCurrentPlayback(requestId);
  if (requestId !== state.player.requestId || $("#player-backdrop").hidden) return;
  if (!source) {
    updatePlayerSelectionUI("No playable resource was returned for this selection.");
    return;
  }
  applyPlayerSource(source);
}

async function changePlayerLanguage(subjectId) {
  const player = state.player;
  const language = player.languageOptions.find((entry) => entry.subjectId === subjectId);
  if (!language || language.subjectId === player.selectedLanguage?.subjectId) return;
  const preferredSeason = player.selectedSeason;
  const preferredEpisode = player.selectedEpisode;
  player.requestId += 1;
  player.selectedLanguage = language;
  player.subtitleSubjectId = "";
  player.seasons = [];
  player.selectedSeason = null;
  player.selectedEpisode = null;
  const requestId = player.requestId;
  setPlayerLoading(`Loading ${language.label}...`);
  updatePlayerSelectionUI(`Loading ${language.label}...`);
  const details = await loadPreviewDetails(language.subjectId);
  if (requestId !== player.requestId) return;
  player.details = details;
  player.subtitleOptions = getSubtitleOptions(details);
  player.qualityOptions = getPlayerQualityOptions(details, player.isSeries);
  player.selectedQuality = player.qualityOptions.at(-1)?.resolution || player.selectedQuality;
  if (player.isSeries) {
    const loaded = await loadEpisodeState(language.subjectId, preferredSeason, preferredEpisode, requestId, player.selectedQuality);
    if (!loaded || requestId !== player.requestId) return;
  }
  if (requestId !== player.requestId) return;
  await reloadSelectedPlayback(`Loading ${language.label} playback...`, requestId);
}

async function changePlayerSubtitle(value) {
  const player = state.player;
  const option = player.subtitleOptions.find((entry) => entry.value === value);
  if (!option || option.value === player.selectedSubtitle) return;
  if (option.labelOnly) {
    showToast(`${option.label} subtitles are not available for this stream.`);
    updatePlayerSelectionUI();
    return;
  }
  player.requestId += 1;
  const requestId = player.requestId;
  player.selectedSubtitle = option.value;
  player.subtitleSubjectId = option.kind === "variant" ? option.subjectId : "";
  setPlayerLoading(option.value === "off" ? "Subtitles disabled" : `Loading ${option.label}...`);
  updatePlayerSelectionUI(option.value === "off" ? "Subtitles disabled" : `Loading ${option.label}...`);
  const subtitleSubjectId = player.subtitleSubjectId || player.selectedLanguage?.subjectId || player.subjectId;
  if (player.isSeries) {
    const subtitleDetails = await loadPreviewDetails(subtitleSubjectId);
    if (requestId !== player.requestId) return;
    player.qualityOptions = getPlayerQualityOptions(subtitleDetails, player.isSeries);
    player.selectedQuality = player.qualityOptions.at(-1)?.resolution || player.selectedQuality;
    const loaded = await loadEpisodeState(subtitleSubjectId, player.selectedSeason, player.selectedEpisode, requestId, player.selectedQuality);
    if (!loaded || requestId !== player.requestId) return;
  }
  if (requestId !== player.requestId) return;
  player.details = await loadPreviewDetails(player.subtitleSubjectId || player.selectedLanguage?.subjectId || player.subjectId);
  if (!player.subtitleSubjectId) {
    player.qualityOptions = getPlayerQualityOptions(player.details, player.isSeries);
    player.selectedQuality = player.qualityOptions.at(-1)?.resolution || player.selectedQuality;
  }
  await reloadSelectedPlayback(`Loading ${option.label} playback...`, requestId);
}

async function changePlayerQuality(value) {
  const player = state.player;
  const quality = Number(value);
  if (!Number.isFinite(quality) || quality === Number(player.selectedQuality)) return;
  player.requestId += 1;
  const requestId = player.requestId;
  player.selectedQuality = quality;
  setPlayerLoading(`Loading ${quality}p playback...`);
  updatePlayerSelectionUI(`Loading ${quality}p playback...`);
  if (player.isSeries) {
    const subjectId = player.subtitleSubjectId || player.selectedLanguage?.subjectId || player.subjectId;
    const loaded = await loadEpisodeState(subjectId, player.selectedSeason, player.selectedEpisode, requestId, quality);
    if (!loaded || requestId !== player.requestId) return;
  }
  if (requestId !== player.requestId) return;
  await reloadSelectedPlayback(`Loading ${quality}p playback...`, requestId);
}

async function changePlayerSeason(seasonNumber) {
  const season = state.player.seasons.find((entry) => entry.season === Number(seasonNumber));
  if (!season) return;
  const selection = chooseEpisode([season], season.season, null);
  state.player.selectedSeason = selection.season;
  state.player.selectedEpisode = selection.episode;
  state.player.requestId += 1;
  const requestId = state.player.requestId;
  setPlayerLoading(`Loading Season ${season.season}...`);
  updatePlayerSelectionUI(`Loading Season ${season.season}...`);
  await reloadSelectedPlayback(`Loading Season ${season.season}, Episode ${selection.episode}...`, requestId);
}

async function changePlayerEpisode(episodeNumber) {
  const season = state.player.seasons.find((entry) => entry.season === state.player.selectedSeason);
  const episode = season?.episodes.find((entry) => entry.episode === Number(episodeNumber)) || state.player.seasons.flatMap((entry) => entry.episodes).find((entry) => entry.episode === Number(episodeNumber));
  if (!episode) return;
  state.player.selectedSeason = episode.season;
  state.player.selectedEpisode = episode.episode;
  state.player.requestId += 1;
  const requestId = state.player.requestId;
  setPlayerLoading(`Loading Episode ${episode.episode}...`);
  updatePlayerSelectionUI(`Loading Episode ${episode.episode}...`);
  await reloadSelectedPlayback(`Loading Episode ${episode.episode}...`, requestId);
}

async function navigateToEpisode(episode, { autoplay = false } = {}) {
  if (!episode || !isEpisodicPlayer()) return false;
  const player = state.player;
  player.selectedSeason = episode.season;
  player.selectedEpisode = episode.episode;
  player.requestId += 1;
  const requestId = player.requestId;
  const label = `S${episode.season} E${episode.episode}${episode.title ? ` · ${episode.title}` : ""}`;
  setPlayerLoading(`${autoplay ? "Loading next episode" : "Loading episode"} · ${label}`);
  updatePlayerSelectionUI(`${autoplay ? "Loading next episode" : "Loading episode"} · ${label}`);
  await reloadSelectedPlayback(`Loading ${label}...`, requestId);
  if (requestId !== player.requestId || $("#player-backdrop").hidden) return false;
  if (autoplay) startPlayer();
  return true;
}

function previousEpisode() {
  return navigateToEpisode(getPreviousEpisode());
}

function nextEpisode(options = {}) {
  return navigateToEpisode(getNextEpisode(), options);
}

async function handlePlayerEnded() {
  const player = state.player;
  if (!isEpisodicPlayer(player)) return;
  const next = getNextEpisode(player);
  updatePlayerEpisodeFlow();
  if (!next) {
    setPlayerLoading("Episode complete · no more episodes available", false);
    return;
  }
  if (player.autoplayNext) {
    await nextEpisode({ autoplay: true });
    return;
  }
  const nextLabel = `S${next.season} E${next.episode}${next.title ? ` · ${next.title}` : ""}`;
  setPlayerLoading(`Episode complete · ${nextLabel} is up next`, false);
}

async function playTitle(title) {
  const item = findTitle(title);
  if (!item) return;
  const video = $("#video-player");
  const player = $("#player-backdrop");
  ensurePlayerFlowUI();
  $("#player-title").textContent = item.title;
  player.style.setProperty("--player-backdrop-image", item.image ? `url("${item.image}")` : "none");
  video.poster = item.image || "";
  video.removeAttribute("src");
  video.dataset.itemTitle = item.title;
  setPlayerState(PLAYER_STATE.LOADING, "Loading stream…");
  player.hidden = false;

  const source = await resolvePlayback(item);
  if (!source || player.hidden || state.player.item !== item) {
    if (!player.hidden && state.player.item === item) {
      setPlayerState(PLAYER_STATE.ERROR, "Playback failed · Stream not available");
    }
    return;
  }
  video.dataset.sourceLabel = source.label;
  video.dataset.playerRequestId = String(state.player.requestId);
  video.src = source.url;
  setPlayerState(PLAYER_STATE.READY, "Ready to watch");
  video.load();
  updatePlayerEpisodeFlow();

  const idx = continuation.findIndex((c) => c.title === item.title);
  if (idx >= 0) {
    continuation[idx].progress = Math.min(95, (continuation[idx].progress || 20) + 15);
  } else {
    continuation.unshift({ ...item, progress: 15 });
    if (continuation.length > 6) continuation.pop();
  }
  try {
    localStorage.setItem("ustream-continuation", JSON.stringify(continuation));
  } catch {}
  renderContinue();
}

function startPlayer() {
  const video = $("#video-player");
  if (!video.src) return;
  if (!video.paused) {
    video.pause();
    return;
  }
  const playAttempt = video.play();
  if (playAttempt?.catch) {
    playAttempt.catch(() => {
      setPlayerState(PLAYER_STATE.ERROR, "Playback failed · Click video controls to allow playback");
    });
  }
}

async function retryPlayback() {
  if (!state.player?.item) return;
  setPlayerState(PLAYER_STATE.LOADING, "Loading stream…");
  await playTitle(state.player.item.title);
}

function handlePlaybackError() {
  const video = $("#video-player");
  if ($("#player-backdrop").hidden || video.dataset.playerRequestId !== String(state.player.requestId)) return;
  setPlayerState(PLAYER_STATE.ERROR, "Playback failed");
}

function closePlayer() {
  const video = $("#video-player");
  state.player.requestId += 1;
  togglePlayerSettings(false);
  video.pause();
  video.removeAttribute("src");
  video.load();
  $("#player-backdrop").hidden = true;
  setPlayerState(PLAYER_STATE.IDLE);
}

function closeDetails() {
  $("#modal-backdrop").hidden = true;
  state.activeModal = null;
}

function toggleList(title) {
  if (state.watchlist.has(title)) {
    state.watchlist.delete(title);
    showToast(`${title} removed from My List`);
  } else {
    state.watchlist.add(title);
    showToast(`${title} added to My List`);
  }
  persistWatchlist();
  if (state.activeModal?.title === title) $("#modal-list").innerHTML = state.watchlist.has(title) ? `${renderIcon("heartFilled", "icon-sm")} <span>In my list</span>` : `${renderIcon("plus", "icon-sm")} <span>Add to list</span>`;
  render();
}

function openDrawer() {
  $("#filter-drawer").classList.add("open");
  $("#filter-drawer").setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  $("#filter-drawer").classList.remove("open");
  $("#filter-drawer").setAttribute("aria-hidden", "true");
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.section) return setSection(button.dataset.section, true);
  if (button.dataset.genre) {
    state.genre = button.dataset.genre;
    $$(".genre-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    render();
    return;
  }
  if (button.dataset.action === "details") return openDetails(button.dataset.title);
  if (button.dataset.action === "play") { playTitle(button.dataset.title); return; }
  if (button.dataset.action === "toggle-list") return toggleList(button.dataset.title);
  if (button.id === "search-trigger") { focusSearch(); return; }
  if (button.id === "filter-button") return openDrawer();
  if (button.id === "close-drawer" || button.id === "drawer-scrim") return closeDrawer();
  if (button.id === "reset-filters") { resetFilters(); return; }
  if (button.id === "apply-filters") { render(); closeDrawer(); showToast(`${getVisibleCards().length} titles ready to explore`); return; }
  if (button.id === "clear-filters") { resetFilters(); return; }
  if (button.dataset.clearFilter !== undefined) {
    const target = button.dataset.clearFilter;
    const defaults = makeFilterDefaults(getFilterChannel());
    if (target === "search") { state.search = ""; $("#search-input").value = ""; }
    if (target === "rate") { state.filters.rateMin = defaults.rateMin; state.filters.rateMax = defaults.rateMax; }
    if (target !== "search" && target !== "rate" && target in defaults) state.filters[target] = defaults[target];
    render();
    return;
  }
  if (button.dataset.view) {
    state.view = button.dataset.view;
    $$(".view-button").forEach((viewButton) => viewButton.classList.toggle("active", viewButton === button));
    render();
    return;
  }
  if (button.id === "close-modal") return closeDetails();
  if (button.id === "modal-play") { playTitle(state.activeModal?.title || featured.title); closeDetails(); return; }
  if (button.id === "start-player") return startPlayer();
  if (button.id === "player-retry-button" || button.id === "player-inline-retry") return void retryPlayback();
  if (button.id === "player-settings-toggle") return togglePlayerSettings();
  if (button.id === "player-prev") { void previousEpisode(); return; }
  if (button.id === "player-next") { void nextEpisode({ autoplay: true }); return; }
  if (button.id === "player-up-next-button") {
    if (button.dataset.action === "play-related" && button.dataset.title) {
      return void playTitle(button.dataset.title);
    }
    return void nextEpisode({ autoplay: true });
  }
  if (button.id === "player-autoplay") {
    state.player.autoplayNext = !state.player.autoplayNext && isEpisodicPlayer();
    updatePlayerEpisodeFlow();
    setPlayerLoading(state.player.autoplayNext ? "Autoplay next episode enabled" : "Autoplay next episode disabled", false);
    return;
  }
  if (button.id === "close-player") return closePlayer();
  if (button.id === "modal-list" && state.activeModal) return toggleList(state.activeModal.title);
  if (button.id === "retry-button") return void retryCatalog();
  if (button.id === "load-fallback-button") return loadShowcaseCatalog();
  if (button.id === "profile-button") return setSection("profile", true);
  if (button.id === "status-pill") return openSettings();
  if (button.id === "close-settings") return closeSettings();
  if (button.id === "refresh-catalog-btn") return void refreshCatalog();
  if (button.id === "revert-demo-btn") return void revertToDemo();
  if (button.id === "clear-watchlist-btn") return clearWatchlist();
  if (button.id === "notifications-button") return showToast("You are all caught up");
  if (button.id === "profile-signout-btn") {
    showToast("Signed out. Switched to guest mode.");
    setSection("home", true);
    return;
  }
  if (button.id === "profile-save-btn") {
    showToast("Preferences saved successfully!");
    return;
  }
  if (button.id === "profile-autoplay-toggle") {
    button.classList.toggle("active");
    const active = button.classList.contains("active");
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "ON" : "OFF";
    showToast(`Autoplay ${active ? "enabled" : "disabled"}`);
    return;
  }
});

function openSettings() {
  const modal = $("#settings-backdrop");
  if (!modal) return;
  modal.hidden = false;
  fetch(buildApiUrl("config"))
    .then((r) => r.json())
    .then((data) => {
      updateStatusBadge(data.configured ?? data.rapidApiKeyConfigured ?? data.rapidApiConfigured);
    })
    .catch(() => {});
}

function closeSettings() {
  const modal = $("#settings-backdrop");
  if (modal) modal.hidden = true;
}

async function refreshCatalog() {
  showToast("Refreshing live catalog...");
  await loadLiveCatalog(true);
  await loadNewestRecommendations();
  closeSettings();
}

function revertToDemo() {
  loadShowcaseCatalog();
  closeSettings();
}

function clearWatchlist() {
  state.watchlist.clear();
  persistWatchlist();
  render();
  showToast("Watchlist cleared");
}

$("#search-input").addEventListener("input", (event) => {
  state.search = event.target.value;
  render();
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => void loadSearchResults(state.search), 350);
});

$("#filter-groups").addEventListener("change", (event) => {
  const input = event.target.closest("[data-filter]");
  if (!input) return;
  state.filters[input.dataset.filter] = input.value;
  render();
});

document.addEventListener("change", (event) => {
  if (event.target.id === "player-language-select") {
    void changePlayerLanguage(event.target.value);
    return;
  }
  if (event.target.id === "player-subtitle-select") {
    void changePlayerSubtitle(event.target.value);
    return;
  }
  if (event.target.id === "player-quality-select") {
    void changePlayerQuality(event.target.value);
    return;
  }
  if (event.target.id === "player-season-select") {
    void changePlayerSeason(event.target.value);
    return;
  }
  if (event.target.id === "player-episode-select") void changePlayerEpisode(event.target.value);
});

$("#filter-groups").addEventListener("input", (event) => {
  const input = event.target.closest("[data-filter]");
  if (!input || !["rateMin", "rateMax"].includes(input.dataset.filter)) return;
  state.filters[input.dataset.filter] = Number(input.value);
  if (state.filters.rateMin > state.filters.rateMax) {
    if (input.dataset.filter === "rateMin") state.filters.rateMax = state.filters.rateMin;
    else state.filters.rateMin = state.filters.rateMax;
  }
  render();
});

$("#modal-backdrop").addEventListener("click", (event) => {
  if (event.target.id === "modal-backdrop") closeDetails();
});

$("#player-backdrop").addEventListener("click", (event) => {
  if (event.target.id === "player-backdrop") closePlayer();
});

$("#settings-backdrop")?.addEventListener("click", (event) => {
  if (event.target.id === "settings-backdrop") closeSettings();
});

$("#player-settings").addEventListener("toggle", (event) => {
  $("#player-settings-toggle")?.setAttribute("aria-expanded", String(event.currentTarget.open));
});

$("#video-player").addEventListener("canplay", () => {
  if (currentPlayerState === PLAYER_STATE.LOADING) {
    setPlayerState(PLAYER_STATE.READY);
  }
});

$("#video-player").addEventListener("play", () => {
  setPlayerState(PLAYER_STATE.PLAYING);
});

$("#video-player").addEventListener("pause", () => {
  if (currentPlayerState === PLAYER_STATE.PLAYING) {
    setPlayerState(PLAYER_STATE.READY);
  }
});

$("#video-player").addEventListener("waiting", () => {
  setPlayerState(PLAYER_STATE.LOADING, "Loading stream…");
});

$("#video-player").addEventListener("playing", () => {
  setPlayerState(PLAYER_STATE.PLAYING);
});

$("#video-player").addEventListener("ended", () => {
  void handlePlayerEnded();
});

$("#video-player").addEventListener("error", () => {
  handlePlaybackError();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== $("#search-input")) {
    event.preventDefault();
    focusSearch();
  }
  if (event.key === "Escape") {
    closeDetails();
    closeDrawer();
    closePlayer();
    closeSettings();
    $("#search-box").classList.remove("mobile-open");
  }
});

function initRouter() {
  const handleRoute = () => {
    const rawHash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    const validSections = ["home", "movies", "series", "anime", "my-list", "profile"];
    const section = validSections.includes(rawHash) ? rawHash : "home";
    setSection(section, false);
  };

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

initRouter();
void loadLiveCatalog();
void loadNewestRecommendations();
}
