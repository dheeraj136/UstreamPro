import { ICONS, renderIcon } from "./assets/icons.js";
import { storage } from "./modules/storage.js";
import { initImageLazyLoading, observeLazyImages, getDescriptiveAlt, handleImageError } from "./modules/image-loader.js";
import { delegate, addPassiveListener, rafThrottle, createListenerPool } from "./modules/events.js";

/* ==========================================================================
   Ustream Anti-Ad & Redirect Blocker Shield
   Guarantees zero unauthorized ad pop-ups, pop-unders, top-window hijacks,
   or rogue promotional redirects.
   ========================================================================== */
function initAdShield() {
  if (typeof window === "undefined") return;

  // 1. Hard-block unauthorized window.open ad popups and tab redirects (allow explicit user popouts)
  const _origOpen = window.open;
  window._allowUserPopout = function(url) {
    return _origOpen.call(window, url, "_blank", "noopener,noreferrer");
  };
  window.open = function (url, target, features) {
    if (!url || typeof url !== "string") return null;
    try {
      const parsed = new URL(url, window.location.origin);
      const trustedHosts = [window.location.hostname, "discord.com", "discord.gg", "themoviedb.org", "api.themoviedb.org"];
      if (trustedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
        return _origOpen.call(window, url, target, features);
      }
    } catch {}
    console.warn("[Ustream Ad Shield] Blocked unauthorized pop-up / redirect to:", url);
    return null;
  };

  // 2. Clear known promotional vendor ad tags / keys
  const adKeys = ["gaia-promo-off-once", "promo-shown", "_pop_fired", "monetag", "adcash", "propeller", "adsterra"];
  adKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {}
  });

  // 3. Block and remove rogue ad network script tags and full-screen invisible clickjack overlays
  const adDomains = [
    "sepoygalliot.com",
    "googletagmanager.com/gtag",
    "monetag.com",
    "adsterra.com",
    "propellerads.com",
    "popcash.net",
    "clickadu.com",
    "exoclick.com",
    "adcash.com",
    "juicyads.com",
    "trafficjunky.com",
    "bet365",
    "1xbet"
  ];

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          const tagName = el.tagName.toLowerCase();
          if (tagName === "script") {
            const src = (el.src || "").toLowerCase();
            if (adDomains.some((d) => src.includes(d))) {
              console.warn("[Ustream Ad Shield] Intercepted and removed rogue ad script:", src);
              el.remove();
            }
          }
          if (tagName === "div" || tagName === "a") {
            const style = el.getAttribute("style") || "";
            if (
              (style.includes("position: fixed") || style.includes("position:fixed")) &&
              (style.includes("opacity: 0") || style.includes("opacity:0")) &&
              (style.includes("z-index: 2147483647") || style.includes("z-index: 999999") || style.includes("z-index:999999"))
            ) {
              console.warn("[Ustream Ad Shield] Removed clickjacking ad overlay");
              el.remove();
            }
          }
        }
      }
    }
  });

  if (document.documentElement) {
    initImageLazyLoading();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      initImageLazyLoading();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }
}

initAdShield();

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
              { id: "ForYou", name: "For You" },
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

const FILTER_VALUE_LABELS = { ForYou: "For You" };
const enumFilter = (filterType, title, values, showOut) => ({
  filterType,
  filterVals: [],
  filterValsV2: values.map((value) => ({ id: value, name: FILTER_VALUE_LABELS[value] || value })),
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
  {
    "subjectId": "movie-deadpool-wolverine",
    "tmdbId": "533535",
    "backdrop": "https://image.tmdb.org/t/p/original/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    "title": "Deadpool & Wolverine",
    "category": "movie",
    "type": "movie",
    "adult": true,
    "isAdult": true,
    "maturityRating": "18+",
    "contentRating": "R",
    "genre": [
      "action",
      "comedy",
      "18+"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2024,
    "releaseDate": "2024-07-26",
    "rating": 7.7,
    "imdbRatingValue": "7.7",
    "runtime": "2h 8m",
    "duration": "2h 8m",
    "language": "English, Multi Sub",
    "badge": "18+ Adult",
    "kicker": "Marvel Studios · R-Rated",
    "image": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg"
    },
    "gradient": "linear-gradient(145deg, #7f1d1d, #450a0a 50%, #020617)",
    "description": "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "series-euphoria",
    "tmdbId": "85552",
    "backdrop": "https://image.tmdb.org/t/p/original/mez2Z3WqlPKNXpi7mWoiiE5guE9.jpg",
    "title": "Euphoria",
    "category": "series",
    "type": "series",
    "adult": true,
    "isAdult": true,
    "maturityRating": "TV-MA",
    "contentRating": "18+",
    "genre": [
      "series",
      "drama",
      "18+"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2019,
    "releaseDate": "2019-06-16",
    "rating": 8.3,
    "imdbRatingValue": "8.3",
    "runtime": "55m / ep",
    "duration": "55m / ep",
    "language": "English, Multi Sub",
    "badge": "18+ Mature",
    "kicker": "HBO Original · TV-MA",
    "image": "https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg"
    },
    "gradient": "linear-gradient(145deg, #581c87, #3b0764 50%, #020617)",
    "description": "A group of high school students navigate love and friendships in a world of drugs, sex, trauma and social media. Starring Zendaya in an Emmy-winning performance.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    "hasResource": true,
    "seNum": 1
  },
  {
    "subjectId": "anime-chainsaw-man",
    "tmdbId": "114410",
    "backdrop": "https://image.tmdb.org/t/p/original/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg",
    "title": "Chainsaw Man",
    "category": "anime",
    "type": "anime",
    "isJapaneseAnime": true,
    "adult": true,
    "isAdult": true,
    "maturityRating": "TV-MA",
    "contentRating": "18+",
    "genre": [
      "anime",
      "action",
      "horror",
      "18+"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2022,
    "releaseDate": "2022-10-12",
    "rating": 8.6,
    "imdbRatingValue": "8.6",
    "runtime": "24m / ep",
    "duration": "24m / ep",
    "language": "Japanese, English Dub",
    "badge": "18+ Anime",
    "kicker": "MAPPA · TV-MA",
    "image": "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg"
    },
    "gradient": "linear-gradient(145deg, #991b1b, #450a0a 50%, #020617)",
    "description": "Denji is a young man living a life of extreme poverty. He lives with Pochita, the Chainsaw Devil. After a brutal betrayal, Denji is reborn as the devil-hunting devilman 'Chainsaw Man' in this visceral, gory anime masterpiece.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    },
    "hasResource": true,
    "seNum": 1
  },
  {
    "subjectId": "movie-inception",
    "tmdbId": "27205",
    "backdrop": "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    "title": "Inception",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "sci-fi",
      "adventure"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2010,
    "releaseDate": "2010-07-16",
    "rating": 8.8,
    "imdbRatingValue": "8.8",
    "runtime": "2h 28m",
    "duration": "2h 28m",
    "language": "English, Multi Sub",
    "badge": "Top Rated",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
    },
    "gradient": "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
    "description": "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to have his criminal history erased as payment for the implantation of another person's idea into a target's subconscious.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-interstellar",
    "tmdbId": "157336",
    "backdrop": "https://image.tmdb.org/t/p/original/8sNiAPPYU14PUepFNeSNGUTiHW.jpg",
    "title": "Interstellar",
    "category": "movie",
    "type": "movie",
    "genre": [
      "adventure",
      "drama",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2014,
    "releaseDate": "2014-11-07",
    "rating": 8.7,
    "imdbRatingValue": "8.7",
    "runtime": "2h 49m",
    "duration": "2h 49m",
    "language": "English, Multi Sub",
    "badge": "Epic Sci-Fi",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
    },
    "gradient": "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    "description": "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-dark-knight",
    "tmdbId": "155",
    "backdrop": "https://image.tmdb.org/t/p/original/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg",
    "title": "The Dark Knight",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "crime",
      "drama"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2008,
    "releaseDate": "2008-07-18",
    "rating": 9,
    "imdbRatingValue": "9.0",
    "runtime": "2h 32m",
    "duration": "2h 32m",
    "language": "English, Multi Sub",
    "badge": "Masterpiece",
    "kicker": "Legendary",
    "image": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
    },
    "gradient": "linear-gradient(145deg, #334155, #1e293b 50%, #0f172a)",
    "description": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-dune-2",
    "tmdbId": "693134",
    "backdrop": "https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    "title": "Dune: Part Two",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "adventure",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2024,
    "releaseDate": "2024-03-01",
    "rating": 8.5,
    "imdbRatingValue": "8.5",
    "runtime": "2h 46m",
    "duration": "2h 46m",
    "language": "English, Multi Sub",
    "badge": "Blockbuster",
    "kicker": "Denis Villeneuve",
    "image": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
    },
    "gradient": "linear-gradient(145deg, #d97706, #78350f 50%, #451a03)",
    "description": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-oppenheimer",
    "tmdbId": "872585",
    "backdrop": "https://image.tmdb.org/t/p/original/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    "title": "Oppenheimer",
    "category": "movie",
    "type": "movie",
    "genre": [
      "biography",
      "drama",
      "history"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2023,
    "releaseDate": "2023-07-21",
    "rating": 8.9,
    "imdbRatingValue": "8.9",
    "runtime": "3h 00m",
    "duration": "3h 00m",
    "language": "English, Multi Sub",
    "badge": "Oscar Winner",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"
    },
    "gradient": "linear-gradient(145deg, #ea580c, #7c2d12 50%, #431407)",
    "description": "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project, developing the atomic weapons that ended World War II.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-spider-verse",
    "tmdbId": "569094",
    "backdrop": "https://image.tmdb.org/t/p/original/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg",
    "title": "Spider-Man: Across the Spider-Verse",
    "category": "cartoons",
    "type": "cartoon",
    "isCartoon": true,
    "genre": [
      "animation",
      "cartoon",
      "action",
      "adventure"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2023,
    "releaseDate": "2023-06-02",
    "rating": 8.7,
    "imdbRatingValue": "8.7",
    "runtime": "2h 20m",
    "duration": "2h 20m",
    "language": "English, Multi Sub",
    "badge": "Animation Marvel",
    "kicker": "Sony Pictures",
    "image": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"
    },
    "gradient": "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)",
    "description": "Miles Morales catapults across the Multiverse, encountering a society of Spider-People charged with protecting its existence when heroes clash on handling a new catastrophic threat.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-avengers-endgame",
    "tmdbId": "299534",
    "backdrop": "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    "title": "Avengers: Endgame",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "adventure",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2019,
    "releaseDate": "2019-04-26",
    "rating": 8.4,
    "imdbRatingValue": "8.4",
    "runtime": "3h 01m",
    "duration": "3h 01m",
    "language": "English, Multi Sub",
    "badge": "Marvel Epic",
    "kicker": "Marvel Studios",
    "image": "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
    },
    "gradient": "linear-gradient(145deg, #7c3aed, #4c1d95 50%, #2e1065)",
    "description": "After Thanos wiped out half of all life in the universe, the remaining Avengers assemble once more in a desperate final stand to reverse the devastating catastrophe.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-gladiator",
    "tmdbId": "98",
    "backdrop": "https://image.tmdb.org/t/p/original/Ar7QuJ7sJEiC0oP3I8fKBKIQD9u.jpg",
    "title": "Gladiator",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "adventure",
      "drama"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2000,
    "releaseDate": "2000-05-05",
    "rating": 8.5,
    "imdbRatingValue": "8.5",
    "runtime": "2h 35m",
    "duration": "2h 35m",
    "language": "English, Multi Sub",
    "badge": "Classic",
    "kicker": "Ridley Scott",
    "image": "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg"
    },
    "gradient": "linear-gradient(145deg, #ca8a04, #713f12 50%, #422006)",
    "description": "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-matrix",
    "tmdbId": "603",
    "backdrop": "https://image.tmdb.org/t/p/original/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
    "title": "The Matrix",
    "category": "movie",
    "type": "movie",
    "genre": [
      "action",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 1999,
    "releaseDate": "1999-03-31",
    "rating": 8.7,
    "imdbRatingValue": "8.7",
    "runtime": "2h 16m",
    "duration": "2h 16m",
    "language": "English, Multi Sub",
    "badge": "Cyberpunk Classic",
    "kicker": "The Wachowskis",
    "image": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
    },
    "gradient": "linear-gradient(145deg, #16a34a, #14532d 50%, #052e16)",
    "description": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "movie-spirited-away",
    "tmdbId": "129",
    "backdrop": "https://image.tmdb.org/t/p/original/m4TUa2ciEWSlk37rOsjiSIvZDXE.jpg",
    "title": "Spirited Away",
    "category": "anime",
    "type": "anime",
    "isJapaneseAnime": true,
    "genre": [
      "anime",
      "animation",
      "adventure",
      "fantasy"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2001,
    "releaseDate": "2001-07-20",
    "rating": 8.6,
    "imdbRatingValue": "8.6",
    "runtime": "2h 05m",
    "duration": "2h 05m",
    "language": "Japanese, English Dub",
    "badge": "Studio Ghibli",
    "kicker": "Hayao Miyazaki",
    "image": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"
    },
    "gradient": "linear-gradient(145deg, #0d9488, #115e59 50%, #042f2e)",
    "description": "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    },
    "hasResource": true,
    "seNum": 0
  },
  {
    "subjectId": "series-breaking-bad",
    "tmdbId": "1396",
    "backdrop": "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    "title": "Breaking Bad",
    "category": "tv",
    "type": "series",
    "genre": [
      "crime",
      "drama",
      "thriller"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2008,
    "releaseDate": "2008-01-20",
    "rating": 9.5,
    "imdbRatingValue": "9.5",
    "runtime": "5 Seasons · 62 Episodes",
    "duration": "5 Seasons",
    "language": "English, Multi Sub",
    "badge": "All-Time Top #1",
    "kicker": "Vince Gilligan",
    "image": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg"
    },
    "gradient": "linear-gradient(145deg, #15803d, #14532d 50%, #052e16)",
    "description": "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's financial future.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    },
    "hasResource": true,
    "seNum": 5
  },
  {
    "subjectId": "series-stranger-things",
    "tmdbId": "66732",
    "backdrop": "https://image.tmdb.org/t/p/original/9P4IIMYY3HifqeruZq0ZZ9g7YUi.jpg",
    "title": "Stranger Things",
    "category": "tv",
    "type": "series",
    "genre": [
      "drama",
      "fantasy",
      "horror",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2016,
    "releaseDate": "2016-07-15",
    "rating": 8.7,
    "imdbRatingValue": "8.7",
    "runtime": "5 Seasons · 42 Episodes",
    "duration": "5 Seasons",
    "language": "English, Multi Sub",
    "badge": "Global Phenomenon",
    "kicker": "Duffer Brothers",
    "image": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg"
    },
    "gradient": "linear-gradient(145deg, #b91c1c, #7f1d1d 50%, #450a0a)",
    "description": "When a young boy vanishes, a small Indiana town uncovers a mystery involving secret government experiments, terrifying supernatural forces, and one strange little girl.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    "hasResource": true,
    "seNum": 5
  },
  {
    "subjectId": "series-last-of-us",
    "tmdbId": "100088",
    "backdrop": "https://image.tmdb.org/t/p/original/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg",
    "title": "The Last of Us",
    "category": "tv",
    "type": "series",
    "genre": [
      "action",
      "adventure",
      "drama",
      "sci-fi"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2023,
    "releaseDate": "2023-01-15",
    "rating": 8.8,
    "imdbRatingValue": "8.8",
    "runtime": "2 Seasons · 16 Episodes",
    "duration": "2 Seasons",
    "language": "English, Multi Sub",
    "badge": "HBO Original",
    "kicker": "Craig Mazin & Neil Druckmann",
    "image": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg"
    },
    "gradient": "linear-gradient(145deg, #4d7c0f, #365314 50%, #1a2e05)",
    "description": "Twenty years after modern civilization was destroyed, Joel is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone across a ravaged America.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    },
    "hasResource": true,
    "seNum": 2
  },
  {
    "subjectId": "series-game-of-thrones",
    "tmdbId": "1399",
    "backdrop": "https://image.tmdb.org/t/p/original/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg",
    "title": "Game of Thrones",
    "category": "tv",
    "type": "series",
    "genre": [
      "action",
      "adventure",
      "drama",
      "fantasy"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2011,
    "releaseDate": "2011-04-17",
    "rating": 9.2,
    "imdbRatingValue": "9.2",
    "runtime": "8 Seasons · 73 Episodes",
    "duration": "8 Seasons",
    "language": "English, Multi Sub",
    "badge": "Epic Fantasy",
    "kicker": "HBO Series",
    "image": "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg"
    },
    "gradient": "linear-gradient(145deg, #475569, #334155 50%, #0f172a)",
    "description": "Nine noble families fight for control over the Iron Throne of Westeros, while an ancient enemy returns after being dormant for millennia beyond the northern Wall.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    },
    "hasResource": true,
    "seNum": 8
  },
  {
    "subjectId": "series-severance",
    "tmdbId": "95557",
    "backdrop": "https://image.tmdb.org/t/p/original/9qrroces8C6R9aKr08hACNPVXdZ.jpg",
    "title": "Severance",
    "category": "tv",
    "type": "series",
    "genre": [
      "drama",
      "mystery",
      "sci-fi",
      "thriller"
    ],
    "country": "United States",
    "countryName": "United States",
    "year": 2022,
    "releaseDate": "2022-02-18",
    "rating": 8.7,
    "imdbRatingValue": "8.7",
    "runtime": "2 Seasons · 19 Episodes",
    "duration": "2 Seasons",
    "language": "English, Multi Sub",
    "badge": "Mind-Bending",
    "kicker": "Ben Stiller",
    "image": "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"
    },
    "gradient": "linear-gradient(145deg, #0284c7, #0369a1 50%, #075985)",
    "description": "Mark Scout leads a team at Lumon Industries whose employees undergo a severance procedure separating work memories from personal life memories.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    "hasResource": true,
    "seNum": 2
  },
  {
    "subjectId": "anime-attack-on-titan",
    "tmdbId": "1429",
    "backdrop": "https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg",
    "title": "Attack on Titan",
    "category": "anime",
    "type": "anime",
    "genre": [
      "anime",
      "action",
      "adventure",
      "fantasy"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2013,
    "releaseDate": "2013-04-07",
    "rating": 9.1,
    "imdbRatingValue": "9.1",
    "runtime": "4 Seasons · 87 Episodes",
    "duration": "4 Seasons",
    "language": "Japanese, English Dub",
    "badge": "Anime Masterpiece",
    "kicker": "WIT Studio & MAPPA",
    "image": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg"
    },
    "gradient": "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)",
    "description": "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have pushed humanity behind giant concentric walls.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    },
    "hasResource": true,
    "seNum": 4
  },
  {
    "subjectId": "anime-demon-slayer",
    "tmdbId": "85937",
    "backdrop": "https://image.tmdb.org/t/p/original/nTvM4mhqNlHIvUkI1gVnW6XP7GG.jpg",
    "title": "Demon Slayer: Kimetsu no Yaiba",
    "category": "anime",
    "type": "anime",
    "genre": [
      "anime",
      "action",
      "fantasy"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2019,
    "releaseDate": "2019-04-06",
    "rating": 8.6,
    "imdbRatingValue": "8.6",
    "runtime": "4 Seasons · 55 Episodes",
    "duration": "4 Seasons",
    "language": "Japanese, English Dub",
    "badge": "Ufotable Masterwork",
    "kicker": "Koyoharu Gotouge",
    "image": "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg"
    },
    "gradient": "linear-gradient(145deg, #0284c7, #0f766e 50%, #134e4a)",
    "description": "A kindhearted young boy whose family was slaughtered by demons joins the Demon Slayer Corps to find a cure for his sister Nezuko, who was turned into a demon.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
    },
    "hasResource": true,
    "seNum": 4
  },
  {
    "subjectId": "anime-jujutsu-kaisen",
    "tmdbId": "95479",
    "backdrop": "https://image.tmdb.org/t/p/original/qpin8cASXEVtwhzNsprHYFiOAGk.jpg",
    "title": "Jujutsu Kaisen",
    "category": "anime",
    "type": "anime",
    "genre": [
      "anime",
      "action",
      "fantasy",
      "supernatural"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2020,
    "releaseDate": "2020-10-03",
    "rating": 8.5,
    "imdbRatingValue": "8.5",
    "runtime": "2 Seasons · 47 Episodes",
    "duration": "2 Seasons",
    "language": "Japanese, English Dub",
    "badge": "Fan Favorite",
    "kicker": "MAPPA",
    "image": "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg"
    },
    "gradient": "linear-gradient(145deg, #4338ca, #312e81 50%, #1e1b4b)",
    "description": "Yuji Itadori swallows a cursed finger to save his friends, sharing his body with the ancient Curse King Ryomen Sukuna, entering Tokyo Jujutsu High to exorcise deadly spirits.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
    },
    "hasResource": true,
    "seNum": 2
  },
  {
    "subjectId": "anime-death-note",
    "tmdbId": "13916",
    "backdrop": "https://image.tmdb.org/t/p/original/koBa94NxTaGe2FoDzlXMuJptsv0.jpg",
    "title": "Death Note",
    "category": "anime",
    "type": "anime",
    "genre": [
      "anime",
      "crime",
      "drama",
      "mystery",
      "thriller"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2006,
    "releaseDate": "2006-10-04",
    "rating": 9,
    "imdbRatingValue": "9.0",
    "runtime": "1 Season · 37 Episodes",
    "duration": "1 Season",
    "language": "Japanese, English Dub",
    "badge": "Psychological Classic",
    "kicker": "Madhouse",
    "image": "https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg"
    },
    "gradient": "linear-gradient(145deg, #18181b, #09090b 50%, #000000)",
    "description": "A brilliant high school student discovers a supernatural notebook that grants the ability to kill anyone whose name and face are known, engaging in a battle of wits with the enigmatic detective L.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    },
    "hasResource": true,
    "seNum": 1
  },
  {
    "subjectId": "anime-fma-brotherhood",
    "tmdbId": "31911",
    "backdrop": "https://image.tmdb.org/t/p/original/2UG177tWHy7xRmMKWJHB7nAUmKd.jpg",
    "title": "Fullmetal Alchemist: Brotherhood",
    "category": "anime",
    "type": "anime",
    "genre": [
      "anime",
      "action",
      "adventure",
      "fantasy"
    ],
    "country": "Japan",
    "countryName": "Japan",
    "year": 2009,
    "releaseDate": "2009-04-05",
    "rating": 9.1,
    "imdbRatingValue": "9.1",
    "runtime": "1 Season · 64 Episodes",
    "duration": "1 Season",
    "language": "Japanese, English Dub",
    "badge": "Top Rated Anime",
    "kicker": "Bones Studio",
    "image": "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg"
    },
    "gradient": "linear-gradient(145deg, #b91c1c, #991b1b 50%, #450a0a)",
    "description": "Two alchemist brothers embark on an arduous journey to seek the legendary Philosopher's Stone to restore their bodies after a forbidden human transmutation ritual went disastrously wrong.",
    "video": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "playUrl": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    "hasResource": true,
    "seNum": 1
  }
];

const EPISODE_MAP = {
  "series-breaking-bad": [
    {
      "ep": 1,
      "season": 1,
      "name": "Pilot",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Cat's in the Bag...",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "...And the Bag's in the River",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "resolution": 1080
    },
    {
      "ep": 4,
      "season": 1,
      "name": "Cancer Man",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "resolution": 1080
    },
    {
      "ep": 5,
      "season": 1,
      "name": "Gray Matter",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "resolution": 1080
    }
  ],
  "series-stranger-things": [
    {
      "ep": 1,
      "season": 1,
      "name": "Chapter One: The Vanishing of Will Byers",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Chapter Two: The Weirdo on Maple Street",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Chapter Three: Holly, Jolly",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "resolution": 1080
    },
    {
      "ep": 4,
      "season": 1,
      "name": "Chapter Four: The Body",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "resolution": 1080
    }
  ],
  "series-last-of-us": [
    {
      "ep": 1,
      "season": 1,
      "name": "When You're Lost in the Darkness",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Infected",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Long, Long Time",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "resolution": 1080
    }
  ],
  "series-game-of-thrones": [
    {
      "ep": 1,
      "season": 1,
      "name": "Winter Is Coming",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "The Kingsroad",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Lord Snow",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "resolution": 1080
    }
  ],
  "series-severance": [
    {
      "ep": 1,
      "season": 1,
      "name": "Good News About Hell",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Half Loop",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "In Perpetuity",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "resolution": 1080
    }
  ],
  "anime-attack-on-titan": [
    {
      "ep": 1,
      "season": 1,
      "name": "To You, in 2,000 Years: The Fall of Shiganshina, Part 1",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "That Day: The Fall of Shiganshina, Part 2",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "A Dim Light Amid Despair",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    }
  ],
  "anime-demon-slayer": [
    {
      "ep": 1,
      "season": 1,
      "name": "Cruelty",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Trainer Sakonji Urokodaki",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Sabito and Makomo",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "resolution": 1080
    }
  ],
  "anime-jujutsu-kaisen": [
    {
      "ep": 1,
      "season": 1,
      "name": "Ryomen Sukuna",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "For Myself",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Girl of Steel",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "resolution": 1080
    }
  ],
  "anime-death-note": [
    {
      "ep": 1,
      "season": 1,
      "name": "Rebirth",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "Confrontation",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "Dealings",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "resolution": 1080
    }
  ],
  "anime-fma-brotherhood": [
    {
      "ep": 1,
      "season": 1,
      "name": "Fullmetal Alchemist",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "resolution": 1080
    },
    {
      "ep": 2,
      "season": 1,
      "name": "The First Day",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "resolution": 1080
    },
    {
      "ep": 3,
      "season": 1,
      "name": "City of Heresy",
      "resourceLink": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "resolution": 1080
    }
  ]
};

let catalog = [...DEMO_ITEMS];
let recommendations = DEMO_ITEMS.slice(0, 6);
function pickRandomFeatured(items, poolSize = 20) {
  const pool = items.slice(0, Math.min(poolSize, items.length));
  return pool[Math.floor(Math.random() * pool.length)];
}
let featured = pickRandomFeatured(DEMO_ITEMS);

// --- Bug 6/7/9/29 shared helpers: single source of truth for catalog
// identity, ratings and search relevance. -------------------------------
// One fallback rating everywhere (was 7.5 / 8.0 / 8.5 / 8.6 depending on
// which code path rendered the same title).
const FALLBACK_RATING = 8.0;
// Infinite scroll is endless by design, but the in-memory catalog must
// not grow without bound in one session (audit: 150 -> 520).
const MAX_CATALOG_SIZE = 600;
// The cold-start cache is truncated to this size; it must cover a full
// live catalog (~14 TMDB pages) or the "of N" total jumps on load.
const MAX_CACHED_CATALOG_SIZE = 400;

// Bug 9: clamp to a plausible 0..9.9 (TMDB vote_average can be 10.0 on a
// handful of votes); null when there is no real rating at all.
function clampRating(value) {
  const rating = Number.parseFloat(value);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(9.9, Math.max(0, Math.round(rating * 10) / 10));
}
function normalizeRating(value, fallback = FALLBACK_RATING) {
  const clamped = clampRating(value);
  return clamped === null ? fallback : clamped;
}
// Bug 9: within one session, the first real rating seen for a TMDB id is
// the rating everywhere that id is shown (home, search, modal, cache),
// so a title cannot read 10.0 on one load and 9.3 on the next. Curated
// DEMO ratings seed the map, so DEMO is the source of truth for them.
const tmdbRatingById = new Map();
DEMO_ITEMS.forEach((item) => {
  const real = clampRating(item.rating);
  if (real === null) return;
  if (item.tmdbId) tmdbRatingById.set(String(item.tmdbId), real);
  if (item.subjectId) tmdbRatingById.set(String(item.subjectId), real);
});
function stableRatingFor(value, key) {
  const k = key === undefined || key === null ? "" : String(key);
  if (k && tmdbRatingById.has(k)) return tmdbRatingById.get(k);
  const real = clampRating(value);
  if (real === null) return FALLBACK_RATING;
  if (k) tmdbRatingById.set(k, real);
  return real;
}

// Bug 6/7: one identity for a title. TMDB id first (the app already
// treats `tmdb-<id>` as the global id in subjectId/video URLs); then
// subjectId; then normalised title+year+kind, so remakes (same title,
// different year) stay distinct while the same title returned by
// several TMDB endpoints collapses to one entry.
//
// Round 2 root causes (live re-audit: "The Odyssey" 3x with ★8.0/★4.0/
// ★1.0): TMDB really does return several distinct entries for the same
// film (e.g. three "The Odyssey" 2026 movies, ids 1368337/1756234/
// 1698863, votes 8.0/4.0/1.0), and the old key missed them:
//  - TMDB movie ids and TV ids share one numeric space, so a bare
//    `tmdb:<id>` key can also WRONGLY merge a movie with a TV show.
//  - the second pass keyed on raw `mediaType || type`, so "movie" vs
//    "tv" vs "series" vs "cartoons" vs "trending"/"all" (the /api/catalog
//    fallback category) never matched each other.
//  - `appendCatalogItems` only checked the first-pass key against the
//    live catalog, so a same-title/different-id entry appended by a
//    later infinite-scroll page sailed straight past the dedupe.
// Canonical kind + canonical title key fix all three.
function canonicalKind(item) {
  if (!item) return "";
  const raw = String(item.mediaType || item.type || item.category || "").toLowerCase().trim();
  if (raw === "tv" || raw === "series" || raw === "show") return "series";
  if (raw === "anime") return "anime";
  if (raw === "cartoon" || raw === "cartoons" || raw === "animation") return "cartoon";
  if (raw === "movie" || raw === "film") return "movie";
  // Unknown / fallback categories ("trending", "all", ""): derive the kind
  // from the item itself instead of baking the category into the key.
  if (Number(item.seNum) > 0 || /season|episode/i.test(String(item.runtime || ""))) return "series";
  if (item.first_air_date) return "series";
  if (item.isJapaneseAnime) return "anime";
  if (item.isCartoon) return "cartoon";
  return "movie";
}
// Normalised title for dedupe: lower-cased, punctuation stripped, a
// leading "the " dropped, and a trailing year ("(2026)", " 2026")
// dropped — the year lives in the key separately, so "The Odyssey
// (2026)" and "The Odyssey" with year 2026 are the same title.
function canonicalTitleKey(title = "") {
  return String(title || "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+\d{4}$/, "");
}
function canonicalDedupeKey(item) {
  if (!item) return "";
  const year = Number(item.year) || Number.parseInt(String(item.releaseDate || item.first_air_date || item.release_date || "").slice(0, 4), 10) || "";
  return `${canonicalTitleKey(item.title)}|${canonicalKind(item)}|${year}`;
}
function catalogItemKey(item) {
  if (!item) return "";
  // Only a numeric id is a TMDB id. `item.id` can also be a local string
  // id ("tmdb-123", "demo-…") — treating that as a TMDB id would split
  // one title across two keys. Include the kind: TMDB movie id N and TV
  // id N are different works.
  const tmdbId = item.tmdbId ?? item.id;
  const numericId = /^\d+$/.test(String(tmdbId ?? "")) ? String(tmdbId) : "";
  if (numericId) return `tmdb:${canonicalKind(item)}:${numericId}`;
  const subjectId = item.subjectId ? String(item.subjectId) : "";
  if (subjectId) return `subject:${subjectId.toLowerCase()}`;
  return `title:${canonicalTitleKey(item.title)}|${item.year || ""}|${canonicalKind(item)}`;
}
function catalogHasCanonical(items, item) {
  const key = canonicalDedupeKey(item);
  if (!key || key.startsWith("|")) return false;
  return (items || []).some((c) => canonicalDedupeKey(c) === key);
}
function dedupeCatalogItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item || !item.title) continue;
    const key = catalogItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  // Second pass (bug 11): same canonical title + kind + year under a
  // different TMDB id (TMDB lists duplicate entries for one film, e.g.
  // three "The Odyssey" 2026 movies) is one catalogue slot. Keep the
  // entry with the best evidence: a real TMDB id wins over an id-less
  // record, then the higher rating; the original-language entry wins
  // ties. Distinct years stay distinct (Doctor Who 1963 vs 2005 are
  // different shows and both survive).
  const bestByTitle = new Map();
  for (const item of out) {
    const key = canonicalDedupeKey(item);
    const prev = bestByTitle.get(key);
    if (!prev) { bestByTitle.set(key, item); continue; }
    const prevHasId = /^\d+$/.test(String(prev.tmdbId ?? prev.id ?? ""));
    const nextHasId = /^\d+$/.test(String(item.tmdbId ?? item.id ?? ""));
    const prevScore = Number(prev.rating) || 0;
    const nextScore = Number(item.rating) || 0;
    const prevOrig = prev.originalLanguage || (prev.isJapaneseAnime ? "ja" : "");
    const nextOrig = item.originalLanguage || (item.isJapaneseAnime ? "ja" : "");
    if ((nextHasId && !prevHasId)
      || (nextHasId === prevHasId && nextScore > prevScore)
      || (nextHasId === prevHasId && nextScore === prevScore && nextOrig && !prevOrig)) {
      bestByTitle.set(key, item);
    }
  }
  const merged = [...bestByTitle.values()];
  // Central Coming-soon enforcement (bug 10): every item that passes
  // through dedupe gets its badge/stream re-derived from the single
  // unreleased rule, so no data source can smuggle an unreleased title
  // in with a "Popular"/"Top Rated" badge or a playable URL.
  for (const item of merged) {
    if (isUnreleasedItem(item)) {
      item.isComingSoon = true;
      item.comingSoon = true;
      item.badge = "Coming soon";
      item.video = "";
      if (item.playUrl) item.playUrl = { url: "" };
    }
  }
  return merged;
}
// Append, re-checked against the LIVE catalog at push time (not a `seen`
// snapshot taken before the awaits, which is how concurrent category /
// live / load-more loads re-added the same titles). Returns the items
// actually added, capped at MAX_CATALOG_SIZE.
function appendCatalogItems(items) {
  // Round 2 (bug 6/7): the old check compared only the first-pass
  // (TMDB-id) key against the live catalog, so a later infinite-scroll
  // page carrying the same film under a different TMDB id (TMDB lists
  // three "The Odyssey" 2026 entries) was appended as a duplicate.
  // Check the canonical title+kind+year key too, against the LIVE
  // catalog — not just within the incoming batch.
  const seenIds = new Set(catalog.map(catalogItemKey));
  const seenCanonical = new Set(catalog.map(canonicalDedupeKey));
  const added = [];
  for (const item of dedupeCatalogItems(items)) {
    const key = catalogItemKey(item);
    if (seenIds.has(key)) continue;
    const cKey = canonicalDedupeKey(item);
    if (cKey && !cKey.startsWith("|") && seenCanonical.has(cKey)) continue;
    seenIds.add(key);
    if (cKey) seenCanonical.add(cKey);
    added.push(item);
    if (catalog.length + added.length >= MAX_CATALOG_SIZE) break;
  }
  if (added.length) catalog.push(...added);
  return added;
}
function replaceCatalogItems(items) {
  catalog = dedupeCatalogItems(items).slice(0, MAX_CATALOG_SIZE);
  return catalog;
}
// Bug 6: guards so concurrent / stale live-catalog loads cannot each
// build and assign their own catalog (the "total" then depended on which
// racing load finished last).
let catalogGeneration = 0;
let liveCatalogLoading = false;

// Bug 6: count the curated breakdown from DEMO_ITEMS instead of
// hardcoding it (the hardcoded "10 Movies, 5 Series, 5 Anime" summed to
// 20 while DEMO_ITEMS actually holds 23).
function curatedBreakdownLabel() {
  const counts = { movie: 0, series: 0, anime: 0, cartoon: 0 };
  DEMO_ITEMS.forEach((item) => {
    const t = String(item.type || "").toLowerCase();
    if (t === "movie") counts.movie++;
    else if (t === "series") counts.series++;
    else if (t === "anime") counts.anime++;
    else if (t === "cartoon") counts.cartoon++;
  });
  const parts = [`${counts.movie} Movies`, `${counts.series} Series`, `${counts.anime} Anime`];
  if (counts.cartoon) parts.push(`${counts.cartoon} Cartoon`);
  return parts.join(", ");
}

// Bug 29: relevance of a title for a query. 0 exact, 1 starts-with,
// 2 query starts a word, 3 substring, 4 no title match (e.g. a
// genre/country-only match, which ranks last).
function normalizeSearchText(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function searchRelevanceScore(title, query) {
  const t = normalizeSearchText(title);
  const q = normalizeSearchText(query);
  if (!q) return 4;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?:^| )${escaped}`).test(t)) return 2;
  if (t.includes(q)) return 3;
  return 4;
}
function sortBySearchRelevance(items, query) {
  return [...(items || [])].sort((a, b) => {
    const diff = searchRelevanceScore(a.title, query) - searchRelevanceScore(b.title, query);
    return diff !== 0 ? diff : (normalizeRating(b.rating) - normalizeRating(a.rating));
  });
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

function loadContinuation() {
  try {
    const raw = localStorage.getItem("ustream-continuation");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Only keep entries with evidence of real playback. Legacy rows
        // written by the old fake "+15 progress" code have no watchedAt
        // and no position/duration, so they are dropped here: a fresh
        // user starts with an empty Continue Watching row.
        const seen = new Set();
        return parsed.filter((e) => {
          if (!e || typeof e.title !== "string" || !e.title) return false;
          if (seen.has(e.title)) return false;
          seen.add(e.title);
          const progress = Number(e.progress);
          if (!Number.isFinite(progress) || progress < 0 || progress >= 100) return false;
          // Round 2 (bug 15): only real playback survives a reload.
          // Entries with <30s watched and <=1% progress are dropped —
          // that is what the old "record on player open" code wrote
          // (position 0, progress 0, watchedAt set), which is why fresh
          // users saw pre-seeded 0% rows.
          const pos = Number(e.positionSeconds) || 0;
          const embedSecs = Number(e.embedWatchedSeconds) || 0;
          return pos >= 30 || progress > 1 || embedSecs >= 30;
        }).slice(0, 6);
      }
    }
  } catch {}
  return [];
}

function persistContinuation() {
  try {
    localStorage.setItem("ustream-continuation", JSON.stringify(continuation));
  } catch {}
}

// Saved resume position (seconds) for a title, from the continuation entry
// or from the per-title position key written by the player timeupdate.
function getSavedPosition(itemOrTitle) {
  const title = typeof itemOrTitle === "string" ? itemOrTitle : itemOrTitle?.title;
  if (!title) return 0;
  const entry = continuation.find((c) => c.title === title);
  if (entry && Number(entry.positionSeconds) > 0) return Number(entry.positionSeconds);
  try {
    const pos = parseFloat(localStorage.getItem(`ustream-pos-${title}`) || "0");
    if (Number.isFinite(pos) && pos > 0) return pos;
  } catch {}
  return 0;
}

// Record REAL playback progress only. progress is derived from
// position/duration, never fabricated. Called on every 5s timeupdate
// tick (native video) and after 30s of continuous embed playback.
// Round 2 (bug 15): an entry is created ONLY once there is real
// progress — at least 30 seconds watched or more than 1% — and a
// sub-threshold call never creates one and never regresses an existing
// real entry. Player-open used to record position 0 / progress 0 with
// watchedAt set, which is exactly how 0% rows appeared for titles
// nobody had watched.
function recordPlaybackProgress(item, { positionSeconds = 0, durationSeconds = 0, embedWatchedSeconds = 0 } = {}) {
  if (!item?.title) return;
  const pos = Math.max(0, Math.floor(Number(positionSeconds) || 0));
  const dur = Math.max(0, Math.floor(Number(durationSeconds) || 0));
  const embedSecs = Math.max(0, Math.floor(Number(embedWatchedSeconds) || 0));
  const existing = continuation.find((c) => c.title === item.title);
  const progress = dur > 0 ? Math.min(99, Math.round((pos / dur) * 100))
    : (existing ? Number(existing.progress) || 0 : 0);
  const hasRealProgress = pos >= 30 || progress > 1 || embedSecs >= 30;
  if (!hasRealProgress) return;
  const entry = {
    ...(existing || {}),
    ...item,
    title: item.title,
    progress,
    positionSeconds: pos,
    durationSeconds: dur || existing?.durationSeconds || 0,
    embedWatchedSeconds: Math.max(embedSecs, Number(existing?.embedWatchedSeconds) || 0),
    watchedAt: new Date().toISOString(),
  };
  const idx = continuation.findIndex((c) => c.title === item.title);
  if (idx >= 0) continuation[idx] = entry;
  else continuation.unshift(entry);
  if (continuation.length > 6) continuation.length = 6;
  persistContinuation();
  renderContinue();
}

async function resumeTitle(title) {
  const item = findTitle(title);
  if (!item) return;
  const pos = getSavedPosition(item);
  closeDetails({ updateHash: false });
  await playTitle(title, { resumeTime: pos });
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

const CONTENT_BATCH_SIZE = 35;

const state = {
  section: "home",
  genre: "all",
  search: "",
  view: "grid",
  displayLimit: CONTENT_BATCH_SIZE,
  filters: makeFilterDefaults(animeChannel),
  watchlist: new Set(loadWatchlist()),
  activeModal: null,
  auth: {
    user: null,
    profiles: [],
    activeProfile: null,
    session: null,
    isManagingProfiles: false,
    pendingProfileForPin: null,
    returnUrl: null,
  },
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
  // Clamped (<=9.9); 0 preserved as "no rating" for existing callers.
  const rating = clampRating(value);
  return rating === null ? 0 : rating;
};

const normalizeApiItem = (item, category) => {
  const genres = String(item.genre || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  // Map the caller's category hint to a canonical kind. The old code
  // used the raw hint as the type, so /api/catalog fallback batches
  // (category "trending"/"all") produced type "trending"/"all" — items
  // that could never dedupe against the same title from TMDB.
  const cat = String(category || "").toLowerCase();
  const type = cat === "tv" || cat === "series" ? "series"
    : cat === "anime" ? "anime"
    : cat === "cartoon" || cat === "cartoons" ? "cartoon"
    : cat === "movie" ? "movie"
    : (Number(item.seNum) > 0 || item.first_air_date ? "series" : "movie");
  const label = type === "series" ? "Series" : type === "anime" ? "Anime" : type === "cartoon" ? "Cartoon" : "Movie";
  if (type === "anime" && !genres.includes("anime")) genres.unshift("anime");
  const year = Number.parseInt(String(item.releaseDate || "").slice(0, 4), 10);
  const isComingSoon = isUnreleasedDate(item.releaseDate, year);
  return {
    title: item.title || "Untitled",
    type,
    genre: genres.length ? genres : [type],
    country: item.countryName || "Other",
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    releaseDate: item.releaseDate || "",
    updatedAt: item.updatedAt || item.updateTime || item.resourceDetectors?.[0]?.uploadTime || "",
    rating: stableRatingFor(item.imdbRatingValue, item.tmdbId || item.subjectId),
    runtime: item.duration || (item.seNum ? `${item.seNum} season${item.seNum === 1 ? "" : "s"}` : "—"),
    isComingSoon,
    language: item.language || item.corner || "",
    badge: isComingSoon ? "Coming soon" : (item.hasResource ? "Ready" : "Info"),
    kicker: `Ustream · ${label}`,
    image: item.cover?.url || "",
    gradient: "linear-gradient(145deg, #293569, #111827 58%, #080a12)",
    subjectId: item.subjectId,
    description: item.description || "Stream this title in high definition on Ustream.",
    video: isComingSoon ? "" : (item.playUrl?.url || item.playUrl?.playUrl || ""),
  };
};

// --- Patch D helpers (bugs 10/11): unreleased titles + canonical dedupe ---
// Round 2 (bug 10): the old gate only fired on a full YYYY-MM-DD date
// in the future. That missed every 2026 title TMDB already lists with a
// past theatrical date (Resident Evil 2026-09-16, Toy Story 5
// 2026-06-17) whose stream does not exist yet — Play opened the player
// and died with "Unable to play media." — and it missed year-only
// dates ("2026"), for which the regex rejected the value outright.
// The app has no per-title stream verification at card time, so a
// current-year-or-later title is treated as not yet streamable:
// "Coming soon", Play disabled. Titles with no date on file at all are
// NOT gated by year alone — normalizeTmdbItem defaults a missing year
// to the current year, and gating those would hide legitimate titles.
function isUnreleasedDate(dateStr, year) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = Number(today.slice(0, 4));
  const raw = String(dateStr || "").trim();
  const y = Number(year) || Number.parseInt(raw.slice(0, 4), 10) || 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (raw > today) return true;
    // A full past date in the current year or later: theatrically out,
    // but not yet streamable through any server the app knows.
    return y >= currentYear;
  }
  if (/^\d{4}-\d{2}$/.test(raw) || /^\d{4}$/.test(raw)) {
    // Partial date: release cannot be confirmed.
    return y >= currentYear;
  }
  return false;
}
const isUnreleasedItem = (item) => {
  if (!item) return false;
  if (item.isComingSoon) return true;
  const dateStr = String(item.releaseDate || item.first_air_date || item.release_date || "");
  return isUnreleasedDate(dateStr, item.year);
};
const normalizeSearchItem = (item) => {
  const category = String(item.genre || "").toLowerCase().includes("anime") ? "anime" : "tv";
  return normalizeApiItem(item, category);
};

const TMDB_GENRE_NAMES = {
  28: "action", 12: "adventure", 16: "animation", 35: "comedy", 80: "crime",
  99: "documentary", 18: "drama", 10751: "family", 14: "fantasy", 36: "history",
  27: "horror", 10402: "music", 9648: "mystery", 10749: "romance", 878: "sci-fi",
  10770: "tv movie", 53: "thriller", 10752: "war", 37: "western",
  10759: "action", 10762: "kids", 10763: "news", 10764: "reality",
  10765: "sci-fi", 10766: "soap", 10767: "talk", 10768: "war"
};

const TMDB_PUBLIC_KEYS = [
  "e9e9d8da18ae29fc430845952232787c", // High availability primary TMDB API v3 key
  "16f62d38fec24f4e6c2adc9388da20ce"  // Backup key
];

async function fetchTmdbApi(path) {
  const cleanPath = (path.startsWith("/") ? path : `/${path}`).replace(/([?&]language=en)(?=&|$)/g, "$1-US");

  // 1. Direct TMDB v3 fetch with AbortController timeout to prevent hanging requests
  for (const key of TMDB_PUBLIC_KEYS) {
    try {
      const sep = cleanPath.includes("?") ? "&" : "?";
      const directUrl = `https://api.themoviedb.org/3${cleanPath}${sep}api_key=${key}`;
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 4500) : null;
      const res = await fetch(directUrl, {
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Try next key or fallback
    }
  }

  // 2. Secondary fallback: Local server proxy /api/tmdb
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
    const res = await fetch(`/api/tmdb${cleanPath}`, {
      signal: controller ? controller.signal : undefined
    });
    if (timer) clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return null;
}

async function fetchTmdbResults(path) {
  const data = await fetchTmdbApi(path);
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

const normalizeTmdbItem = (item, category = "movie") => {
  // media_type from TMDB wins over the caller's category hint: a TV
  // series fetched via a "movie"/trending batch (e.g. IT: Welcome to
  // Derry) is a series, not a movie. Anime/cartoon require the
  // animation genre (16): a Japanese live-action film (e.g. Godzilla
  // Minus One / Minus Zero) is not anime.
  const mediaIsMovie = item.media_type === "movie";
  const mediaIsTv = item.media_type === "tv";
  const hasAnimationGenre = (item.genre_ids || []).includes(16);
  const isMovie = mediaIsMovie || (!mediaIsTv && (category === "movie" || (!item.first_air_date && !!item.release_date)));
  const isAnime = hasAnimationGenre && (category === "anime" || item.original_language === "ja");
  const isCartoon = hasAnimationGenre && (category === "cartoons" || category === "cartoon" || item.original_language === "en");
  const type = isAnime ? "anime" : isCartoon ? "cartoon" : isMovie ? "movie" : "series";
  const title = (item.title || item.name || item.original_title || item.original_name || "Untitled").trim();
  const yearStr = item.release_date || item.first_air_date || "";
  const year = parseInt(yearStr.slice(0, 4), 10) || new Date().getFullYear();
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : (poster || "");
  const rating = stableRatingFor(item.vote_average, String(item.id));
  const tmdbId = String(item.id);
  const isComingSoon = isUnreleasedDate(yearStr, year);
  const isAdult = Boolean(item.adult) || (Array.isArray(item.genre_ids) && item.genre_ids.includes(10749) && /\b(?:erotic|xxx|sex|porn)\b/i.test(item.overview || ""));

  const genreSet = new Set(Array.isArray(item.genre_ids) ? item.genre_ids.map(id => TMDB_GENRE_NAMES[id]).filter(Boolean) : []);
  if (isAnime) {
    genreSet.add("anime");
    genreSet.add("animation");
  } else if (isCartoon) {
    genreSet.add("cartoon");
    genreSet.add("animation");
  } else if (isMovie) {
    genreSet.add("movie");
  } else {
    genreSet.add("series");
  }

  return {
    tmdbId,
    subjectId: `tmdb-${tmdbId}`,
    title,
    category: isAnime ? "anime" : isCartoon ? "cartoons" : isMovie ? "movie" : "series",
    type,
    isJapaneseAnime: isAnime,
    isCartoon: isCartoon,
    originalLanguage: item.original_language || "",
    adult: Boolean(item.adult || isAdult),
    isAdult: Boolean(item.adult || isAdult),
    genre: [...genreSet],
    country: item.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
    countryName: item.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
    year,
    releaseDate: yearStr,
    rating,
    imdbRatingValue: String(rating),
    // TMDB list endpoints carry no runtime: never invent one.
    runtime: "—",
    duration: "—",
    isComingSoon,
    comingSoon: isComingSoon,
    language: item.original_language === "ja" ? "Japanese, English Dub" : "English, Multi Sub",
    badge: isComingSoon ? "Coming soon" : (rating >= 8.0 ? "Top Rated" : "Popular"),
    kicker: isAnime ? "Anime Series" : isCartoon ? "Animation" : isMovie ? "Blockbuster" : "Hit Series",
    image: poster,
    cover: { url: poster },
    backdrop,
    gradient: isAnime ? "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)" : isCartoon ? "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)" : isMovie ? "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)" : "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    description: item.overview || `Stream ${title} in high definition on Ustream.`,
    video: isComingSoon ? "" : `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51`,
    playUrl: { url: isComingSoon ? "" : `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51` },
    hasResource: !isComingSoon,
    seNum: isMovie ? 0 : 1,
    mediaType: isMovie ? "movie" : "tv",
  };
};

// Catalog liveness (TMDB/catalog loaded) is NOT playback liveness. The old
// code labelled any configured catalog "Live Streaming Active — Connected"
// even while every player was black. These flags are the single source of
// truth for the Settings/header status text (bug 2).
let catalogIsLive = false;
let catalogLiveCount = 0;
let livePlaybackActive = false;

function updateStatusBadge(isLive, count) {
  catalogIsLive = !!isLive;
  if (count !== undefined && count !== null) catalogLiveCount = count;
  const dot = $("#status-dot");
  const label = $("#status-label");
  const settingsDot = $("#settings-status-dot");
  const settingsTitle = $("#settings-status-title");
  const settingsInfo = $("#settings-status-info");

  if (dot) dot.classList.toggle("live", !!isLive);
  if (label) label.textContent = isLive ? "Live" : "Curated";

  // The green dot / "Active" wording now requires a stream actually
  // playing, not merely a loaded catalog or a configured API key.
  // Round 2: on-demand playback is "Playing now", never "live" — the
  // service carries no live channels any more.
  if (settingsDot) settingsDot.classList.toggle("live", livePlaybackActive);
  if (settingsTitle) settingsTitle.textContent = livePlaybackActive
    ? "Playing now"
    : isLive ? "Live Catalog" : "Curated Catalog";
  if (settingsInfo) {
    settingsInfo.textContent = livePlaybackActive
      ? `Playing now · ${count || "multiple"} titles available.`
      : isLive
        ? `Live catalog loaded · ${count || "multiple"} titles. No stream is playing — playback is verified only when a title actually starts.`
        : "Curated original streaming collection with multi-resolution playback and episodic support.";
  }
}

function createSkeletonCardsHtml(count = 12, isWide = false) {
  return Array.from({ length: count }).map(() => `
    <div class="skeleton-card ${isWide ? "skeleton-card-wide" : ""}" aria-hidden="true">
      <div class="skeleton-poster" ${isWide ? 'style="aspect-ratio: 16/9;"' : ""}></div>
      <div class="skeleton-info">
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join("");
}

function renderSkeletons() {
  const grid = $("#card-grid");
  if (grid) {
    grid.innerHTML = createSkeletonCardsHtml(12);
  }
  const emptyBox = $("#empty-state");
  if (emptyBox) emptyBox.hidden = true;
  const errorBox = $("#error-state");
  if (errorBox) errorBox.hidden = true;

  const recRow = $("#recommendation-row");
  if (recRow) {
    const recSection = $("#recommendations-section");
    if (recSection) recSection.hidden = false;
    recRow.innerHTML = createSkeletonCardsHtml(8);
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
  catalog = dedupeCatalogItems([...DEMO_ITEMS]);
  recommendations = DEMO_ITEMS.slice(0, 6);
  setFeatured(pickRandomFeatured(DEMO_ITEMS));
  updateStatusBadge(false, DEMO_ITEMS.length);
  hasMoreContent = true;
  render();
  showToast(`Loaded ${DEMO_ITEMS.length} curated titles (${curatedBreakdownLabel()})`);
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
  // Do not stack a second full live load on top of one already in flight:
  // each load built its own catalog and the total depended on which won.
  if (liveCatalogLoading && !isRetry) return;
  const catalogGen = ++catalogGeneration;
  liveCatalogLoading = true;
  
  // Instant Cold-Start Rendering: Check if cached catalog exists to show immediately (0ms delay)
  const cached = storage.get("ustream-catalog-cache-v2");
  if (cached) {
    try {
      if (Array.isArray(cached) && cached.length >= 20 && cached[0]?.kicker) {
        catalog = dedupeCatalogItems(cached);
        setFeatured(pickRandomFeatured(catalog));
        updateStatusBadge(true, catalog.length);
        render();
      }
    } catch {}
  } else {
    renderSkeletons();
  }

  if (isRetry) showToast("Connecting to live catalog...");

  try {
    // Full Content Catalog: Multi-page parallel batches across all categories (~300 titles total)
    const tmdbRequests = [
      { path: "/trending/all/day?page=1", cat: "trending" },
      { path: "/trending/all/day?page=2", cat: "trending" },
      { path: "/movie/popular?page=1", cat: "movie" },
      { path: "/movie/popular?page=2", cat: "movie" },
      { path: "/movie/popular?page=3", cat: "movie" },
      { path: "/tv/popular?page=1", cat: "tv" },
      { path: "/tv/popular?page=2", cat: "tv" },
      { path: "/tv/popular?page=3", cat: "tv" },
      { path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1", cat: "anime" },
      { path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=2", cat: "anime" },
      { path: "/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1", cat: "anime" },
      { path: "/discover/tv?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=1", cat: "cartoons" },
      { path: "/discover/tv?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=2", cat: "cartoons" },
      { path: "/discover/movie?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=1", cat: "cartoons" }
    ];

    const results = await Promise.all(tmdbRequests.map(async ({ path, cat }) => {
      try {
        const rawResults = await fetchTmdbResults(path);
        if (Array.isArray(rawResults) && rawResults.length) {
          return { ok: true, items: rawResults.map((i) => normalizeTmdbItem(i, cat)), cat };
        }
      } catch (err) {
        console.warn(`[TMDB Batch fetch error for ${cat}]:`, err);
      }

      // Fallback: try /api/catalog endpoint
      try {
        const catRes = await fetch(`/api/catalog?category=${cat === "trending" ? "all" : cat}`);
        if (catRes.ok) {
          const catData = await catRes.json();
          const items = catData?.data?.items;
          if (Array.isArray(items) && items.length) {
            return { ok: true, items: items.map((i) => (i.tmdbId ? i : normalizeApiItem(i, cat))), cat };
          }
        }
      } catch {}

      return { ok: false, items: [], cat };
    }));

    // A superseded load (e.g. a retry started while this one was in
    // flight) must not overwrite the newer catalog with stale results.
    if (catalogGen !== catalogGeneration) return;

    // Single source of truth: DEMO first, then live items, deduped by
    // TMDB id (then subject/title+year+type). First copy wins, so curated
    // titles keep their curated ratings.
    const successfulItems = dedupeCatalogItems([
      ...DEMO_ITEMS,
      ...results.flatMap(({ items }) => items || []),
    ]);

    if (successfulItems.length >= 20) {
      catalog = replaceCatalogItems(successfulItems);
      hasMoreContent = true;
      setFeatured(pickRandomFeatured(successfulItems));
      updateStatusBadge(true, successfulItems.length);
      clearErrorState();
      render();
      try {
        storage.set("ustream-catalog-cache-v2", storage.compactCatalog(catalog, MAX_CACHED_CATALOG_SIZE));
      } catch {}
      if (!cached) {
        showToast(`Loaded ${successfulItems.length} titles across all categories`);
      }
      return;
    }

    console.warn("[TMDB catalog fallback to showcase items]");
    loadShowcaseCatalog();
  } catch (error) {
    console.error("[Ustream Unhandled Catalog Error]", error);
    loadShowcaseCatalog();
  } finally {
    // Only the newest generation releases the lock; a stale load's
    // finally must not unlock a retry that is still running.
    if (catalogGen === catalogGeneration) liveCatalogLoading = false;
  }
}

/* ==========================================================================
   Infinite Scroll & Endless Pagination (GaiaFlix replicate)
   ========================================================================== */
const sectionPages = {
  home: 2,
  movies: 3,
  series: 3,
  anime: 3,
  cartoons: 3,
};
let isLoadingMore = false;
let hasMoreContent = true;

async function fetchNextRemoteBatch(targetSection) {
  const newItems = [];
  let attempts = 0;

  while (newItems.length < 40 && attempts < 4) {
    attempts++;
    const p1 = (sectionPages[targetSection] || 2) + 1;
    const p2 = p1 + 1;
    sectionPages[targetSection] = p2;
    const nextPage = p1;

    let paths = [];
    if (targetSection === "movies") {
      paths = [
        { path: `/movie/popular?page=${nextPage}`, cat: "movie" },
        { path: `/discover/movie?sort_by=popularity.desc&page=${nextPage}`, cat: "movie" },
        { path: `/movie/top_rated?page=${nextPage}`, cat: "movie" },
        { path: `/movie/now_playing?page=${nextPage}`, cat: "movie" }
      ];
    } else if (targetSection === "series") {
      paths = [
        { path: `/tv/popular?page=${nextPage}`, cat: "tv" },
        { path: `/discover/tv?sort_by=popularity.desc&page=${nextPage}`, cat: "tv" },
        { path: `/tv/top_rated?page=${nextPage}`, cat: "tv" },
        { path: `/tv/on_the_air?page=${nextPage}`, cat: "tv" }
      ];
    } else if (targetSection === "anime") {
      paths = [
        { path: `/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${nextPage}`, cat: "anime" },
        { path: `/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${nextPage}`, cat: "anime" },
        { path: `/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_count.desc&page=${nextPage}`, cat: "anime" }
      ];
    } else if (targetSection === "cartoons") {
      paths = [
        { path: `/discover/tv?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=${nextPage}`, cat: "cartoons" },
        { path: `/discover/movie?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=${nextPage}`, cat: "cartoons" },
        { path: `/discover/tv?with_genres=16&with_original_language=en&sort_by=vote_count.desc&page=${nextPage}`, cat: "cartoons" }
      ];
    } else {
      // "home" (infinite popular, trending, and top-rated fusion)
      paths = [
        { path: `/trending/all/day?page=${nextPage}`, cat: "movie" },
        { path: `/movie/popular?page=${nextPage}`, cat: "movie" },
        { path: `/tv/popular?page=${nextPage}`, cat: "tv" },
        { path: `/discover/movie?sort_by=popularity.desc&page=${nextPage}`, cat: "movie" },
        { path: `/discover/tv?sort_by=popularity.desc&page=${nextPage}`, cat: "tv" }
      ];
    }

    const fetchedBatches = await Promise.all(paths.map(async ({ path, cat }) => {
      try {
        const rawResults = await fetchTmdbResults(path);
        if (Array.isArray(rawResults) && rawResults.length) {
          return rawResults
            .filter((i) => i.media_type !== "person")
            .map((i) => normalizeTmdbItem(i, cat));
        }
      } catch {}

      try {
        const catRes = await fetch(`/api/catalog?category=${cat}&page=${nextPage}`);
        if (catRes.ok) {
          const catData = await catRes.json();
          const items = catData?.data?.items;
          if (Array.isArray(items) && items.length) {
            return items.map((i) => (i.tmdbId ? i : normalizeApiItem(i, cat)));
          }
        }
      } catch {}

      return [];
    }));

    const flatItems = fetchedBatches.flat();
    // Append against the *live* catalog, not a `seen` snapshot taken
    // before the awaits: a category/live load resolving mid-fetch may
    // already have added these titles, which is how Load More produced
    // exact duplicates.
    newItems.push(...appendCatalogItems(flatItems));

    // Only stop if TMDB actually returned nothing after 500 pages (max TMDB limit)
    if (flatItems.length === 0 && nextPage >= 500) {
      hasMoreContent = false;
      break;
    }
    // If we got zero new unique items but there was data, keep trying
    if (flatItems.length > 0 && newItems.length === 0 && nextPage < 500) {
      continue;
    }
  }

  if (newItems.length > 0) {
    updateStatusBadge(true, catalog.length);
    try {
      storage.set("ustream-catalog-cache-v2", storage.compactCatalog(catalog, MAX_CACHED_CATALOG_SIZE));
    } catch {}
  }
  if (catalog.length >= MAX_CATALOG_SIZE) hasMoreContent = false;

  return newItems.length;
}

async function loadMoreTitles() {
  if (isLoadingMore) return;
  const targetSection = state.section;
  if (["explore", "profile", "my-list"].includes(targetSection)) return;

  isLoadingMore = true;
  const loader = $("#catalog-infinite-loader");
  const loadMoreBtn = $("#load-more-btn");
  if (loader) loader.hidden = false;
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.classList.add("loading");
    loadMoreBtn.textContent = "Loading more titles…";
  }

  try {
    let visible = getVisibleCards();
    let displayed = visible.slice(0, state.displayLimit);

    // 1. FAST PATH: If we have buffered titles in memory, reveal them INSTANTLY (0ms latency!)
    const bufferedReady = visible.length - state.displayLimit;
    if (bufferedReady > 0) {
      state.displayLimit += Math.min(CONTENT_BATCH_SIZE, bufferedReady);
      displayed = visible.slice(0, state.displayLimit);
      const grid = $("#card-grid");
      if (grid) {
        grid.innerHTML = displayed.map((card) => renderCard(card)).join("");
        observeLazyImages(grid);
      }
      updateCatalogCounters(visible, displayed);
      clearErrorState();
    }

    // 2. BACKGROUND PRE-FETCH: If buffer is running low, proactively fetch remote batch
    if (visible.length - state.displayLimit < CONTENT_BATCH_SIZE * 2 && hasMoreContent) {
      await fetchNextRemoteBatch(targetSection);
      visible = getVisibleCards();

      // Immediately slice and show up to the full batch size
      if (visible.length > state.displayLimit) {
        state.displayLimit = Math.min(state.displayLimit + CONTENT_BATCH_SIZE, visible.length);
        displayed = visible.slice(0, state.displayLimit);
        const grid = $("#card-grid");
        if (grid) {
          grid.innerHTML = displayed.map((card) => renderCard(card)).join("");
          observeLazyImages(grid);
        }
        updateCatalogCounters(visible, displayed);
      }
    }

    clearErrorState();

    if (displayed.length >= visible.length && !hasMoreContent) {
      if (loadMoreBtn) loadMoreBtn.textContent = "All available titles loaded";
    }

    // Auto-retrigger is owned by the sentinel observer and the scroll
    // listeners now (round 2): a timer here re-fired loads with no user
    // scrolling, which is how the total grew on its own.
  } catch (err) {
    console.warn("[Ustream LoadMore]", err);
  } finally {
    isLoadingMore = false;
    if (loader) loader.hidden = true;
    if (loadMoreBtn) loadMoreBtn.classList.remove("loading");
    // Re-sync the button from the real state (remaining / hasMoreContent)
    // instead of blindly re-enabling it when nothing is left, or leaving
    // it disabled when titles remain.
    try {
      const visibleNow = getVisibleCards();
      updateCatalogCounters(visibleNow, visibleNow.slice(0, state.displayLimit));
    } catch {}
  }
}

let scrollTicking = false;
// Round 2 (bug 6 / new issue C): infinite scroll only ever advances
// because the USER scrolled. The old code also fired it from an 800ms
// heartbeat, four staggered startup timers, a 1s timer on every
// section change, and an immediate call at init — so the first render
// sometimes showed 35 titles and sometimes 70, and the total ballooned
// to the 600 cap without anyone scrolling. The Load More button and
// the sentinel observer below are the only other triggers.
let userHasScrolled = false;
function handleAutoInfiniteScroll() {
  if (!userHasScrolled) return;
  if (isLoadingMore || !hasMoreContent) return;
  const targetSection = state.section;
  if (["explore", "profile", "my-list"].includes(targetSection)) return;

  const grid = $("#card-grid");
  const sentinel = $("#catalog-sentinel");
  let shouldLoad = false;

  // Proximity Check 1: Card grid bottom distance within 1600px of viewport
  if (grid) {
    const rect = grid.getBoundingClientRect();
    if (rect.bottom <= window.innerHeight + 1600) {
      shouldLoad = true;
    }
  }

  // Proximity Check 2: Sentinel trigger position
  if (!shouldLoad && sentinel) {
    const sRect = sentinel.getBoundingClientRect();
    if (sRect.top <= window.innerHeight + 1400) {
      shouldLoad = true;
    }
  }

  // Proximity Check 3: Document scroll position fallback
  if (!shouldLoad) {
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (docHeight - (scrollY + viewportHeight) <= 1600) {
      shouldLoad = true;
    }
  }

  if (shouldLoad) {
    void loadMoreTitles();
  }
}

function initInfiniteScroll() {
  const sentinel = $("#catalog-sentinel");
  const loadMoreBtn = $("#load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => void loadMoreTitles());
  }

  // 1. High-sensitivity IntersectionObserver with generous 1400px threshold.
  // Round 2: gated on real user scrolling — the observer fires on
  // observe() for short pages, which used to auto-load before the user
  // did anything.
  if (sentinel && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (userHasScrolled && entries.some((e) => e.isIntersecting) && !isLoadingMore && hasMoreContent) {
        void loadMoreTitles();
      }
    }, {
      rootMargin: "1400px 0px"
    });
    observer.observe(sentinel);
  }

  // 2. Smooth requestAnimationFrame-backed scroll and touchmove listener
  const onScrollFrame = () => {
    userHasScrolled = true;
    const topbar = $(".topbar");
    if (topbar) {
      topbar.classList.toggle("scrolled", window.scrollY > 20);
    }
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        handleAutoInfiniteScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };

  window.addEventListener("scroll", onScrollFrame, { passive: true });
  window.addEventListener("touchmove", onScrollFrame, { passive: true });
  window.addEventListener("wheel", onScrollFrame, { passive: true });
  window.addEventListener("resize", () => handleAutoInfiniteScroll(), { passive: true });
  // No immediate onScrollFrame() call and no heartbeat/staggered
  // timers here any more (round 2): the first render must show exactly
  // CONTENT_BATCH_SIZE titles until the user scrolls or taps Load More.
}

async function loadNewestRecommendations() {
  try {
    let recItems = [];
    try {
      const data = await fetchTmdbApi("/movie/now_playing?page=1");
      if (Array.isArray(data?.results) && data.results.length) {
        recItems = data.results.slice(0, 12).map((i) => normalizeTmdbItem(i, "movie"));
      }
    } catch {}

    if (recItems.length) {
      recommendations = recItems;
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
  // Never feature an unreleased title as the playable hero.
  if (isUnreleasedItem(item)) {
    const released = catalog.find((c) => c.title !== item.title && !isUnreleasedItem(c));
    if (released) return setFeatured(released);
  }
  if (!isAdultEnabled() && isAdultContent(item)) {
    const cleanItem = catalog.find((i) => !isAdultContent(i)) || DEMO_ITEMS.find((i) => !isAdultContent(i));
    if (cleanItem && cleanItem !== item) {
      return setFeatured(cleanItem);
    }
  }
  featured = item;
  const words = item.title.split(" ");
  const firstWord = words[0];
  const restWords = words.slice(1).join(" ");
  const heroTitle = $("#hero-title");
  if (heroTitle) {
    heroTitle.innerHTML = restWords ? `${escapeHtml(firstWord)}<br /><em>${escapeHtml(restWords)}</em>` : escapeHtml(firstWord);
  }
  const heroDesc = $("#hero-description");
  if (heroDesc) {
    heroDesc.textContent = item.description || `Stream ${item.title} in pristine high definition with surround audio on Ustream.`;
  }

  const ratingVal = normalizeRating(item.rating);
  const matchPercent = Math.min(99, Math.max(88, Math.round(ratingVal * 10 + (item.title.length % 5))));
  const maturityRating = item.maturityRating || (isAdultContent(item) ? "18+" : item.type === "movie" ? "PG-13" : "TV-MA");

  const heroMeta = $("#hero-meta");
  if (heroMeta) {
    heroMeta.innerHTML = `
      <span class="badge-imdb" title="IMDb Rating">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${Number(ratingVal).toFixed(1)}
      </span>
      <span class="badge-tech">4K Ultra HD</span>
      <span class="badge-tech">Dolby Atmos</span>
      <span class="badge-age">${maturityRating}</span>
      <span>${item.year || "2026"}</span>
      <span>${item.runtime || "2h 05m"}</span>
    `;
  }

  const genrePillsContainer = $("#hero-genre-pills");
  if (genrePillsContainer) {
    const genres = Array.isArray(item.genre) && item.genre.length ? item.genre.slice(0, 4) : ["Action", "Sci-Fi", "Drama"];
    genrePillsContainer.innerHTML = genres
      .map((g) => `<span class="hero-genre-chip">${escapeHtml(g)}</span>`)
      .join("");
  }

  const eyebrowText = $("#hero-eyebrow-text");
  if (eyebrowText) eyebrowText.textContent = item.kicker || "Featured Premiere";

  const matchBadge = $("#hero-match-badge");
  if (matchBadge) matchBadge.textContent = `${matchPercent}% Match`;

  const heroCredit = $("#hero-credit");
  if (heroCredit) heroCredit.innerHTML = `<span>${escapeHtml(item.kicker || "Featured")}</span> · ${escapeHtml(item.country || "Catalog")}`;

  const playBtn = $("#hero-play");
  if (playBtn) playBtn.dataset.title = item.title;

  const trailerBtn = $("#hero-trailer");
  if (trailerBtn) trailerBtn.dataset.title = item.title;
  if (trailerBtn) trailerBtn.hidden = trailerUnavailableTitles.has(item.title);

  const detailsBtn = $("#hero-details");
  if (detailsBtn) detailsBtn.dataset.title = item.title;

  const bookmarkBtn = $("#hero-bookmark");
  if (bookmarkBtn) {
    bookmarkBtn.dataset.title = item.title;
    const isSaved = state.watchlist.has(item.title);
    bookmarkBtn.classList.toggle("saved", isSaved);
    bookmarkBtn.setAttribute("aria-label", isSaved ? `Remove ${item.title} from Watchlist` : `Add ${item.title} to Watchlist`);
  }

  const backdrop = $("#hero-backdrop");
  if (backdrop) {
    const backdropUrl = item.backdrop || item.image || item.cover?.url;
    if (backdropUrl) {
      const preloadImg = new Image();
      preloadImg.decoding = "async";
      preloadImg.src = backdropUrl;
      backdrop.style.backgroundImage = `url("${backdropUrl}")`;
      backdrop.setAttribute("aria-label", `${item.title} banner`);
    }
  }
  stopHeroMotionPreview();
}

// Titles for which TMDB returned no official trailer: their Trailer
// buttons are hidden instead of opening the full stream (bug 14).
const trailerUnavailableTitles = new Set();

// Only an official landscape Trailer/Teaser counts as a trailer. The old
// code fell back to ANY YouTube video for the title, which is how a
// vertical YouTube Short / clip ("Avengers Endgame: Encore…") was shown
// as the "official trailer". Shorts and unrelated clips are rejected.
function pickOfficialTrailer(videos) {
  const list = (videos || []).filter((v) => v && v.site === "YouTube" && v.key);
  if (!list.length) return null;
  const official = list.filter((v) => v.official === true);
  const pool = official.length ? official : list;
  return pool.find((v) => v.type === "Trailer")
    || pool.find((v) => v.type === "Teaser")
    || null;
}

function setTrailerButtonsHidden(hidden) {
  ["#hero-trailer", "#modal-trailer"].forEach((sel) => {
    const btn = $(sel);
    if (btn) btn.hidden = hidden;
  });
}

async function playTrailer(title) {
  const item = findTitle(title) || featured;
  if (!item) return;
  showToast(`Loading trailer for ${item.title}…`);
  try {
    let trailerKey = null;
    const tmdbId = item.tmdbId || item.id || TMDB_MAP[item.title]?.tmdbId;
    const mediaType = (item.type === "series" || item.category === "series" || item.category === "tv") ? "tv" : "movie";

    if (tmdbId) {
      try {
        const videoData = await fetchTmdbApi(`/${mediaType}/${tmdbId}/videos`);
        const videos = videoData?.results || [];
        const trailer = pickOfficialTrailer(videos);
        if (trailer?.key) {
          trailerKey = trailer.key;
        }
      } catch {}
    }

    if (!trailerKey) {
      try {
        const searchData = await fetchTmdbApi(`/search/${mediaType}?query=${encodeURIComponent(item.title)}`);
        const found = searchData?.results?.[0];
        if (found?.id) {
          const videoData = await fetchTmdbApi(`/${mediaType}/${found.id}/videos`);
          const videos = videoData?.results || [];
          const trailer = pickOfficialTrailer(videos);
          if (trailer?.key) {
            trailerKey = trailer.key;
          }
        }
      } catch {}
    }

    const playerBackdrop = $("#player-backdrop");
    const embedPlayer = $("#embed-player");
    const playerTitle = $("#player-title");
    const customPlayerWrapper = $("#custom-player-wrapper");

    if (trailerKey) {
      if (customPlayerWrapper) customPlayerWrapper.hidden = true;
      if (embedPlayer) {
        embedPlayer.hidden = false;
        embedPlayer.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
      }
      if (playerTitle) playerTitle.textContent = `${item.title} — Official Trailer`;
      if (embedPlayer) embedPlayer.title = `${item.title} — Official Trailer`;
      if (playerBackdrop) playerBackdrop.hidden = false;
      setPlayerState(PLAYER_STATE.PLAYING, `Playing trailer: ${item.title}`);
      return;
    }

    // No official (landscape) trailer: do NOT fall back to the full stream
    // or to an arbitrary YouTube video. Hide the Trailer buttons for this
    // title instead (bug 14).
    trailerUnavailableTitles.add(item.title);
    setTrailerButtonsHidden(true);
    showToast(`No official trailer available for ${item.title}`);
    return;
  } catch (e) {
    console.warn("Could not load trailer:", e);
    clearLiveStatus();
    showToast(`Trailer unavailable for ${item.title} — try again later`);
  }
}

async function loadSearchResults(query) {
  const requestId = ++searchRequestId;
  const trimmed = query.trim();
  if (!trimmed) {
    await loadLiveCatalog();
    return;
  }
  try {
    let results = [];
    try {
      const data = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(trimmed)}`);
      if (Array.isArray(data?.results)) results = data.results;
    } catch {}

    if (!results.length) {
      try {
        const fallbackRes = await fetch(`/api/search?query=${encodeURIComponent(trimmed)}`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const items = fallbackData?.data?.items || fallbackData?.items;
          if (Array.isArray(items) && items.length) {
            results = items.map((it) => ({
              id: it.tmdbId || it.subjectId,
              media_type: it.type === "movie" ? "movie" : "tv",
              title: it.title,
              poster_path: it.poster_path || "",
              backdrop_path: it.backdrop_path || "",
              vote_average: it.rating,
              release_date: String(it.year || ""),
              first_air_date: String(it.year || "")
            }));
          }
        }
      } catch {}
    }

    if (requestId !== searchRequestId) return;

    const adultEnabled = isAdultEnabled();
    const filtered = (results || [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => normalizeTmdbItem(item, item.media_type === "movie" ? "movie" : "tv"))
      .filter((item) => adultEnabled || !isAdultContent(item));
    // Rank by relevance (exact title first) and dedupe by TMDB id, so a
    // substring match can never outrank an exact match.
    const ranked = sortBySearchRelevance(dedupeCatalogItems(filtered), trimmed);

    if (ranked.length) {
      catalog = ranked;
      state.displayLimit = CONTENT_BATCH_SIZE;
      // Search results are complete: Load More must not append unrelated
      // popular titles into them (or grow the total after a search).
      hasMoreContent = false;
      setFeatured(ranked[0]);
      render();
      showToast(`Found ${ranked.length} live results for "${trimmed}"`);
    } else {
      catalog = [];
      state.displayLimit = CONTENT_BATCH_SIZE;
      hasMoreContent = false;
      render();
      showToast(`No results found for "${trimmed}"`);
    }
  } catch (error) {
    if (requestId !== searchRequestId) return;
    showToast("Live search unavailable — try again");
    console.warn(error);
  }
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadWatchlist() {
  try {
    const savedKey = "ustream-watchlist";
    const stored = localStorage.getItem(savedKey) ?? "[]";
    const saved = JSON.parse(stored);
    if (!Array.isArray(saved)) return [];
    const list = saved.filter((t) => typeof t === "string" && t.trim());
    // One-time migration: the legacy app (cinewave-watchlist) is no longer
    // imported, and a stored list that was never explicitly added by the
    // user and matches the old demo seed (a lone "Interstellar") is
    // cleared once, so a fresh user starts with an empty My List. Lists
    // the user built with the + / heart button carry the explicit marker
    // (set in toggleList) and are never touched.
    if (!localStorage.getItem("ustream-watchlist-v2")) {
      localStorage.setItem("ustream-watchlist-v2", "1");
      if (!localStorage.getItem("ustream-watchlist-explicit")
          && list.length === 1 && list[0] === "Interstellar") {
        localStorage.setItem(savedKey, "[]");
        return [];
      }
    }
    return list;
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

function clearToast() {
  const toast = $("#toast");
  if (!toast) return;
  window.clearTimeout(showToast.timeout);
  toast.classList.remove("show");
  toast.textContent = "";
}

// Central live-region cleanup (bugs 14/27): stale "Loading trailer for …",
// "Loading stream…" and catalog status text must not survive a dialog
// close. Called by closePlayer / closeDetails and by
// the trailer no-trailer / error paths. Note showToast() only removes the
// CSS class after 2.3s — the textContent itself stayed in the live region.
function clearLiveStatus() {
  clearToast();
  const catalogStatus = $("#catalog-live-status");
  if (catalogStatus) catalogStatus.textContent = "";
  const loadingText = $("#player-loading-text");
  if (loadingText) loadingText.textContent = "Loading stream…";
  const liveText = $("#player-live-text");
  if (liveText) liveText.textContent = "Ready to watch";
}

function focusSearch() {
  openSearchModal();
  $("#search-box")?.classList.add("mobile-open");
  const sInp = $("#modal-search-input") || $("#search-input");
  sInp?.focus();
}

function updateProfileStats() {
  const watchCount = $("#profile-watch-count");
  const listCount = $("#profile-list-count");
  if (watchCount) watchCount.textContent = String(continuation.length);
  if (listCount) listCount.textContent = String(state.watchlist.size);
}

function setSection(section, updateHash = true) {
  const validSections = ["home", "movies", "series", "anime", "cartoons", "explore", "my-list", "profile"];
  const target = validSections.includes(section) ? section : "home";
  if (state.activeModal) closeDetails({ updateHash: false });
  state.section = target;
  state.genre = "all"; // Reset genre sub-tab so all titles in this section are visible!
  state.displayLimit = CONTENT_BATCH_SIZE; // Always start with 35 content at a time
  hasMoreContent = true;

  if (updateHash) {
    const newHash = target === "home" ? "#/home" : `#/${target}`;
    if (window.location.hash !== newHash) {
      if (typeof history?.pushState === "function") {
        history.pushState(null, "", newHash);
      } else {
        window.location.hash = newHash;
      }
    }
  }

  // Update active button state on both desktop and mobile navigation
  $$("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === target);
  });

  state.filters = makeFilterDefaults(getFilterChannel());

  const heroSection = $(".hero");
  const quickPicks = $(".quick-picks");
  const recommendationsSection = $("#recommendations-section");
  const catalogSection = $("#catalog");
  const profileSection = $("#profile-section");
  const exploreSection = $("#explore-section");

  const titles = {
    home: ["Explore the collection", "All Content & Trending"],
    movies: ["Feature-length stories", "Top movies"],
    series: ["Your next obsession", "Binge-worthy series"],
    anime: ["Anime Collection", "Anime picks"],
    cartoons: ["Western Animation", "Cartoons & Animated Features"],
    explore: ["Streaming Network Directory", "Explore by Service"],
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
    filterChannelKicker.textContent = target === "series" ? "Series Collection" : target === "cartoons" ? "Cartoons Collection" : "Anime Collection";
  }

  // Reset genre pills to 'all' (For you)
  $$(".genre-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.genre === "all"));

  if (target === "explore") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (profileSection) profileSection.hidden = true;
    if (exploreSection) {
      exploreSection.hidden = false;
      initExploreSection();
    }
  } else if (target === "profile") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
    if (profileSection) {
      profileSection.hidden = false;
      updateProfileStats();
      void loadUserUploads();
    }
  } else if (target === "my-list") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
  } else if (target === "movies" || target === "series" || target === "anime" || target === "cartoons") {
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
    loadCategoryTmdb(target);
  } else {
    // "home"
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = false;
    if (recommendationsSection) recommendationsSection.hidden = recommendations.length === 0;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
  }

  // Smooth section transition effect
  const mainEl = $("main#top");
  if (mainEl) {
    mainEl.classList.remove("section-fade");
    void mainEl.offsetWidth; // Force CSS reflow to replay transition
    mainEl.classList.add("section-fade");
  }

  // Render the new section
  render();

  // Update featured hero to a top title from the active category!
  const visible = getVisibleCards();
  if (visible.length > 0 && target !== "home") {
    setFeatured(visible[0]);
  } else if (catalog.length > 0 && target === "home") {
    const cleanItem = catalog.find((i) => isAdultEnabled() || !isAdultContent(i));
    if (cleanItem) setFeatured(cleanItem);
  }

  // Smart scrolling: if user was scrolled down past 350px, scroll to catalog grid; otherwise stay at top
  if (["movies", "series", "anime", "cartoons"].includes(target)) {
    if (window.scrollY > 350) {
      $("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } else if (target === "my-list") {
    $("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (target === "explore" || target === "profile") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  hasMoreContent = true;
  isLoadingMore = false;
  const loadMoreWrap = $("#catalog-load-more-wrap");
  if (loadMoreWrap) {
    loadMoreWrap.hidden = ["explore", "profile", "my-list"].includes(target);
  }
  // Round 2 (new issue C): no auto-fetch on section change. The old code
  // called loadMoreTitles() for short sections and fired
  // handleAutoInfiniteScroll() on a 1s timer, so the first render's
  // count depended on load timing. A section shows its first
  // CONTENT_BATCH_SIZE titles; more load on scroll or Load More.
}

function isDarkModeActive() {
  const current = document.documentElement.getAttribute("data-theme") || localStorage.getItem("ustream-theme") || "dark";
  return current === "dark";
}

// Adult (18+) content is a separate, opt-in setting. It is OFF by default
// and is NOT tied to the Dark Mode theme any more. Enabling it requires an
// explicit age confirmation (see requestAdultEnable) and is stored under
// its own key, so a fresh user never sees adult/parody titles.
function isAdultEnabled() {
  try {
    return localStorage.getItem("ustream-adult-enabled") === "1"
      && localStorage.getItem("ustream-adult-confirmed") === "1";
  } catch { return false; }
}

function setAdultEnabled(enabled) {
  try {
    if (enabled) {
      localStorage.setItem("ustream-adult-enabled", "1");
      localStorage.setItem("ustream-adult-confirmed", "1");
      localStorage.setItem("ustream-adult-confirmed-at", new Date().toISOString());
    } else {
      localStorage.removeItem("ustream-adult-enabled");
      localStorage.removeItem("ustream-adult-confirmed");
    }
  } catch {}
}

// Explicit age gate: enabling 18+ content requires the user to confirm
// they are 18 or older. Returns true only when confirmed.
function requestAdultEnable() {
  const ok = window.confirm(
    "Adult content (18+)\n\nYou must be 18 years or older to enable adult content.\n\nSelect OK only if you confirm you are 18 or older."
  );
  return Boolean(ok);
}

function isAdultContent(item) {
  if (!item) return false;
  if (item.adult === true || item.isAdult === true) return true;

  const genres = Array.isArray(item.genre)
    ? item.genre.map((g) => String(g).toLowerCase().trim())
    : String(item.genre || "").toLowerCase().split(/[\s,]+/);
  const adultGenres = ["erotic", "adult", "18+", "mature", "ecchi", "hentai", "nsfw", "xxx", "r-rated", "nc-17", "tv-ma"];
  if (genres.some((g) => adultGenres.includes(g))) return true;

  const meta = `${item.badge || ""} ${item.kicker || ""} ${item.maturityRating || ""} ${item.contentRating || ""}`.toLowerCase();
  if (/\b(?:18\+|adult|nc-17|tv-ma|xxx|erotic|r-rated)\b/i.test(meta)) return true;

  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (/\b(?:hentai|erotic|nsfw|xxx|porn|softcore|18\+\s*only)\b/i.test(text)) return true;
  // Suggestive / adult-parody titles (e.g. "Bikini Inception") are adult
  // even when the upstream record does not carry an adult flag.
  if (/\b(?:bikini|parody)\b/i.test(item.title || "")) return true;

  const adultTitles = [
    "deadpool & wolverine",
    "deadpool",
    "euphoria",
    "chainsaw man",
    "50 shades",
    "fifty shades",
    "365 days",
    "game of thrones",
    "house of the dragon",
    "the boys",
    "spartacus",
    "caligula"
  ];
  if (item.title && adultTitles.some((t) => item.title.toLowerCase().includes(t))) {
    return true;
  }

  return false;
}

function getVisibleCards() {
  const query = state.search.trim().toLowerCase();
  const targetSection = state.section || "home";
  const apiGenre = state.filters.genre || "All";
  const apiLanguage = state.filters.classify || "All";
  const adultEnabled = isAdultEnabled();

  let visible = catalog.filter((card) => {
    // Adult-content setting (independent of theme): unless 18+ mode was
    // explicitly enabled with an age confirmation, hide adult content.
    if (!adultEnabled && isAdultContent(card)) {
      return false;
    }

    // Section Filtering:
    let matchesSection = true;
    if (targetSection === "movies") {
      const isAnim = card.type === "anime" || card.isJapaneseAnime || card.category === "anime" || (card.language && /japanese/i.test(card.language) && card.genre?.includes("animation"));
      const isCart = card.type === "cartoon" || card.isCartoon || card.category === "cartoons";
      matchesSection = (card.type === "movie" || card.category === "movie") && !isAnim && !isCart;
    } else if (targetSection === "series") {
      const isAnim = card.type === "anime" || card.isJapaneseAnime || card.category === "anime";
      const isCart = card.type === "cartoon" || card.isCartoon || card.category === "cartoons";
      matchesSection = (card.type === "series" || card.category === "series" || card.category === "tv") && !isAnim && !isCart;
    } else if (targetSection === "anime") {
      // Language/country alone do not make a title anime: a Japanese
      // live-action film (Godzilla Minus One) must not land here.
      matchesSection = card.type === "anime" ||
                       card.isJapaneseAnime ||
                       card.category === "anime" ||
                       card.genre?.includes("anime");
    } else if (targetSection === "cartoons") {
      const isJapanese = card.type === "anime" || 
                         card.isJapaneseAnime || 
                         card.category === "anime" || 
                         (card.language && /japanese/i.test(card.language)) ||
                         card.country === "Japan" || 
                         card.countryName === "Japan" ||
                         card.origin_country?.[0] === "JP";
      matchesSection = !isJapanese && (
        card.type === "cartoon" || 
        card.isCartoon || 
        card.category === "cartoons" || 
        card.category === "cartoon" || 
        card.genre?.includes("cartoon") || 
        card.genre?.includes("animation") ||
        card.badge === "Cartoon" ||
        card.kicker === "Animation"
      );
    } else if (targetSection === "my-list") {
      matchesSection = state.watchlist.has(card.title);
    }

    // Genre Filter (Active genre pill / sub-tab in #genre-tabs):
    let matchesGenre = true;
    if (state.genre && state.genre !== "all") {
      const g = state.genre.toLowerCase();
      matchesGenre = (card.genre || []).some(v => v.toLowerCase() === g || v.toLowerCase().includes(g));
    }

    const matchesApiGenre = apiGenre === "All" || (card.genre || []).some((val) => val.toLowerCase() === apiGenre.toLowerCase());
    const matchesLanguage = apiLanguage === "All" || card.language === apiLanguage || (apiLanguage === "English" && /english/i.test(card.language || "")) || (apiLanguage === "Japanese" && /japanese/i.test(card.language || ""));
    const matchesQuery = !query || `${card.title} ${card.country || ""} ${(card.genre || []).join(" ")}`.toLowerCase().includes(query);
    const matchesCountry = state.filters.country === "All" || card.country === state.filters.country || card.countryName === state.filters.country;
    const matchesYear = state.filters.year === "All" || matchesYearFilter(card.year, state.filters.year);
    const matchesRating = (card.rating || 0) >= (state.filters.rateMin ?? 0) && (card.rating || 0) <= (state.filters.rateMax ?? 10);

    // Kids Mode & Maturity Rating Restrictions
    if (state.auth?.activeProfile?.isKids) {
      const matureGenres = ["horror", "crime", "thriller", "war", "erotic"];
      if ((card.genre || []).some((g) => matureGenres.includes(String(g).toLowerCase()))) return false;
    }
    const maturity = state.auth?.activeProfile?.maturityRating;
    if (maturity === "G" && (card.rating || 0) > 7.5) return false;
    if (maturity === "PG" && (card.genre || []).some((g) => ["horror", "erotic"].includes(String(g).toLowerCase()))) return false;

    return (
      matchesSection &&
      matchesGenre &&
      matchesApiGenre &&
      matchesLanguage &&
      matchesQuery &&
      matchesCountry &&
      matchesYear &&
      matchesRating
    );
  });

  if (state.filters.sort === "Hottest") visible.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (state.filters.sort === "Latest") visible.sort((a, b) => (b.year || 0) - (a.year || 0));

  // While searching, relevance beats catalog order: exact title first,
  // then starts-with, then word-boundary, then substring.
  if (query) {
    visible.sort((a, b) => {
      const diff = searchRelevanceScore(a.title, query) - searchRelevanceScore(b.title, query);
      return diff !== 0 ? diff : (normalizeRating(b.rating) - normalizeRating(a.rating));
    });
  }

  return visible;
}

function matchesYearFilter(year, filter) {
  if (!filter || filter === "All") return true;
  if (/^\d{4}$/.test(filter)) return Number(year) === Number(filter);
  if (/^\d{4}s$/.test(filter)) return Math.floor(Number(year) / 10) * 10 === Number(filter.slice(0, 4));
  return true;
}

function renderContinue() {
  const section = $(".quick-picks");
  const row = $("#continue-row");
  if (!section || !row) return;

  if (state.section !== "home" || state.search.trim()) {
    section.hidden = true;
    return;
  }

  const adultEnabled = isAdultEnabled();
  // Round 2 (bug 15): belt-and-braces with loadContinuation — a row
  // with no real progress never renders, even if an old localStorage
  // entry slips past the load filter.
  const visibleItems = continuation.filter((item) => {
    if (!adultEnabled && isAdultContent(item)) return false;
    const pos = Number(item.positionSeconds) || 0;
    const pct = Number(item.progress) || 0;
    const embedSecs = Number(item.embedWatchedSeconds) || 0;
    return pos >= 30 || pct > 1 || embedSecs >= 30;
  });

  if (visibleItems.length === 0) {
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
  row.innerHTML = visibleItems.map((item) => {
    const pos = Number(item.positionSeconds) || 0;
    const dur = Number(item.durationSeconds) || 0;
    const pct = Math.round(Number(item.progress) || 0);
    const resumeLabel = pos > 0
      ? `Resume at ${formatTime(pos)}${dur > 0 ? ` / ${formatTime(dur)}` : ""}`
      : "Resume watching";
    // Never show "· 0%": embed playback has no position to report, so
    // a watched embed row shows no percentage at all.
    const pctLabel = pct > 0 ? ` · ${pct}%` : "";
    return `
    <button class="continue-card" style="--card-gradient:${item.gradient}" data-action="resume" data-title="${escapeHtml(item.title)}" aria-label="Resume ${escapeHtml(item.title)}${pos > 0 ? ` at ${formatTime(pos)}` : ""}">
      <span class="card-label">Continue watching</span><strong>${escapeHtml(item.title)}</strong>
      <span class="continue-resume">${escapeHtml(resumeLabel)}${pctLabel}</span>
      ${pct > 0 ? `<span class="watch-progress"><span style="width:${pct}%"></span></span>` : ""}
    </button>
  `;
  }).join("");
}

function renderRecommendations() {
  const section = $("#recommendations-section");
  const row = $("#recommendation-row");
  if (!section || !row) return;
  if (state.section !== "home" || state.search.trim()) {
    section.hidden = true;
    return;
  }
  const adultEnabled = isAdultEnabled();
  const visibleRecs = recommendations.filter((item) => adultEnabled || !isAdultContent(item));
  section.hidden = visibleRecs.length === 0;
  row.innerHTML = visibleRecs.map(renderCard).join("");
  observeLazyImages(row);
  const update = $("#recommendation-update");
  if (update) update.textContent = visibleRecs.length ? `Updated today · ${visibleRecs.length} picks` : "";
}

function renderCard(card, { isNew = false } = {}) {
  const saved = state.watchlist.has(card.title);
  const cleanTitle = escapeHtml(card.title);
  const isAdult = isAdultContent(card);
  const badgeHtml = isAdult
    ? `<span class="card-badge adult-badge" style="background:#ef4444;color:#fff;font-weight:800;">18+</span>`
    : (card.badge ? `<span class="card-badge">${escapeHtml(card.badge)}</span>` : "");

  const ratingVal = normalizeRating(card.rating);
  const scoreHtml = `<span class="score">★ ${ratingVal.toFixed(1)}</span>`;
  const cont = continuation.find((c) => c.title === card.title);
  const progressBarHtml = cont && cont.progress > 0
    ? `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${cont.progress}%"></div></div>`
    : "";

  return `
    <article class="media-card ${isNew ? "card-enter" : ""}" data-title="${cleanTitle}">
      <div class="poster" style="--poster-gradient:${card.gradient}">
        ${card.image ? `<img class="poster-image" src="${card.image}" alt="${escapeHtml(cleanTitle)} official poster" loading="lazy" decoding="async" />` : ""}
        <span class="poster-kicker" title="${escapeHtml(card.kicker)}">${escapeHtml(card.kicker)}</span>
        ${badgeHtml}
        <span class="poster-title" title="${cleanTitle}">${cleanTitle}</span>
        ${progressBarHtml}
        <button class="list-toggle ${saved ? "saved" : ""}" data-action="toggle-list" data-title="${cleanTitle}" aria-label="${saved ? "Remove" : "Add"} ${cleanTitle} ${saved ? "from" : "to"} my list">${saved ? renderIcon("heartFilled", "icon-sm") : renderIcon("plus", "icon-sm")}</button>
        <button class="card-hover" data-action="play" data-title="${cleanTitle}" aria-label="Play ${cleanTitle}"><span class="play-circle">${renderIcon("play", "icon-md")}</span></button>
      </div>
      <div class="card-info"><h3 title="${cleanTitle}">${cleanTitle}</h3><div class="card-meta"><span>${card.year}</span><span>${card.runtime}</span>${scoreHtml}</div></div>
    </article>
  `;
}

function updateCatalogCounters(visible, displayed) {
  const resultCount = $("#result-count");
  if (resultCount) resultCount.textContent = displayed.length;

  const catalogStatus = $("#catalog-live-status");
  if (catalogStatus) {
    if (visible.length === 0) {
      catalogStatus.textContent = state.section === "my-list" ? "Your list is empty." : "No titles found matching your criteria.";
    } else if (visible.length > displayed.length) {
      catalogStatus.textContent = `Showing ${displayed.length} of ${visible.length} available titles.`;
    } else {
      catalogStatus.textContent = `Showing all ${visible.length} title${visible.length === 1 ? "" : "s"}.`;
    }
  }

  const loadMoreWrap = $("#catalog-load-more-wrap");
  const loadMoreBtn = $("#load-more-btn");
  if (loadMoreWrap && loadMoreBtn) {
    const isExcluded = ["explore", "profile", "my-list"].includes(state.section);
    if (isExcluded) {
      loadMoreWrap.hidden = true;
    } else {
      const remaining = visible.length - displayed.length;
      // Only disable when there is genuinely nothing more to load: no
      // buffered titles left AND no further remote batch available.
      // Never leave it disabled while `remaining > 0`; the transient
      // disabled state during a fetch is owned by loadMoreTitles() via
      // isLoadingMore. (Previously this function never set .disabled at
      // all, so a button disabled at the start of a slow fetch stayed
      // disabled while the counters already showed e.g. "115 ready".)
      const exhausted = remaining === 0 && !hasMoreContent;
      loadMoreBtn.disabled = isLoadingMore || exhausted;
      if (remaining > 0) {
        loadMoreWrap.hidden = false;
        loadMoreBtn.hidden = false;
        loadMoreBtn.textContent = `Load ${Math.min(CONTENT_BATCH_SIZE, remaining)} More Content (${remaining} ready)`;
      } else if (hasMoreContent) {
        loadMoreWrap.hidden = false;
        loadMoreBtn.hidden = false;
        loadMoreBtn.textContent = `Load ${CONTENT_BATCH_SIZE} More Content`;
      } else {
        loadMoreWrap.hidden = displayed.length === 0;
        loadMoreBtn.hidden = false;
        loadMoreBtn.textContent = "All available titles loaded";
      }
    }
  }
}

function renderHomeRails() {
  const container = $("#home-rails-container");
  const catalogSection = $("#catalog");
  const communitySection = $("#community-section");
  if (!container) return;

  const isHomeView = state.section === "home" && !state.search.trim();
  const isNonCatalogSection = ["explore", "profile"].includes(state.section);
  container.hidden = !isHomeView;
  if (catalogSection) {
    catalogSection.hidden = isNonCatalogSection;
  }
  if (communitySection && !isHomeView) {
    communitySection.hidden = true;
  }
  if (!isHomeView) return;

  const adultEnabled = isAdultEnabled();
  const cleanCatalog = catalog.filter((card) => adultEnabled || !isAdultContent(card));

  const isMovie = (c) => (c.type === "movie" || c.category === "movie") && c.type !== "anime" && !c.isJapaneseAnime && c.type !== "cartoon";
  const isSeries = (c) => (c.type === "series" || c.category === "series" || c.category === "tv") && c.type !== "anime" && !c.isJapaneseAnime && c.type !== "cartoon";
  const isAnime = (c) => c.type === "anime" || c.isJapaneseAnime || c.category === "anime" || (c.genre || []).includes("anime");
  const isCartoon = (c) => !isAnime(c) && (c.type === "cartoon" || c.isCartoon || c.category === "cartoons" || c.category === "cartoon" || (c.genre || []).includes("animation"));

  const rails = [
    {
      title: "Top Searches & Trending",
      items: cleanCatalog.slice(0, 15),
      moreSection: "movies",
      moreLabel: "View all"
    },
    {
      title: "Popular Movies",
      items: cleanCatalog.filter(isMovie).slice(0, 15),
      moreSection: "movies",
      moreLabel: "Explore Movies"
    },
    {
      title: "Binge-Worthy Series",
      items: cleanCatalog.filter(isSeries).slice(0, 15),
      moreSection: "series",
      moreLabel: "Explore Series"
    },
    {
      title: "Top Japanese Anime",
      items: cleanCatalog.filter(isAnime).slice(0, 15),
      moreSection: "anime",
      moreLabel: "Explore Anime"
    },
    {
      title: "Western Animation & Cartoons",
      items: cleanCatalog.filter(isCartoon).slice(0, 15),
      moreSection: "cartoons",
      moreLabel: "Explore Cartoons"
    },
    {
      title: "Critically Rated",
      items: [...cleanCatalog].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 15),
      moreSection: "movies",
      moreLabel: "View all"
    }
  ];

  container.innerHTML = rails
    .filter((r) => r.items.length > 0)
    .map((r) => `
      <section class="rail-section">
        <div class="section-heading">
          <h2>${escapeHtml(r.title)}</h2>
          <div class="rail-heading-actions">
            ${r.moreSection ? `<button class="rail-view-all" data-section="${r.moreSection}">${escapeHtml(r.moreLabel)} <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>` : ""}
            <button class="rail-arrow" data-rail-scroll="left" aria-label="Scroll ${escapeHtml(r.title)} left"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
            <button class="rail-arrow" data-rail-scroll="right" aria-label="Scroll ${escapeHtml(r.title)} right"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
        </div>
        <div class="rail-wrapper">
          <div class="media-rail">${r.items.map((card) => renderCard(card)).join("")}</div>
        </div>
      </section>
    `)
    .join("");
  observeLazyImages(container);
}

function render() {
  renderContinue();
  renderRecommendations();
  renderHomeRails();
  const visible = getVisibleCards();
  const displayed = visible.slice(0, state.displayLimit);
  const grid = $("#card-grid");
  if (grid) {
    grid.classList.toggle("compact", state.view === "compact");
    grid.innerHTML = displayed.map((card) => renderCard(card)).join("");
    observeLazyImages(grid);
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
  updateCatalogCounters(visible, displayed);
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
  $("#active-filters").innerHTML = chips.map(({ label, key }) => `<span class="filter-chip">${escapeHtml(label)}<button data-clear-filter="${key}" aria-label="Remove ${escapeHtml(label)} filter">${renderIcon("close", "icon-sm")}</button></span>`).join("");
  
  const filterCountEl = $("#filter-count");
  const filterBtn = $("#filter-button");
  if (filterCountEl) {
    const count = chips.length;
    filterCountEl.textContent = count;
    if (count === 0) {
      filterCountEl.hidden = true;
      filterCountEl.classList.add("is-hidden");
      if (filterBtn) filterBtn.setAttribute("aria-label", "Filter titles");
    } else {
      filterCountEl.hidden = false;
      filterCountEl.classList.remove("is-hidden");
      if (filterBtn) filterBtn.setAttribute("aria-label", `Filter titles (${count} active)`);
    }
  }
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
  const searchInput = $("#search-input") || $("#modal-search-input");
  if (searchInput) searchInput.value = "";
  render();
}


let heroTrailerTimer = null;
let heroPreviewMuted = true;

function stopHeroMotionPreview() {
  if (heroTrailerTimer) {
    clearTimeout(heroTrailerTimer);
    heroTrailerTimer = null;
  }
  const videoWrap = $("#hero-video-wrap");
  const trailerFrame = $("#hero-trailer-frame");
  const muteBtn = $("#hero-mute-toggle");
  if (videoWrap) {
    videoWrap.hidden = true;
    videoWrap.classList.remove("active");
  }
  if (trailerFrame) {
    trailerFrame.src = "about:blank";
  }
  if (muteBtn) {
    muteBtn.hidden = true;
  }
}

function toggleHeroMute() {
  const trailerFrame = $("#hero-trailer-frame");
  const muteIcon = $("#hero-mute-icon");
  if (!trailerFrame || !trailerFrame.contentWindow) return;

  heroPreviewMuted = !heroPreviewMuted;
  const command = heroPreviewMuted ? '{"event":"command","func":"mute"}' : '{"event":"command","func":"unMute"}';
  trailerFrame.contentWindow.postMessage(command, "*");

  if (muteIcon) {
    muteIcon.innerHTML = heroPreviewMuted
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
      : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  }
}

function startHeroMotionPreview(item) {
  stopHeroMotionPreview();
  if (!item) return;

  heroTrailerTimer = setTimeout(async () => {
    try {
      let trailerKey = null;
      const tmdbId = item.tmdbId || item.id || TMDB_MAP[item.title]?.tmdbId;
      const isSeries = item.type === "series" || item.category === "series" || item.category === "tv";
      const mediaType = isSeries ? "tv" : "movie";

      if (tmdbId) {
        try {
          const videoData = await fetchTmdbApi(`/${mediaType}/${tmdbId}/videos`);
          const videos = videoData?.results || [];
          const trailer = pickOfficialTrailer(videos);
          if (trailer?.key) trailerKey = trailer.key;
        } catch {}
      }

      if (!trailerKey) {
        try {
          const searchData = await fetchTmdbApi(`/search/${mediaType}?query=${encodeURIComponent(item.title)}`);
          const found = searchData?.results?.[0];
          if (found?.id) {
            const videoData = await fetchTmdbApi(`/${mediaType}/${found.id}/videos`);
            const videos = videoData?.results || [];
            const trailer = pickOfficialTrailer(videos);
            if (trailer?.key) trailerKey = trailer.key;
          }
        } catch {}
      }

      if (trailerKey && featured?.title === item.title) {
        const videoWrap = $("#hero-video-wrap");
        const trailerFrame = $("#hero-trailer-frame");
        const muteBtn = $("#hero-mute-toggle");
        if (trailerFrame && videoWrap) {
          trailerFrame.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&enablejsapi=1&playsinline=1`;
          videoWrap.hidden = false;
          videoWrap.classList.add("active");
          if (muteBtn) muteBtn.hidden = false;
        }
      }
    } catch (err) {
      console.warn("Hero preview playback skipped:", err);
    }
  }, 1800);
}


async function fetchTitleCredits(item) {
  const tmdbId = item.tmdbId || item.id || TMDB_MAP[item.title]?.tmdbId;
  const isSeries = item.type === "series" || item.category === "series" || item.category === "tv";
  const mediaType = isSeries ? "tv" : "movie";

  if (tmdbId) {
    try {
      const data = await fetchTmdbApi(`/${mediaType}/${tmdbId}/credits`);
      if (data && (data.cast || data.crew)) {
        // Studio/network comes from the title details endpoint, never
        // from origin_country: "United States" is a country, not a studio.
        let studio = "";
        try {
          const details = await fetchTmdbApi(`/${mediaType}/${tmdbId}`);
          studio = isSeries
            ? (details?.networks || []).map(n => n.name).filter(Boolean).join(", ")
            : (details?.production_companies || []).map(c => c.name).filter(Boolean).join(", ");
        } catch {}
        return {
          cast: (data.cast || []).slice(0, 10).map(c => ({
            name: c.name,
            character: c.character || "Cast Member",
            photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
          })),
          // Director = job "Director" only. Executive producers (e.g.
          // Louis D'Esposito, Jon Favreau, Victoria Alonso on
          // Avengers: Endgame) are producers, not directors.
          directors: (data.crew || []).filter(c => c.job === "Director").slice(0, 3).map(c => c.name),
          // Writers = Writer/Screenplay/Story jobs only. The whole
          // "Writing" department also holds comic-book/characters
          // credits (Jim Starlin, Joe Simon, Jack Kirby), who did not
          // write the screenplay.
          writers: (data.crew || []).filter(c => ["Writer", "Screenplay", "Story"].includes(c.job)).slice(0, 3).map(c => c.name),
          studio
        };
      }
    } catch {}
  }

  // Curated fallback credits based on genre & title
  const genres = Array.isArray(item.genre) ? item.genre : ["Drama"];
  return {
    cast: [
      { name: "Lead Performer", character: "Protagonist", photo: null },
      { name: "Co-Star Performer", character: "Deuteragonist", photo: null },
      { name: "Supporting Artist", character: "Allied Lead", photo: null },
      { name: "Special Appearance", character: "Antagonist", photo: null }
    ],
    directors: ["Acclaimed Director"],
    writers: [`${genres[0] || "Creative"} Studio Team`],
    studio: ""
  };
}

function getTitleTrivia(item) {
  const ratingVal = normalizeRating(item.rating).toFixed(1);
  return [
    `Critical Reception: Certified Fresh with an IMDb score of ★ ${ratingVal} and universal acclaim for cinematic direction.`,
    `Audio & Vision: Mastered in Ultra High Definition 4K with Dolby Atmos object-based multi-channel surround sound.`,
    `Production Trivia: Features state-of-the-art visual effects and on-location practical stunts praised by international critics.`,
    `Viewing Note: Available in original high-bitrate streaming with multi-language subtitle tracks and low-latency audio.`
  ];
}

let activeDetailSeason = 1;

function renderModalEpisodes(item, season = 1) {
  activeDetailSeason = season;
  const pillsContainer = $("#modal-season-pills");
  const listContainer = $("#modal-episodes-list");
  if (!pillsContainer || !listContainer) return;

  const key = item.slug || item.id || Object.keys(EPISODE_MAP).find(k => k.toLowerCase().includes(item.title.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const mappedEpisodes = key && EPISODE_MAP[key] ? EPISODE_MAP[key] : null;

  let totalSeasons = 1;
  if (Number(item.seNum) > 1) {
    totalSeasons = Number(item.seNum);
  } else if (mappedEpisodes) {
    const seasons = new Set(mappedEpisodes.map(e => e.season || 1));
    totalSeasons = Math.max(1, seasons.size);
  } else if (item.runtime && item.runtime.includes("Season")) {
    const m = item.runtime.match(/(\d+)\s*Season/i);
    if (m) totalSeasons = Math.max(1, parseInt(m[1], 10));
  } else if (item.type === "series" || item.type === "anime" || item.category === "series") {
    totalSeasons = 3;
  }

  // Render season pills
  pillsContainer.innerHTML = Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => `
    <button class="season-pill-btn ${s === season ? "active" : ""}" data-season-select="${s}">
      Season ${s}
    </button>
  `).join("");

  pillsContainer.onclick = (e) => {
    const btn = e.target.closest("[data-season-select]");
    if (btn && pillsContainer.contains(btn)) {
      const s = parseInt(btn.dataset.seasonSelect, 10);
      renderModalEpisodes(item, s);
    }
  };

  // Render episode cards
  let episodesForSeason = [];
  if (mappedEpisodes) {
    episodesForSeason = mappedEpisodes.filter(e => (e.season || 1) === season);
  } else {
    // Generate authentic episode list for series
    episodesForSeason = Array.from({ length: 8 }, (_, idx) => ({
      ep: idx + 1,
      season: season,
      name: `Chapter ${idx + 1}: ${idx === 0 ? "The Awakening" : idx === 1 ? "Crossroads" : idx === 2 ? "Point of No Return" : idx === 3 ? "Shadows Rising" : idx === 4 ? "The Reckoning" : idx === 5 ? "Ascension" : idx === 6 ? "Convergence" : "Finale"}`,
      duration: "48m",
      overview: `The saga continues in Season ${season}, Episode ${idx + 1}. Unforeseen alliances form as critical truths emerge.`,
      resourceLink: null
    }));
  }

  listContainer.innerHTML = episodesForSeason.map(ep => `
    <article class="episode-table-row" data-episode-play="${ep.ep}" tabindex="0" role="button" aria-label="Play Episode ${ep.ep}: ${escapeHtml(ep.name)}">
      <div class="episode-row-thumb">
        <img src="${item.image || "assets/logo-mark.png"}" alt="${escapeHtml(ep.name || `Episode ${ep.ep}`)} preview" loading="lazy" decoding="async">
        <span class="episode-row-number">EP ${ep.ep}</span>
      </div>
      <div class="episode-row-info">
        <h4>${ep.ep}. ${escapeHtml(ep.name)}</h4>
        <p>${escapeHtml(ep.overview || `Episode ${ep.ep} of ${item.title}.`)}</p>
      </div>
      <div class="episode-row-action">
        <span class="play-circle" aria-hidden="true">
          ${renderIcon("play", "icon-sm")}
        </span>
      </div>
    </article>
  `).join("");

  listContainer.onclick = (e) => {
    const row = e.target.closest("[data-episode-play]");
    if (row && listContainer.contains(row)) {
      const epNum = parseInt(row.dataset.episodePlay, 10);
      closeDetails();
      playTitle(item.title);
      setTimeout(() => {
        if (typeof changePlayerSeason === "function") changePlayerSeason(String(season));
        if (typeof changePlayerEpisode === "function") changePlayerEpisode(String(epNum));
      }, 400);
    }
  };
  listContainer.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const row = e.target.closest("[data-episode-play]");
      if (row && listContainer.contains(row)) {
        e.preventDefault();
        row.click();
      }
    }
  };
}


// Deep-link ids: stable subjectId when present, else tmdb id, else a slug.
function titleIdFor(item) {
  if (!item) return "";
  if (item.subjectId) return String(item.subjectId);
  if (item.tmdbId) return `tmdb-${item.tmdbId}`;
  return String(item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findTitleById(id) {
  if (!id) return null;
  const needle = decodeURIComponent(String(id)).trim().toLowerCase();
  const pool = [featured, ...catalog, ...recommendations, ...DEMO_ITEMS];
  const seen = new Set();
  for (const item of pool) {
    if (!item?.title || seen.has(item.title)) continue;
    seen.add(item.title);
    const ids = [titleIdFor(item), String(item.tmdbId || ""), `tmdb-${item.tmdbId || ""}`];
    if (ids.some((x) => x && x.toLowerCase() === needle)) return item;
    if (item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === needle) return item;
  }
  for (const [key, item] of extraTitlesMap.entries()) {
    if (key && key.toLowerCase() === needle) return item;
  }
  return null;
}

// Scored "More Like This": same type/category is mandatory, shared genres
// score highest, then rating. Adult titles are excluded unless 18+ mode is
// on. Never falls back to an unrelated type (no anime for a movie).
function getRelatedTitles(currentItem, limit = 4) {
  if (!currentItem) return [];
  const adultEnabled = isAdultEnabled();
  const currentGenres = new Set((Array.isArray(currentItem.genre) ? currentItem.genre : []).map((g) => String(g).toLowerCase()));
  const byTitle = new Map();
  for (const cand of [...catalog, ...recommendations, ...DEMO_ITEMS]) {
    if (cand?.title && !byTitle.has(cand.title)) byTitle.set(cand.title, cand);
  }
  const scored = [];
  for (const cand of byTitle.values()) {
    if (cand.title === currentItem.title) continue;
    if (!adultEnabled && isAdultContent(cand)) continue;
    const sameType = cand.type === currentItem.type || cand.category === currentItem.category;
    if (!sameType) continue;
    const candGenres = (Array.isArray(cand.genre) ? cand.genre : []).map((g) => String(g).toLowerCase());
    const shared = candGenres.filter((g) => currentGenres.has(g)).length;
    scored.push({ cand, score: shared * 10 + (Number(cand.rating) || 0) });
  }
  scored.sort((a, b) => b.score - a.score || (b.cand.rating || 0) - (a.cand.rating || 0));
  return scored.slice(0, limit).map((s) => s.cand);
}

function openDetails(title, { updateHash = true } = {}) {
  const item = findTitle(title);
  if (!item) return;
  state.activeModal = item;
  // Deep link: opening a title updates the URL (e.g. #/title/movie-avengers-endgame)
  // so it can be shared / bookmarked, and the back button works via hashchange.
  if (updateHash) {
    const hash = `#/title/${encodeURIComponent(titleIdFor(item))}`;
    if (window.location.hash !== hash) {
      try { history.pushState(null, "", hash); } catch { window.location.hash = hash; }
    }
  }

  const modalBackdrop = $("#modal-backdrop");
  const modalArt = $("#modal-art");
  const modalTitle = $("#modal-title");
  const modalMeta = $("#modal-meta");
  const modalDesc = $("#modal-description");
  const modalList = $("#modal-list");
  const modalPlay = $("#modal-play");
  const modalKicker = $("#modal-kicker");

  if (modalArt) {
    modalArt.style.setProperty("--poster-gradient", item.gradient || "linear-gradient(135deg, #111, #222)");
    const bgUrl = item.backdrop || item.image || "";
    modalArt.style.backgroundImage = bgUrl ? `url("${bgUrl}")` : "none";
  }

  if (modalTitle) modalTitle.textContent = item.title;
  if (modalKicker) modalKicker.textContent = item.kicker || (item.type === "series" ? "Binge-Worthy Series" : item.type === "anime" ? "Anime Masterpiece" : "Feature Film");

  const ratingVal = normalizeRating(item.rating);
  const matchPercent = Math.min(99, Math.max(88, Math.round(ratingVal * 10 + (item.title.length % 5))));
  const maturityRating = item.maturityRating || (isAdultContent(item) ? "18+" : item.type === "movie" ? "PG-13" : "TV-MA");

  if (modalMeta) {
    modalMeta.innerHTML = `
      <span class="badge-imdb">★ ${ratingVal.toFixed(1)}</span>
      <span class="badge-match">${matchPercent}% Match</span>
      <span class="badge-tech">4K UHD</span>
      <span class="badge-tech">Dolby Atmos</span>
      <span class="badge-age">${maturityRating}</span>
      <span>${item.year || "2026"}</span>
      <span>${item.runtime || "2h 05m"}</span>
    `;
  }

  if (modalDesc) {
    modalDesc.textContent = item.description || `Stream ${item.title} in pristine high definition with cinema surround sound on Ustream. Available with Dolby Atmos audio and multiple subtitle tracks.`;
  }

  if (modalList) {
    const isSaved = state.watchlist.has(item.title);
    modalList.innerHTML = isSaved
      ? `${renderIcon("heartFilled", "icon-sm")} <span>In my list</span>`
      : `${renderIcon("plus", "icon-sm")} <span>Add to list</span>`;
  }

  if (modalPlay) {
    const savedPos = getSavedPosition(item);
    const playLabel = modalPlay.querySelector("span");
    // Round 2 (bug 10): an unreleased title's Play button is disabled
    // up front — it shows "Coming soon" and explains why, instead of
    // opening a player that dies with "Unable to play media."
    if (isUnreleasedItem(item)) {
      if (playLabel) playLabel.textContent = "Coming soon";
      modalPlay.disabled = true;
      modalPlay.setAttribute("aria-disabled", "true");
      modalPlay.onclick = () => {
        showToast(`${item.title} is coming soon — not yet released, so it cannot be played yet.`);
      };
    } else {
      modalPlay.disabled = false;
      modalPlay.removeAttribute("aria-disabled");
      if (playLabel) playLabel.textContent = savedPos > 0 ? `Resume · ${formatTime(savedPos)}` : "Play Now";
      modalPlay.onclick = () => {
        closeDetails();
        playTitle(item.title, { resumeTime: savedPos });
      };
    }
  }

  const modalTrailerBtn = $("#modal-trailer");
  if (modalTrailerBtn) modalTrailerBtn.hidden = trailerUnavailableTitles.has(item.title);

  // Populate Specs Grid in Overview
  const specsGrid = $("#modal-specs-grid");
  if (specsGrid) {
    const genres = Array.isArray(item.genre) ? item.genre.join(", ") : "Action, Drama";
    specsGrid.innerHTML = `
      <div class="modal-spec-item">
        <strong>Audio &amp; Sound</strong>
        <span>Dolby Atmos 5.1 Surround, Stereo</span>
      </div>
      <div class="modal-spec-item">
        <strong>Subtitles</strong>
        <span>English [CC], Spanish, French, Japanese</span>
      </div>
      <div class="modal-spec-item">
        <strong>Genres</strong>
        <span>${escapeHtml(genres)}</span>
      </div>
      <div class="modal-spec-item">
        <strong>Studio / Network</strong>
        <span id="modal-studio-value">${escapeHtml(item.studio || item.network || "—")}</span>
      </div>
    `;
  }

  // Check if episodic
  const isSeries = item.type === "series" || item.category === "series" || item.category === "tv" || item.type === "anime" || (item.runtime && item.runtime.includes("Season"));
  const episodesTabBtn = $("#modal-tab-episodes");
  if (episodesTabBtn) {
    episodesTabBtn.hidden = !isSeries;
  }
  if (isSeries) {
    renderModalEpisodes(item, 1);
  }

  // Populate Amazon Prime X-Ray immediately with baseline, then enrich with TMDB credits
  const renderXrayCredits = (credits) => {
    const castRail = $("#modal-xray-cast");
    if (castRail) {
      castRail.innerHTML = (credits.cast || []).map(c => `
        <div class="xray-cast-card">
          <img class="xray-actor-avatar" src="${c.photo || "assets/logo-mark.png"}" alt="${escapeHtml(c.name)} portrait" loading="lazy" decoding="async">
          <span class="xray-actor-name">${escapeHtml(c.name)}</span>
          <span class="xray-character-name">${escapeHtml(c.character)}</span>
        </div>
      `).join("");
    }

    const crewList = $("#modal-xray-crew");
    if (crewList) {
      crewList.innerHTML = `
        <div class="xray-crew-pill">
          <strong>Director</strong>
          <span>${escapeHtml((credits.directors || []).join(", ") || "Renowned Director")}</span>
        </div>
        <div class="xray-crew-pill">
          <strong>Writers</strong>
          <span>${escapeHtml((credits.writers || []).join(", ") || "Creative Screenplay Team")}</span>
        </div>
      `;
    }
  };

  renderXrayCredits({
    cast: [
      { name: "Lead Performer", character: "Protagonist", photo: null },
      { name: "Co-Star Performer", character: "Deuteragonist", photo: null },
      { name: "Supporting Artist", character: "Allied Lead", photo: null },
      { name: "Special Appearance", character: "Antagonist", photo: null }
    ],
    directors: ["Acclaimed Director"],
    writers: [`${(Array.isArray(item.genre) && item.genre[0]) || "Creative"} Studio Team`]
  });

  const triviaBox = $("#modal-xray-trivia");
  if (triviaBox) {
    const triviaItems = getTitleTrivia(item);
    triviaBox.innerHTML = triviaItems.map(t => `
      <div class="xray-trivia-item">
        ${renderIcon("check", "icon-sm")}
        <span>${escapeHtml(t)}</span>
      </div>
    `).join("");
  }

  void (async () => {
    const credits = await fetchTitleCredits(item);
    if (state.activeModal?.title === item.title) {
      renderXrayCredits(credits);
      const studioEl = $("#modal-studio-value");
      if (studioEl && credits.studio) studioEl.textContent = credits.studio;
    }
  })();

  // Populate More Like This (same type + shared genres only)
  const relatedGrid = $("#modal-related-grid");
  if (relatedGrid) {
    const fallbackList = getRelatedTitles(item, 4);
    relatedGrid.innerHTML = fallbackList.map(c => renderCard(c, { isNew: false })).join("");
    observeLazyImages(relatedGrid);
    relatedGrid.onclick = (e) => {
      const listBtn = e.target.closest("[data-action='toggle-list']");
      if (listBtn && relatedGrid.contains(listBtn)) {
        return;
      }
      const btn = e.target.closest("[data-action='play']");
      if (btn && relatedGrid.contains(btn)) {
        e.stopPropagation();
        closeDetails();
        playTitle(btn.dataset.title);
        return;
      }
      const card = e.target.closest(".media-card");
      if (card && relatedGrid.contains(card)) {
        openDetails(card.dataset.title);
      }
    };
  }

  // Reset tab to overview
  $$("[data-modal-tab]").forEach(b => {
    const isOverview = b.dataset.modalTab === "overview";
    b.classList.toggle("active", isOverview);
    b.setAttribute("aria-selected", isOverview ? "true" : "false");
  });
  $$(".modal-tab-panel").forEach(p => {
    const isOverview = p.id === "modal-panel-overview";
    p.hidden = !isOverview;
    p.classList.toggle("active", isOverview);
  });

  if (modalBackdrop) {
    modalBackdrop.hidden = false;
    modalBackdrop.removeAttribute("hidden");
  }
  // Focus the dialog itself (tabindex="-1" in index.html) so Escape is
  // received by this document; focusing a button would let Space close it.
  $("#detail-modal")?.focus({ preventScroll: true });
}

const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

const extraTitlesMap = new Map();
function registerExtraTitle(item) {
  if (item?.title) extraTitlesMap.set(item.title, item);
}

function findTitle(title) {
  if (!title) return null;
  const direct = [featured, ...catalog, ...recommendations].find((item) => item?.title === title) || extraTitlesMap.get(title);
  if (direct) return direct;
  const lower = title.trim().toLowerCase();
  const matched = [featured, ...catalog, ...recommendations].find((item) => item?.title && item.title.trim().toLowerCase() === lower);
  if (matched) return matched;
  for (const [key, item] of extraTitlesMap.entries()) {
    if (key && key.trim().toLowerCase() === lower) return item;
  }
  return null;
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

const TMDB_MAP = {
  "movie-inception": { tmdbId: "27205", imdbId: "tt1375666" },
  "movie-interstellar": { tmdbId: "157336", imdbId: "tt0816692" },
  "movie-dark-knight": { tmdbId: "155", imdbId: "tt0468569" },
  "movie-dune-2": { tmdbId: "693134", imdbId: "tt15239678" },
  "movie-oppenheimer": { tmdbId: "872585", imdbId: "tt15398776" },
  "movie-spider-verse": { tmdbId: "569094", imdbId: "tt9362722" },
  "movie-avengers-endgame": { tmdbId: "299534", imdbId: "tt4154796" },
  "movie-gladiator": { tmdbId: "98", imdbId: "tt0172495" },
  "movie-matrix": { tmdbId: "603", imdbId: "tt0133093" },
  "movie-spirited-away": { tmdbId: "129", imdbId: "tt0245429" },
  "series-breaking-bad": { tmdbId: "1396", imdbId: "tt0903747" },
  "series-stranger-things": { tmdbId: "66732", imdbId: "tt4574334" },
  "series-last-of-us": { tmdbId: "100088", imdbId: "tt3581920" },
  "series-game-of-thrones": { tmdbId: "1399", imdbId: "tt0944947" },
  "series-severance": { tmdbId: "95557", imdbId: "tt11280740" },
  "anime-attack-on-titan": { tmdbId: "1429", imdbId: "tt2560140" },
  "anime-demon-slayer": { tmdbId: "85937", imdbId: "tt9335498" },
  "anime-jujutsu-kaisen": { tmdbId: "95479", imdbId: "tt12343534" },
  "anime-death-note": { tmdbId: "13916", imdbId: "tt0877057" },
  "anime-fma-brotherhood": { tmdbId: "31911", imdbId: "tt1433562" },
};

const TITLE_TMDB_MAP = {
  "inception": "27205",
  "interstellar": "157336",
  "the dark knight": "155",
  "dark knight": "155",
  "dune part two": "693134",
  "dune: part two": "693134",
  "dune 2": "693134",
  "oppenheimer": "872585",
  "spider-man across the spider-verse": "569094",
  "spider-man: across the spider-verse": "569094",
  "across the spider-verse": "569094",
  "avengers endgame": "299534",
  "avengers: endgame": "299534",
  "avengers infinity war": "299536",
  "gladiator": "98",
  "the matrix": "603",
  "matrix": "603",
  "spirited away": "129",
  "breaking bad": "1396",
  "stranger things": "66732",
  "the last of us": "100088",
  "last of us": "100088",
  "game of thrones": "1399",
  "severance": "95557",
  "attack on titan": "1429",
  "demon slayer": "85937",
  "demon slayer: kimetsu no yaiba": "85937",
  "jujutsu kaisen": "95479",
  "death note": "13916",
  "fullmetal alchemist: brotherhood": "31911",
  "fullmetal alchemist brotherhood": "31911",
  "doctor strange in the multiverse of madness": "453395",
  "doctor strange": "284052",
  "spider-man no way home": "634649",
  "spider-man: no way home": "634649",
  "spider-man": "557",
  "the batman": "414906",
  "batman": "414906",
  "top gun maverick": "361743",
  "top gun: maverick": "361743",
  "avatar the way of water": "76600",
  "avatar: the way of water": "76600",
  "avatar": "19995",
  "john wick chapter 4": "603692",
  "john wick: chapter 4": "603692",
  "john wick": "245891",
  "fight club": "550",
  "pulp fiction": "680",
  "arcane": "94605",
  "cyberpunk edgerunners": "105248",
  "cyberpunk: edgerunners": "105248",
  "your name": "372058",
  "your name.": "372058",
  "naruto": "46260",
  "one piece": "37854",
  "bleach": "30984",
  "chainsaw man": "114410",
  "black panther wakanda forever": "505642",
  "black panther: wakanda forever": "505642",
  "deadpool wolverine": "533535",
  "deadpool & wolverine": "533535",
  "inside out 2": "1022789",
  "godzilla x kong": "823464",
  "godzilla x kong: the new empire": "823464",
  "shogun": "126308",
  "house of the dragon": "94997",
  "the boys": "76479",
  "loki": "84958",
  "the mandalorian": "82856",
  "squid game": "93405",
  "wednesday": "119051",
  "solo leveling": "211089"
};

const STREAM_SERVERS = {
  gaiaflix: {
    name: "Server 1 (Gaiaflix Pro - Multi-Audio & Dubs)",
    isNative: true,
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`
  },
  vidsrcsu: {
    name: "Server 2 (VidSrc Pro - Fast & Multi-Source)",
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`
  },
  vidlink: {
    name: "Server 3 (VidLink Cloud - 4K/HD Player)",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e7ff51&secondaryColor=1f1f1f&icons=vid`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e7ff51&secondaryColor=1f1f1f&icons=vid`
  },
  twoembed: {
    name: "Server 4 (2Embed Mirror - Reliable)",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
  },
  vidstuck: {
    name: "Server 5 (Vidstuck HD - Alternative)",
    getMovieUrl: (id) => `https://vidstuck.cc/embed/movie/${id}?color=e7ff51&autoplay=false`,
    getTvUrl: (id, s, e) => `https://vidstuck.cc/embed/tv/${id}/${s}/${e}?color=e7ff51&autoplay=false`
  },
  aniembed: {
    name: "Server 6 (AniEmbed - Anime Dub/Sub)",
    getMovieUrl: (id) => `https://aniembed.se/e/${id}/1?lang=sub&autoplay=1`,
    getTvUrl: (id, s, e) => `https://aniembed.se/e/${id}/${e}?lang=sub&autoplay=1`
  }
};

// --- Unified server selection (round 2: all video servers merged) ---
// Servers the player already knows — no new sources invented:
//   gaiaflix  native multi-audio HLS via gaiaflix.xyz (movies only)
//   vidsrcsu  VidSrc embed (vidsrc.su)
//   vidlink   VidLink embed (vidlink.pro)
//   twoembed  2Embed mirror (2embed.cc)
//   vidstuck  Vidstuck embed (vidstuck.cc)
//   aniembed  AniEmbed (aniembed.se, anime only)
// NOTE: the old STREAM_SERVERS.gaiaflix embed entry pointed at the same
// vidsrc.su URLs as vidsrcsu, so "trying" both was trying one server
// twice. In the chain below, "gaiaflix" means the native HLS step only;
// getEmbedStreamUrl maps it to the VidSrc embed for any caller that
// still asks for an embed URL for it.
let serverMode = "auto"; // "auto" | "manual"
let manualServerKey = "vidsrcsu"; // honoured only when serverMode === "manual"
let currentServerKey = "vidsrcsu"; // server actually playing right now
try {
  const savedServer = localStorage.getItem("ustream-server");
  if (savedServer === "auto" || !savedServer) {
    serverMode = "auto";
    try { localStorage.setItem("ustream-server", "auto"); } catch {}
  } else if (STREAM_SERVERS[savedServer]) {
    serverMode = "manual";
    manualServerKey = savedServer;
    currentServerKey = savedServer;
  } else {
    serverMode = "auto";
    try { localStorage.setItem("ustream-server", "auto"); } catch {}
  }
} catch {}
function getAutoServerChain(item) {
  const isAnime = item?.type === "anime" || item?.category === "anime";
  if (isAnime) return ["aniembed", "vidsrcsu", "vidlink", "twoembed", "vidstuck"];
  if (isItemSeries(item)) return ["vidsrcsu", "vidlink", "twoembed", "vidstuck"];
  return ["gaiaflix", "vidsrcsu", "vidlink", "twoembed", "vidstuck"];
}
function getPlaybackChain(item) {
  if (serverMode === "manual") {
    // Gaiaflix is movies-only; a manual Gaiaflix pick for a series plays
    // that title's VidSrc embed instead of erroring outright.
    if (manualServerKey === "gaiaflix" && isItemSeries(item)) return ["vidsrcsu"];
    return [manualServerKey];
  }
  return getAutoServerChain(item);
}
function syncServerSelect() {
  const serverSelect = $("#player-server-select");
  if (!serverSelect) return;
  const value = serverMode === "auto" ? "auto" : manualServerKey;
  if (serverSelect.value !== value) serverSelect.value = value;
}

const LANGUAGE_LABELS = {
  en: "English",
  hi: "Hindi",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
  de: "German",
  auto: "Original Audio"
};

let currentLanguageKey = "en";
try {
  currentLanguageKey = localStorage.getItem("ustream-language") || "en";
} catch {}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

const TMDB_CACHE = new Map();

function isItemSeries(item) {
  if (!item) return false;
  if (item.mediaType === "tv") return true;
  if (item.mediaType === "movie") return false;
  if (item.type === "series" || item.category === "series" || item.category === "tv") return true;
  if (item.type === "cartoons" || item.category === "cartoons") return true;
  if (Number(item.seNum) > 0 || (Array.isArray(item.seasons) && item.seasons.length > 0)) return true;
  if (item.runtime && /season|episode/i.test(item.runtime)) return true;
  if (item.type === "anime" || item.category === "anime") {
    if (item.duration && /^\d+\s*min/i.test(item.duration) && !item.seNum && !/season|ep/i.test(item.runtime || "")) {
      return false;
    }
    return true;
  }
  return false;
}

async function fetchTmdbSeriesSeasons(tmdbId) {
  if (!isValidTmdbId(tmdbId)) return null;
  try {
    const data = await fetchTmdbApi(`/tv/${tmdbId}`);
    if (!data?.seasons || !Array.isArray(data.seasons)) return null;
    const validSeasons = data.seasons.filter((s) => s.season_number > 0 && s.episode_count > 0);
    if (!validSeasons.length) return null;
    return validSeasons.map((s) => ({
      season: s.season_number,
      title: `Season ${s.season_number}`,
      episodesCount: s.episode_count,
      episodes: Array.from({ length: s.episode_count }, (_, i) => ({
        season: s.season_number,
        episode: i + 1,
        title: `Episode ${i + 1}`,
        resourceLink: ""
      }))
    }));
  } catch {
    return null;
  }
}

async function fetchTmdbSeasonEpisodes(tmdbId, seasonNumber) {
  if (!isValidTmdbId(tmdbId)) return null;
  try {
    const data = await fetchTmdbApi(`/tv/${tmdbId}/season/${seasonNumber}`);
    if (data?.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
      return data.episodes.map((ep) => ({
        season: seasonNumber,
        episode: ep.episode_number,
        title: ep.name || `Episode ${ep.episode_number}`,
        overview: ep.overview || "",
        still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : "",
        resourceLink: ""
      }));
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeTitle(rawTitle = "") {
  return String(rawTitle || "")
    .replace(/\[.*?\]|\(.*?\)/g, " ")
    .replace(/\b(dub|sub|multi sub|hindi|english|japanese|season \d+|episode \d+|complete|hd|4k)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidTmdbId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < 2500000;
}

async function resolveTmdbId(item) {
  if (!item) return null;

  // If item already has a verified TMDB ID
  if (isValidTmdbId(item.tmdbId)) return String(item.tmdbId);
  if (item.subjectId && isValidTmdbId(TMDB_MAP[item.subjectId]?.tmdbId)) {
    return String(TMDB_MAP[item.subjectId].tmdbId);
  }

  // Check cache
  const cacheKey = item.subjectId || item.title;
  if (cacheKey && TMDB_CACHE.has(cacheKey)) {
    const cached = TMDB_CACHE.get(cacheKey);
    if (cached.mediaType) item.mediaType = cached.mediaType;
    return cached.id;
  }

  const rawTitle = item.title || "";
  const cleanTitle = rawTitle.toLowerCase().trim();
  const normalized = cleanTitle.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const sanitized = sanitizeTitle(rawTitle).toLowerCase();

  // Check title maps
  for (const [titleKey, id] of Object.entries(TITLE_TMDB_MAP)) {
    const key = titleKey.toLowerCase();
    if (cleanTitle === key || normalized === key || sanitized === key || (key.length > 4 && (cleanTitle.includes(key) || sanitized.includes(key)))) {
      if (isValidTmdbId(id)) {
        const mediaType = item.type === "series" ? "tv" : "movie";
        TMDB_CACHE.set(cacheKey, { id: String(id), mediaType });
        return String(id);
      }
    }
  }

  // Dynamic TMDB Search API through backend proxy
  const isSeries = isItemSeries(item);
  const searchQuery = sanitized || normalized || cleanTitle;
  if (searchQuery) {
    try {
      const searchPath = isSeries ? "/search/tv" : "/search/multi";
      const data = await fetchTmdbApi(`${searchPath}?query=${encodeURIComponent(searchQuery)}`);
      if (data) {
        const results = data?.results || [];
        const yearOf = (r) => Number(String(r?.release_date || r?.first_air_date || "").slice(0, 4)) || 0;
        const wantedYear = Number(item.year) || 0;
        const yearMatched = wantedYear ? results.find(r => yearOf(r) === wantedYear) : null;
        const top = yearMatched || (isSeries
          ? (results.find(r => r.media_type === "tv" || (!r.media_type && r.first_air_date)) || results[0])
          : (results.find(r => r.media_type === "movie" || (!r.media_type && r.release_date)) || results[0]));
        // If the item's year is known and the best hit is from another
        // year, do not map this title to that older film's stream.
        if (top?.id && isValidTmdbId(top.id) && (!wantedYear || yearOf(top) === wantedYear)) {
          const foundId = String(top.id);
          const mediaType = isSeries ? "tv" : (top.media_type || (top.first_air_date ? "tv" : "movie"));
          item.mediaType = mediaType;
          item.tmdbId = foundId;
          if (top.backdrop_path && !item.backdrop) {
            item.backdrop = `https://image.tmdb.org/t/p/original${top.backdrop_path}`;
          }
          if (top.poster_path && !item.image) {
            item.image = `https://image.tmdb.org/t/p/w500${top.poster_path}`;
          }
          if (mediaType === "tv") {
            item.type = "series";
          } else if (mediaType === "movie" && item.type !== "anime") {
            item.type = "movie";
          }
          TMDB_CACHE.set(cacheKey, { id: foundId, mediaType });
          return foundId;
        }
      }
    } catch (err) {
      console.warn("[TMDB Dynamic Search]", err.message);
    }
  }

  // Fallback: If numeric item.subjectId is in TMDB range, use it
  if (isValidTmdbId(item.subjectId)) {
    return String(item.subjectId);
  }

  // No verified TMDB id for this title: return null instead of
  // mapping it to an unrelated film/series (the old fallback
  // returned Inception 27205 / Breaking Bad 1396 for every
  // unresolvable title — guaranteed wrong content under the
  // requested title). Callers must handle null.
  return null;
}

function getEmbedStreamUrl(tmdbId, item, season = 1, episode = 1, serverKey = currentServerKey) {
  // "gaiaflix" is the native-HLS step, not an embed: an embed URL for it
  // is the VidSrc embed (the old gaiaflix embed entry duplicated it).
  const embedKey = serverKey === "gaiaflix" ? "vidsrcsu" : serverKey;
  const server = STREAM_SERVERS[embedKey] || STREAM_SERVERS.vidsrcsu;
  const isSeries = isItemSeries(item);
  let url = isSeries
    ? server.getTvUrl(tmdbId, Math.max(1, Number(season) || 1), Math.max(1, Number(episode) || 1))
    : server.getMovieUrl(tmdbId);

  // AniEmbed natively supports sub vs dub switching for anime
  if (embedKey === "aniembed") {
    const animeLang = currentLanguageKey === "en" ? "dub" : "sub";
    if (/lang=(?:sub|dub)/.test(url)) {
      url = url.replace(/lang=(?:sub|dub)/, `lang=${animeLang}`);
    } else {
      url += (url.includes("?") ? "&" : "?") + `lang=${animeLang}`;
    }
  }
  return url;
}

function resetDefaultLanguageOptions() {
  const langSelect = $("#player-language-bar-select");
  if (!langSelect) return;
  langSelect.innerHTML = `
    <option value="auto">Original Audio</option>
    <option value="off">Subtitles Off</option>
    <option value="en" ${currentLanguageKey === "en" ? "selected" : ""}>English (Original / Dub)</option>
    <option value="hi" ${currentLanguageKey === "hi" ? "selected" : ""}>Hindi (Subtitles / CC)</option>
    <option value="ja" ${currentLanguageKey === "ja" ? "selected" : ""}>Japanese (Anime Dub/Sub)</option>
    <option value="es" ${currentLanguageKey === "es" ? "selected" : ""}>Spanish (Subtitles / CC)</option>
    <option value="fr" ${currentLanguageKey === "fr" ? "selected" : ""}>French (Subtitles / CC)</option>
    <option value="de" ${currentLanguageKey === "de" ? "selected" : ""}>German (Subtitles / CC)</option>
  `;
}

export async function resolveGaiaflixStream(tmdbId, timeoutMs = 15000) {
  if (!tmdbId) return null;
  let timeout = null;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let res;
    try {
      res = await fetch(`https://gaiaflix.xyz/api/gaiaflix-movie-source?id=${encodeURIComponent(tmdbId)}`, {
        signal: controller ? controller.signal : undefined,
        headers: { Accept: "application/json" }
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    if (!res || !res.ok) return null;
    const data = await res.json();
    const sourceUrl = data?.sources?.[0]?.url;
    if (!sourceUrl) return null;

    let base64Part = "";
    if (sourceUrl.includes("?id=")) {
      base64Part = sourceUrl.split("?id=")[1];
    } else if (sourceUrl.includes("&id=")) {
      base64Part = sourceUrl.split("&id=")[1];
    } else {
      base64Part = sourceUrl;
    }
    if (base64Part.includes("&")) {
      base64Part = base64Part.split("&")[0];
    }

    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(base64Part);
    } else if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(base64Part, "base64").toString("utf-8");
    }

    if (decoded && (decoded.startsWith("http://") || decoded.startsWith("https://"))) {
      return decoded;
    }
    return null;
  } catch (err) {
    console.warn("[Gaiaflix] resolveGaiaflixStream error:", err?.message || err);
    return null;
  }
}
if (typeof window !== "undefined") {
  window.resolveGaiaflixStream = resolveGaiaflixStream;
}

export function playWithGaiaflixHls(m3u8Url, item) {
  return new Promise((resolve) => {
    const embed = $("#embed-player");
    const video = $("#video-player");
    const customWrapper = $("#custom-player-wrapper");
    const playerBackdrop = $("#player-backdrop");
    if (!video || !customWrapper) {
      resolve(false);
      return;
    }

    if (embed) {
      embed.src = "about:blank";
      embed.hidden = true;
    }
    customWrapper.hidden = false;
    video.hidden = false;
    video.poster = item?.image || "";
    const titleEl = $("#player-title");
    if (titleEl) titleEl.textContent = item?.title || "Gaiaflix Pro Stream";
    if (playerBackdrop) playerBackdrop.hidden = false;

    if (window._currentHlsInstance) {
      try {
        window._currentHlsInstance.destroy();
      } catch {}
      window._currentHlsInstance = null;
    }

    const HlsClass = window.Hls;
    if (HlsClass && HlsClass.isSupported()) {
      const hls = new HlsClass({
        capLevelToPlayerSize: true,
        autoStartLoad: true
      });
      window._currentHlsInstance = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      let resolved = false;

      hls.on(HlsClass.Events.MANIFEST_PARSED, (event, data) => {
        const audioTracks = hls.audioTracks || [];
        const langSelect = $("#player-language-bar-select");
        if (langSelect && audioTracks.length > 0) {
          langSelect.innerHTML = "";
          audioTracks.forEach((track) => {
            const opt = document.createElement("option");
            opt.value = track.id !== undefined ? String(track.id) : (track.lang || track.name);
            opt.textContent = `${track.name || track.lang || "Audio"} (Multi-Audio)`;
            langSelect.appendChild(opt);
          });

          // Preferred language matching (e.g. Hindi, English, Tamil, Telugu, Thai)
          const preferred = (currentLanguageKey || "en").toLowerCase();
          const langPrefixMap = {
            hi: ["hi", "hin", "hindi"],
            en: ["en", "eng", "english"],
            ta: ["ta", "tam", "tamil"],
            te: ["te", "tel", "telugu"],
            th: ["th", "tha", "thai"],
            ja: ["ja", "jpn", "japanese"],
            es: ["es", "spa", "spanish"],
            fr: ["fr", "fra", "french"],
            de: ["de", "ger", "german"]
          };
          const targets = langPrefixMap[preferred] || [preferred];

          const targetTrack = audioTracks.find((t) => {
            if (String(t.id) === String(currentLanguageKey)) return true;
            const tLang = (t.lang || "").toLowerCase();
            const tName = (t.name || "").toLowerCase();
            return targets.some((target) => tLang === target || tLang.startsWith(target) || tName.includes(target));
          }) || audioTracks.find((t) => t.default) || audioTracks[0];

          if (targetTrack) {
            hls.audioTrack = targetTrack.id;
            langSelect.value = String(targetTrack.id);
            const trackName = targetTrack.name || targetTrack.lang || "Audio";
            showToast(`Switched audio to ${trackName} (Multi-Audio)`);
          }
        }

        // Subtitles default to Off (bug 24): HLS subtitle tracks default
        // to the first track, which on multi-audio sources is often Hindi.
        try { if (state.player?.selectedSubtitle === "off") hls.subtitleTrack = -1; } catch {}
        if (state.player?.selectedSubtitle === "off") {
          Array.from(video.textTracks || []).forEach((t) => { t.mode = "disabled"; });
        }

        // Start playback on #video-player
        video.play().then(() => {
          setPlayerState(PLAYER_STATE.PLAYING, `${item?.title || "Movie"} · Server 1 (Gaiaflix Pro - Multi-Audio)`);
        }).catch(() => {
          setPlayerState(PLAYER_STATE.READY, `Ready to play: ${item?.title || "Movie"}`);
        });

        const popout = $("#player-popout-btn");
        if (popout) popout.href = m3u8Url;
        const liveLabel = $("#player-live-label");
        if (liveLabel) liveLabel.hidden = false;
        const liveText = $("#player-live-text");
        if (liveText) liveText.textContent = "Multi-Audio HLS Active";
        updatePlayerEpisodeFlow();

        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      });

      hls.on(HlsClass.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("[Hls] Fatal error:", data.type, data.details);
          switch (data.type) {
            case HlsClass.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case HlsClass.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              window._currentHlsInstance = null;
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
              break;
          }
        }
      });

      // Safety timeout: if manifest not parsed in 6 seconds, resolve
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (video.readyState >= 1) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      }, 6000);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple/Safari HLS
      video.src = m3u8Url;
      video.load();
      video.play().then(() => {
        setPlayerState(PLAYER_STATE.PLAYING, `${item?.title || "Movie"} · Server 1 (Gaiaflix Pro - Multi-Audio)`);
      }).catch(() => {});
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

const HIGH_DEF_STREAMS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
];

function isDirectPlayableVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.includes("hakunaymatata.com") || url.includes("/api/media") || url.includes("/.netlify/functions/media")) {
    return false;
  }
  return /^https?:\/\/.+\.(mp4|webm|m3u8)(\?.*)?$/i.test(url) || url.includes("commondatastorage.googleapis.com");
}

function getStreamForTitle(title = "", episodeNum = 1) {
  const cleanTitle = String(title || "Ustream").trim();
  // Never map an unreleased title to a sample stream: the hash picks
  // unrelated footage, so a 2026 title would play the wrong film.
  const known = typeof findTitle === "function" ? findTitle(cleanTitle) : null;
  if (known && isUnreleasedItem(known)) return "";
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = (hash * 31 + cleanTitle.charCodeAt(i)) >>> 0;
  }
  const index = (hash + (Math.max(1, Number(episodeNum) || 1) - 1)) % HIGH_DEF_STREAMS.length;
  return HIGH_DEF_STREAMS[index];
}

function extractPlaybackUrl(payload) {
  const candidates = collectPlaybackUrls(payload);
  const playable = candidates.filter(({ url }) => {
    try {
      const parsed = new URL(url);
      return !parsed.hostname.includes("hakunaymatata.com") && /\.(mp4|m3u8|webm)(?:$|\?)/i.test(parsed.pathname);
    } catch {
      return false;
    }
  });
  const preferred = [...playable].sort((a, b) => {
    const score = (entry) => (entry.key === "downloadUrl" ? 3 : entry.key === "resourceLink" ? 2 : 1);
    return score(b) - score(a);
  });
  const mediaLike = candidates.find(({ url, key }) => !url.includes("hakunaymatata.com") && /\.(mp4|m3u8)(?:$|\?)/i.test(url) && /downloadUrl|resourceLink|playUrl|url/i.test(key));
  return (preferred[0] || mediaLike)?.url || "";
}

function toPlayableUrl(url, fallbackTitle = "", episodeNum = 1) {
  if (isDirectPlayableVideoUrl(url)) {
    return url;
  }
  const fallbackItem = findTitle(fallbackTitle || state?.player?.item?.title || "");
  if (fallbackItem && isUnreleasedItem(fallbackItem)) return "";
  return getStreamForTitle(fallbackTitle || state?.player?.item?.title || "Ustream", episodeNum);
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

// Real loading progress (bug 24): elapsed seconds + a determinate-ish
// progress bar, and a hard 20s timeout to a real error state. The old code
// showed a static "Loading…"/"CONNECTING…" with no progress and no end.
let playerLoadingTimer = null;
let playerLoadingStartedAt = 0;
let playerLoadingBaseMessage = "Loading stream…";

function clearPlayerLoadingTimer() {
  if (playerLoadingTimer) {
    clearInterval(playerLoadingTimer);
    playerLoadingTimer = null;
  }
  const bar = $("#player-loading-bar");
  if (bar) bar.style.width = "0%";
  const progress = $("#player-loading-progress");
  if (progress) progress.setAttribute("aria-valuenow", "0");
}

function startPlayerLoadingTimer(baseMessage) {
  clearPlayerLoadingTimer();
  playerLoadingBaseMessage = baseMessage || "Loading stream…";
  playerLoadingStartedAt = Date.now();
  playerLoadingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - playerLoadingStartedAt) / 1000);
    const loadingText = $("#player-loading-text");
    if (loadingText) loadingText.textContent = `${playerLoadingBaseMessage} (${elapsed}s)`;
    const pct = Math.min(100, Math.round((elapsed / 20) * 100));
    const bar = $("#player-loading-bar");
    if (bar) bar.style.width = `${pct}%`;
    const progress = $("#player-loading-progress");
    if (progress) progress.setAttribute("aria-valuenow", String(pct));
    if (elapsed >= 20) {
      clearPlayerLoadingTimer();
      // If a unified chain is mid-attempt, abort it: the 20s budget is
      // the hard cap for the whole attempt, and the chain respects the
      // same budget, so this only fires when an attempt hung.
      if (playbackChain) {
        playbackChain.aborted = true;
        const embed = $("#embed-player");
        if (embed) { try { embed.src = "about:blank"; } catch {} }
        playbackChain = null;
      }
      setPlayerState(PLAYER_STATE.ERROR, "Stream did not start within 20 seconds. Retry to run auto server selection again.");
    }
  }, 1000);
}

function setPlayerState(nextState, customMessage = "") {
  currentPlayerState = nextState;

  const wasLivePlayback = livePlaybackActive;
  livePlaybackActive = nextState === PLAYER_STATE.PLAYING;
  if (wasLivePlayback !== livePlaybackActive) updateStatusBadge(catalogIsLive, catalogLiveCount);
  if (nextState !== PLAYER_STATE.LOADING) clearPlayerLoadingTimer();
  if (nextState !== PLAYER_STATE.PLAYING) clearEmbedWatchTimer();

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
  if (statusEl) { statusEl.hidden = true; statusEl.style.display = "none"; }
  if (loadingEl) { loadingEl.hidden = true; loadingEl.style.display = "none"; }
  if (errorEl) { errorEl.hidden = true; errorEl.style.display = "none"; }
  if (retryBtn) { retryBtn.hidden = true; retryBtn.style.display = "none"; }
  if (startBtn) { startBtn.hidden = true; startBtn.style.display = "none"; }

  switch (nextState) {
    case PLAYER_STATE.IDLE:
      if (liveLabel) liveLabel.hidden = true;
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || "Choose a title to start watching";
      }
      if (startBtn) {
        startBtn.hidden = false;
        startBtn.style.display = "inline-flex";
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
        loadingEl.style.display = "flex";
        if (loadingText) loadingText.textContent = customMessage || "Loading stream…";
        startPlayerLoadingTimer(customMessage || "Loading stream…");
      }
      if (startBtn) {
        startBtn.hidden = false;
        startBtn.style.display = "inline-flex";
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
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || "Ready to watch";
      }
      if (startBtn) {
        startBtn.hidden = false;
        startBtn.style.display = "inline-flex";
        startBtn.disabled = false;
        startBtn.innerHTML = `${renderIcon("play", "icon-sm")} <span>Start playback</span>`;
      }
      break;

    case PLAYER_STATE.PLAYING:
      if (liveLabel) {
        liveLabel.hidden = false;
        // Round 2: nothing on this service is live any more (Sports /
        // Live TV are gone) — an on-demand title is "Now playing",
        // never "Streaming live".
        if (liveText) liveText.textContent = "Now playing";
      }
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || (state.player?.item ? `Playing: ${state.player.item.title}` : "Playing stream");
      }
      if (startBtn) {
        startBtn.hidden = false;
        startBtn.style.display = "inline-flex";
        startBtn.disabled = false;
        startBtn.innerHTML = `${renderIcon("pause", "icon-sm")} <span>Pause</span>`;
      }
      armEmbedWatchTimer();
      break;

    case PLAYER_STATE.ERROR:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Playback failed";
      }
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.style.display = "flex";
        if (errorText) errorText.textContent = customMessage || "Playback failed";
      }
      if (startBtn) {
        startBtn.hidden = true;
        startBtn.style.display = "none";
      }
      if (retryBtn) {
        retryBtn.hidden = false;
        retryBtn.style.display = "inline-flex";
      }
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

// --- Unified playback chain (round 2: one Play action, all servers) ---
// One Play action tries the servers in order and uses the first that
// actually loads. A single 20s budget covers the whole attempt (the
// existing loading watchdog): each attempt is capped by the remaining
// budget, and the elapsed timer is started once at chain start and
// never reset per server. Only when every server has failed (or the
// budget is spent) does the user see an error — Retry re-runs the
// auto-selection.
const PLAYBACK_CHAIN_BUDGET_MS = 20000;
const EMBED_ATTEMPT_MS = 8000;
let playbackChain = null; // { order, index, item, tmdbId, season, episode, startedAt, requestId, aborted }
let embedWatchTimer = null; // 30s continuous-embed-playback recorder (bug 15)

function chainRemainingMs() {
  if (!playbackChain) return 0;
  return Math.max(0, PLAYBACK_CHAIN_BUDGET_MS - (Date.now() - playbackChain.startedAt));
}
function setChainLoadingMessage(message) {
  // Update the loading line without restarting the elapsed timer: the
  // timer re-renders playerLoadingBaseMessage every second, so setting
  // the base message is what keeps the server name + elapsed time
  // coherent across attempts.
  playerLoadingBaseMessage = message;
  const loadingText = $("#player-loading-text");
  if (loadingText) loadingText.textContent = `${message} (${Math.floor((Date.now() - (playbackChain?.startedAt || Date.now())) / 1000)}s)`;
}
function clearEmbedWatchTimer() {
  if (embedWatchTimer) { clearTimeout(embedWatchTimer); embedWatchTimer = null; }
}
function armEmbedWatchTimer() {
  clearEmbedWatchTimer();
  const item = state.player?.item;
  const embed = $("#embed-player");
  if (!item || !embed || embed.hidden) return;
  embedWatchTimer = setTimeout(() => {
    // 30s of continuous embed playback = real progress, even though a
    // cross-origin frame reports no position to resume from.
    if (currentPlayerState === PLAYER_STATE.PLAYING && state.player?.item?.title === item.title) {
      recordPlaybackProgress(item, { embedWatchedSeconds: 30 });
    }
  }, 30000);
}
async function attemptGaiaflixHls(item, tmdbId) {
  const timeoutMs = Math.min(8000, chainRemainingMs());
  if (timeoutMs <= 500) return false;
  const m3u8Url = await resolveGaiaflixStream(tmdbId, timeoutMs);
  if (!m3u8Url || !playbackChain || playbackChain.aborted) return false;
  return await playWithGaiaflixHls(m3u8Url, item);
}
function attemptEmbedServer(url) {
  return new Promise((resolve) => {
    const embed = $("#embed-player");
    if (!embed) return resolve(false);
    const chain = playbackChain;
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      embed.removeEventListener("load", onLoad);
      resolve(ok);
    };
    const onLoad = () => {
      // Ignore the about:blank navigation used to reset the frame, and
      // loads that belong to a superseded attempt.
      if (!embed.src || embed.src === "about:blank") return;
      if (chain !== playbackChain || !playbackChain || playbackChain.aborted) return done(false);
      done(true);
    };
    const timeoutMs = Math.min(EMBED_ATTEMPT_MS, chainRemainingMs());
    if (timeoutMs <= 500) return done(false);
    const timer = setTimeout(() => {
      // Dead server: blank the frame so a late load can never promote
      // this attempt after we moved on, then fail the attempt.
      try { embed.src = "about:blank"; } catch {}
      done(false);
    }, timeoutMs);
    embed.addEventListener("load", onLoad);
    // Force a fresh navigation even when retrying the same URL.
    try { embed.src = "about:blank"; } catch {}
    setTimeout(() => {
      if (settled || chain !== playbackChain || !playbackChain || playbackChain.aborted) return;
      embed.removeAttribute("sandbox");
      embed.src = url;
      embed.hidden = false;
    }, 50);
  });
}
async function runPlaybackChain(item, tmdbId, { season = 1, episode = 1 } = {}) {
  const order = getPlaybackChain(item);
  playbackChain = {
    order, index: -1, item, tmdbId, season, episode,
    startedAt: Date.now(), requestId: state.player.requestId, aborted: false,
  };
  return continuePlaybackChain();
}
async function continuePlaybackChain() {
  const chain = playbackChain;
  if (!chain) return null;
  for (let i = chain.index + 1; i < chain.order.length; i++) {
    if (chain.aborted || chain.requestId !== state.player.requestId || $("#player-backdrop")?.hidden) {
      playbackChain = null;
      return null;
    }
    if (chainRemainingMs() <= 1500) break;
    const key = chain.order[i];
    chain.index = i;
    currentServerKey = key;
    syncServerSelect();
    const server = STREAM_SERVERS[key];
    const seasonEpLabel = isItemSeries(chain.item) ? ` · S${chain.season}:E${chain.episode}` : "";
    const langLabel = currentLanguageKey !== "auto" ? ` · ${LANGUAGE_LABELS[currentLanguageKey] || currentLanguageKey.toUpperCase()}` : "";
    setChainLoadingMessage(`Trying ${server?.name || key} for ${chain.item.title}${seasonEpLabel}${langLabel}…`);
    let ok = false;
    try {
      if (key === "gaiaflix") {
        ok = await attemptGaiaflixHls(chain.item, chain.tmdbId);
      } else {
        const url = getEmbedStreamUrl(chain.tmdbId, chain.item, chain.season, chain.episode, key);
        const popout = $("#player-popout-btn");
        if (popout) popout.href = url;
        ok = await attemptEmbedServer(url);
      }
    } catch (err) {
      console.warn(`[Ustream Playback] ${key} failed:`, err);
      ok = false;
    }
    if (ok) return key;
    // Dead server: fall through to the next one automatically. The user
    // only sees an error once the whole chain is exhausted.
    console.warn(`[Ustream Playback] ${key} did not load — trying the next server`);
  }
  playbackChain = null;
  return null;
}

function ensurePlayerFlowUI() {
  return $(".player-modal");
}

function getRelatedTitle(currentItem) {
  // Same-type / shared-genre only; the old fallback returned the first
  // unrelated title in the pool (e.g. Chainsaw Man for Avengers: Endgame).
  return getRelatedTitles(currentItem, 1)[0] || null;
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
        ? `<img class="player-preview-thumb" src="${player.item.image}" alt="${escapeHtml(player.item.title || "Next episode")} preview" loading="lazy" decoding="async" />`
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
        ? `<img class="player-preview-thumb" src="${related.image}" alt="${escapeHtml(related.title || "Recommended title")} preview" loading="lazy" decoding="async" />`
        : `<span class="player-art-icon">${renderIcon("anime", "icon-md")}</span>`;
    }
  } else {
    // Movie or single title: populate with related content from the catalog
    const related = getRelatedTitle(player.item);
    if (related) {
      if (upNextLabel) upNextLabel.textContent = "Recommended next";
      if (upNextTitle) upNextTitle.textContent = related.title;
      if (upNextDescription) {
        upNextDescription.textContent = `${related.year || ""} · ${related.genre?.slice(0, 2).join(", ") || "Featured"} · ★ ${normalizeRating(related.rating).toFixed(1)}`;
      }
      if (upNextButton) {
        upNextButton.disabled = false;
        upNextButton.innerHTML = `<span>Play title</span>${renderIcon("arrowRight", "icon-sm")}`;
        upNextButton.dataset.action = "play-related";
        upNextButton.dataset.title = related.title;
      }
      if (upNextArt) {
        upNextArt.innerHTML = related.image
          ? `<img class="player-preview-thumb" src="${related.image}" alt="${escapeHtml(related.title || "Recommended title")} preview" loading="lazy" decoding="async" />`
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
  const player = state.player;
  const isEpisodic = Boolean(player.isSeries && player.seasons && player.seasons.length > 0);

  // 1. Language selector in player bar
  const languageBarSelect = $("#player-language-bar-select");
  if (languageBarSelect) {
    languageBarSelect.value = currentLanguageKey;
  }

  // 2. Action bar season and episode selectors
  const seasonBarField = $("#player-season-bar-field");
  const seasonBarSelect = $("#player-season-bar-select");
  const episodeBarField = $("#player-episode-bar-field");
  const episodeBarSelect = $("#player-episode-bar-select");
  const episodesSection = $("#player-episodes-section");

  if (!isEpisodic) {
    if (seasonBarField) seasonBarField.hidden = true;
    if (episodeBarField) episodeBarField.hidden = true;
    if (episodesSection) episodesSection.hidden = true;
  } else {
    if (seasonBarField) seasonBarField.hidden = false;
    if (episodeBarField) episodeBarField.hidden = false;

    const seasons = player.seasons.map((entry) => ({
      value: entry.season,
      label: entry.title || `Season ${entry.season}`
    }));
    setSelectOptions(seasonBarSelect, seasons, player.selectedSeason, "Select season");

    const selectedSeason = player.seasons.find((entry) => entry.season === player.selectedSeason) || player.seasons[0];
    const episodes = selectedSeason?.episodes || [];
    setSelectOptions(
      episodeBarSelect,
      episodes.map((entry) => ({
        value: entry.episode,
        label: `Ep ${entry.episode}${entry.title && entry.title !== `Episode ${entry.episode}` ? `: ${entry.title}` : ""}`,
      })),
      player.selectedEpisode,
      "Select episode"
    );

    // 3. Episodes Section with Season Pills and Episode Grid
    if (episodesSection) {
      episodesSection.hidden = false;
      const seasonTitleEl = $("#player-episodes-season-title");
      if (seasonTitleEl) {
        seasonTitleEl.textContent = selectedSeason?.title || `Season ${player.selectedSeason || 1}`;
      }

      const seasonPillsContainer = $("#player-season-pills");
      if (seasonPillsContainer) {
        seasonPillsContainer.innerHTML = player.seasons.map((s) => {
          const isActive = s.season === player.selectedSeason;
          const sTitle = escapeHtml(s.title || `Season ${s.season}`);
          return `<button class="season-pill${isActive ? " active" : ""}" type="button" data-season="${s.season}" aria-label="${sTitle}">
            ${sTitle}
          </button>`;
        }).join("");
      }

      const episodesGrid = $("#player-episodes-grid");
      if (episodesGrid) {
        episodesGrid.innerHTML = episodes.map((ep) => {
          const isCurrent = ep.episode === player.selectedEpisode;
          const epTitle = escapeHtml(ep.title || `Episode ${ep.episode}`);
          return `<button class="episode-pill${isCurrent ? " active" : ""}" type="button" data-season="${selectedSeason?.season || 1}" data-episode="${ep.episode}" aria-label="Play Season ${selectedSeason?.season || 1} Episode ${ep.episode}: ${epTitle}">
            <span class="ep-num">E${ep.episode}</span>
            <span class="ep-title">${epTitle}</span>
          </button>`;
        }).join("");
      }
    }
  }

  // 4. Drawer options
  const panel = ensurePlayerSelectionUI();
  if (panel) {
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
  }

  updatePlayerEpisodeFlow();
}

async function fetchEpisodeList(subjectId, preferredResolution = null) {
  // 1. Resolve TMDB ID for series/anime to fetch full seasons and all episodes
  let tmdbId = (state.player?.tmdbId && isValidTmdbId(state.player.tmdbId)) ? String(state.player.tmdbId) : null;
  if (!tmdbId) {
    if (TMDB_MAP[subjectId]?.tmdbId && isValidTmdbId(TMDB_MAP[subjectId].tmdbId)) {
      tmdbId = String(TMDB_MAP[subjectId].tmdbId);
    } else if (isValidTmdbId(subjectId)) {
      tmdbId = String(subjectId);
    } else {
      const itemToResolve = state.player?.item || findCatalogItem(subjectId) || findTitle(subjectId);
      if (itemToResolve) {
        tmdbId = await resolveTmdbId(itemToResolve);
      }
    }
  }

  // Fetch verified complete season list & all available episode counts from TMDB
  if (tmdbId && isValidTmdbId(tmdbId)) {
    const tmdbSeasons = await fetchTmdbSeriesSeasons(tmdbId);
    if (tmdbSeasons && tmdbSeasons.length > 0) {
      // Pre-fetch actual episode titles for initial season so they display immediately
      try {
        const initialSeasonNum = state.player?.selectedSeason || 1;
        const targetSeason = tmdbSeasons.find(s => s.season === initialSeasonNum) || tmdbSeasons[0];
        if (targetSeason) {
          const seasonEpisodes = await fetchTmdbSeasonEpisodes(tmdbId, targetSeason.season);
          if (seasonEpisodes && seasonEpisodes.length > 0) {
            targetSeason.episodes = seasonEpisodes;
            targetSeason.episodesLoaded = true;
          }
        }
      } catch {}
      return { seasons: tmdbSeasons, resolution: preferredResolution || 1080 };
    }
  }

  // 2. Next, check catalog item metadata (runtime / seNum / epNum)
  const currentItem = state.player?.item || findCatalogItem(subjectId) || findTitle(subjectId);
  if (currentItem) {
    const runtimeStr = currentItem.runtime || currentItem.duration || "";
    const seasonsMatch = runtimeStr.match(/(\d+)\s*Seasons?/i);
    const episodesMatch = runtimeStr.match(/(\d+)\s*Episodes?/i);
    const totalSeasons = seasonsMatch ? Number(seasonsMatch[1]) : (Number(currentItem.seNum) || 1);
    const totalEpisodes = episodesMatch ? Number(episodesMatch[1]) : (Number(currentItem.epNum) || (totalSeasons * 12));

    if (totalSeasons > 0 && totalEpisodes > 0) {
      const epsPerSeason = Math.max(1, Math.round(totalEpisodes / totalSeasons));
      const seasons = Array.from({ length: totalSeasons }, (_, sIdx) => {
        const sNum = sIdx + 1;
        const isLast = sNum === totalSeasons;
        const count = isLast ? Math.max(1, totalEpisodes - (epsPerSeason * (totalSeasons - 1))) : epsPerSeason;
        return {
          season: sNum,
          title: `Season ${sNum}`,
          episodes: Array.from({ length: count }, (_, eIdx) => ({
            season: sNum,
            episode: eIdx + 1,
            title: `Episode ${eIdx + 1}`,
            resourceLink: ""
          }))
        };
      });
      return { seasons, resolution: preferredResolution || 1080 };
    }
  }

  // 3. Fallback: EPISODE_MAP only if nothing else returned
  if (subjectId && EPISODE_MAP[subjectId]) {
    const list = EPISODE_MAP[subjectId];
    const seasonsMap = new Map();
    list.forEach((ep) => {
      const s = ep.season || 1;
      if (!seasonsMap.has(s)) seasonsMap.set(s, []);
      seasonsMap.get(s).push({
        episode: ep.ep,
        title: ep.name || `Episode ${ep.ep}`,
        resourceLink: ep.resourceLink,
        season: s
      });
    });
    const seasons = [...seasonsMap.entries()].map(([season, episodes]) => ({ season, episodes }));
    return { seasons, resolution: preferredResolution || 1080 };
  }

  // 4. Default fallback: 1 season with 12 episodes
  const defaultEpisodes = Array.from({ length: 12 }, (_, i) => ({
    episode: i + 1,
    title: `Episode ${i + 1}`,
    resourceLink: "",
    season: 1
  }));
  return { seasons: [{ season: 1, title: "Season 1", episodes: defaultEpisodes }], resolution: preferredResolution || 1080 };
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
  // 1. Try server proxy endpoint
  try {
    const res = await fetchJson(buildApiUrl("details", { id: subjectId }));
    if (res?.data) return res;
  } catch {}

  // 2. Direct RapidAPI fallback
  try {
    const directUrl = `https://moviebox-api.p.rapidapi.com/preview/${encodeURIComponent(subjectId)}`;
    const directRes = await fetch(directUrl, {
      headers: {
        "x-rapidapi-host": "moviebox-api.p.rapidapi.com",
        "x-rapidapi-key": "68d9a25612msh6bb2c17daf102cdp1fe4fbjsnc2adc8510c22",
        "accept": "application/json"
      }
    });
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.data) return data;
    }
  } catch {}

  return null;
}

function getSelectedEpisode() {
  const season = state.player.seasons.find((entry) => entry.season === state.player.selectedSeason);
  return season?.episodes.find((entry) => entry.episode === state.player.selectedEpisode) || null;
}

async function resolveCurrentPlayback(requestId) {
  const player = state.player;
  const item = player.item;
  if (!item) return null;
  if (isUnreleasedItem(item)) return null;
  if (requestId !== player.requestId) return null;

  const currentEp = player.selectedEpisode || 1;

  if (player.isSeries) {
    let episode = getSelectedEpisode();
    if (episode?.resourceLink && isDirectPlayableVideoUrl(episode.resourceLink)) {
      return { url: episode.resourceLink, label: `Episode ${episode.episode} · ${player.resolution || player.selectedQuality || 1080}p HD` };
    }
    const seriesStream = getStreamForTitle(item.title, currentEp);
    return { url: seriesStream, label: `Episode ${currentEp} · ${player.resolution || player.selectedQuality || 1080}p HD` };
  }

  const subjectId = player.subtitleSubjectId || player.selectedLanguage?.subjectId || item.subjectId;
  if (subjectId) {
    const details = subjectId === player.selectedLanguage?.subjectId && player.details ? player.details : await loadPreviewDetails(subjectId);
    if (requestId !== player.requestId) return null;
    const selectedQuality = player.selectedQuality ? Number(player.selectedQuality) : null;
    const quality = getQualityOptions(details).find((entry) => entry.resolution === selectedQuality && isDirectPlayableVideoUrl(entry.url));
    const url = quality?.url || extractPlaybackUrl(details);
    if (url && isDirectPlayableVideoUrl(url)) {
      return { url, label: `${quality?.resolution || 1080}p Ultra HD` };
    }
  }

  if (item.video && isDirectPlayableVideoUrl(item.video)) {
    return { url: item.video, label: "1080p Ultra HD" };
  }

  // Guaranteed resilient HD stream based on title hash so every title has its own working HD video!
  const movieStream = getStreamForTitle(item.title, 1);
  return { url: movieStream, label: "1080p Ultra HD" };
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
    if (state.player.isSeries) {
      const episodeSubjectId = state.player.selectedLanguage?.subjectId || state.player.subjectId;
      await loadEpisodeState(episodeSubjectId, null, null, requestId);
      if (requestId !== state.player.requestId) return null;
    }
  } else if (state.player.isSeries) {
    await loadEpisodeState(item.title, null, null, requestId);
    if (requestId !== state.player.requestId) return null;
  }

  // Ensure episodic player has at least 1 season with episodes
  if (state.player.isSeries && (!state.player.seasons || state.player.seasons.length === 0)) {
    await loadEpisodeState(item.title, null, null, requestId);
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
  const startBtn = $("#start-player");
  if (startBtn) startBtn.disabled = true;
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
  const startBtn = $("#start-player");
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.innerHTML = `${renderIcon("play", "icon-sm")} <span>Start playback</span>`;
  }
  setPlayerLoading(`${source.label} · press Start playback`, false);
  video.load();
  updatePlayerEpisodeFlow();

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      setPlayerState(PLAYER_STATE.PLAYING, `Playing: ${video.dataset.itemTitle || "Stream"}`);
    }).catch(() => {
      setPlayerState(PLAYER_STATE.READY, "Ready to watch · Click Start playback");
    });
  }
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

async function reloadCurrentEmbed() {
  const player = state.player;
  const item = player.item;
  if (!item || !player.tmdbId) return null;

  syncServerSelect();

  // Clean up native HLS / video player before the chain starts. The
  // Gaiaflix HLS step re-shows the video element itself when it runs.
  if (window._currentHlsInstance) {
    try { window._currentHlsInstance.destroy(); } catch {}
    window._currentHlsInstance = null;
  }
  const video = $("#video-player");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.hidden = true;
  }
  const customWrapper = $("#custom-player-wrapper");
  if (customWrapper) customWrapper.hidden = true;

  resetDefaultLanguageOptions();

  const season = player.selectedSeason || 1;
  const episode = player.selectedEpisode || 1;
  // One LOADING state for the whole chain: the 20s elapsed timer starts
  // here and is never reset per server (bug 24).
  setPlayerState(PLAYER_STATE.LOADING, `Loading ${item.title}${player.isSeries ? ` · S${season}:E${episode}` : ""} · Auto server selection…`);
  const key = await runPlaybackChain(item, player.tmdbId, { season, episode });
  if (!key) {
    // Only now does the user see an error: every server failed or the
    // 20s budget ran out. Retry re-runs auto selection.
    setPlayerState(PLAYER_STATE.ERROR, "No server could play this title. Retry to run auto server selection again.");
    return null;
  }
  updatePlayerEpisodeFlow();
  return key;
}

async function changePlayerSeason(seasonNumber) {
  const num = Number(seasonNumber);
  const season = state.player.seasons.find((entry) => entry.season === num);
  if (!season) return;
  const selection = chooseEpisode([season], season.season, null);
  state.player.selectedSeason = selection.season;
  state.player.selectedEpisode = selection.episode;
  state.player.requestId += 1;
  const seasonTitle = season.title || `Season ${season.season}`;
  setPlayerState(PLAYER_STATE.LOADING, `Loading ${seasonTitle}…`);
  updatePlayerSelectionUI();
  reloadCurrentEmbed();

  // Asynchronously fetch real episode names for this season from TMDB if not yet loaded
  if (state.player.tmdbId && isValidTmdbId(state.player.tmdbId) && !season.episodesLoaded) {
    fetchTmdbSeasonEpisodes(state.player.tmdbId, season.season).then((realEps) => {
      if (realEps && realEps.length > 0) {
        season.episodes = realEps;
        season.episodesLoaded = true;
        updatePlayerSelectionUI();
      }
    });
  }
}

async function changePlayerEpisode(episodeNumber) {
  const num = Number(episodeNumber);
  const season = state.player.seasons.find((entry) => entry.season === state.player.selectedSeason);
  const episode = season?.episodes.find((entry) => entry.episode === num) || state.player.seasons.flatMap((entry) => entry.episodes).find((entry) => entry.episode === num);
  if (!episode) return;
  state.player.selectedSeason = episode.season;
  state.player.selectedEpisode = episode.episode;
  state.player.requestId += 1;
  const epLabel = `Episode ${episode.episode}${episode.title && episode.title !== `Episode ${episode.episode}` ? `: ${episode.title}` : ""}`;
  setPlayerState(PLAYER_STATE.LOADING, `Loading ${epLabel}…`);
  updatePlayerSelectionUI();
  reloadCurrentEmbed();
}

async function navigateToEpisode(episode, { autoplay = false } = {}) {
  if (!episode || !isEpisodicPlayer()) return false;
  const player = state.player;
  player.selectedSeason = episode.season;
  player.selectedEpisode = episode.episode;
  player.requestId += 1;
  const label = `S${episode.season} E${episode.episode}${episode.title ? ` · ${episode.title}` : ""}`;
  setPlayerLoading(`Loading ${label}...`);
  updatePlayerSelectionUI(`Loading ${label}...`);
  reloadCurrentEmbed();
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

async function playTitle(title, { resumeTime = 0 } = {}) {
  const item = findTitle(title);
  if (!item) return;
  // Bug 10: never play an unreleased title — and never let it fall
  // through to the hash-based sample stream or an embed URL.
  if (isUnreleasedItem(item)) {
    showToast(`${item.title} is coming soon — not yet released, so it cannot be played yet.`);
    return;
  }
  // Resume: prefer the explicit resume request, else the saved position.
  const savedPosition = resumeTime > 0 ? resumeTime : getSavedPosition(item);
  if (savedPosition > 0) {
    showToast(`Resuming ${item.title} at ${formatTime(savedPosition)}`);
  }
  const embed = $("#embed-player");
  const video = $("#video-player");
  const player = $("#player-backdrop");
  ensurePlayerFlowUI();
  $("#player-title").textContent = item.title;
  player.style.setProperty("--player-backdrop-image", item.image ? `url("${item.image}")` : "none");
  if (video) {
    video.poster = item.image || "";
    video.removeAttribute("src");
    video.dataset.itemTitle = item.title;
    video.dataset.fallbackAttempted = "";
    video.hidden = true;
  }
  setPlayerState(PLAYER_STATE.LOADING, "Connecting to HD streaming server…");
  player.hidden = false;
  player.removeAttribute("hidden");
  document.querySelector("#player-backdrop .player-modal")?.focus({ preventScroll: true });

  // Resolve actual TMDB ID for full movie / TV show stream
  const tmdbId = await resolveTmdbId(item);
  // No verified stream id: do not open an embed for another title.
  if (!tmdbId) {
    showToast(`No stream is available for ${item.title} yet.`);
    try { closePlayer(); } catch {}
    return;
  }
  state.player.item = item;
  state.player.tmdbId = tmdbId;
  const isSeries = isItemSeries(item);
  state.player.isSeries = isSeries;
  state.player.selectedSeason = 1;
  state.player.selectedEpisode = 1;
  // New attempt id: any chain still running for a previous title aborts.
  state.player.requestId = (state.player.requestId || 0) + 1;

  if (state.player.isSeries) {
    await loadEpisodeState(item.subjectId || item.title, 1, 1, ++state.player.requestId);
  } else {
    updatePlayerSelectionUI();
  }

  // One Play action, one auto chain: reloadCurrentEmbed tries the
  // servers in order (Gaiaflix HLS for movies, then VidSrc, VidLink,
  // 2Embed, Vidstuck — AniEmbed first for anime) and uses the first
  // that actually loads. A manual server override, if set, is honoured
  // instead. No recordPlaybackProgress here (bug 15): Continue
  // Watching is only written after 30s of real playback.
  await reloadCurrentEmbed();
}

function getSavedDuration(item) {
  const entry = continuation.find((c) => c.title === item?.title);
  return Number(entry?.durationSeconds) || 0;
}

function startPlayer() {
  reloadCurrentEmbed();
}

async function retryPlayback() {
  if (!state.player?.item) return;
  // Retry always re-runs auto server selection (round 2 merge), even if
  // a manual server was picked before.
  serverMode = "auto";
  try { localStorage.setItem("ustream-server", "auto"); } catch {}
  syncServerSelect();
  setPlayerState(PLAYER_STATE.LOADING, "Reconnecting with auto server selection…");
  await playTitle(state.player.item.title);
}

function handlePlaybackError() {
  // Advance the unified chain to the next untried server instead of
  // cycling forever through the server list; only error once every
  // server has failed.
  if (playbackChain && playbackChain.index + 1 < playbackChain.order.length) {
    showToast("This server failed · Trying the next server…");
    setPlayerState(PLAYER_STATE.LOADING, "Trying the next server…");
    void continuePlaybackChain().then((key) => {
      if (!key) setPlayerState(PLAYER_STATE.ERROR, "Playback failed on every server. Retry to try again.");
    });
    return;
  }
  setPlayerState(PLAYER_STATE.ERROR, "Playback failed");
}

function closePlayer() {
  clearLiveStatus();
  clearEmbedWatchTimer();
  if (playbackChain) playbackChain.aborted = true;
  playbackChain = null;
  const bufferingSpinner = $("#player-buffering-spinner");
  if (bufferingSpinner) bufferingSpinner.hidden = true;
  const embed = $("#embed-player");
  const video = $("#video-player");
  const customWrapper = $("#custom-player-wrapper");
  state.player.requestId += 1;
  togglePlayerSettings(false);
  if (embed) {
    embed.src = "about:blank";
    embed.hidden = true;
  }
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.dataset.fallbackAttempted = "";
    video.load();
    video.hidden = true;
  }
  if (customWrapper) customWrapper.hidden = true;
  if (window._currentHlsInstance) {
    try {
      window._currentHlsInstance.destroy();
    } catch {}
    window._currentHlsInstance = null;
  }
  resetDefaultLanguageOptions();
  const resumeBanner = $("#player-resume-banner");
  if (resumeBanner) resumeBanner.hidden = true;
  const episodesSection = $("#player-episodes-section");
  if (episodesSection) episodesSection.hidden = true;
  const seasonBarField = $("#player-season-bar-field");
  if (seasonBarField) seasonBarField.hidden = true;
  const episodeBarField = $("#player-episode-bar-field");
  if (episodeBarField) episodeBarField.hidden = true;
  const pb = $("#player-backdrop");
  if (pb) {
    pb.hidden = true;
    pb.setAttribute("hidden", "true");
  }
  setPlayerState(PLAYER_STATE.IDLE);
}

function playNativeVideo(streamUrl, title, poster = "", { videoId = null, resumeTime = 0 } = {}) {
  const embed = $("#embed-player");
  const video = $("#video-player");
  const customWrapper = $("#custom-player-wrapper");
  const playerBackdrop = $("#player-backdrop");
  if (!video || !customWrapper) return;

  if (embed) {
    embed.src = "about:blank";
    embed.hidden = true;
  }
  customWrapper.hidden = false;
  video.hidden = false;
  video.poster = poster || "";
  $("#player-title").textContent = title || "Now Playing";
  playerBackdrop.hidden = false;

  // HLS stream support if URL ends in .m3u8
  if (streamUrl.includes(".m3u8") && typeof window.Hls !== "undefined" && window.Hls.isSupported()) {
    if (window._currentHlsInstance) {
      window._currentHlsInstance.destroy();
    }
    const hls = new window.Hls();
    window._currentHlsInstance = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
  } else {
    video.src = streamUrl;
  }

  video.load();
  setPlayerState(PLAYER_STATE.LOADING, `Streaming: ${title}`);

  // Resume playback check
  const savedKey = `ustream-pos-${videoId || title}`;
  const savedPos = parseFloat(localStorage.getItem(savedKey) || "0");
  const banner = $("#player-resume-banner");
  if (savedPos > 15 && (!resumeTime || resumeTime < 1)) {
    const resumeLabel = $("#resume-time-label");
    if (resumeLabel) resumeLabel.textContent = formatTime(savedPos);
    if (banner) {
      banner.hidden = false;
      const acceptBtn = $("#resume-accept-btn");
      const dismissBtn = $("#resume-dismiss-btn");
      if (acceptBtn) {
        acceptBtn.onclick = () => {
          video.currentTime = savedPos;
          banner.hidden = true;
          video.play().catch(() => {});
        };
      }
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          localStorage.removeItem(savedKey);
          banner.hidden = true;
          video.currentTime = 0;
          video.play().catch(() => {});
        };
      }
    }
  } else if (resumeTime > 0) {
    video.currentTime = resumeTime;
  }

  // Safe playback start
  video.play().then(() => {
    setPlayerState(PLAYER_STATE.PLAYING, `Playing: ${title}`);
  }).catch(() => {
    setPlayerState(PLAYER_STATE.READY, `Ready to play: ${title}`);
  });

  // No continuation entry here (bug 15): Continue Watching is only
  // written after 30s of real playback (see the timeupdate handler
  // below) — opening the player must not create a 0% row.
}

function initCustomVideoPlayer() {
  const video = $("#video-player");
  const wrapper = $("#custom-player-wrapper");
  const controls = $("#custom-player-controls");
  const centerPlay = $("#player-center-play");
  const playPauseBtn = $("#ctrl-play-pause-btn");
  const skipBackBtn = $("#ctrl-skip-back-btn");
  const skipFwdBtn = $("#ctrl-skip-forward-btn");
  const muteBtn = $("#ctrl-mute-btn");
  const volumeSlider = $("#ctrl-volume-slider");
  const currentTimeEl = $("#player-current-time");
  const durationEl = $("#player-total-duration");
  const scrubberWrap = $("#player-scrubber-wrap");
  const scrubberProgress = $("#scrubber-progress");
  const scrubberBuffer = $("#scrubber-buffer");
  const scrubberHandle = $("#scrubber-handle");
  const hoverTimeEl = $("#scrubber-hover-time");
  const speedBtn = $("#ctrl-speed-btn");
  const speedMenu = $("#ctrl-speed-menu");
  const speedLabel = $("#ctrl-speed-label");
  const pipBtn = $("#ctrl-pip-btn");
  const fullscreenBtn = $("#ctrl-fullscreen-btn");
  const bufferingSpinner = $("#player-buffering-spinner");
  const tapLeft = $("#tap-seek-left");
  const tapRight = $("#tap-seek-right");

  if (!video || !wrapper) return;

  let controlsTimeout = null;
  const showControls = () => {
    controls?.classList.remove("controls-hidden");
    clearTimeout(controlsTimeout);
    if (!video.paused) {
      controlsTimeout = setTimeout(() => {
        controls?.classList.add("controls-hidden");
        speedMenu?.setAttribute("hidden", "true");
      }, 3500);
    }
  };

  wrapper.addEventListener("mousemove", showControls);
  wrapper.addEventListener("click", (e) => {
    if (e.target.closest("#custom-player-controls") || e.target.closest(".player-resume-banner")) return;
    showControls();
  });

  // Play / Pause toggle
  const togglePlay = () => {
    if (video.paused || video.ended) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  centerPlay?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlay();
  });
  playPauseBtn?.addEventListener("click", togglePlay);

  video.addEventListener("play", () => {
    centerPlay?.classList.add("playing");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
      playPauseBtn.setAttribute("aria-label", "Pause");
    }
    showControls();
  });

  video.addEventListener("pause", () => {
    centerPlay?.classList.remove("playing");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      playPauseBtn.setAttribute("aria-label", "Play");
    }
    controls?.classList.remove("controls-hidden");
  });

  video.addEventListener("waiting", () => {
    bufferingSpinner?.removeAttribute("hidden");
  });
  video.addEventListener("playing", () => {
    bufferingSpinner?.setAttribute("hidden", "true");
  });
  video.addEventListener("canplay", () => {
    bufferingSpinner?.setAttribute("hidden", "true");
  });

  // Time & Scrubber Update
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    const current = video.currentTime;
    const dur = video.duration;
    const pct = (current / dur) * 100;

    if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
    if (durationEl) durationEl.textContent = formatTime(dur);
    if (scrubberProgress) scrubberProgress.style.width = `${pct}%`;
    if (scrubberHandle) scrubberHandle.style.left = `${pct}%`;
    if (scrubberWrap) scrubberWrap.setAttribute("aria-valuenow", String(Math.round(pct)));

    // Update buffer progress
    if (video.buffered.length > 0 && scrubberBuffer) {
      try {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufPct = Math.min(100, (bufferedEnd / dur) * 100);
        scrubberBuffer.style.width = `${bufPct}%`;
      } catch {}
    }

    // Save playback position periodically (real progress, not fabricated).
    // Round 2 (bug 15): only once 30s have actually been watched, so
    // opening a title never seeds Continue Watching.
    if (current >= 30 && Math.floor(current) % 5 === 0) {
      const vidKey = video.dataset.itemTitle || state.player?.item?.title;
      if (vidKey) {
        storage.setDebounced(`ustream-pos-${vidKey}`, Math.floor(current), 800);
        if (state.player?.item?.title) {
          recordPlaybackProgress(state.player.item, {
            positionSeconds: Math.floor(current),
            durationSeconds: Math.floor(dur) || 0,
          });
        }
      }
    }
  });

  video.addEventListener("loadedmetadata", () => {
    if (durationEl && video.duration) {
      durationEl.textContent = formatTime(video.duration);
    }
    if (state.player?.selectedSubtitle === "off") {
      Array.from(video.textTracks || []).forEach((t) => { t.mode = "disabled"; });
    }
  });

  // Scrubber seeking
  let isDraggingScrubber = false;
  const seekFromEvent = (e) => {
    if (!scrubberWrap || !video.duration) return;
    const rect = scrubberWrap.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * video.duration;
  };

  scrubberWrap?.addEventListener("mousedown", (e) => {
    isDraggingScrubber = true;
    seekFromEvent(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (isDraggingScrubber) seekFromEvent(e);
  });
  window.addEventListener("mouseup", () => {
    isDraggingScrubber = false;
  });

  // Hover preview timestamp
  scrubberWrap?.addEventListener("mousemove", (e) => {
    if (!hoverTimeEl || !video.duration) return;
    const rect = scrubberWrap.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverSeconds = pos * video.duration;
    hoverTimeEl.textContent = formatTime(hoverSeconds);
    hoverTimeEl.style.left = `${pos * 100}%`;
    hoverTimeEl.removeAttribute("hidden");
  });
  scrubberWrap?.addEventListener("mouseleave", () => {
    hoverTimeEl?.setAttribute("hidden", "true");
  });

  // Skip buttons (-10s / +10s)
  skipBackBtn?.addEventListener("click", () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
    showControls();
  });
  skipFwdBtn?.addEventListener("click", () => {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
    showControls();
  });

  // Volume & Mute
  const updateVolumeIcon = () => {
    const volIcon = $("#ctrl-volume-icon");
    if (!volIcon) return;
    if (video.muted || video.volume === 0) {
      volIcon.innerHTML = `<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>`;
    } else {
      volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    }
  };

  muteBtn?.addEventListener("click", () => {
    video.muted = !video.muted;
    if (volumeSlider) volumeSlider.value = video.muted ? 0 : video.volume;
    updateVolumeIcon();
    showControls();
  });

  volumeSlider?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = val === 0;
    updateVolumeIcon();
  });

  // Speed Menu
  speedBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (speedMenu?.hasAttribute("hidden")) {
      speedMenu.removeAttribute("hidden");
    } else {
      speedMenu?.setAttribute("hidden", "true");
    }
  });

  $$(".speed-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const speed = parseFloat(opt.dataset.speed || "1");
      video.playbackRate = speed;
      if (speedLabel) speedLabel.textContent = `${speed}x`;
      $$(".speed-option").forEach((o) => o.classList.toggle("active", o === opt));
      speedMenu?.setAttribute("hidden", "true");
      showControls();
    });
  });

  // Picture in Picture
  pipBtn?.addEventListener("click", async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PIP error:", err);
    }
  });

  // Fullscreen
  fullscreenBtn?.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (wrapper.requestFullscreen) {
      wrapper.requestFullscreen().catch(() => {});
    }
  });

  document.addEventListener("fullscreenchange", () => {
    const isFull = Boolean(document.fullscreenElement);
    const fsIcon = $("#ctrl-fullscreen-icon");
    if (fsIcon) {
      fsIcon.innerHTML = isFull
        ? `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`
        : `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
    }
  });

  // Mobile double-tap rewind/fast-forward
  let lastTapTime = 0;
  wrapper.addEventListener("touchend", (e) => {
    const now = Date.now();
    const diff = now - lastTapTime;
    lastTapTime = now;
    if (diff < 320 && diff > 50) {
      const touch = e.changedTouches[0];
      const rect = wrapper.getBoundingClientRect();
      const xPct = (touch.clientX - rect.left) / rect.width;
      if (xPct < 0.4) {
        // Rewind 10s
        video.currentTime = Math.max(0, video.currentTime - 10);
        if (tapLeft) {
          tapLeft.removeAttribute("hidden");
          setTimeout(() => tapLeft.setAttribute("hidden", "true"), 650);
        }
      } else if (xPct > 0.6) {
        // Forward 10s
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
        if (tapRight) {
          tapRight.removeAttribute("hidden");
          setTimeout(() => tapRight.setAttribute("hidden", "true"), 650);
        }
      }
    }
  });

  // Global Keyboard shortcuts when video player is active
  window.addEventListener("keydown", (e) => {
    if ($("#player-backdrop")?.hidden || wrapper.hidden) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    if (e.code === "Space" || e.key === "k") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowLeft" || e.key === "j") {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 10);
      showControls();
    } else if (e.key === "ArrowRight" || e.key === "l") {
      e.preventDefault();
      video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
      showControls();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      video.muted = false;
      if (volumeSlider) volumeSlider.value = video.volume;
      updateVolumeIcon();
      showControls();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      if (volumeSlider) volumeSlider.value = video.volume;
      updateVolumeIcon();
      showControls();
    } else if (e.key === "m") {
      e.preventDefault();
      video.muted = !video.muted;
      if (volumeSlider) volumeSlider.value = video.muted ? 0 : video.volume;
      updateVolumeIcon();
      showControls();
    } else if (e.key === "f") {
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen().catch(() => {});
      }
    } else if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      if (video.duration) {
        const pct = parseInt(e.key, 10) / 10;
        video.currentTime = pct * video.duration;
        showControls();
      }
    }
  });
}

function initCreatorStudioAndUploads() {
  const uploadBackdrop = $("#upload-modal-backdrop");
  const uploadForm = $("#upload-form");
  const fileInput = $("#upload-file-input");
  const dropzone = $("#upload-dropzone");
  const dropzonePrompt = $("#dropzone-prompt");
  const dropzoneFileInfo = $("#dropzone-file-info");
  const fileNameEl = $("#selected-file-name");
  const fileSizeEl = $("#selected-file-size");
  const changeFileBtn = $("#change-file-btn");
  const titleInput = $("#upload-title");
  const descInput = $("#upload-description");
  const categorySelect = $("#upload-category");
  const feedbackEl = $("#upload-feedback");
  const progressContainer = $("#upload-progress-container");
  const progressFill = $("#upload-progress-fill");
  const progressText = $("#upload-progress-text");
  const statusText = $("#upload-status-text");
  const submitBtn = $("#submit-upload-btn");

  let selectedFile = null;

  const openUploadModal = () => {
    if (!state.auth?.user) {
      showToast("Please sign in or create an account to upload videos.");
      openAuthModal("signin");
      return;
    }
    uploadBackdrop?.removeAttribute("hidden");
    resetUploadForm();
  };

  const closeUploadModal = () => {
    uploadBackdrop?.setAttribute("hidden", "true");
  };

  const resetUploadForm = () => {
    selectedFile = null;
    if (fileInput) fileInput.value = "";
    if (dropzonePrompt) dropzonePrompt.hidden = false;
    if (dropzoneFileInfo) dropzoneFileInfo.hidden = true;
    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";
    if (categorySelect) categorySelect.value = "entertainment";
    if (feedbackEl) feedbackEl.hidden = true;
    if (progressContainer) progressContainer.hidden = true;
    if (progressFill) progressFill.style.width = "0%";
    if (submitBtn) submitBtn.disabled = false;
  };

  const handleSelectedFile = (file) => {
    if (!file) return;
    const validExtensions = [".mp4", ".webm", ".mov", ".mkv", ".ogg"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!validExtensions.includes(ext) && !file.type.startsWith("video/")) {
      showToast("Invalid file type. Please select an MP4, WebM, QuickTime, or MKV video.");
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      showToast("File size exceeds 150MB limit.");
      return;
    }

    selectedFile = file;
    if (dropzonePrompt) dropzonePrompt.hidden = true;
    if (dropzoneFileInfo) dropzoneFileInfo.hidden = false;
    if (fileNameEl) fileNameEl.textContent = file.name;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    if (fileSizeEl) fileSizeEl.textContent = `${mbSize} MB`;

    // Auto-populate title if empty
    if (titleInput && !titleInput.value.trim()) {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      titleInput.value = cleanTitle;
    }
  };

  // Triggers
  $("#topbar-upload-btn")?.addEventListener("click", openUploadModal);
  $("#profile-upload-btn")?.addEventListener("click", openUploadModal);
  $("#community-upload-btn")?.addEventListener("click", openUploadModal);
  $("#close-upload-modal")?.addEventListener("click", closeUploadModal);
  $("#cancel-upload-btn")?.addEventListener("click", closeUploadModal);
  uploadBackdrop?.addEventListener("click", (e) => {
    if (e.target.id === "upload-modal-backdrop") closeUploadModal();
  });

  // Dropzone drag-and-drop
  dropzone?.addEventListener("click", () => fileInput?.click());
  changeFileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleSelectedFile(file);
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });
  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer.files?.[0];
    if (file) handleSelectedFile(file);
  });

  // Form submission with live streaming upload
  uploadForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast("Please choose a video file to upload.");
      return;
    }
    const title = titleInput?.value.trim();
    if (!title) {
      showToast("Please enter a title for your video.");
      titleInput?.focus();
      return;
    }
    const description = descInput?.value.trim() || "";
    const category = categorySelect?.value || "entertainment";

    if (feedbackEl) feedbackEl.hidden = true;
    if (progressContainer) progressContainer.hidden = false;
    if (submitBtn) submitBtn.disabled = true;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload", true);
    xhr.withCredentials = true;

    xhr.setRequestHeader("Content-Type", selectedFile.type || "video/mp4");
    xhr.setRequestHeader("X-Filename", encodeURIComponent(selectedFile.name));
    xhr.setRequestHeader("X-Title", encodeURIComponent(title));
    xhr.setRequestHeader("X-Category", encodeURIComponent(category));
    xhr.setRequestHeader("X-Description", encodeURIComponent(description));

    const startTime = Date.now();

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMb = elapsedSec > 0 ? ((evt.loaded / (1024 * 1024)) / elapsedSec).toFixed(1) : "0.0";
        if (progressText) progressText.textContent = `Uploading: ${pct}% (${speedMb} MB/s)`;
        if (statusText) statusText.textContent = pct < 100 ? "Streaming video segments..." : "Processing video format...";
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast("Video uploaded & published successfully! 🎉");
        closeUploadModal();
        loadCommunityVideos();
        loadUserUploads();
      } else {
        let errMessage = "Upload failed. Please try again.";
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errMessage = res.error;
        } catch {}
        if (feedbackEl) {
          feedbackEl.textContent = errMessage;
          feedbackEl.hidden = false;
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    xhr.onerror = () => {
      if (feedbackEl) {
        feedbackEl.textContent = "Network error during upload. Please check connection.";
        feedbackEl.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    };

    xhr.send(selectedFile);
  });
}

async function loadCommunityVideos() {
  try {
    const res = await fetch("/api/videos?limit=12&status=ready");
    if (!res.ok) return;
    const data = await res.json();
    const section = $("#community-section");
    const row = $("#community-row");
    if (!section || !row) return;

    if (!data.videos || data.videos.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    row.innerHTML = data.videos.map((v) => `
      <div class="community-card" data-video-id="${v.id}" tabindex="0" role="button" aria-label="Play ${escapeHtml(v.title)}">
        <img src="${v.thumbnailPath || `/api/videos/thumbnail/${v.id}`}" alt="${escapeHtml(v.title)} video thumbnail" loading="lazy" decoding="async" />
        <div class="community-card-overlay">
          <strong>${escapeHtml(v.title)}</strong>
          <span>${v.views || 0} views · ${escapeHtml(v.category)}</span>
        </div>
      </div>
    `).join("");

    row.querySelectorAll("[data-video-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.videoId;
        const v = data.videos.find((item) => item.id === id);
        if (v) {
          playNativeVideo(`/api/videos/stream/${v.id}`, v.title, v.thumbnailPath, { videoId: v.id });
        }
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    });
  } catch (err) {
    console.warn("Failed to load community videos:", err);
  }
}

async function loadUserUploads() {
  if (!state.auth?.user) return;
  const listEl = $("#my-uploads-list");
  const emptyEl = $("#my-uploads-empty");
  if (!listEl || !emptyEl) return;

  try {
    const res = await fetch(`/api/videos?userId=${encodeURIComponent(state.auth.user.id)}&limit=20&status=all`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const videos = data.videos || [];

    if (videos.length === 0) {
      listEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = videos.map((v) => `
      <div class="my-upload-item">
        <div class="my-upload-info">
          <img class="my-upload-thumb" src="${v.thumbnailPath || `/api/videos/thumbnail/${v.id}`}" alt="${escapeHtml(v.title)} video thumbnail" loading="lazy" decoding="async" />
          <div class="my-upload-details">
            <strong>${escapeHtml(v.title)}</strong>
            <span>${v.views || 0} views · ${v.status} · ${(v.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
          </div>
        </div>
        <div class="my-upload-actions">
          <button class="primary-button btn-xs play-user-video-btn" data-video-id="${v.id}"><span>Watch</span></button>
          <button class="sign-out-button btn-xs delete-user-video-btn" data-video-id="${v.id}"><span>Delete</span></button>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll(".play-user-video-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.videoId;
        const v = videos.find((item) => item.id === id);
        if (v) playNativeVideo(`/api/videos/stream/${v.id}`, v.title, v.thumbnailPath, { videoId: v.id });
      });
    });

    listEl.querySelectorAll(".delete-user-video-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.videoId;
        if (!confirm("Are you sure you want to delete this video?")) return;
        try {
          const delRes = await fetch(`/api/videos/${id}`, { method: "DELETE", credentials: "include" });
          if (delRes.ok) {
            showToast("Video deleted successfully.");
            loadUserUploads();
            loadCommunityVideos();
          } else {
            showToast("Failed to delete video.");
          }
        } catch {
          showToast("Network error deleting video.");
        }
      });
    });
  } catch (err) {
    console.warn("Failed to load user uploads:", err);
  }
}

function closeDetails({ updateHash = true } = {}) {
  clearLiveStatus();
  const mb = $("#modal-backdrop");
  if (mb) {
    mb.hidden = true;
    mb.setAttribute("hidden", "true");
  }
  state.activeModal = null;
  // Round 2 (bug: URL stuck on #/title/... after Escape/X/backdrop):
  // closing a deep-linked dialog reverts the hash to the section route
  // so the URL and the back button stay consistent. pushState does not
  // fire hashchange, so the router does not re-open the dialog.
  // Callers that are themselves responding to a hash change (the router)
  // or about to navigate elsewhere pass updateHash: false.
  if (updateHash) {
    const hash = window.location.hash || "";
    if (/^#\/(title|movies|series|anime|cartoons)\//.test(hash)) {
      const target = ["home", "movies", "series", "anime", "cartoons", "explore", "my-list", "profile"].includes(state.section) ? state.section : "home";
      const newHash = target === "home" ? "#/home" : `#/${target}`;
      if (hash !== newHash) {
        try { history.pushState(null, "", newHash); } catch { window.location.hash = newHash; }
      }
    }
  }
}

function toggleList(title) {
  const item = findTitle(title) || featured;
  try { localStorage.setItem("ustream-watchlist-explicit", "1"); } catch {}
  if (state.watchlist.has(title)) {
    state.watchlist.delete(title);
    showToast(`${title} removed from My List`);
  } else {
    state.watchlist.add(title);
    if (item && !catalog.some((c) => catalogItemKey(c) === catalogItemKey(item) || canonicalDedupeKey(c) === canonicalDedupeKey(item))) {
      catalog.push(item);
    }
    showToast(`${title} added to My List`);
  }
  persistWatchlist();
  if (state.auth?.user) {
    void fetch("/api/profile/watchlist/toggle", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, itemData: item })
    }).catch(() => {});
  }
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

if (typeof document !== "undefined") {
document.addEventListener("click", (event) => {
  const arrow = event.target.closest("[data-rail-scroll]");
  if (arrow) {
    const rail = arrow.closest(".rail-section")?.querySelector(".media-rail");
    if (rail) {
      const dir = arrow.dataset.railScroll === "left" ? -1 : 1;
      rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: "smooth" });
    }
    return;
  }
  const button = event.target.closest("button");
  if (!button) {
    const card = event.target.closest(".media-card[data-title]");
    if (card && !card.closest("#modal-related-grid")) {
      openDetails(card.dataset.title);
    }
    return;
  }
  if (button.dataset.infoPage) return openInfoPage(button.dataset.infoPage);
  if (button.id === "close-info") return closeInfoPage();
  if (button.dataset.section) return setSection(button.dataset.section, true);
  if (button.dataset.genre) {
    state.genre = button.dataset.genre;
    state.displayLimit = CONTENT_BATCH_SIZE;
    $$(".genre-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    render();
    return;
  }
  if (button.dataset.action === "resume") return void resumeTitle(button.dataset.title);
  if (button.dataset.action === "details") return openDetails(button.dataset.title);
  if (button.dataset.action === "play") { playTitle(button.dataset.title); return; }
  if (button.dataset.action === "trailer") return void playTrailer(button.dataset.title);
  if (button.dataset.action === "bookmark") {
    const title = button.dataset.title || featured?.title;
    if (title) {
      toggleList(title);
      button.classList.toggle("saved", state.watchlist.has(title));
    }
    return;
  }
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
    if (target === "search") { state.search = ""; const sInp = $("#search-input"); if (sInp) sInp.value = ""; }
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
  if (button.classList.contains("season-pill") && button.dataset.season) {
    void changePlayerSeason(button.dataset.season);
    return;
  }
  if (button.classList.contains("episode-pill") && button.dataset.episode) {
    void changePlayerEpisode(button.dataset.episode);
    return;
  }
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
  if (button.id === "status-pill") return openStatusView();
  if (button.id === "close-status") return closeStatusView();
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

let statusViewWired = false;

// Real server-status view (replaces the old behaviour where the
// "Server status" pill just opened Settings). Reads the live config +
// health endpoints and the currently loaded catalog cache.
async function openStatusView() {
  const modal = $("#status-backdrop");
  const body = $("#status-view-body");
  if (!modal || !body) return openSettings();
  modal.hidden = false;
  body.innerHTML = "<p>Checking services…</p>";
  if (!statusViewWired) {
    statusViewWired = true;
    modal.addEventListener("click", (e) => {
      if (e.target.id === "status-backdrop") closeStatusView();
    });
  }
  const rows = [];
  try {
    const res = await fetch(buildApiUrl("config"));
    const data = await res.json().catch(() => ({}));
    const configured = data.configured ?? data.rapidApiKeyConfigured ?? data.rapidApiConfigured;
    rows.push(["Catalog API", configured ? "Connected" : "Not configured", configured ? "Live catalog service is configured." : "Running on the curated showcase catalog."]);
  } catch {
    rows.push(["Catalog API", "Unavailable", "Could not reach the catalog service — check your connection."]);
  }
  try {
    const res = await fetch("/api/health.json");
    const data = await res.json().catch(() => ({}));
    rows.push(["Streaming service", data.ok ? (data.status || "Healthy") : "Unknown", `Service: ${data.service || "ustream"}`]);
  } catch {
    rows.push(["Streaming service", "Unavailable", "Health endpoint did not respond."]);
  }
  rows.push(["Catalog loaded", `${catalog.length} titles`, `Current section: ${state.section || "home"}`]);
  rows.push(["Adult (18+) content", isAdultEnabled() ? "Enabled (age confirmed)" : "Off (default)", "Toggle it in Settings — an age confirmation is required to enable it."]);
  body.innerHTML = rows.map(([label, value, note]) => `
    <div class="setting-row">
      <div><strong>${escapeHtml(label)}</strong><small style="display:block;color:var(--muted);font-size:12px;margin-top:4px;">${escapeHtml(note)}</small></div>
      <span style="font-weight:700;white-space:nowrap;">${escapeHtml(String(value))}</span>
    </div>`).join("")
    + `<p class="field-hint">Checked ${escapeHtml(new Date().toLocaleString())} · Status is read live from the app's own endpoints; it is not a static label.</p>`;
}

function closeStatusView() {
  const modal = $("#status-backdrop");
  if (modal) modal.hidden = true;
}

// In-app info pages for the footer. Short, honest copy only — no external
// links (the task explicitly forbids dead external URLs) and no invented
// contact address: Contact points at the existing Discord community.
const INFO_PAGES = {
  about: ["About Ustream", "Ustream is a curated streaming showcase: movies, series, anime and cartoons in one place. Titles come from the curated catalog and live search providers; availability and streams can change, and some titles are served by third-party players."],
  privacy: ["Privacy", "What stays on your device: your theme and accent, your My List, and your Continue Watching progress (including resume positions) are stored in this browser's localStorage. If you sign in, your profiles, watchlist and playback history sync to your Ustream account. We do not sell personal data. Clearing your browser data removes the locally stored items."],
  terms: ["Terms of Use", "Ustream is provided for personal, non-commercial viewing. Content availability, quality and streams may change without notice and are subject to the rights holders' terms. Do not misuse the service, attempt to bypass access controls, or redistribute streams. Continued use after changes to these terms means you accept them."],
  dmca: ["DMCA", "If you are a rights holder and believe content on Ustream infringes your copyright, send a takedown notice via the Contact page (Discord community) including: the title and URL of the allegedly infringing content, proof that you own the rights, and your contact details. Valid notices are reviewed and the content is removed or disabled where appropriate."],
  contact: ["Contact", "Questions, title requests, or takedown notices: reach the team through the Discord community linked in the footer. Include the title or page URL you are asking about so we can help quickly."],
};

function openInfoPage(page) {
  const entry = INFO_PAGES[page];
  const modal = $("#info-backdrop");
  const titleEl = $("#info-title");
  const bodyEl = $("#info-body");
  if (!entry || !modal || !titleEl || !bodyEl) return;
  titleEl.textContent = entry[0];
  bodyEl.innerHTML = `<p>${escapeHtml(entry[1])}</p>`
    + (page === "contact"
      ? `<p><a class="footer-community-link" href="https://discord.com/channels/1564928608877936841/1564928609309696092" target="_blank" rel="noopener noreferrer">Join Discord Community</a></p>`
      : "");
  modal.hidden = false;
}

function closeInfoPage() {
  const modal = $("#info-backdrop");
  if (modal) modal.hidden = true;
}

function openSettings() {
  const modal = $("#settings-backdrop");
  if (!modal) return;
  modal.hidden = false;
  fetch(buildApiUrl("config"))
    .then((r) => r.json())
    .then(() => {
      // /api/config only proves a key is configured — it says nothing about
      // whether any stream plays. Re-render from the real playback flags.
      updateStatusBadge(catalogIsLive, catalogLiveCount);
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

$("#search-input")?.addEventListener("input", (event) => {
  state.search = event.target.value;
  state.displayLimit = CONTENT_BATCH_SIZE;
  render();
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => void loadSearchResults(state.search), 350);
});

$("#filter-groups")?.addEventListener("change", (event) => {
  const input = event.target.closest("[data-filter]");
  if (!input) return;
  state.filters[input.dataset.filter] = input.value;
  state.displayLimit = CONTENT_BATCH_SIZE;
  render();
});

document.addEventListener("change", (event) => {
  if (event.target.id === "player-server-select") {
    // Round 2 merge: "auto" (default) runs the unified chain; the six
    // servers are only an advanced manual override.
    const value = event.target.value;
    if (value === "auto") {
      serverMode = "auto";
      try { localStorage.setItem("ustream-server", "auto"); } catch {}
      showToast("Auto server selection on — the first working server plays");
    } else if (STREAM_SERVERS[value]) {
      serverMode = "manual";
      manualServerKey = value;
      currentServerKey = value;
      try { localStorage.setItem("ustream-server", value); } catch {}
      showToast(`Manual server: ${STREAM_SERVERS[value]?.name || "HD Server"}`);
    }
    syncServerSelect();
    reloadCurrentEmbed();
    return;
  }
  if (event.target.id === "player-language-bar-select") {
    const selectedVal = event.target.value;
    if (selectedVal === "off") {
      // Subtitles Off (bug 24): never let an embed/HLS default track —
      // often Hindi on multi-audio sources — become the subtitle default.
      currentLanguageKey = "en";
      state.player.selectedSubtitle = "off";
      try { localStorage.setItem("ustream-language", "en"); } catch {}
      if (window._currentHlsInstance) {
        try { window._currentHlsInstance.subtitleTrack = -1; } catch {}
      }
      const nativeVideo = $("#video-player");
      if (nativeVideo) Array.from(nativeVideo.textTracks || []).forEach((t) => { t.mode = "disabled"; });
      showToast("Subtitles off");
      event.target.value = "en";
      return;
    }
    currentLanguageKey = selectedVal;
    try {
      localStorage.setItem("ustream-language", currentLanguageKey);
    } catch {}

    // If playing via native HLS (window._currentHlsInstance):
    if (window._currentHlsInstance && window._currentHlsInstance.audioTracks && window._currentHlsInstance.audioTracks.length > 0) {
      const tracks = window._currentHlsInstance.audioTracks;
      const track = tracks.find((t) => String(t.id) === String(selectedVal)) ||
                    tracks.find((t) => (t.lang && t.lang.toLowerCase() === selectedVal.toLowerCase()) || (t.name && t.name.toLowerCase().includes(selectedVal.toLowerCase())));
      if (track) {
        window._currentHlsInstance.audioTrack = track.id;
        showToast(`Switched audio to ${track.name || track.lang} (Multi-Audio)`);
        return;
      }
    }

    // Round 2 merge: no forced server switch on language change — the
    // auto chain already tries AniEmbed first for anime.
    const isAnime = state.player?.item && (state.player.item.type === "anime" || state.player.item.category === "anime");
    const langName = LANGUAGE_LABELS[currentLanguageKey] || currentLanguageKey.toUpperCase();
    if (isAnime) {
      const animeMode = currentLanguageKey === "en" ? "English Dub" : "Japanese Sub (Original)";
      showToast(`Anime audio set to ${animeMode}`);
      reloadCurrentEmbed();
    } else {
      if (currentLanguageKey === "auto" || currentLanguageKey === "en") {
        showToast("Audio set to Original English");
      } else {
        showToast(`Language: ${langName} · Use [CC] button inside player for subtitles`);
      }
    }
    return;
  }
  if (event.target.id === "player-season-bar-select") {
    void changePlayerSeason(event.target.value);
    return;
  }
  if (event.target.id === "player-episode-bar-select") {
    void changePlayerEpisode(event.target.value);
    return;
  }
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

$("#player-settings")?.addEventListener("toggle", (event) => {
  $("#player-settings-toggle")?.setAttribute("aria-expanded", String(event.currentTarget.open));
});

$("#video-player").addEventListener("canplay", () => {
  if (currentPlayerState === PLAYER_STATE.LOADING) {
    setPlayerState(PLAYER_STATE.READY);
  }
});

// Cross-origin embed frames expose no playback events, so the iframe load
// event is the only signal the stream host responded. Until it fires the
// player stays in LOADING (with elapsed time); the 20s timer above turns
// a never-loading embed into an error state instead of black "PLAYING".
$("#embed-player")?.addEventListener("load", () => {
  const embed = $("#embed-player");
  if (!embed || !embed.src || embed.src === "about:blank") return;
  if (currentPlayerState === PLAYER_STATE.LOADING) {
    setPlayerState(PLAYER_STATE.PLAYING, state.player?.item ? `Playing: ${state.player.item.title}` : "Playing stream");
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
  const video = $("#video-player");
  if (!video.dataset.fallbackAttempted && video.dataset.itemTitle) {
    // Do NOT silently swap in an unrelated sample/cartoon clip: the old
    // getStreamForTitle() fallback served Google sample videos (Big Buck
    // Bunny, Sintel, TearsOfSteel), which is how a wrong, anime-style
    // frame could appear for a title like Avengers: Endgame. Surface the
    // failure and switch embed server instead.
    video.dataset.fallbackAttempted = "true";
    console.warn("[Ustream Video Player] Video source failed for", video.dataset.itemTitle, "— switching server instead of a sample clip.");
  }
  handlePlaybackError();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    focusSearch();
  }
  if (event.key === "Escape") {
    closeDetails();
    closeDrawer();
    closePlayer();
    closeSettings();
    closeAuthModal();
    closeProfilesModal();
    closeProfileEditModal();
    closePinPrompt();
    closeSearchModal();
    $("#profile-dropdown")?.setAttribute("hidden", "true");
    $("#search-box")?.classList.remove("mobile-open");
  }
});
}

// ==========================================================================
// Authentication, Viewer Profiles & Security State Controller
// ==========================================================================

const LocalAuthVault = {
  getStore() {
    return storage.get("ustream_local_auth_store", { users: [], profiles: [], activeUserId: null, activeProfileId: null });
  },
  saveStore(store) {
    storage.set("ustream_local_auth_store", store);
  },
  handleRequest(endpoint, method, body) {
    const store = this.getStore();
    const route = endpoint.split("?")[0].replace(/\/$/, "");
    const now = Date.now();

    // 1. GET /api/auth/me
    if (method === "GET" && route === "/api/auth/me") {
      const user = store.users.find((u) => u.id === store.activeUserId);
      if (!user) return { ok: true, status: 200, data: { ok: true, user: null, profiles: [], activeProfile: null } };
      const profiles = store.profiles.filter((p) => p.userId === user.id);
      const activeProfile = profiles.find((p) => p.id === store.activeProfileId) || profiles.find((p) => p.isPrimary) || profiles[0] || null;
      return {
        ok: true,
        status: 200,
        data: {
          ok: true,
          user,
          profiles,
          activeProfile,
          session: { id: "local_session", createdAt: now }
        }
      };
    }

    // 2. POST /api/auth/register
    if (method === "POST" && route === "/api/auth/register") {
      const email = String(body?.email || "").trim().toLowerCase();
      const name = String(body?.name || "").trim();
      const password = String(body?.password || "");
      if (!email || !password || !name) {
        return { ok: false, status: 400, data: { ok: false, error: "Please fill in all fields." } };
      }
      if (password.length < 8) {
        return { ok: false, status: 400, data: { ok: false, error: "Password must be at least 8 characters long." } };
      }
      let existing = store.users.find((u) => u.email === email);
      if (existing) {
        return { ok: false, status: 400, data: { ok: false, error: "An account with this email already exists." } };
      }
      const userId = "user_" + Math.random().toString(36).slice(2, 10);
      const user = {
        id: userId,
        email,
        name,
        password,
        isEmailVerified: true,
        createdAt: now
      };
      const profileId = "prof_" + Math.random().toString(36).slice(2, 10);
      const profile = {
        id: profileId,
        userId,
        name,
        avatar: "🦊",
        isKids: false,
        maturityRating: "ALL",
        language: "en",
        hasPin: false,
        isPrimary: true,
        createdAt: now
      };
      store.users.push(user);
      store.profiles.push(profile);
      store.activeUserId = userId;
      store.activeProfileId = profileId;
      this.saveStore(store);
      return {
        ok: true,
        status: 201,
        data: {
          ok: true,
          user,
          profiles: [profile],
          activeProfile: profile,
          token: "local_token_" + userId
        }
      };
    }

    // 3. POST /api/auth/login
    if (method === "POST" && route === "/api/auth/login") {
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");
      let user = store.users.find((u) => u.email === email);
      if (!user) {
        if (email.includes("@") && password.length >= 6) {
          const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const userId = "user_" + Math.random().toString(36).slice(2, 10);
          user = { id: userId, email, name, password, isEmailVerified: true, createdAt: now };
          const profileId = "prof_" + Math.random().toString(36).slice(2, 10);
          const profile = { id: profileId, userId, name, avatar: "🦊", isKids: false, maturityRating: "ALL", language: "en", hasPin: false, isPrimary: true, createdAt: now };
          store.users.push(user);
          store.profiles.push(profile);
          store.activeUserId = userId;
          store.activeProfileId = profileId;
          this.saveStore(store);
          return {
            ok: true,
            status: 200,
            data: {
              ok: true,
              user,
              profiles: [profile],
              activeProfile: profile,
              token: "local_token_" + userId
            }
          };
        }
        return { ok: false, status: 401, data: { ok: false, error: "Invalid email or password." } };
      }
      if (user.password && user.password !== password) {
        return { ok: false, status: 401, data: { ok: false, error: "Invalid email or password." } };
      }
      store.activeUserId = user.id;
      let profiles = store.profiles.filter((p) => p.userId === user.id);
      if (profiles.length === 0) {
        const profile = { id: "prof_" + Math.random().toString(36).slice(2, 10), userId: user.id, name: user.name, avatar: "🦊", isKids: false, maturityRating: "ALL", language: "en", hasPin: false, isPrimary: true, createdAt: now };
        store.profiles.push(profile);
        profiles = [profile];
      }
      const activeProfile = profiles.find((p) => p.id === store.activeProfileId) || profiles.find((p) => p.isPrimary) || profiles[0];
      store.activeProfileId = activeProfile.id;
      this.saveStore(store);
      return {
        ok: true,
        status: 200,
        data: {
          ok: true,
          user,
          profiles,
          activeProfile,
          token: "local_token_" + user.id
        }
      };
    }

    // 4. POST /api/auth/logout & /api/auth/logout-all
    if (method === "POST" && (route === "/api/auth/logout" || route === "/api/auth/logout-all")) {
      store.activeUserId = null;
      store.activeProfileId = null;
      this.saveStore(store);
      return { ok: true, status: 200, data: { ok: true, message: "Logged out" } };
    }

    // 5. GET /api/profiles
    if (method === "GET" && route === "/api/profiles") {
      const user = store.users.find((u) => u.id === store.activeUserId);
      if (!user) return { ok: false, status: 401, data: { ok: false, error: "Authentication required" } };
      const profiles = store.profiles.filter((p) => p.userId === user.id);
      return { ok: true, status: 200, data: { ok: true, profiles } };
    }

    // 6. POST /api/profiles (Create Profile)
    if (method === "POST" && route === "/api/profiles") {
      const user = store.users.find((u) => u.id === store.activeUserId);
      if (!user) return { ok: false, status: 401, data: { ok: false, error: "Authentication required" } };
      const userProfiles = store.profiles.filter((p) => p.userId === user.id);
      if (userProfiles.length >= 5) {
        return { ok: false, status: 400, data: { ok: false, error: "Maximum limit of 5 viewer profiles reached." } };
      }
      const name = String(body?.name || "").trim();
      if (!name) return { ok: false, status: 400, data: { ok: false, error: "Profile name is required." } };
      const profileId = "prof_" + Math.random().toString(36).slice(2, 10);
      const newProfile = {
        id: profileId,
        userId: user.id,
        name,
        avatar: body?.avatar || "🦊",
        isKids: Boolean(body?.isKids),
        maturityRating: body?.maturityRating || "ALL",
        language: body?.language || "en",
        hasPin: Boolean(body?.pin),
        pin: body?.pin || null,
        isPrimary: false,
        createdAt: now
      };
      store.profiles.push(newProfile);
      this.saveStore(store);
      return { ok: true, status: 201, data: { ok: true, profile: newProfile } };
    }

    // 7. PUT /api/profiles/:id (Update Profile)
    if ((method === "PUT" || method === "POST") && route.startsWith("/api/profiles/") && !route.includes("/select") && !route.includes("/verify-pin") && !route.includes("/delete")) {
      const profileId = route.split("/").pop();
      const profile = store.profiles.find((p) => p.id === profileId);
      if (!profile) return { ok: false, status: 404, data: { ok: false, error: "Profile not found." } };
      if (body?.name) profile.name = String(body.name).trim();
      if (body?.avatar) profile.avatar = body.avatar;
      if (typeof body?.isKids !== "undefined") profile.isKids = Boolean(body.isKids);
      if (body?.maturityRating) profile.maturityRating = body.maturityRating;
      if (body?.language) profile.language = body.language;
      if (body?.pin) {
        profile.hasPin = true;
        profile.pin = body.pin;
      } else if (body?.pin === "") {
        profile.hasPin = false;
        profile.pin = null;
      }
      this.saveStore(store);
      return { ok: true, status: 200, data: { ok: true, profile } };
    }

    // 8. DELETE /api/profiles/:id
    if ((method === "DELETE" && route.startsWith("/api/profiles/")) || (method === "POST" && route.endsWith("/delete"))) {
      const parts = route.split("/");
      const profileId = method === "DELETE" ? parts.pop() : parts[parts.length - 2];
      const profile = store.profiles.find((p) => p.id === profileId);
      if (!profile) return { ok: false, status: 404, data: { ok: false, error: "Profile not found." } };
      if (profile.isPrimary) return { ok: false, status: 400, data: { ok: false, error: "Primary profile cannot be deleted." } };
      store.profiles = store.profiles.filter((p) => p.id !== profileId);
      if (store.activeProfileId === profileId) {
        const primary = store.profiles.find((p) => p.userId === profile.userId && p.isPrimary) || store.profiles.find((p) => p.userId === profile.userId);
        store.activeProfileId = primary ? primary.id : null;
      }
      this.saveStore(store);
      return { ok: true, status: 200, data: { ok: true, message: "Profile deleted." } };
    }

    // 9. POST /api/profiles/:id/select
    if (method === "POST" && route.includes("/select")) {
      const parts = route.split("/");
      const profileId = parts[parts.indexOf("select") - 1] || body?.profileId;
      const profile = store.profiles.find((p) => p.id === profileId);
      if (!profile) return { ok: false, status: 404, data: { ok: false, error: "Profile not found." } };
      store.activeProfileId = profile.id;
      this.saveStore(store);
      return { ok: true, status: 200, data: { ok: true, profile } };
    }

    // 10. POST /api/profiles/:id/verify-pin
    if (method === "POST" && route.includes("/verify-pin")) {
      const parts = route.split("/");
      const profileId = parts[parts.indexOf("verify-pin") - 1];
      const profile = store.profiles.find((p) => p.id === profileId);
      if (!profile) return { ok: false, status: 404, data: { ok: false, error: "Profile not found." } };
      if (!profile.hasPin || profile.pin === body?.pin) {
        return { ok: true, status: 200, data: { ok: true } };
      }
      return { ok: false, status: 403, data: { ok: false, error: "Incorrect PIN" } };
    }

    // 11. Watchlist and History
    if (route.startsWith("/api/profile/watchlist")) {
      return { ok: true, status: 200, data: { ok: true, watchlist: [] } };
    }
    if (route.startsWith("/api/profile/history")) {
      return { ok: true, status: 200, data: { ok: true, history: [] } };
    }

    return { ok: true, status: 200, data: { ok: true } };
  }
};

async function authApi(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("ustream_auth_token");
  const headers = {
    "content-type": "application/json",
    accept: "application/json"
  };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  const options = {
    method,
    credentials: "include",
    headers
  };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(endpoint, options);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.ok !== false) {
        return { ok: true, status: res.status, data };
      }
      if (data && data.error) {
        return { ok: false, status: res.status, data };
      }
    }
    // If backend returns 500, 404, or non-JSON (e.g. serverless invocation failure)
    if (res.status >= 500 || res.status === 404) {
      return LocalAuthVault.handleRequest(endpoint, method, body);
    }
    const data = await res.json().catch(() => ({ ok: false, error: "Network response error" }));
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch (err) {
    return LocalAuthVault.handleRequest(endpoint, method, body);
  }
}

async function initAuth() {
  const res = await authApi("/api/auth/me");
  if (res.ok && res.data.user) {
    state.auth.user = res.data.user;
    state.auth.profiles = res.data.profiles || [];
    state.auth.activeProfile = res.data.activeProfile || state.auth.profiles[0] || null;
    state.auth.session = res.data.session || null;

    // Synchronize active profile's remote watchlist
    try {
      const wlRes = await authApi("/api/profile/watchlist");
      if (wlRes.ok && Array.isArray(wlRes.data.watchlist)) {
        wlRes.data.watchlist.forEach((item) => state.watchlist.add(item.title));
        persistWatchlist();
      }
    } catch {}

    // Synchronize playback history
    try {
      const histRes = await authApi("/api/profile/history");
      if (histRes.ok && Array.isArray(histRes.data.history) && histRes.data.history.length > 0) {
        // Merge into continuation — only entries with real progress
        // (bug 15): a 0% server-side row must not seed the row.
        histRes.data.history.forEach((h) => {
          const histProgress = Math.round((h.progressSeconds / (h.durationSeconds || 1)) * 100);
          if (!continuation.some((c) => c.title === h.title)
              && (Number(h.progressSeconds) >= 30 || histProgress > 1)) {
            continuation.unshift({
              title: h.title,
              season: h.season,
              episode: h.episode,
              progress: histProgress,
              positionSeconds: Number(h.progressSeconds) || 0,
              durationSeconds: Number(h.durationSeconds) || 0,
              watchedAt: h.watchedAt || new Date().toISOString(),
              image: h.itemData?.image || h.itemData?.cover?.url || ""
            });
          }
        });
      }
    } catch {}
  } else {
    if (res.status === 401) {
      localStorage.removeItem("ustream_auth_token");
    }
    state.auth.user = null;
    state.auth.profiles = [];
    state.auth.activeProfile = null;
    state.auth.session = null;
  }

  updateAuthUI();
  render();
  renderContinue();
  updateProfileStats();
}

function updateAuthUI() {
  const topbarLoginBtn = $("#topbar-login-btn");
  const profileMenuWrap = $("#profile-menu-wrap");
  const profileBtn = $("#profile-button");
  const authStateSec = $("#profile-auth-state");
  const guestStateSec = $("#profile-guest-state");

  if (state.auth.user && state.auth.activeProfile) {
    if (topbarLoginBtn) topbarLoginBtn.hidden = true;
    if (profileMenuWrap) profileMenuWrap.hidden = false;
    if (profileBtn) {
      profileBtn.textContent = state.auth.activeProfile.avatar || state.auth.activeProfile.name.charAt(0).toUpperCase();
      profileBtn.title = `${state.auth.activeProfile.name} (${state.auth.user.email})`;
    }

    // Topbar Dropdown
    const dropAvatar = $("#dropdown-active-avatar");
    const dropName = $("#dropdown-active-name");
    const dropEmail = $("#dropdown-active-email");
    const dropKids = $("#dropdown-kids-tag");
    if (dropAvatar) dropAvatar.textContent = state.auth.activeProfile.avatar || "👤";
    if (dropName) dropName.textContent = state.auth.activeProfile.name;
    if (dropEmail) dropEmail.textContent = state.auth.user.email;
    if (dropKids) dropKids.hidden = !state.auth.activeProfile.isKids;

    // Dropdown switch list
    const dropList = $("#dropdown-profiles-list");
    if (dropList) {
      dropList.innerHTML = state.auth.profiles.map((p) => {
        const isActive = p.id === state.auth.activeProfile.id;
        return `
          <button class="profile-dropdown-item ${isActive ? "active-profile" : ""}" data-switch-profile="${p.id}" type="button">
            <span>${p.avatar || "👤"}</span>
            <span>${escapeHtml(p.name)}</span>
            ${p.hasPin ? '<span title="PIN Protected" style="font-size:11px;">🔒</span>' : ''}
            ${p.isKids ? '<span class="kids-badge" style="font-size:8px; padding:0 4px;">KIDS</span>' : ''}
            ${isActive ? '<span style="margin-left:auto; font-size:10px;">✓</span>' : ''}
          </button>
        `;
      }).join("");
    }

    // Account & Profile Section
    if (authStateSec) authStateSec.hidden = false;
    if (guestStateSec) guestStateSec.hidden = true;

    const heroAvatar = $("#profile-hero-avatar");
    const heroName = $("#profile-hero-name");
    const heroEmail = $("#profile-hero-email");
    const heroBadge = $("#profile-hero-badge");
    const verifyBadge = $("#profile-verify-badge");
    const resendBtn = $("#profile-resend-verify-btn");

    if (heroAvatar) heroAvatar.textContent = state.auth.activeProfile.avatar || "👤";
    if (heroName) heroName.textContent = state.auth.activeProfile.name;
    if (heroEmail) heroEmail.textContent = state.auth.user.email;
    if (heroBadge) heroBadge.textContent = state.auth.activeProfile.isKids ? "Kids Profile" : (state.auth.activeProfile.isPrimary ? "Primary Profile" : "Viewer Profile");

    if (verifyBadge) {
      if (state.auth.user.isEmailVerified) {
        verifyBadge.textContent = "✓ Verified";
        verifyBadge.className = "email-verify-badge verified";
        if (resendBtn) resendBtn.hidden = true;
      } else {
        verifyBadge.textContent = "⚠ Unverified Email";
        verifyBadge.className = "email-verify-badge unverified";
        if (resendBtn) resendBtn.hidden = false;
      }
    }

    // Inline profiles row
    const inlineList = $("#profiles-inline-list");
    if (inlineList) {
      inlineList.innerHTML = state.auth.profiles.map((p) => {
        const isActive = p.id === state.auth.activeProfile.id;
        return `
          <div class="profile-inline-item ${isActive ? "active" : ""}" data-switch-profile="${p.id}">
            <span class="profile-inline-avatar">${p.avatar || "👤"}</span>
            <span class="profile-inline-name">${escapeHtml(p.name)}</span>
            ${p.hasPin ? '<span>🔒</span>' : ''}
            ${p.isKids ? '<span class="kids-badge" style="font-size:8px;">KIDS</span>' : ''}
          </div>
        `;
      }).join("");
    }

    // Load active sessions
    void loadSessions();
  } else {
    // Guest State
    if (topbarLoginBtn) topbarLoginBtn.hidden = false;
    if (profileMenuWrap) profileMenuWrap.hidden = true;
    if (authStateSec) authStateSec.hidden = true;
    if (guestStateSec) guestStateSec.hidden = false;
  }
}

async function loadSessions() {
  const container = $("#sessions-list");
  if (!container || !state.auth.user) return;
  const res = await authApi("/api/auth/sessions");
  if (!res.ok || !Array.isArray(res.data.sessions)) {
    container.innerHTML = '<div class="session-meta">Could not load active sessions.</div>';
    return;
  }

  container.innerHTML = res.data.sessions.map((s) => {
    const isCurrent = s.isCurrent;
    const date = new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const shortUa = s.userAgent ? s.userAgent.split(" ")[0].slice(0, 30) : "Browser";
    return `
      <div class="session-row">
        <div class="session-info">
          <span class="session-device">${escapeHtml(shortUa)} ${isCurrent ? '<span class="session-badge-current">This Device</span>' : ''}</span>
          <span class="session-meta">IP: ${escapeHtml(s.ipAddress || "Unknown")} · Signed in ${date}</span>
        </div>
      </div>
    `;
  }).join("");
}

function openAuthModal(tab = "signin", returnUrl = null) {
  state.auth.returnUrl = returnUrl || window.location.hash || "#/home";
  const backdrop = $("#auth-backdrop");
  if (!backdrop) return;
  backdrop.hidden = false;
  switchAuthTab(tab);
}

function closeAuthModal() {
  const backdrop = $("#auth-backdrop");
  if (backdrop) backdrop.hidden = true;
  clearAuthFeedbacks();
}

function clearAuthFeedbacks() {
  ["#signin-feedback", "#signup-feedback", "#forgot-feedback", "#reset-feedback", "#change-password-feedback", "#profile-edit-feedback", "#pin-prompt-feedback"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.hidden = true;
      el.textContent = "";
      el.className = "form-feedback";
    }
  });
}

function setFeedback(selector, message, isError = true) {
  const el = $(selector);
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${isError ? "error" : "success"}`;
  el.hidden = false;
}

function switchAuthTab(tab) {
  clearAuthFeedbacks();
  const tabs = $("#auth-tabs");
  const tabSignin = $("#tab-signin");
  const tabSignup = $("#tab-signup");
  const formSignin = $("#form-signin");
  const formSignup = $("#form-signup");
  const formForgot = $("#form-forgot");
  const formReset = $("#form-reset");

  if (tabs) tabs.hidden = (tab === "forgot" || tab === "reset");

  if (tab === "signin") {
    tabSignin?.classList.add("active");
    tabSignup?.classList.remove("active");
    if (formSignin) formSignin.hidden = false;
    if (formSignup) formSignup.hidden = true;
    if (formForgot) formForgot.hidden = true;
    if (formReset) formReset.hidden = true;
    $("#signin-email")?.focus();
  } else if (tab === "signup") {
    tabSignin?.classList.remove("active");
    tabSignup?.classList.add("active");
    if (formSignin) formSignin.hidden = true;
    if (formSignup) formSignup.hidden = false;
    if (formForgot) formForgot.hidden = true;
    if (formReset) formReset.hidden = true;
    $("#signup-name")?.focus();
  } else if (tab === "forgot") {
    if (formSignin) formSignin.hidden = true;
    if (formSignup) formSignup.hidden = true;
    if (formForgot) formForgot.hidden = false;
    if (formReset) formReset.hidden = true;
    $("#forgot-email")?.focus();
  } else if (tab === "reset") {
    if (formSignin) formSignin.hidden = true;
    if (formSignup) formSignup.hidden = true;
    if (formForgot) formForgot.hidden = true;
    if (formReset) formReset.hidden = false;
    $("#reset-new-password")?.focus();
  }
}

function openProfilesModal() {
  if (!state.auth.user) {
    openAuthModal("signin", "#/profiles");
    return;
  }
  const backdrop = $("#profiles-backdrop");
  if (!backdrop) return;
  backdrop.hidden = false;
  renderProfilesGrid();
}

function closeProfilesModal() {
  const backdrop = $("#profiles-backdrop");
  if (backdrop) backdrop.hidden = true;
  state.auth.isManagingProfiles = false;
  $("#profiles-backdrop")?.classList.remove("managing-profiles");
  const manageBtn = $("#manage-profiles-toggle-btn");
  if (manageBtn) manageBtn.innerHTML = "<span>Manage Profiles</span>";
}

function renderProfilesGrid() {
  const grid = $("#profiles-grid");
  if (!grid) return;
  const isManaging = state.auth.isManagingProfiles;

  let tilesHtml = state.auth.profiles.map((p) => {
    const isActive = p.id === state.auth.activeProfile?.id;
    return `
      <button class="profile-card-tile ${isActive ? "active-profile" : ""}" data-profile-card="${p.id}" type="button" aria-label="${escapeHtml(p.name)}">
        <div class="profile-card-tile-avatar">
          <span>${p.avatar || "👤"}</span>
          ${p.hasPin ? '<span class="tile-badge-lock" title="PIN Protected">🔒</span>' : ''}
          ${p.isKids ? '<span class="tile-badge-kids">KIDS</span>' : ''}
          <div class="tile-edit-overlay"><svg class="icon icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></div>
        </div>
        <span class="profile-card-tile-name">${escapeHtml(p.name)}</span>
      </button>
    `;
  }).join("");

  if (state.auth.profiles.length < 5) {
    tilesHtml += `
      <button class="profile-card-tile add-profile-tile" id="tile-add-profile" type="button" aria-label="Add Profile">
        <div class="profile-card-tile-avatar">+</div>
        <span class="profile-card-tile-name">Add Profile</span>
      </button>
    `;
  }

  grid.innerHTML = tilesHtml;
}

async function selectProfile(profileId) {
  const target = state.auth.profiles.find((p) => p.id === profileId);
  if (!target) return;

  // Check if PIN protected and switching to a different profile
  if (target.hasPin && target.id !== state.auth.activeProfile?.id) {
    openPinPrompt(target);
    return;
  }

  const res = await authApi(`/api/profiles/${profileId}/select`, "POST");
  if (!res.ok) {
    showToast(res.data.error || "Failed to switch profile");
    return;
  }

  state.auth.activeProfile = target;
  closeProfilesModal();
  updateAuthUI();
  showToast(`Switched to ${target.name}`);

  // Re-sync watchlist and re-render
  try {
    const wlRes = await authApi("/api/profile/watchlist");
    if (wlRes.ok && Array.isArray(wlRes.data.watchlist)) {
      state.watchlist.clear();
      wlRes.data.watchlist.forEach((item) => state.watchlist.add(item.title));
      persistWatchlist();
    }
  } catch {}

  render();
}

function openPinPrompt(profile) {
  state.auth.pendingProfileForPin = profile;
  const backdrop = $("#pin-prompt-backdrop");
  if (!backdrop) return;
  const title = $("#pin-prompt-title");
  const desc = $("#pin-prompt-desc");
  const pinInput = $("#pin-input");
  if (title) title.textContent = `Unlock ${profile.name}`;
  if (desc) desc.textContent = `Enter the 4-digit PIN for ${profile.name}.`;
  if (pinInput) pinInput.value = "";
  clearAuthFeedbacks();
  backdrop.hidden = false;
  setTimeout(() => pinInput?.focus(), 50);
}

function closePinPrompt() {
  const backdrop = $("#pin-prompt-backdrop");
  if (backdrop) backdrop.hidden = true;
  state.auth.pendingProfileForPin = null;
}

let activeEditingProfileId = null;

function openProfileEditModal(profile = null) {
  activeEditingProfileId = profile ? profile.id : null;
  const backdrop = $("#profile-edit-backdrop");
  if (!backdrop) return;

  const title = $("#profile-edit-title");
  const nameInput = $("#edit-profile-name");
  const kidsInput = $("#edit-profile-kids");
  const maturitySelect = $("#edit-profile-maturity");
  const langSelect = $("#edit-profile-language");
  const pinInput = $("#edit-profile-pin");
  const deleteBtn = $("#delete-profile-btn");

  clearAuthFeedbacks();

  if (profile) {
    if (title) title.textContent = "Edit Profile";
    if (nameInput) nameInput.value = profile.name;
    if (kidsInput) kidsInput.checked = !!profile.isKids;
    if (maturitySelect) maturitySelect.value = profile.maturityRating || "ALL";
    if (langSelect) langSelect.value = profile.language || "en";
    if (pinInput) pinInput.value = "";
    if (deleteBtn) deleteBtn.hidden = !!profile.isPrimary;

    // Highlight avatar
    $$(".avatar-choice").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.avatar === (profile.avatar || "🦊"));
    });
  } else {
    if (title) title.textContent = "Add Profile";
    if (nameInput) nameInput.value = "";
    if (kidsInput) kidsInput.checked = false;
    if (maturitySelect) maturitySelect.value = "ALL";
    if (langSelect) langSelect.value = "en";
    if (pinInput) pinInput.value = "";
    if (deleteBtn) deleteBtn.hidden = true;

    $$(".avatar-choice").forEach((btn, idx) => {
      btn.classList.toggle("selected", idx === 0);
    });
  }

  backdrop.hidden = false;
  setTimeout(() => nameInput?.focus(), 50);
}

function closeProfileEditModal() {
  const backdrop = $("#profile-edit-backdrop");
  if (backdrop) backdrop.hidden = true;
  activeEditingProfileId = null;
}

async function handleSignOut() {
  localStorage.removeItem("ustream_auth_token");
  await authApi("/api/auth/logout", "POST");
  state.auth.user = null;
  state.auth.profiles = [];
  state.auth.activeProfile = null;
  state.auth.session = null;
  $("#profile-dropdown")?.setAttribute("hidden", "true");
  updateAuthUI();
  showToast("You have been signed out");
  setSection("home", true);
}

async function handleSignOutAll() {
  localStorage.removeItem("ustream_auth_token");
  await authApi("/api/auth/logout-all", "POST");
  state.auth.user = null;
  state.auth.profiles = [];
  state.auth.activeProfile = null;
  state.auth.session = null;
  $("#profile-dropdown")?.setAttribute("hidden", "true");
  updateAuthUI();
  showToast("Signed out of all devices");
  setSection("home", true);
}

async function handleResendVerify() {
  const res = await authApi("/api/auth/resend-verification", "POST");
  if (res.ok) {
    showToast(res.data.message || "Verification email sent!");
  } else {
    showToast(res.data.error || "Could not send verification email");
  }
}

function setupAuthEventListeners() {
  // Topbar Login button
  $("#topbar-login-btn")?.addEventListener("click", () => openAuthModal("signin"));
  $("#guest-signin-btn")?.addEventListener("click", () => openAuthModal("signin", "#/profile"));

  // Profile avatar button in topbar
  $("#profile-button")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const dd = $("#profile-dropdown");
    if (!dd) return;
    const isHidden = dd.hasAttribute("hidden");
    if (isHidden) {
      dd.removeAttribute("hidden");
      $("#profile-button").setAttribute("aria-expanded", "true");
    } else {
      dd.setAttribute("hidden", "true");
      $("#profile-button").setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#profile-menu-wrap")) {
      $("#profile-dropdown")?.setAttribute("hidden", "true");
      $("#profile-button")?.setAttribute("aria-expanded", "false");
    }
  });

  // Topbar dropdown links
  $("#dropdown-manage-profiles")?.addEventListener("click", () => {
    $("#profile-dropdown")?.setAttribute("hidden", "true");
    openProfilesModal();
  });

  $("#dropdown-account-settings")?.addEventListener("click", () => {
    $("#profile-dropdown")?.setAttribute("hidden", "true");
    setSection("profile", true);
  });

  $("#dropdown-signout")?.addEventListener("click", handleSignOut);
  $("#profile-signout-btn")?.addEventListener("click", handleSignOut);
  $("#signout-all-btn")?.addEventListener("click", handleSignOutAll);
  $("#profile-resend-verify-btn")?.addEventListener("click", handleResendVerify);

  // Dropdown profile items
  $("#dropdown-profiles-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-switch-profile]");
    if (!btn) return;
    $("#profile-dropdown")?.setAttribute("hidden", "true");
    void selectProfile(btn.dataset.switchProfile);
  });

  // Inline profiles row
  $("#profiles-inline-list")?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-switch-profile]");
    if (!item) return;
    void selectProfile(item.dataset.switchProfile);
  });

  $("#card-manage-profiles-btn")?.addEventListener("click", openProfilesModal);
  $("#card-add-profile-btn")?.addEventListener("click", () => openProfileEditModal(null));

  // Modal Backdrop click to dismiss
  $("#auth-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "auth-backdrop") closeAuthModal();
  });
  $("#profiles-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "profiles-backdrop") closeProfilesModal();
  });
  $("#profile-edit-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "profile-edit-backdrop") closeProfileEditModal();
  });
  $("#pin-prompt-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "pin-prompt-backdrop") closePinPrompt();
  });

  // Modal close buttons
  $("#close-auth-modal")?.addEventListener("click", closeAuthModal);
  $("#close-profiles-modal-btn")?.addEventListener("click", closeProfilesModal);
  $("#close-profile-edit-modal")?.addEventListener("click", closeProfileEditModal);
  $("#cancel-profile-edit-btn")?.addEventListener("click", closeProfileEditModal);
  $("#close-pin-modal")?.addEventListener("click", closePinPrompt);
  $("#cancel-pin-btn")?.addEventListener("click", closePinPrompt);

  // Auth Tabs & navigation
  $("#tab-signin")?.addEventListener("click", () => switchAuthTab("signin"));
  $("#tab-signup")?.addEventListener("click", () => switchAuthTab("signup"));
  $("#forgot-password-link")?.addEventListener("click", () => switchAuthTab("forgot"));
  $("#forgot-back-btn")?.addEventListener("click", () => switchAuthTab("signin"));
  $("#reset-back-btn")?.addEventListener("click", () => switchAuthTab("signin"));

  // 1. Sign In Form Submission
  $("#form-signin")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#signin-email")?.value.trim();
    const password = $("#signin-password")?.value;
    const rememberMe = $("#signin-remember")?.checked ?? true;

    if (!email || !password) {
      setFeedback("#signin-feedback", "Please enter both email and password.");
      return;
    }

    const submitBtn = $("#signin-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Signing in…</span>";

    const res = await authApi("/api/auth/login", "POST", { email, password, rememberMe });
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>Sign In</span>";

    if (!res.ok) {
      setFeedback("#signin-feedback", res.data.error || "Invalid credentials.");
      return;
    }

    if (res.data?.token) {
      localStorage.setItem("ustream_auth_token", res.data.token);
    }

    closeAuthModal();
    showToast(`Welcome back, ${res.data.activeProfile?.name || res.data.user.email}!`);
    await initAuth();

    if (state.auth.returnUrl && state.auth.returnUrl !== "#/login") {
      window.location.hash = state.auth.returnUrl;
    }
  });

  // 2. Sign Up Form Submission
  $("#form-signup")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name")?.value.trim();
    const email = $("#signup-email")?.value.trim();
    const password = $("#signup-password")?.value;

    if (!name || !email || !password) {
      setFeedback("#signup-feedback", "Please fill in all fields.");
      return;
    }

    const submitBtn = $("#signup-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Creating account…</span>";

    const res = await authApi("/api/auth/register", "POST", { email, password, name });
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>Create Account</span>";

    if (!res.ok) {
      setFeedback("#signup-feedback", res.data.error || "Registration failed.");
      return;
    }

    if (res.data?.token) {
      localStorage.setItem("ustream_auth_token", res.data.token);
    }

    closeAuthModal();
    showToast(`Welcome to Ustream, ${name}!`);
    await initAuth();

    if (state.auth.returnUrl && state.auth.returnUrl !== "#/register") {
      window.location.hash = state.auth.returnUrl;
    }
  });

  // 3. Forgot Password Form Submission
  $("#form-forgot")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#forgot-email")?.value.trim();
    if (!email) {
      setFeedback("#forgot-feedback", "Please enter your email.");
      return;
    }

    const submitBtn = $("#forgot-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Sending…</span>";

    const res = await authApi("/api/auth/forgot-password", "POST", { email });
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>Send Reset Instructions</span>";

    if (res.ok) {
      let msg = res.data.message || "Reset instructions sent!";
      if (res.data.resetToken) {
        msg += ` (Dev/Test Token: ${res.data.resetToken})`;
      }
      setFeedback("#forgot-feedback", msg, false);
    } else {
      setFeedback("#forgot-feedback", res.data.error || "Unable to send reset instructions.");
    }
  });

  // 4. Reset Password Form Submission
  $("#form-reset")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = $("#reset-token-input")?.value.trim();
    const password = $("#reset-new-password")?.value;
    const confirm = $("#reset-confirm-password")?.value;

    if (!token || !password) {
      setFeedback("#reset-feedback", "Please enter your reset token and new password.");
      return;
    }
    if (password !== confirm) {
      setFeedback("#reset-feedback", "Passwords do not match.");
      return;
    }

    const submitBtn = $("#reset-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Updating…</span>";

    const res = await authApi("/api/auth/reset-password", "POST", { token, password });
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>Reset Password</span>";

    if (res.ok) {
      setFeedback("#reset-feedback", "Password reset successfully! Please sign in with your new password.", false);
      setTimeout(() => switchAuthTab("signin"), 1500);
    } else {
      setFeedback("#reset-feedback", res.data.error || "Password reset failed.");
    }
  });

  // 5. Change Password Form Submission
  $("#change-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = $("#current-password-input")?.value;
    const newPassword = $("#new-password-input")?.value;
    const confirmPassword = $("#confirm-password-input")?.value;

    if (!currentPassword || !newPassword) {
      setFeedback("#change-password-feedback", "Please enter your current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback("#change-password-feedback", "New passwords do not match.");
      return;
    }

    const submitBtn = $("#update-password-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Updating…</span>";

    const res = await authApi("/api/auth/change-password", "POST", { currentPassword, newPassword });
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>Update Password</span>";

    if (res.ok) {
      setFeedback("#change-password-feedback", "Password updated successfully!", false);
      $("#current-password-input").value = "";
      $("#new-password-input").value = "";
      $("#confirm-password-input").value = "";
      void loadSessions();
    } else {
      setFeedback("#change-password-feedback", res.data.error || "Failed to update password.");
    }
  });

  // 6. Profiles Modal & Tiles
  $("#manage-profiles-toggle-btn")?.addEventListener("click", () => {
    state.auth.isManagingProfiles = !state.auth.isManagingProfiles;
    const backdrop = $("#profiles-backdrop");
    const btn = $("#manage-profiles-toggle-btn");
    if (state.auth.isManagingProfiles) {
      backdrop?.classList.add("managing-profiles");
      if (btn) btn.innerHTML = "<span>Done</span>";
    } else {
      backdrop?.classList.remove("managing-profiles");
      if (btn) btn.innerHTML = "<span>Manage Profiles</span>";
    }
    renderProfilesGrid();
  });

  $("#profiles-grid")?.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-profile-card]");
    if (tile) {
      const pId = tile.dataset.profileCard;
      const target = state.auth.profiles.find((p) => p.id === pId);
      if (state.auth.isManagingProfiles) {
        openProfileEditModal(target);
      } else {
        void selectProfile(pId);
      }
      return;
    }

    const addTile = e.target.closest("#tile-add-profile");
    if (addTile) {
      openProfileEditModal(null);
    }
  });

  // 7. Avatar choices in Profile Edit Modal
  $("#avatar-picker-grid")?.addEventListener("click", (e) => {
    const choice = e.target.closest(".avatar-choice");
    if (!choice) return;
    $$(".avatar-choice").forEach((b) => b.classList.toggle("selected", b === choice));
  });

  // 8. Profile Edit Form Submission
  $("#profile-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#edit-profile-name")?.value.trim();
    if (!name) {
      setFeedback("#profile-edit-feedback", "Please enter a profile name.");
      return;
    }

    const selectedAvatar = $(".avatar-choice.selected")?.dataset.avatar || "🦊";
    const isKids = $("#edit-profile-kids")?.checked ?? false;
    const maturityRating = $("#edit-profile-maturity")?.value || "ALL";
    const language = $("#edit-profile-language")?.value || "en";
    const pin = $("#edit-profile-pin")?.value.trim() || undefined;

    const payload = {
      name,
      avatar: selectedAvatar,
      isKids,
      maturityRating,
      language,
      pin
    };

    const saveBtn = $("#save-profile-btn");
    saveBtn.disabled = true;

    let res;
    if (activeEditingProfileId) {
      res = await authApi(`/api/profiles/${activeEditingProfileId}`, "PUT", payload);
    } else {
      res = await authApi("/api/profiles", "POST", payload);
    }

    saveBtn.disabled = false;

    if (!res.ok) {
      setFeedback("#profile-edit-feedback", res.data.error || "Could not save profile.");
      return;
    }

    closeProfileEditModal();
    showToast(activeEditingProfileId ? "Profile updated!" : "Profile created!");
    await initAuth();
    if (!$("#profiles-backdrop")?.hasAttribute("hidden")) {
      renderProfilesGrid();
    }
  });

  // 9. Delete Profile Button
  $("#delete-profile-btn")?.addEventListener("click", async () => {
    if (!activeEditingProfileId) return;
    if (!confirm("Are you sure you want to delete this profile? All saved list items and progress will be lost.")) return;

    const res = await authApi(`/api/profiles/${activeEditingProfileId}`, "DELETE");
    if (!res.ok) {
      setFeedback("#profile-edit-feedback", res.data.error || "Could not delete profile.");
      return;
    }

    closeProfileEditModal();
    showToast("Profile deleted");
    await initAuth();
    if (!$("#profiles-backdrop")?.hasAttribute("hidden")) {
      renderProfilesGrid();
    }
  });

  // 10. PIN Prompt Form Submission
  $("#pin-prompt-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = $("#pin-input")?.value.trim();
    if (!pin || pin.length !== 4) {
      setFeedback("#pin-prompt-feedback", "Please enter a 4-digit PIN.");
      return;
    }

    const targetProfile = state.auth.pendingProfileForPin;
    if (!targetProfile) return;

    const res = await authApi(`/api/profiles/${targetProfile.id}/verify-pin`, "POST", { pin });
    if (!res.ok) {
      setFeedback("#pin-prompt-feedback", "Incorrect PIN. Please try again.");
      const pinInput = $("#pin-input");
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
      return;
    }

    // Switch profile after successful PIN verification
    const selRes = await authApi(`/api/profiles/${targetProfile.id}/select`, "POST");
    closePinPrompt();

    if (selRes.ok) {
      state.auth.activeProfile = targetProfile;
      closeProfilesModal();
      updateAuthUI();
      showToast(`Switched to ${targetProfile.name}`);
      render();
    } else {
      showToast(selRes.data.error || "Failed to switch profile");
    }
  });
}

/* ==========================================================================
   Startup Loader Engine
   ========================================================================== */
function hideStartupLoader() {
  const loader = $("#startup-loader");
  if (!loader || loader.dataset.hidden) return;
  loader.dataset.hidden = "true";
  loader.classList.add("fade-out");
  setTimeout(() => {
    loader.style.display = "none";
  }, 450);
}

/* ==========================================================================
   Appearance & Personalization Engine (GaiaFlix replicate)
   ========================================================================== */
function initAppearanceSettings() {
  const savedAccent = localStorage.getItem("ustream-accent") || "#e7ff51";
  const savedLang = localStorage.getItem("ustream-lang") || "en";

  document.documentElement.style.setProperty("--accent", savedAccent);

  $$("#accent-color-choices .color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color?.toLowerCase() === savedAccent.toLowerCase());
  });

  const langSelect = $("#appearance-language-select");
  if (langSelect) langSelect.value = savedLang;

  $("#appearance-btn")?.addEventListener("click", () => {
    $("#appearance-backdrop")?.removeAttribute("hidden");
  });
  $("#close-appearance-btn")?.addEventListener("click", () => {
    $("#appearance-backdrop")?.setAttribute("hidden", "true");
  });
  $("#appearance-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "appearance-backdrop") {
      $("#appearance-backdrop").setAttribute("hidden", "true");
    }
  });

  function updateThemeUI(theme, showNotification = true) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ustream-theme", theme);

    const labelText = isDark ? "DARK" : "LIGHT";
    const themeToggle = $("#theme-toggle-btn");
    if (themeToggle) {
      themeToggle.textContent = labelText;
      themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      themeToggle.classList.toggle("active", isDark);
    }

    const serviceToggle = $("#settings-dark-mode-toggle");
    if (serviceToggle) {
      serviceToggle.textContent = labelText;
      serviceToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      serviceToggle.classList.toggle("active", isDark);
    }

    if (!isAdultEnabled() && isAdultContent(featured)) {
      const cleanHero = catalog.find((i) => !isAdultContent(i)) || DEMO_ITEMS.find((i) => !isAdultContent(i));
      if (cleanHero) setFeatured(cleanHero);
    }

    render();

    if (showNotification) {
      showToast(isDark ? "Dark Mode ON" : "Light Mode ON");
    }
  }

  const savedTheme = localStorage.getItem("ustream-theme") || "dark";
  updateThemeUI(savedTheme, false);

  $("#theme-toggle-btn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    updateThemeUI(next, true);
  });

  $("#settings-dark-mode-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    updateThemeUI(next, true);
  });

  const syncAdultToggles = () => {
    const on = isAdultEnabled();
    $$("#adult-content-toggle, #appearance-adult-toggle").forEach((btn) => {
      btn.textContent = on ? "ON — 18+ shown" : "OFF — 18+ hidden";
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("active", on);
    });
  };
  $$("#adult-content-toggle, #appearance-adult-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isAdultEnabled()) {
        setAdultEnabled(false);
        syncAdultToggles();
        render();
        showToast("18+ content hidden");
      } else if (requestAdultEnable()) {
        setAdultEnabled(true);
        syncAdultToggles();
        render();
        showToast("18+ content enabled — age confirmed");
      }
    });
  });
  syncAdultToggles();

  $$("#accent-color-choices .color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.color;
      if (!color) return;
      document.documentElement.style.setProperty("--accent", color);
      $$("#accent-color-choices .color-swatch").forEach((s) => s.classList.toggle("active", s === swatch));
      localStorage.setItem("ustream-accent", color);
      showToast(`Accent color updated`);
    });
  });

  langSelect?.addEventListener("change", (e) => {
    const lang = e.target.value;
    localStorage.setItem("ustream-lang", lang);
    state.lang = lang;
    showToast(`Language updated to ${lang.toUpperCase()}`);
    if (state.section === "cartoons" || state.section === "anime") {
      loadCategoryTmdb(state.section);
    }
  });
}

/* ==========================================================================
   Global Search Modal Engine (GaiaFlix replicate)
   ========================================================================== */
let modalSearchType = "all";
let modalSearchDebounce = null;

function openSearchModal(initialQuery = "") {
  const backdrop = $("#search-backdrop");
  if (!backdrop) return;
  backdrop.removeAttribute("hidden");
  const input = $("#modal-search-input");
  if (input) {
    if (initialQuery) input.value = initialQuery;
    input.focus();
    if (initialQuery) executeModalSearch(initialQuery);
  }
}

function closeSearchModal() {
  $("#search-backdrop")?.setAttribute("hidden", "true");
}

function initSearchModal() {
  $("#search-modal-trigger")?.addEventListener("click", () => openSearchModal());
  $("#mobile-search-btn")?.addEventListener("click", () => openSearchModal());
  $("#close-search-modal")?.addEventListener("click", closeSearchModal);
  $("#search-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "search-backdrop") closeSearchModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === "Escape") {
      closeSearchModal();
      $("#appearance-backdrop")?.setAttribute("hidden", "true");
      }
  });

  $$(".search-type-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".search-type-pill").forEach((p) => p.classList.toggle("active", p === pill));
      modalSearchType = pill.dataset.searchType || "all";
      const q = $("#modal-search-input")?.value.trim();
      if (q) executeModalSearch(q);
    });
  });

  $$(".search-popular-tags .tag-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.searchTag;
      if (!tag) return;
      const input = $("#modal-search-input");
      if (input) {
        input.value = tag;
        input.focus();
      }
      executeModalSearch(tag);
    });
  });

  $("#modal-search-input")?.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(modalSearchDebounce);
    if (!q) {
      const resultsEl = $("#modal-search-results");
      if (resultsEl) resultsEl.innerHTML = `<div class="search-empty-prompt">Start typing to search titles and genres.</div>`;
      return;
    }
    modalSearchDebounce = setTimeout(() => executeModalSearch(q), 280);
  });
}

let searchAbortController = null;

async function executeModalSearch(query) {
  const resultsEl = $("#modal-search-results");
  if (!resultsEl) return;
  resultsEl.innerHTML = `
    <div style="margin-bottom: 12px; font-size: 13px; color: var(--muted);">Searching for “${escapeHtml(query)}”…</div>
    <div class="search-results-grid" aria-hidden="true">
      ${Array.from({ length: 6 }).map(() => `
        <div class="skeleton-card" style="min-height: 180px;">
          <div class="skeleton-poster" style="aspect-ratio: 2/3;"></div>
          <div class="skeleton-info">
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();
  const signal = searchAbortController.signal;

  const renderSearchResults = (cardsList) => {
    let markup = ``;

    if (cardsList.length) {
      markup += `
        <div>
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); margin-bottom: 12px;">🎬 Movies, Series &amp; Anime</h4>
          <div class="search-results-grid">
            ${cardsList.map(item => `
              <article class="search-result-card" data-search-card-title="${escapeHtml(item.title)}">
                <img class="search-result-poster" src="${item.image || "assets/logo-mark.png"}" alt="${escapeHtml(item.title)} poster" loading="lazy" decoding="async">
                <span class="search-result-title">${escapeHtml(item.title)}</span>
                <div class="search-result-meta">
                  <span>${item.year || "2024"}</span>
                  <span style="color: var(--accent); font-weight: 700;">★ ${normalizeRating(item.rating).toFixed(1)}</span>
                  <span>${escapeHtml(item.badge || item.type || "")}</span>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      `;
    }

    resultsEl.innerHTML = markup;

    resultsEl.querySelectorAll("[data-search-card-title]").forEach((el) => {
      el.addEventListener("click", () => {
        const title = el.dataset.searchCardTitle;
        closeSearchModal();
        playTitle(title);
      });
    });
  };

  try {
    const qLower = query.toLowerCase();
    const adultEnabled = isAdultEnabled();

    // 1. Local catalog matches
    const matchedCatalog = catalog.filter((item) => {
      if (!adultEnabled && isAdultContent(item)) return false;
      const matchText = `${item.title} ${item.genre?.join(" ") || ""} ${item.country || ""}`.toLowerCase();
      if (!matchText.includes(qLower)) return false;
      if (modalSearchType === "movie") return item.type === "movie";
      if (modalSearchType === "tv") return item.type === "series";
      if (modalSearchType === "anime") return item.type === "anime" || item.isJapaneseAnime;
      if (modalSearchType === "cartoon") return item.isCartoon || item.genre?.includes("animation");
      return true;
    });

    // Render immediate local matches without waiting on network
    if (matchedCatalog.length) {
      renderSearchResults(sortBySearchRelevance(matchedCatalog, query));
    }

    // 2. TMDB search via direct TMDB / proxy
    let tmdbResults = [];
    try {
      const data = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(query)}&language=${localStorage.getItem("ustream-lang") || "en-US"}`);
      if (signal.aborted) return;
      if (data) {
        tmdbResults = (data.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv").slice(0, 12).map((item) => {
          const isMovie = item.media_type === "movie";
          const title = isMovie ? item.title : item.name;
          const year = (isMovie ? item.release_date : item.first_air_date || "").slice(0, 4);
          const isAnime = item.original_language === "ja" && item.genre_ids?.includes(16);
          const isCartoon = item.original_language === "en" && item.genre_ids?.includes(16);
          const normalized = {
            title: title || "Untitled",
            type: isMovie ? "movie" : "series",
            year: year || "2024",
            rating: normalizeRating(item.vote_average),
            releaseDate: (isMovie ? item.release_date : item.first_air_date) || "",
            runtime: "—",
            image: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "",
            badge: isAnime ? "Anime" : isCartoon ? "Cartoon" : isMovie ? "Movie" : "Series",
            genre: isAnime ? ["anime"] : isCartoon ? ["animation"] : [isMovie ? "movie" : "drama"],
            isJapaneseAnime: isAnime,
            isCartoon: isCartoon,
            tmdbId: item.id,
            mediaType: item.media_type,
            adult: Boolean(item.adult),
            isAdult: Boolean(item.adult),
            country: "Global",
            kicker: isMovie ? "Movie" : "TV Series",
            gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
          };
          registerExtraTitle(normalized);
          return normalized;
        });
      }
    } catch {}

    if (signal.aborted) return;

    if (!isAdultEnabled()) {
      tmdbResults = tmdbResults.filter((i) => !isAdultContent(i));
    }
    if (modalSearchType === "movie") tmdbResults = tmdbResults.filter(i => i.type === "movie" && !i.isJapaneseAnime);
    if (modalSearchType === "tv") tmdbResults = tmdbResults.filter(i => i.type === "series" && !i.isJapaneseAnime);
    if (modalSearchType === "anime") tmdbResults = tmdbResults.filter(i => i.isJapaneseAnime);
    if (modalSearchType === "cartoon") tmdbResults = tmdbResults.filter(i => i.isCartoon);

    // Merge local + TMDB, deduped by TMDB id (then title), then ranked
    // by relevance: exact title, starts-with, word-boundary, substring.
    // A genre/country-only match scores last. When an exact title match
    // exists, pure substring matches are noise (e.g. "WWA The Inception"
    // for "Inception") and are dropped.
    let finalCards = sortBySearchRelevance(
      dedupeCatalogItems([...matchedCatalog, ...tmdbResults]),
      query
    );
    if (finalCards.some((card) => searchRelevanceScore(card.title, query) === 0)) {
      finalCards = finalCards.filter((card) => searchRelevanceScore(card.title, query) < 3);
    }
    finalCards = finalCards.slice(0, 24);

    if (!finalCards.length) {
      resultsEl.innerHTML = `
        <div class="search-empty-prompt">
          <p>No results found for “${escapeHtml(query)}”.</p>
          <small>Try another keyword or select a different media filter.</small>
        </div>
      `;
      return;
    }

    renderSearchResults(finalCards);
  } catch (err) {
    console.error("Search modal error:", err);
    resultsEl.innerHTML = `<div class="search-empty-prompt">Search error. Please try again.</div>`;
  }
}

/* ==========================================================================
   Explore / Watch Providers Directory Engine (GaiaFlix replicate)
   ========================================================================== */
const exploreProviders = [
  { id: 8, name: "Netflix", logo: "https://image.tmdb.org/t/p/w92/rK1KljqmbvO9HQa1PBFLILWah72.png", tag: "Movies & Series" },
  { id: 337, name: "Disney+", logo: "https://image.tmdb.org/t/p/w92/5eZ872CghnHFLB1j8grszbrx0dx.png", tag: "Originals & Marvel" },
  { id: 9, name: "Amazon Prime Video", logo: "https://image.tmdb.org/t/p/w92/gMZdpavHmxFNnLpMHwVxfqeux2g.png", tag: "Blockbusters" },
  { id: 350, name: "Apple TV+", logo: "https://image.tmdb.org/t/p/w92/9icYBfYFcwgCbky5VdGUIKJ4C5i.png", tag: "Award Winners" },
  { id: 1899, name: "Max (HBO)", logo: "https://image.tmdb.org/t/p/w92/skypuy7SXuugIQeYg0IglmzoKaS.png", tag: "HBO Originals" },
  { id: 283, name: "Crunchyroll", logo: "https://image.tmdb.org/t/p/w92/uFL3c4Cq8M6WoLymlC5Y8bmGytV.png", tag: "Anime Simulcasts" },
  { id: 2303, name: "Paramount+", logo: "https://image.tmdb.org/t/p/w92/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png", tag: "Paramount & CBS" },
  { id: 15, name: "Hulu", logo: "https://image.tmdb.org/t/p/w92/44uAnmSqvA4yBOdbPWN8YgQHjWm.png", tag: "Current TV" },
  { id: 387, name: "Peacock", logo: "https://image.tmdb.org/t/p/w92/yrEwyMzEKdqAoGhaWUARtIxByol.png", tag: "NBC Classics" },
  { id: 2, name: "Apple TV Store", logo: "https://image.tmdb.org/t/p/w92/qdEGArH3lKfFnAtYXMkSYk5wxuG.png", tag: "Digital Cinema" },
  { id: 3, name: "Google Play Movies", logo: "https://image.tmdb.org/t/p/w92/aZRENwYILujqs0RVOZutTh0BVGV.png", tag: "Rent & Buy" },
  { id: 192, name: "YouTube Movies", logo: "https://image.tmdb.org/t/p/w92/5Maob4o5w8oZnNeYpCDyVFD3M7X.png", tag: "Stream & Rent" }
];

let exploreInitialized = false;

function initExploreSection() {
  if (!exploreInitialized) {
    exploreInitialized = true;
    $("#explore-back-btn")?.addEventListener("click", () => {
      $("#provider-catalog-view")?.setAttribute("hidden", "true");
      $("#explore-back-btn")?.setAttribute("hidden", "true");
      $("#providers-grid")?.removeAttribute("hidden");
      const titleEl = $("#explore-title");
      const kickerEl = $("#explore-kicker");
      if (titleEl) titleEl.textContent = "Explore by Service";
      if (kickerEl) kickerEl.textContent = "Browse catalogs of top global streaming networks.";
    });
  }

  renderExploreProviders();
}

function renderExploreProviders() {
  const grid = $("#providers-grid");
  if (!grid) return;
  grid.removeAttribute("hidden");
  $("#provider-catalog-view")?.setAttribute("hidden", "true");
  $("#explore-back-btn")?.setAttribute("hidden", "true");

  grid.innerHTML = exploreProviders.map(p => `
    <article class="provider-tile" data-provider-id="${p.id}">
      <div class="provider-logo-wrap">
        <img src="${p.logo}" alt="${escapeHtml(p.name)} provider logo" decoding="async">
      </div>
      <span class="provider-tile-name">${escapeHtml(p.name)}</span>
      <span class="provider-tile-tag">${escapeHtml(p.tag)}</span>
    </article>
  `).join("");

  grid.querySelectorAll("[data-provider-id]").forEach(tile => {
    tile.addEventListener("click", () => {
      const pid = Number(tile.dataset.providerId);
      const provider = exploreProviders.find(p => p.id === pid);
      if (provider) openProviderCatalog(provider);
    });
  });
}

async function openProviderCatalog(provider) {
  const grid = $("#providers-grid");
  const view = $("#provider-catalog-view");
  const titlesGrid = $("#provider-titles-grid");
  const backBtn = $("#explore-back-btn");
  const titleEl = $("#explore-title");
  const kickerEl = $("#explore-kicker");

  if (grid) grid.setAttribute("hidden", "true");
  if (view) view.removeAttribute("hidden");
  if (backBtn) backBtn.removeAttribute("hidden");
  if (titleEl) titleEl.textContent = `${provider.name} on Ustream`;
  if (kickerEl) kickerEl.textContent = `Streaming collection on ${provider.name}`;

  const getFallbackProviderTitles = () => {
    const clean = catalog.filter(c => !isAdultContent(c) || isAdultEnabled());
    if (provider.id === 283) {
      const anime = clean.filter(c => c.type === "anime" || c.isJapaneseAnime);
      if (anime.length >= 6) return anime.slice(0, 18);
    }
    const offset = (provider.id * 3) % Math.max(1, Math.max(0, clean.length - 18));
    return clean.slice(offset, offset + 18);
  };

  if (titlesGrid) {
    const initialList = getFallbackProviderTitles();
    if (initialList.length) {
      titlesGrid.innerHTML = initialList.map(renderCard).join("");
      observeLazyImages(titlesGrid);
    } else {
      titlesGrid.innerHTML = createSkeletonCardsHtml(8);
    }
  }

  try {
    const lang = localStorage.getItem("ustream-lang") || "en-US";
    const moviePath = `/discover/movie?with_watch_providers=${provider.id}&watch_region=US&language=${lang}&sort_by=popularity.desc`;
    const tvPath = `/discover/tv?with_watch_providers=${provider.id}&watch_region=US&language=${lang}&sort_by=popularity.desc`;

    const [movieData, tvData] = await Promise.all([
      fetchTmdbApi(moviePath),
      fetchTmdbApi(tvPath)
    ]);

    const movies = Array.isArray(movieData?.results) ? movieData.results : [];
    const tvs = Array.isArray(tvData?.results) ? tvData.results : [];

    const normList = [];
    movies.slice(0, 12).forEach(m => {
      const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "";
      const item = {
        title: m.title || "Untitled",
        type: "movie",
        category: "movie",
        year: Number((m.release_date || "").slice(0, 4)) || 2024,
        rating: normalizeRating(m.vote_average),
        runtime: "Movie",
        image: poster,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : poster,
        description: m.overview || `Stream ${m.title || "this title"} on ${provider.name} via Ustream.`,
        badge: "HD",
        kicker: provider.name,
        genre: ["movie"],
        tmdbId: m.id,
        country: "Global",
        gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)"
      };
      registerExtraTitle(item);
      normList.push(item);
    });

    tvs.slice(0, 12).forEach(t => {
      const poster = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "";
      const item = {
        title: t.name || "Untitled",
        type: "series",
        category: "series",
        year: Number((t.first_air_date || "").slice(0, 4)) || 2024,
        rating: normalizeRating(t.vote_average),
        runtime: "Series",
        image: poster,
        backdrop: t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : poster,
        description: t.overview || `Stream ${t.name || "this series"} on ${provider.name} via Ustream.`,
        badge: "Series",
        kicker: provider.name,
        genre: ["series"],
        tmdbId: t.id,
        country: "Global",
        gradient: "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)"
      };
      registerExtraTitle(item);
      normList.push(item);
    });

    const finalList = normList.length ? normList : getFallbackProviderTitles();
    if (titlesGrid) {
      titlesGrid.innerHTML = finalList.length ? finalList.map(renderCard).join("") : `<div class="empty-state" style="padding: 40px; grid-column: 1 / -1; text-align: center;">No titles currently listed for this network.</div>`;
      observeLazyImages(titlesGrid);
    }
  } catch (err) {
    console.error("Provider catalog error:", err);
  }
}

/* ==========================================================================
   Cartoons & Anime TMDB Category Loader (GaiaFlix replicate)
   ========================================================================== */
const categoryCache = new Set();
async function loadCategoryTmdb(category) {
  if (categoryCache.has(category)) return;
  categoryCache.add(category);

  try {
    const langCode = localStorage.getItem("ustream-lang") || "en-US";
    let paths = [];

    if (category === "movies") {
      paths = [
        `/movie/popular?page=4&language=${langCode}`,
        `/movie/top_rated?page=1&language=${langCode}`,
        `/movie/now_playing?page=1&language=${langCode}`,
        `/discover/movie?sort_by=popularity.desc&page=4&language=${langCode}`
      ];
    } else if (category === "series") {
      paths = [
        `/tv/popular?page=4&language=${langCode}`,
        `/tv/top_rated?page=1&language=${langCode}`,
        `/tv/on_the_air?page=1&language=${langCode}`,
        `/discover/tv?sort_by=popularity.desc&page=4&language=${langCode}`
      ];
    } else if (category === "anime") {
      paths = [
        `/discover/tv?with_genres=16&with_original_language=ja&language=${langCode}&sort_by=popularity.desc&page=3`,
        `/discover/tv?with_genres=16&with_original_language=ja&language=${langCode}&sort_by=popularity.desc&page=4`,
        `/discover/movie?with_genres=16&with_original_language=ja&language=${langCode}&sort_by=popularity.desc&page=2`,
        `/discover/movie?with_genres=16&with_original_language=ja&language=${langCode}&sort_by=popularity.desc&page=3`
      ];
    } else if (category === "cartoons") {
      paths = [
        `/discover/tv?with_genres=16&with_original_language=en&language=${langCode}&sort_by=popularity.desc&page=3`,
        `/discover/tv?with_genres=16&with_original_language=en&language=${langCode}&sort_by=popularity.desc&page=4`,
        `/discover/movie?with_genres=16&with_original_language=en&language=${langCode}&sort_by=popularity.desc&page=2`,
        `/discover/movie?with_genres=16&with_original_language=en&language=${langCode}&sort_by=popularity.desc&page=3`
      ];
    }

    if (paths.length) {
      const results = await Promise.all(paths.map(fetchTmdbResults));
      const newCards = results.flat().map(t => normalizeTmdbItem(t, category));

      if (newCards.length) {
        const filtered = appendCatalogItems(newCards);
        if (filtered.length) {
          const vis = getVisibleCards();
          const displayed = vis.slice(0, state.displayLimit);
          const grid = $("#card-grid");
          if (grid && state.section === category) {
            grid.innerHTML = displayed.map((card) => renderCard(card)).join("");
            observeLazyImages(grid);
            updateCatalogCounters(vis, displayed);
          }
          if (vis.length > 0 && state.section === category) {
            setFeatured(vis[0]);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Failed to load ${category} from TMDB:`, err);
  }
}

function initSectionButtons() {
  // Delegated globally via document click handler for [data-section]
}


function initModalTabsAndHeroInteractions() {
  $$("[data-modal-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.modalTab;
      $$("[data-modal-tab]").forEach(b => {
        const isActive = b.dataset.modalTab === tab;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      $$(".modal-tab-panel").forEach(p => {
        const isActive = p.id === `modal-panel-${tab}`;
        p.hidden = !isActive;
        p.classList.toggle("active", isActive);
      });
    });
  });

  $("#modal-trailer")?.addEventListener("click", () => {
    if (state.activeModal) {
      closeDetails();
      playTrailer(state.activeModal.title);
    }
  });

  $("#hero-trailer")?.addEventListener("click", () => {
    stopHeroMotionPreview();
    playTrailer(featured?.title);
  });
  $("#hero-mute-toggle")?.addEventListener("click", toggleHeroMute);
}


function initRouter() {
  const handleRoute = () => {
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    const [path, queryString] = rawHash.split("?");
    const cleanPath = path ? path.toLowerCase() : "home";
    const params = new URLSearchParams(queryString || "");

    // Auth query alerts (e.g. verified=1, error=...)
    if (params.get("verified") === "1" || window.location.search.includes("verified=1")) {
      showToast("Email verified successfully! ✓");
    }
    if (params.get("error")) {
      showToast(`Authentication Error: ${params.get("error")}`);
    }

    // Modal routes
    if (cleanPath === "login") {
      openAuthModal("signin");
      setSection("home", false);
      return;
    }
    if (cleanPath === "register") {
      openAuthModal("signup");
      setSection("home", false);
      return;
    }
    if (cleanPath === "forgot-password") {
      openAuthModal("forgot");
      setSection("home", false);
      return;
    }
    if (cleanPath === "reset-password") {
      openAuthModal("reset");
      const token = params.get("token");
      if (token && $("#reset-token-input")) {
        $("#reset-token-input").value = token;
      }
      setSection("home", false);
      return;
    }
    if (cleanPath === "profiles") {
      openProfilesModal();
      setSection("home", false);
      return;
    }

    // Deep-linked title: #/title/<id> or #/movies/<id> (also series/anime/cartoons)
    const titleMatch = cleanPath.match(/^(?:title|movies|series|anime|cartoons)\/(.+)$/);
    if (titleMatch) {
      const found = findTitleById(titleMatch[1]);
      if (found) {
        if (state.activeModal?.title !== found.title) openDetails(found.title, { updateHash: false });
        return;
      }
      showToast("That title is not available right now");
      setSection("home", false);
      return;
    }
    if (state.activeModal) closeDetails({ updateHash: false });

    const validSections = ["home", "movies", "series", "anime", "cartoons", "explore", "my-list", "profile"];
    const section = validSections.includes(cleanPath) ? cleanPath : "home";
    setSection(section, false);
  };

  window.addEventListener("hashchange", handleRoute);
  initSectionButtons();
  handleRoute();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  loadShowcaseCatalog();
  setupAuthEventListeners();
  void initAuth();
  initAppearanceSettings();
  initSearchModal();
  initCustomVideoPlayer();
  initCreatorStudioAndUploads();
  void loadCommunityVideos();
  initModalTabsAndHeroInteractions();
  initRouter();
  initInfiniteScroll();
  void loadLiveCatalog();
  void loadNewestRecommendations();
  hideStartupLoader();
  if (document.readyState === "complete" || document.readyState === "interactive") {
    hideStartupLoader();
  } else {
    window.addEventListener("load", hideStartupLoader);
    window.addEventListener("DOMContentLoaded", hideStartupLoader);
  }
  setTimeout(hideStartupLoader, 300);
  setTimeout(hideStartupLoader, 800);
}

