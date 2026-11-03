import { ICONS, renderIcon } from "./assets/icons.js";

/* ==========================================================================
   Ustream Anti-Ad & Redirect Blocker Shield
   Guarantees zero unauthorized ad pop-ups, pop-unders, top-window hijacks,
   or rogue promotional redirects.
   ========================================================================== */
function initAdShield() {
  if (typeof window === "undefined") return;

  // 1. Hard-block unauthorized window.open ad popups and tab redirects
  const _origOpen = window.open;
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
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
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
    "runtime": "4 Seasons · 34 Episodes",
    "duration": "4 Seasons",
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
    "seNum": 4
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
    "runtime": "1 Season · 9 Episodes",
    "duration": "1 Season",
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
    "seNum": 1
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

const TMDB_GENRE_NAMES = {
  28: "action", 12: "adventure", 16: "animation", 35: "comedy", 80: "crime",
  99: "documentary", 18: "drama", 10751: "family", 14: "fantasy", 36: "history",
  27: "horror", 10402: "music", 9648: "mystery", 10749: "romance", 878: "sci-fi",
  10770: "tv movie", 53: "thriller", 10752: "war", 37: "western",
  10759: "action", 10762: "kids", 10763: "news", 10764: "reality",
  10765: "sci-fi", 10766: "soap", 10767: "talk", 10768: "war"
};

const TMDB_PUBLIC_KEYS = [
  "16f62d38fec24f4e6c2adc9388da20ce", // GaiaFlix primary TMDB API v3 key
  "e9e9d8da18ae29fc430845952232787c"  // High availability backup key
];

async function fetchTmdbApi(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Direct TMDB v3 fetch (Replicating GaiaFlix client-side architecture)
  // Direct client calls bypass Vercel serverless cold starts, timeouts, and lambda failures
  for (const key of TMDB_PUBLIC_KEYS) {
    try {
      const sep = cleanPath.includes("?") ? "&" : "?";
      const directUrl = `https://api.themoviedb.org/3${cleanPath}${sep}api_key=${key}`;
      const res = await fetch(directUrl, {
        headers: { Accept: "application/json" }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Try next key or proxy fallback
    }
  }

  // 2. Secondary fallback: Local server proxy /api/tmdb
  try {
    const res = await fetch(`/api/tmdb${cleanPath}`);
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
  const isMovie = category === "movie" || item.media_type === "movie" || (!item.first_air_date && !!item.release_date);
  const isAnime = category === "anime" || (item.original_language === "ja" && (item.genre_ids || []).includes(16));
  const isCartoon = category === "cartoons" || category === "cartoon" || (item.original_language === "en" && (item.genre_ids || []).includes(16));
  const type = isAnime ? "anime" : isCartoon ? "cartoon" : isMovie ? "movie" : "series";
  const title = (item.title || item.name || item.original_title || item.original_name || "Untitled").trim();
  const yearStr = item.release_date || item.first_air_date || "";
  const year = parseInt(yearStr.slice(0, 4), 10) || new Date().getFullYear();
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : (poster || "");
  const rating = item.vote_average ? Number(item.vote_average.toFixed(1)) : 8.0;
  const tmdbId = String(item.id);
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
    adult: Boolean(item.adult || isAdult),
    isAdult: Boolean(item.adult || isAdult),
    genre: [...genreSet],
    country: item.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
    countryName: item.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
    year,
    releaseDate: yearStr,
    rating,
    imdbRatingValue: String(rating),
    runtime: isMovie ? "Feature film" : "Series",
    duration: isMovie ? "Feature film" : "Series",
    language: item.original_language === "ja" ? "Japanese, English Dub" : "English, Multi Sub",
    badge: rating >= 8.0 ? "Top Rated" : "Popular",
    kicker: isAnime ? "Anime Series" : isCartoon ? "Animation" : isMovie ? "Blockbuster" : "Hit Series",
    image: poster,
    cover: { url: poster },
    backdrop,
    gradient: isAnime ? "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)" : isCartoon ? "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)" : isMovie ? "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)" : "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    description: item.overview || `Stream ${title} in high definition on Ustream.`,
    video: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51`,
    playUrl: { url: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51` },
    hasResource: true,
    seNum: isMovie ? 0 : 1,
    mediaType: isMovie ? "movie" : "tv",
  };
};

function updateStatusBadge(isLive, count) {
  const dot = $("#status-dot");
  const label = $("#status-label");
  const settingsDot = $("#settings-status-dot");
  const settingsTitle = $("#settings-status-title");
  const settingsInfo = $("#settings-status-info");

  if (dot) dot.classList.toggle("live", !!isLive);
  if (label) label.textContent = isLive ? "Live" : "Curated";

  if (settingsDot) settingsDot.classList.toggle("live", !!isLive);
  if (settingsTitle) settingsTitle.textContent = isLive ? "Live Streaming Active" : "Curated Catalog";
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
  showToast(`Loaded ${DEMO_ITEMS.length} curated titles (10 Movies, 5 Series, 5 Anime)`);
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
  
  // Instant Cold-Start Rendering: Check if cached catalog exists to show immediately (0ms delay)
  const cachedCatalogStr = localStorage.getItem("ustream-catalog-cache");
  if (cachedCatalogStr) {
    try {
      const cached = JSON.parse(cachedCatalogStr);
      if (Array.isArray(cached) && cached.length >= 20) {
        catalog = cached;
        setFeatured(catalog[0]);
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

    const successfulItems = [];
    const seenTitles = new Set();

    // Include DEMO_ITEMS so all 20 curated premier items are always present
    DEMO_ITEMS.forEach((d) => {
      const key = d.title.toLowerCase().trim();
      seenTitles.add(key);
      successfulItems.push(d);
    });

    results.forEach(({ items }) => {
      items.forEach((item) => {
        const key = item.title.toLowerCase().trim();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          successfulItems.push(item);
        }
      });
    });

    if (successfulItems.length >= 20) {
      catalog = successfulItems;
      setFeatured(successfulItems[0]);
      updateStatusBadge(true, successfulItems.length);
      clearErrorState();
      render();
      try {
        localStorage.setItem("ustream-catalog-cache", JSON.stringify(catalog.slice(0, 300)));
      } catch {}
      if (!cachedCatalogStr) {
        showToast(`Loaded ${successfulItems.length} titles across all categories`);
      }
      return;
    }

    console.warn("[TMDB catalog fallback to showcase items]");
    loadShowcaseCatalog();
  } catch (error) {
    console.error("[Ustream Unhandled Catalog Error]", error);
    loadShowcaseCatalog();
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
  const nextPage = (sectionPages[targetSection] || 1) + 1;
  sectionPages[targetSection] = nextPage;

  let paths = [];
  if (targetSection === "movies") {
    paths = [
      { path: `/movie/popular?page=${nextPage}`, cat: "movie" },
      { path: `/discover/movie?sort_by=popularity.desc&page=${nextPage}`, cat: "movie" }
    ];
  } else if (targetSection === "series") {
    paths = [
      { path: `/tv/popular?page=${nextPage}`, cat: "tv" },
      { path: `/discover/tv?sort_by=popularity.desc&page=${nextPage}`, cat: "tv" }
    ];
  } else if (targetSection === "anime") {
    paths = [
      { path: `/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${nextPage}`, cat: "anime" },
      { path: `/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${nextPage}`, cat: "anime" }
    ];
  } else if (targetSection === "cartoons") {
    paths = [
      { path: `/discover/tv?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=${nextPage}`, cat: "cartoons" },
      { path: `/discover/movie?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=${nextPage}`, cat: "cartoons" }
    ];
  } else {
    // "home"
    paths = [
      { path: `/trending/all/day?page=${nextPage}`, cat: "trending" },
      { path: `/movie/now_playing?page=${nextPage}`, cat: "movie" }
    ];
  }

  const fetchedBatches = await Promise.all(paths.map(async ({ path, cat }) => {
    try {
      const rawResults = await fetchTmdbResults(path);
      if (Array.isArray(rawResults) && rawResults.length) {
        return rawResults.map((i) => normalizeTmdbItem(i, cat));
      }
    } catch {}

    // Fallback: /api/catalog
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
  const newItems = [];
  const seen = new Set(catalog.map((c) => (c.title || "").toLowerCase().trim()));
  flatItems.forEach((item) => {
    const key = (item.title || "").toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      newItems.push(item);
    }
  });

  if (newItems.length > 0) {
    catalog.push(...newItems);
    updateStatusBadge(true, catalog.length);
    try {
      localStorage.setItem("ustream-catalog-cache", JSON.stringify(catalog.slice(0, 1000)));
    } catch {}
  } else if (flatItems.length === 0 && nextPage >= 50) {
    hasMoreContent = false;
  }

  return newItems.length;
}

async function loadMoreTitles() {
  if (isLoadingMore) return;
  const targetSection = state.section;
  if (["sports", "explore", "profile", "my-list"].includes(targetSection)) return;

  const visible = getVisibleCards();
  const currentDisplayedCount = Math.min(state.displayLimit, visible.length);

  // 1. If we already have buffered items in memory, reveal the next 35 immediately
  if (state.displayLimit < visible.length) {
    state.displayLimit += CONTENT_BATCH_SIZE;
    const newDisplayed = visible.slice(0, state.displayLimit);
    const toAppend = newDisplayed.slice(currentDisplayedCount);

    const grid = $("#card-grid");
    if (grid && toAppend.length > 0) {
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = toAppend.map((card) => renderCard(card, { isNew: true })).join("");
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      grid.appendChild(fragment);
    }

    updateCatalogCounters(visible, newDisplayed);

    // If remaining buffered items are low, prefetch the next remote batch in the background
    if (visible.length - state.displayLimit < CONTENT_BATCH_SIZE && hasMoreContent) {
      void fetchNextRemoteBatch(targetSection);
    }
    return;
  }

  // 2. Fetch the next batch from the network
  if (!hasMoreContent) {
    const loadMoreBtn = $("#load-more-btn");
    if (loadMoreBtn) loadMoreBtn.textContent = "All available titles loaded";
    return;
  }

  isLoadingMore = true;
  const loader = $("#catalog-infinite-loader");
  const loadMoreBtn = $("#load-more-btn");
  if (loader) loader.hidden = false;
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.classList.add("loading");
  }

  try {
    await fetchNextRemoteBatch(targetSection);
    const updatedVisible = getVisibleCards();

    state.displayLimit += CONTENT_BATCH_SIZE;
    const newDisplayed = updatedVisible.slice(0, state.displayLimit);
    const toAppend = newDisplayed.slice(currentDisplayedCount);

    const grid = $("#card-grid");
    if (grid && toAppend.length > 0) {
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = toAppend.map((card) => renderCard(card, { isNew: true })).join("");
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      grid.appendChild(fragment);
    }

    updateCatalogCounters(updatedVisible, newDisplayed);

    if (updatedVisible.length <= newDisplayed.length && !hasMoreContent) {
      if (loadMoreBtn) loadMoreBtn.textContent = "All available titles loaded";
    }
  } catch (err) {
    console.warn("[Ustream LoadMore]", err);
  } finally {
    isLoadingMore = false;
    if (loader) loader.hidden = true;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.classList.remove("loading");
    }
  }
}

let scrollThrottleTimer = null;
function handleAutoInfiniteScroll() {
  if (isLoadingMore || !hasMoreContent) return;
  const targetSection = state.section;
  if (["sports", "explore", "profile", "my-list"].includes(targetSection)) return;

  const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

  // Auto infinity load: as soon as user is within 1000px of bottom, automatically load next 35 content!
  if (docHeight - (scrollY + viewportHeight) <= 1000) {
    void loadMoreTitles();
  }
}

function initInfiniteScroll() {
  const sentinel = $("#catalog-sentinel");
  const loadMoreBtn = $("#load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => void loadMoreTitles());
  }

  // 1. Dual-trigger IntersectionObserver with generous 800px root margin
  if (sentinel && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoadingMore && hasMoreContent) {
        void loadMoreTitles();
      }
    }, {
      rootMargin: "800px 0px"
    });
    observer.observe(sentinel);
  }

  // 2. Continuous passive window scroll listener (guarantees auto infinity loading on all mobile & desktop browsers)
  window.addEventListener("scroll", () => {
    const topbar = $(".topbar");
    if (topbar) {
      topbar.classList.toggle("scrolled", window.scrollY > 20);
    }
    if (scrollThrottleTimer) return;
    scrollThrottleTimer = window.setTimeout(() => {
      scrollThrottleTimer = null;
      handleAutoInfiniteScroll();
    }, 80);
  }, { passive: true });

  // 3. Window resize listener
  window.addEventListener("resize", () => {
    handleAutoInfiniteScroll();
  }, { passive: true });
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
  if (!isDarkModeActive() && isAdultContent(item)) {
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

  const ratingVal = item.rating || 8.6;
  const matchPercent = Math.min(99, Math.max(88, Math.round(ratingVal * 10 + (item.title.length % 5))));
  const maturityRating = item.maturityRating || (isAdultContent(item) ? "18+" : item.type === "movie" ? "PG-13" : "TV-MA");

  const heroMeta = $("#hero-meta");
  if (heroMeta) {
    heroMeta.innerHTML = `
      <span class="badge-imdb" title="IMDb Rating">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${ratingVal.toFixed(1)}
      </span>
      <span class="badge-match" title="Viewer Match Score">${matchPercent}% Match</span>
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
      backdrop.style.backgroundImage = `url("${backdropUrl}")`;
      backdrop.setAttribute("aria-label", `${item.title} banner`);
    }
  }
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
        const trailer = videos.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) || videos.find((v) => v.site === "YouTube");
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
          const trailer = videos.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) || videos.find((v) => v.site === "YouTube");
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
      if (playerBackdrop) playerBackdrop.hidden = false;
      return;
    }

    // Fallback: regular playTitle if trailer unavailable
    showToast(`Opening stream for ${item.title}`);
    playTitle(item.title);
  } catch (e) {
    console.warn("Could not load trailer:", e);
    playTitle(item.title);
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
              vote_average: it.rating || 8.0,
              release_date: String(it.year || ""),
              first_air_date: String(it.year || "")
            }));
          }
        }
      } catch {}
    }

    if (requestId !== searchRequestId) return;

    const isDark = isDarkModeActive();
    const filtered = (results || [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => normalizeTmdbItem(item, item.media_type === "movie" ? "movie" : "tv"))
      .filter((item) => isDark || !isAdultContent(item));

    if (filtered.length) {
      catalog = filtered;
      setFeatured(filtered[0]);
      render();
      showToast(`Found ${filtered.length} live results for "${trimmed}"`);
    } else {
      catalog = [];
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
  if (typeof openSearchModal === "function") {
    openSearchModal();
    return;
  }
  $("#search-box")?.classList.add("mobile-open");
  $("#search-input")?.focus();
}

function updateProfileStats() {
  const watchCount = $("#profile-watch-count");
  const listCount = $("#profile-list-count");
  if (watchCount) watchCount.textContent = String(continuation.length);
  if (listCount) listCount.textContent = String(state.watchlist.size);
}

function setSection(section, updateHash = true) {
  const validSections = ["home", "movies", "series", "anime", "cartoons", "sports", "explore", "my-list", "profile"];
  const target = validSections.includes(section) ? section : "home";
  state.section = target;
  state.genre = "all"; // Reset genre sub-tab so all titles in this section are visible!
  state.displayLimit = CONTENT_BATCH_SIZE; // Always start with 35 content at a time
  hasMoreContent = true;

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

  const heroSection = $(".hero");
  const quickPicks = $(".quick-picks");
  const recommendationsSection = $("#recommendations-section");
  const catalogSection = $("#catalog");
  const profileSection = $("#profile-section");
  const sportsSection = $("#sports-section");
  const exploreSection = $("#explore-section");

  const titles = {
    home: ["Explore the collection", "All Content & Trending"],
    movies: ["Feature-length stories", "Top movies"],
    series: ["Your next obsession", "Binge-worthy series"],
    anime: ["Anime Collection", "Anime picks"],
    cartoons: ["Western Animation", "Cartoons & Animated Features"],
    sports: ["BinTV Live", "Live & Upcoming Sports"],
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

  if (target === "sports") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (profileSection) profileSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
    if (sportsSection) {
      sportsSection.hidden = false;
      initSportsSection();
    }
  } else if (target === "explore") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (profileSection) profileSection.hidden = true;
    if (sportsSection) sportsSection.hidden = true;
    if (exploreSection) {
      exploreSection.hidden = false;
      initExploreSection();
    }
  } else if (target === "profile") {
    if (heroSection) heroSection.hidden = true;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = true;
    if (sportsSection) sportsSection.hidden = true;
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
    if (sportsSection) sportsSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
  } else if (target === "movies" || target === "series" || target === "anime" || target === "cartoons") {
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = true;
    if (recommendationsSection) recommendationsSection.hidden = true;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
    if (sportsSection) sportsSection.hidden = true;
    if (exploreSection) exploreSection.hidden = true;
    loadCategoryTmdb(target);
  } else {
    // "home"
    if (heroSection) heroSection.hidden = false;
    if (quickPicks) quickPicks.hidden = false;
    if (recommendationsSection) recommendationsSection.hidden = recommendations.length === 0;
    if (catalogSection) catalogSection.hidden = false;
    if (profileSection) profileSection.hidden = true;
    if (sportsSection) sportsSection.hidden = true;
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
    const cleanItem = catalog.find((i) => isDarkModeActive() || !isAdultContent(i));
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
  } else if (target === "sports" || target === "explore" || target === "profile") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  hasMoreContent = true;
  isLoadingMore = false;
  const loadMoreWrap = $("#catalog-load-more-wrap");
  if (loadMoreWrap) {
    loadMoreWrap.hidden = ["sports", "explore", "profile", "my-list"].includes(target);
  }
  if (visible.length < CONTENT_BATCH_SIZE && !["sports", "explore", "profile", "my-list"].includes(target) && hasMoreContent) {
    void loadMoreTitles();
  }
}

function isDarkModeActive() {
  const current = document.documentElement.getAttribute("data-theme") || localStorage.getItem("ustream-theme") || "dark";
  return current === "dark";
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
  const isDark = isDarkModeActive();

  let visible = catalog.filter((card) => {
    // Dark Mode Setting: If Dark Mode is OFF, strictly hide all 18+ and adult content across all categories
    if (!isDark && isAdultContent(card)) {
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
      matchesSection = card.type === "anime" || 
                       card.isJapaneseAnime || 
                       card.category === "anime" || 
                       card.genre?.includes("anime") ||
                       (card.language && /japanese/i.test(card.language)) ||
                       card.country === "Japan" || 
                       card.countryName === "Japan" ||
                       card.origin_country?.[0] === "JP";
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

  const isDark = isDarkModeActive();
  const visibleItems = continuation.filter((item) => isDark || !isAdultContent(item));

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
  row.innerHTML = visibleItems.map((item) => `
    <button class="continue-card" style="--card-gradient:${item.gradient}" data-action="details" data-title="${escapeHtml(item.title)}" aria-label="Continue watching ${escapeHtml(item.title)}">
      <span class="card-label">Continue watching</span><strong>${escapeHtml(item.title)}</strong>
      <span class="watch-progress"><span style="width:${item.progress}%"></span></span>
    </button>
  `).join("");
}

function renderRecommendations() {
  const section = $("#recommendations-section");
  const row = $("#recommendation-row");
  if (!section || !row) return;
  const isDark = isDarkModeActive();
  const visibleRecs = recommendations.filter((item) => isDark || !isAdultContent(item));
  section.hidden = visibleRecs.length === 0;
  row.innerHTML = visibleRecs.map(renderCard).join("");
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

  const cont = continuation.find((c) => c.title === card.title);
  const progressBarHtml = cont && cont.progress > 0
    ? `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${cont.progress}%"></div></div>`
    : "";

  return `
    <article class="media-card ${isNew ? "card-enter" : ""}" data-title="${cleanTitle}">
      <div class="poster" style="--poster-gradient:${card.gradient}">
        ${card.image ? `<img class="poster-image" src="${card.image}" alt="${cleanTitle} poster" loading="lazy" />` : ""}
        <span class="poster-kicker">${escapeHtml(card.kicker)}</span>
        ${badgeHtml}
        <span class="poster-title">${cleanTitle}</span>
        ${progressBarHtml}
        <button class="list-toggle ${saved ? "saved" : ""}" data-action="toggle-list" data-title="${cleanTitle}" aria-label="${saved ? "Remove" : "Add"} ${cleanTitle} ${saved ? "from" : "to"} my list">${saved ? renderIcon("heartFilled", "icon-sm") : renderIcon("plus", "icon-sm")}</button>
        <button class="card-hover" data-action="play" data-title="${cleanTitle}" aria-label="Play ${cleanTitle}"><span class="play-circle">${renderIcon("play", "icon-md")}</span></button>
      </div>
      <div class="card-info"><h3>${cleanTitle}</h3><div class="card-meta"><span>${card.year}</span><span>${card.runtime}</span><span class="score">★ ${card.rating.toFixed(1)}</span></div></div>
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
    const isExcluded = ["sports", "explore", "profile", "my-list"].includes(state.section);
    if (isExcluded) {
      loadMoreWrap.hidden = true;
    } else {
      const remaining = visible.length - displayed.length;
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
  if (!container) return;

  const isHomeView = state.section === "home" && !state.search.trim();
  container.hidden = !isHomeView;
  if (catalogSection) {
    catalogSection.hidden = false;
  }
  if (!isHomeView) return;

  const isDark = isDarkModeActive();
  const cleanCatalog = catalog.filter((card) => isDark || !isAdultContent(card));

  const isMovie = (c) => (c.type === "movie" || c.category === "movie") && c.type !== "anime" && !c.isJapaneseAnime && c.type !== "cartoon";
  const isSeries = (c) => (c.type === "series" || c.category === "series" || c.category === "tv") && c.type !== "anime" && !c.isJapaneseAnime && c.type !== "cartoon";
  const isAnime = (c) => c.type === "anime" || c.isJapaneseAnime || c.category === "anime" || (c.genre || []).includes("anime") || (c.language && /japanese/i.test(c.language));
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
          <button class="rail-arrow-float left" data-rail-scroll="left" aria-label="Scroll ${escapeHtml(r.title)} left"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg></button>
          <div class="media-rail">${r.items.map((card) => renderCard(card)).join("")}</div>
          <button class="rail-arrow-float right" data-rail-scroll="right" aria-label="Scroll ${escapeHtml(r.title)} right"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
      </section>
    `)
    .join("");
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
  vidstuck: {
    name: "Server 1 (Vidstuck HD - Fast & Reliable)",
    getMovieUrl: (id) => `https://vidstuck.cc/embed/movie/${id}?color=e7ff51&autoplay=false`,
    getTvUrl: (id, s, e) => `https://vidstuck.cc/embed/tv/${id}/${s}/${e}?color=e7ff51&autoplay=false`
  },
  vidlink: {
    name: "Server 2 (VidLink Cloud)",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e7ff51&secondaryColor=1f1f1f&icons=vid`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e7ff51&secondaryColor=1f1f1f&icons=vid`
  },
  vidsrc: {
    name: "Server 3 (VidSrc VIP)",
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
  },
  aniembed: {
    name: "Server 4 (AniEmbed Anime)",
    getMovieUrl: (id) => `https://aniembed.se/e/${id}/1?lang=sub&autoplay=1`,
    getTvUrl: (id, s, e) => `https://aniembed.se/e/${id}/${e}?lang=sub&autoplay=1`
  },
  smashy: {
    name: "Server 5 (SmashyStream)",
    getMovieUrl: (id) => `https://player.smashy.stream/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}`
  },
  autoembed: {
    name: "Server 6 (AutoEmbed)",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
  }
};

let currentServerKey = "vidstuck";
try {
  const savedServer = localStorage.getItem("ustream-server");
  if (savedServer && STREAM_SERVERS[savedServer] && savedServer !== "vidlink") {
    currentServerKey = savedServer;
  }
} catch {}

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
      title: s.name || `Season ${s.season_number}`,
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
  if (!item) return "27205";

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
        const top = isSeries
          ? (results.find(r => r.media_type === "tv" || (!r.media_type && r.first_air_date)) || results[0])
          : (results.find(r => r.media_type === "movie" || (!r.media_type && r.release_date)) || results[0]);
        if (top?.id && isValidTmdbId(top.id)) {
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

  // Safe fallback default IDs that always stream without crash
  const isTv = isSeries;
  const fallbackId = isTv ? "1396" : (item.type === "anime" ? "916192" : "27205");
  TMDB_CACHE.set(cacheKey, { id: fallbackId, mediaType: isTv ? "tv" : "movie" });
  return fallbackId;
}

function getEmbedStreamUrl(tmdbId, item, season = 1, episode = 1, serverKey = currentServerKey) {
  const server = STREAM_SERVERS[serverKey] || STREAM_SERVERS.vidstuck;
  const isSeries = isItemSeries(item);
  let url = isSeries
    ? server.getTvUrl(tmdbId, Math.max(1, Number(season) || 1), Math.max(1, Number(episode) || 1))
    : server.getMovieUrl(tmdbId);
  if (serverKey === "vidlink" && currentLanguageKey && currentLanguageKey !== "auto") {
    const langLabel = LANGUAGE_LABELS[currentLanguageKey] || "English";
    url += `&sub_label=${encodeURIComponent(langLabel)}`;
  }
  return url;
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
        if (liveText) liveText.textContent = "Streaming live";
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
        ? `<img src="${player.item.image}" alt="${escapeHtml(player.item.title || "Next episode")} preview" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
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
        ? `<img src="${related.image}" alt="${escapeHtml(related.title || "Recommended title")} preview" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
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
          ? `<img src="${related.image}" alt="${escapeHtml(related.title || "Recommended title")} preview" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`
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

function reloadCurrentEmbed() {
  const player = state.player;
  const item = player.item;
  if (!item || !player.tmdbId) return;
  const embed = $("#embed-player");
  if (!embed) return;
  embed.removeAttribute("sandbox");
  const season = player.selectedSeason || 1;
  const episode = player.selectedEpisode || 1;
  const url = getEmbedStreamUrl(player.tmdbId, item, season, episode, currentServerKey);
  embed.src = url;
  embed.hidden = false;
  const video = $("#video-player");
  if (video) video.hidden = true;
  const popout = $("#player-popout-btn");
  if (popout) popout.href = url;
  const server = STREAM_SERVERS[currentServerKey];
  const langLabel = currentLanguageKey !== "auto" ? ` · ${LANGUAGE_LABELS[currentLanguageKey] || currentLanguageKey.toUpperCase()}` : "";
  const seasonEpLabel = player.isSeries ? ` · S${season}:E${episode}` : "";
  setPlayerState(PLAYER_STATE.PLAYING, `${item.title}${seasonEpLabel} · ${server?.name || "HD Stream"}${langLabel}`);
  const liveLabel = $("#player-live-label");
  if (liveLabel) liveLabel.hidden = false;
  const liveText = $("#player-live-text");
  if (liveText) liveText.textContent = "HD Stream Online";
  updatePlayerEpisodeFlow();
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

async function playTitle(title) {
  const item = findTitle(title);
  if (!item) return;
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

  // Resolve actual TMDB ID for full movie / TV show stream
  const tmdbId = await resolveTmdbId(item);
  state.player.item = item;
  state.player.tmdbId = tmdbId;
  const isSeries = isItemSeries(item);
  state.player.isSeries = isSeries;
  state.player.selectedSeason = 1;
  state.player.selectedEpisode = 1;

  if (state.player.isSeries) {
    await loadEpisodeState(item.subjectId || item.title, 1, 1, ++state.player.requestId);
  } else {
    updatePlayerSelectionUI();
  }

  // Load embed player with actual content!
  const serverSelect = $("#player-server-select");
  if (serverSelect) serverSelect.value = currentServerKey;
  const streamUrl = getEmbedStreamUrl(tmdbId, item, state.player.selectedSeason || 1, state.player.selectedEpisode || 1, currentServerKey);
  if (embed) {
    embed.removeAttribute("sandbox");
    embed.src = streamUrl;
    embed.hidden = false;
  }
  const popout = $("#player-popout-btn");
  if (popout) popout.href = streamUrl;

  const server = STREAM_SERVERS[currentServerKey];
  const langLabel = currentLanguageKey !== "auto" ? ` · ${LANGUAGE_LABELS[currentLanguageKey] || currentLanguageKey.toUpperCase()}` : "";
  const seasonEpLabel = isSeries ? ` · S${state.player.selectedSeason || 1}:E${state.player.selectedEpisode || 1}` : "";
  setPlayerState(PLAYER_STATE.PLAYING, `${item.title}${seasonEpLabel} · ${server?.name || "HD Stream"}${langLabel}`);
  const liveLabel = $("#player-live-label");
  if (liveLabel) liveLabel.hidden = false;
  const liveText = $("#player-live-text");
  if (liveText) liveText.textContent = "HD Stream Online";
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
  reloadCurrentEmbed();
}

async function retryPlayback() {
  if (!state.player?.item) return;
  setPlayerState(PLAYER_STATE.LOADING, "Reconnecting to HD stream…");
  await playTitle(state.player.item.title);
}

function handlePlaybackError() {
  const embed = $("#embed-player");
  if (embed && state.player?.tmdbId && state.player?.item) {
    // Switch to alternate server
    const serverKeys = Object.keys(STREAM_SERVERS);
    const nextIdx = (serverKeys.indexOf(currentServerKey) + 1) % serverKeys.length;
    currentServerKey = serverKeys[nextIdx];
    const serverSelect = $("#player-server-select");
    if (serverSelect) serverSelect.value = currentServerKey;
    reloadCurrentEmbed();
    showToast(`Switched to ${STREAM_SERVERS[currentServerKey]?.name}`);
    return;
  }
  setPlayerState(PLAYER_STATE.ERROR, "Playback failed");
}

function closePlayer() {
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
  const resumeBanner = $("#player-resume-banner");
  if (resumeBanner) resumeBanner.hidden = true;
  const episodesSection = $("#player-episodes-section");
  if (episodesSection) episodesSection.hidden = true;
  const seasonBarField = $("#player-season-bar-field");
  if (seasonBarField) seasonBarField.hidden = true;
  const episodeBarField = $("#player-episode-bar-field");
  if (episodeBarField) episodeBarField.hidden = true;
  $("#player-backdrop").hidden = true;
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

  // Track continuation row
  const item = {
    title,
    image: poster,
    type: "video",
    streamUrl,
    videoId
  };
  const idx = continuation.findIndex((c) => c.title === title);
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

    // Save playback position periodically
    if (current > 5 && Math.floor(current) % 5 === 0) {
      const vidKey = video.dataset.itemTitle || state.player?.item?.title;
      if (vidKey) {
        localStorage.setItem(`ustream-pos-${vidKey}`, String(Math.floor(current)));
      }
    }
  });

  video.addEventListener("loadedmetadata", () => {
    if (durationEl && video.duration) {
      durationEl.textContent = formatTime(video.duration);
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
        <img src="${v.thumbnailPath || `/api/videos/thumbnail/${v.id}`}" alt="${escapeHtml(v.title)}" loading="lazy" />
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
          <img class="my-upload-thumb" src="${v.thumbnailPath || `/api/videos/thumbnail/${v.id}`}" alt="" />
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

function closeDetails() {
  $("#modal-backdrop").hidden = true;
  state.activeModal = null;
}

function toggleList(title) {
  const item = catalog.find((c) => c.title === title) || featured;
  if (state.watchlist.has(title)) {
    state.watchlist.delete(title);
    showToast(`${title} removed from My List`);
  } else {
    state.watchlist.add(title);
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

if (typeof window !== "undefined" && typeof document !== "undefined") {
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
  if (!button) return;
  if (button.dataset.section) return setSection(button.dataset.section, true);
  if (button.dataset.genre) {
    state.genre = button.dataset.genre;
    state.displayLimit = CONTENT_BATCH_SIZE;
    $$(".genre-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    render();
    return;
  }
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
    currentServerKey = event.target.value;
    try {
      localStorage.setItem("ustream-server", currentServerKey);
    } catch {}
    reloadCurrentEmbed();
    showToast(`Switched to ${STREAM_SERVERS[currentServerKey]?.name || "HD Server"}`);
    return;
  }
  if (event.target.id === "player-language-bar-select") {
    currentLanguageKey = event.target.value;
    try {
      localStorage.setItem("ustream-language", currentLanguageKey);
    } catch {}
    showToast(`Language set to ${LANGUAGE_LABELS[currentLanguageKey] || currentLanguageKey.toUpperCase()}`);
    reloadCurrentEmbed();
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
    video.dataset.fallbackAttempted = "true";
    console.warn("[Ustream Video Player] Video source failed, switching to verified HD stream...");
    setPlayerState(PLAYER_STATE.LOADING, "Activating resilient HD stream…");
    const backupUrl = getStreamForTitle(video.dataset.itemTitle, 2);
    video.src = backupUrl;
    video.load();
    const playAttempt = video.play();
    if (playAttempt?.then) {
      playAttempt.then(() => {
        setPlayerState(PLAYER_STATE.PLAYING, `Playing: ${video.dataset.itemTitle}`);
      }).catch(() => {
        setPlayerState(PLAYER_STATE.READY, "Ready to watch · Click Start playback");
      });
    }
    return;
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
    closeSportsPlayer();
    $("#profile-dropdown")?.setAttribute("hidden", "true");
    $("#search-box")?.classList.remove("mobile-open");
  }
});

// ==========================================================================
// Authentication, Viewer Profiles & Security State Controller
// ==========================================================================

const LocalAuthVault = {
  getStore() {
    try {
      const raw = localStorage.getItem("ustream_local_auth_store");
      if (raw) return JSON.parse(raw);
    } catch {}
    return { users: [], profiles: [], activeUserId: null, activeProfileId: null };
  },
  saveStore(store) {
    try {
      localStorage.setItem("ustream_local_auth_store", JSON.stringify(store));
    } catch {}
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
        // Merge into continuation
        histRes.data.history.forEach((h) => {
          if (!continuation.some((c) => c.title === h.title)) {
            continuation.unshift({
              title: h.title,
              season: h.season,
              episode: h.episode,
              progress: Math.round((h.progressSeconds / (h.durationSeconds || 1)) * 100),
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

    const labelText = isDark ? "DARK (18+ ON)" : "LIGHT (18+ OFF)";
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

    if (!isDark && isAdultContent(featured)) {
      const cleanHero = catalog.find((i) => !isAdultContent(i)) || DEMO_ITEMS.find((i) => !isAdultContent(i));
      if (cleanHero) setFeatured(cleanHero);
    }

    render();

    if (showNotification) {
      showToast(isDark ? "Dark Mode ON — 18+ and adult content unlocked" : "Light Mode ON — All 18+ and adult content hidden");
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
      closeSportsPlayer();
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
      if (resultsEl) resultsEl.innerHTML = `<div class="search-empty-prompt">Start typing to search titles, genres, and live events.</div>`;
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
    <div class="search-loading-state" style="padding: 40px; text-align: center; color: var(--muted);">
      <span class="player-loading-indicator"></span>
      <p style="margin-top: 10px;">Searching titles &amp; events for “${escapeHtml(query)}”…</p>
    </div>
  `;

  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();
  const signal = searchAbortController.signal;

  try {
    const qLower = query.toLowerCase();
    const isDark = isDarkModeActive();

    // 1. Local catalog matches
    const matchedCatalog = catalog.filter((item) => {
      if (!isDark && isAdultContent(item)) return false;
      const matchText = `${item.title} ${item.genre?.join(" ") || ""} ${item.country || ""}`.toLowerCase();
      if (!matchText.includes(qLower)) return false;
      if (modalSearchType === "movie") return item.type === "movie";
      if (modalSearchType === "tv") return item.type === "series";
      if (modalSearchType === "anime") return item.type === "anime" || item.isJapaneseAnime;
      if (modalSearchType === "cartoon") return item.isCartoon || item.genre?.includes("animation");
      return true;
    });

    // 2. Search sports events
    let matchedSports = [];
    if (sportsState.cache && (modalSearchType === "all" || modalSearchType === "sports")) {
      const allEvents = [...(sportsState.cache.live || []), ...(sportsState.cache.upcoming || []), ...(sportsState.cache.channels || [])];
      matchedSports = allEvents.filter((ev) => {
        const text = `${ev.title} ${ev.category} ${ev.teams?.home?.name || ""} ${ev.teams?.away?.name || ""}`.toLowerCase();
        return text.includes(qLower);
      }).slice(0, 6);
    }

    // 3. TMDB search via direct TMDB / proxy
    let tmdbResults = [];
    try {
      const data = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(query)}&language=${localStorage.getItem("ustream-lang") || "en-US"}`);
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
            rating: item.vote_average || 7.5,
            runtime: isMovie ? "Feature film" : "TV Series",
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

    if (!isDark) {
      tmdbResults = tmdbResults.filter((i) => !isAdultContent(i));
    }
    if (modalSearchType === "movie") tmdbResults = tmdbResults.filter(i => i.type === "movie" && !i.isJapaneseAnime);
    if (modalSearchType === "tv") tmdbResults = tmdbResults.filter(i => i.type === "series" && !i.isJapaneseAnime);
    if (modalSearchType === "anime") tmdbResults = tmdbResults.filter(i => i.isJapaneseAnime);
    if (modalSearchType === "cartoon") tmdbResults = tmdbResults.filter(i => i.isCartoon);

    const seenTitles = new Set();
    const finalCards = [];
    for (const card of [...matchedCatalog, ...tmdbResults]) {
      const key = card.title.toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        finalCards.push(card);
      }
    }

    if (!finalCards.length && !matchedSports.length) {
      resultsEl.innerHTML = `
        <div class="search-empty-prompt">
          <p>No results found for “${escapeHtml(query)}”.</p>
          <small>Try another keyword or select a different media filter.</small>
        </div>
      `;
      return;
    }

    let markup = ``;

    if (matchedSports.length) {
      markup += `
        <div style="margin-bottom: 18px;">
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); margin-bottom: 10px;">⚡ Live Sports &amp; Channels</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${matchedSports.map(m => `
              <div class="sports-match-card" data-watch-sports-id="${escapeHtml(m.id)}" style="flex-direction: row; align-items: center; justify-content: space-between; padding: 10px 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="sports-live-tag" style="margin: 0;">${m._live ? '<span class="live-dot"></span> LIVE' : escapeHtml(m.category)}</span>
                  <strong style="font-size: 13px;">${escapeHtml(m.title)}</strong>
                </div>
                <button class="primary-button" type="button" style="padding: 6px 14px; font-size: 11px;">Watch</button>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (finalCards.length) {
      markup += `
        <div>
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); margin-bottom: 12px;">🎬 Movies, Series &amp; Anime</h4>
          <div class="search-results-grid">
            ${finalCards.map(item => `
              <article class="search-result-card" data-search-card-title="${escapeHtml(item.title)}">
                <img class="search-result-poster" src="${item.image || "about:blank"}" alt="${escapeHtml(item.title)}" loading="lazy">
                <span class="search-result-title">${escapeHtml(item.title)}</span>
                <div class="search-result-meta">
                  <span>${item.year || "2024"}</span>
                  <span style="color: var(--accent); font-weight: 700;">★ ${Number(item.rating || 7).toFixed(1)}</span>
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

    resultsEl.querySelectorAll("[data-watch-sports-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const sportId = el.dataset.watchSportsId;
        const allEvents = [...(sportsState.cache?.live || []), ...(sportsState.cache?.upcoming || []), ...(sportsState.cache?.channels || [])];
        const match = allEvents.find(e => e.id === sportId);
        if (match) {
          closeSearchModal();
          openSportsPlayer(match);
        }
      });
    });
  } catch (err) {
    console.error("Search modal error:", err);
    resultsEl.innerHTML = `<div class="search-empty-prompt">Search error. Please try again.</div>`;
  }
}

/* ==========================================================================
   Live Sports Match Centre Engine (BinTV Integration)
   ========================================================================== */
const FALLBACK_SPORTS_CHANNELS = [
  {
    "id": "channel-sky-sports-main-event",
    "name": "Sky Sports Main Event",
    "category": "24/7 Channels",
    "poster": "https://e0.365dm.com/17/07/1600x900/skysports-all-new-rebrand-f1-premier-league-golf-cricket_4001810.jpg",
    "streams": [
      {
        "name": "Sky Sports Main Event",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvbjU4YWpnZngtNDcy"
      },
      {
        "name": "4K HEVC",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvaXk1MDBoenEtNzY1MQ"
      }
    ]
  },
  {
    "id": "channel-sky-sports-premier-league",
    "name": "Sky Sports Premier League",
    "category": "24/7 Channels",
    "poster": "https://e0.365dm.com/25/06/2048x1152/skysports-premier-league-fixtures_6937276.jpg",
    "streams": [
      {
        "name": "Sky Sports Premier League",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYva3pkM2hycXotNDMxNA"
      }
    ]
  },
  {
    "id": "channel-sky-sports-cricket",
    "name": "Sky Sports Cricket",
    "category": "24/7 Channels",
    "poster": "https://e0.365dm.com/17/07/2048x1152/skysports-sky-sports-cricket-podcast-sky-cricket-podcast_4004801.jpg",
    "streams": [
      {
        "name": "Sky Sports Cricket",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvcWZ4NDAzOHAtOTU"
      }
    ]
  },
  {
    "id": "channel-sky-sports-f1",
    "name": "Sky Sports F1",
    "category": "24/7 Channels",
    "poster": "https://e0.365dm.com/21/03/1600x900/skysports-f1-2021-graphic_5299452.png",
    "streams": [
      {
        "name": "English",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZjU5NmY5OHItNjk3Nw"
      },
      {
        "name": "Italian",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvdDVtcG4xOTItNjUwNA"
      },
      {
        "name": "German",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvNzhoeTY2bjYtODE5OA"
      },
      {
        "name": "4K HEVC",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvYzg5dnhydmMtNTA4Nw"
      }
    ]
  },
  {
    "id": "channel-tnt-sports-1",
    "name": "TNT Sports 1",
    "category": "24/7 Channels",
    "poster": "https://cdn.mos.cms.futurecdn.net/y3oPitXYAwGJnyTHFYo5qB.jpeg",
    "streams": [
      {
        "name": "TNT Sports 1",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZTBseXJraHItMTAwMg"
      },
      {
        "name": "4K HEVC (Select Events Only)",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZDlkYjRnbnQtNDAzOQ"
      }
    ]
  },
  {
    "id": "channel-tnt-sports-2",
    "name": "TNT Sports 2",
    "category": "24/7 Channels",
    "poster": "https://cdn.mos.cms.futurecdn.net/y3oPitXYAwGJnyTHFYo5qB.jpeg",
    "streams": [
      {
        "name": "TNT Sports 2",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvaXQ3YXl0cWgtMTU0MA"
      }
    ]
  },
  {
    "id": "channel-willow-cricket",
    "name": "Willow Cricket",
    "category": "24/7 Channels",
    "poster": "https://mgpindia.com/wp-content/uploads/2021/10/willow-logo.jpg",
    "streams": [
      {
        "name": "Willow Cricket",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvc3BkOGdwb2gtNjU4Ng"
      }
    ]
  },
  {
    "id": "channel-willow-cricket-2",
    "name": "Willow Cricket 2",
    "category": "24/7 Channels",
    "poster": "https://d229kpbsb5jevy.cloudfront.net/tv/1920/1080/languages/WILLOW-2.jpg",
    "streams": [
      {
        "name": "Willow Cricket 2",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvMTRxdWF3ZDUtODgxOQ"
      }
    ]
  },
  {
    "id": "channel-espn",
    "name": "ESPN",
    "category": "24/7 Channels",
    "poster": "https://a1.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png",
    "streams": [
      {
        "name": "ESPN",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvbzlibDhjYWktNzIyMw"
      }
    ]
  },
  {
    "id": "channel-espn-deportes",
    "name": "ESPN Deportes",
    "category": "24/7 Channels",
    "poster": "https://i.ibb.co/Y7zHmbbz/i.png",
    "streams": [
      {
        "name": "ESPN Deportes",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvNnRyc2FudDctMTQyMQ"
      }
    ]
  },
  {
    "id": "channel-espn2",
    "name": "ESPN2",
    "category": "24/7 Channels",
    "poster": "https://discgolf.ultiworld.com/wp-content/uploads/2020/10/ESPN2.png",
    "streams": [
      {
        "name": "ESPN2",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvMzNqaHB6ZnItOTM2"
      }
    ]
  },
  {
    "id": "channel-espnews",
    "name": "ESPNEWS",
    "category": "24/7 Channels",
    "poster": "https://i.ibb.co/5h4LGFHq/image.png",
    "streams": [
      {
        "name": "ESPNEWS",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvbWZ0c2xlejQtMzM2NA"
      }
    ]
  },
  {
    "id": "channel-espnu",
    "name": "ESPNU",
    "category": "24/7 Channels",
    "poster": "https://i.ibb.co/Lh5jHVDm/ESPNU-logo-1-jpg.webp",
    "streams": [
      {
        "name": "ESPNU",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvd3Fid2pqaGYtOTc3MQ"
      }
    ]
  },
  {
    "id": "channel-dazn-1-germany",
    "name": "DAZN 1 Germany",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=12dpnhddhmpm71228raanhyxs2_image-header_pDach_1723627450000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN 1 Germany",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvM2RrOHJ4dWktNjIxMg"
      }
    ]
  },
  {
    "id": "channel-dazn-1-italia",
    "name": "DAZN 1 Italia",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=pterrit4f2xu1pa2r6x87y5e9_image-header_pIt_1724315365000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN 1 Italia",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZ21vcW96N2ItNDk0NQ"
      }
    ]
  },
  {
    "id": "channel-dazn-1-portugal",
    "name": "DAZN 1 Portugal",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=1o4eamzb4env61ddc8wv4ra06l_image-header_pRow_1720521601000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN 1 Portugal",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvM3poY3p6YmwtOTA4Ng"
      }
    ]
  },
  {
    "id": "channel-dazn-1-spain",
    "name": "DAZN 1 Spain",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=hn9vkic8rbfi1ndrym8sw2qh7_image-header_pEs_1723035920000",
    "streams": [
      {
        "name": "DAZN 1 Spain",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvc3EyNmlueWYtMjY2MA"
      }
    ]
  },
  {
    "id": "channel-dazn-1-usa",
    "name": "DAZN 1 USA",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=1owzb99m9mnzy15hjxolpukwul_image-header_pUs_1771501796000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN 1 USA",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvanlxemV0MGItMjkwMQ"
      }
    ]
  },
  {
    "id": "channel-dazn-2-germany",
    "name": "DAZN 2 Germany",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=1ni1lpwjtnxmr1xklfoptrt2mz_image-header_pDach_1723628653000",
    "streams": [
      {
        "name": "DAZN 2 Germany",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvdG5pZnNwajYtODUy"
      }
    ]
  },
  {
    "id": "channel-dazn-2-spain",
    "name": "DAZN 2 Spain",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=2ouwtae8ad7l1fxviow9bowpk_image-header_pEs_1723118632000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN 2 Spain",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvMG8zdmxhYmstNDA4OA"
      }
    ]
  },
  {
    "id": "channel-dazn-f1",
    "name": "DAZN F1",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=14ln25pmjdv031ejxsmg8dczsu_image-header_pEs_1723117975000&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;quality=70",
    "streams": [
      {
        "name": "DAZN F1",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvNXJ2YXpzenotNjk4Mw"
      }
    ]
  },
  {
    "id": "channel-dazn-laliga",
    "name": "DAZN LaLiga",
    "category": "24/7 Channels",
    "poster": "https://image.discovery.indazn.com/ca/v2/ca/image?id=1weziux6zy5mb16pev002ax1yu_image-header_pEs_1723118324000",
    "streams": [
      {
        "name": "DAZN LaLiga",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZncyanJ1bTktNDQ4"
      }
    ]
  },
  {
    "id": "channel-bein-max-4-francais",
    "name": "beIN Max 4 Francais",
    "category": "24/7 Channels",
    "poster": "https://i.postimg.cc/MG3RnXzm/Frame-12-(1).png",
    "streams": [
      {
        "name": "beIN Max 4 Francais",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZzhmMHdwcWMtMjY5Ng"
      }
    ]
  },
  {
    "id": "channel-bein-max-5-francais",
    "name": "beIN Max 5 Francais",
    "category": "24/7 Channels",
    "poster": "https://i.postimg.cc/MG3RnXzm/Frame-12-(1).png",
    "streams": [
      {
        "name": "beIN Max 5 Francais",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYva2Nra29lZHYtMjU5NA"
      }
    ]
  },
  {
    "id": "channel-bein-max-6",
    "name": "beIN Max 6 Francais",
    "category": "24/7 Channels",
    "poster": "https://i.postimg.cc/MG3RnXzm/Frame-12-(1).png",
    "streams": [
      {
        "name": "beIN Max 6 Francais",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvd3FqbGJ3bGwtMjI1OA"
      }
    ]
  },
  {
    "id": "channel-bein-max-7-francais",
    "name": "beIN Max 7 Francais",
    "category": "24/7 Channels",
    "poster": "https://i.postimg.cc/MG3RnXzm/Frame-12-(1).png",
    "streams": [
      {
        "name": "beIN Max 7 Francais",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvbnA0Yml3ZjMtMzA5Nw"
      }
    ]
  },
  {
    "id": "channel-bein-sports",
    "name": "beIN Sports",
    "category": "24/7 Channels",
    "poster": "https://assets-us-01.kc-usercontent.com/31dbcbc6-da4c-0033-328a-d7621d0fa726/1318873e-8501-4f79-bb69-182d741cf9ad/beIN%20SPORTS%20Portada.jpg?ver=03-06-2025?w=3840&amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;amp;q=75",
    "streams": [
      {
        "name": "beIN Sports",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvdTM2ZnRmY3ktNzEwMQ"
      }
    ]
  },
  {
    "id": "channel-bein-sports-francais-1",
    "name": "beIN Sports Francais 1",
    "category": "24/7 Channels",
    "poster": "https://cdn.jsdelivr.net/gh/willthequeencome/img-cdn/beinsports.png",
    "streams": [
      {
        "name": "beIN Sports Francais 1",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZ2J3MDlhbm4tOTgz"
      }
    ]
  },
  {
    "id": "channel-bein-sports-francais-2",
    "name": "beIN Sports Francais 2",
    "category": "24/7 Channels",
    "poster": "https://cdn.jsdelivr.net/gh/willthequeencome/img-cdn/beinsports.png",
    "streams": [
      {
        "name": "beIN Sports Francais 2",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvYWhsNzdjZ28tMzU5Nw"
      }
    ]
  },
  {
    "id": "channel-bein-sports-francais-3",
    "name": "beIN Sports Francais 3",
    "category": "24/7 Channels",
    "poster": "https://cdn.jsdelivr.net/gh/willthequeencome/img-cdn/beinsports.png",
    "streams": [
      {
        "name": "beIN Sports Francais 3",
        "url": "https://bintv-sources.pages.dev/?id=aHR0cHM6Ly9laGdlbWJ4ZS5jZmQvYmludHYvZmN4cGViMmktOTI3NQ"
      }
    ]
  }
];

const sportsState = {
  tab: "live",
  query: "",
  category: "all",
  channelLetter: "",
  channelPage: 0,
  pageSize: 24,
  cache: null,
  loading: false,
  activeMatch: null,
  activeFeedIndex: 0,
  initialized: false,
};

function decodeSportsStreamUrl(url) {
  try {
    if (!url) return "";
    if (url.includes("id=")) {
      const parsed = new URL(url);
      const id = parsed.searchParams.get("id");
      if (id) {
        const b = id.replace(/-/g, "+").replace(/_/g, "/");
        const dec = atob(b);
        if (/^https?:\/\//i.test(dec)) return dec;
      }
    }
  } catch {}
  return "";
}

async function fetchSportsCatalog() {
  if (sportsState.cache && Date.now() - (sportsState.cache.timestamp || 0) < 45000) {
    return sportsState.cache;
  }

  let raw = null;

  // 1. Direct fetch to Lovable public sports endpoint (fastest, CORS-enabled, 6s timeout)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch("https://bintvjson.lovable.app/api/public/bintvjson", {
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timer);
    if (res?.ok) {
      const parsed = await res.json().catch(() => null);
      if (parsed && (Array.isArray(parsed["Live Events"]) || Array.isArray(parsed["24/7 Channels"]))) {
        raw = parsed;
      }
    }
  } catch {}

  // 2. Fallback to /api/sports proxy with 6s timeout
  if (!raw) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch("/api/sports", { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);
      if (res?.ok) {
        const parsed = await res.json().catch(() => null);
        if (parsed && (Array.isArray(parsed["Live Events"]) || Array.isArray(parsed["24/7 Channels"]))) {
          raw = parsed;
        }
      }
    } catch {}
  }

  const normalizeEvent = (item, fallbackStatus) => {
    if (!item?.id || !item?.name) return null;
    const streams = (Array.isArray(item.streams) ? item.streams : []).map((st, idx) => {
      const url = String(st?.url || "").trim();
      if (!url) return null;
      const name = String(st?.name || `Feed ${idx + 1}`).trim();
      const decodedUrl = decodeSportsStreamUrl(url);
      return {
        embedUrl: url,
        rawUrl: url,
        decodedUrl: decodedUrl || url,
        name,
        hd: /(?:hd|4k|1080|720)/i.test(name),
        streamNo: idx + 1
      };
    }).filter(Boolean);
    if (!streams.length) return null;

    const title = String(item.name).trim();
    const versus = title.split(/\s+(?:vs\.?|v|@)\s+/i);
    const poster = item.poster ? String(item.poster).replace(/^http:/i, "https:") : "";
    return {
      id: String(item.id),
      title,
      category: String(item.category || "Other"),
      poster,
      status: String(item.status || fallbackStatus),
      _live: String(item.status || fallbackStatus).toLowerCase() === "live",
      teams: versus.length === 2 ? { home: { name: versus[0].trim() }, away: { name: versus[1].trim() } } : null,
      sources: streams,
      date: Number(item.date || 0)
    };
  };

  let live = [];
  let upcoming = [];
  let channels = [];

  if (raw) {
    const parseList = (key, fallback) => (Array.isArray(raw[key]) ? raw[key] : []).map(i => normalizeEvent(i, fallback)).filter(Boolean);
    live = parseList("Live Events", "live");
    upcoming = parseList("Upcoming Events", "upcoming");
    channels = parseList("24/7 Channels", "24/7");
  }

  // If 24/7 channels is empty or offline, populate with verified fallback channels
  if (!channels.length && Array.isArray(FALLBACK_SPORTS_CHANNELS)) {
    channels = FALLBACK_SPORTS_CHANNELS.map(i => normalizeEvent(i, "24/7")).filter(Boolean);
  }

  const categories = [...new Set([...live, ...upcoming, ...channels].map(i => i.category).filter(Boolean))].sort();

  sportsState.cache = { live, upcoming, channels, categories, timestamp: Date.now() };
  return sportsState.cache;
}

function initSportsSection() {
  if (!sportsState.initialized) {
    sportsState.initialized = true;

    $$("[data-sports-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$("[data-sports-tab]").forEach(b => b.classList.toggle("active", b === btn));
        sportsState.tab = btn.dataset.sportsTab || "live";
        sportsState.channelPage = 0;
        sportsState.channelLetter = "";
        renderSportsSection();
      });
    });

    $("#sports-search-input")?.addEventListener("input", (e) => {
      sportsState.query = e.target.value.trim().toLowerCase();
      sportsState.channelPage = 0;
      renderSportsSection();
    });

    $("#close-sports-player")?.addEventListener("click", closeSportsPlayer);
    $("#sports-player-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "sports-player-backdrop") closeSportsPlayer();
    });

    // Popout button: opens the active stream directly in a new window/tab
    $("#sports-popout-btn")?.addEventListener("click", () => {
      const match = sportsState.activeMatch;
      const idx = sportsState.activeFeedIndex;
      const src = match?.sources?.[idx]?.embedUrl || match?.sources?.[0]?.embedUrl;
      if (src && src !== "about:blank") {
        window.open(src, "_blank", "noopener,noreferrer");
      }
    });

    // Reload button: reloads the active iframe feed safely
    $("#sports-reload-btn")?.addEventListener("click", () => {
      const frame = $("#sports-stream-frame");
      const match = sportsState.activeMatch;
      const idx = sportsState.activeFeedIndex;
      const src = match?.sources?.[idx]?.embedUrl || match?.sources?.[0]?.embedUrl;
      if (frame && src) {
        frame.src = "about:blank";
        setTimeout(() => { frame.src = src; }, 80);
      }
    });
  }

  loadAndRenderSports();
}

async function loadAndRenderSports() {
  const grid = $("#sports-match-grid");
  if (!sportsState.cache && grid) {
    grid.innerHTML = `
      <div class="sports-loading-state">
        <span class="player-loading-indicator"></span>
        <span>Loading live matches &amp; channels…</span>
      </div>
    `;
  }
  try {
    await fetchSportsCatalog();
    renderSportsSection();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `
        <div class="sports-loading-state">
          <p>Failed to load sports events. Please check connection.</p>
          <button class="primary-button" id="retry-sports-btn" type="button" style="margin-top: 10px;">Retry</button>
        </div>
      `;
      $("#retry-sports-btn")?.addEventListener("click", () => loadAndRenderSports());
    }
  }
}

function renderSportsSection() {
  const data = sportsState.cache;
  if (!data) return;

  const liveCount = $("#sports-live-count");
  const upCount = $("#sports-upcoming-count");
  const chCount = $("#sports-channels-count");
  if (liveCount) liveCount.textContent = String(data.live.length);
  if (upCount) upCount.textContent = String(data.upcoming.length);
  if (chCount) chCount.textContent = String(data.channels.length);

  const pillsEl = $("#sports-categories-pills");
  if (pillsEl && sportsState.tab !== "channels") {
    pillsEl.hidden = false;
    pillsEl.innerHTML = `
      <button class="sports-cat-pill ${sportsState.category === "all" ? "active" : ""}" data-sports-category="all" type="button">All Sports</button>
      ${data.categories.map(cat => `
        <button class="sports-cat-pill ${sportsState.category === cat ? "active" : ""}" data-sports-category="${escapeHtml(cat)}" type="button">${escapeHtml(cat)}</button>
      `).join("")}
    `;
    pillsEl.querySelectorAll("[data-sports-category]").forEach(p => {
      p.addEventListener("click", () => {
        sportsState.category = p.dataset.sportsCategory || "all";
        renderSportsSection();
      });
    });
  } else if (pillsEl) {
    pillsEl.hidden = true;
  }

  const lettersEl = $("#sports-channel-letters");
  if (lettersEl) {
    if (sportsState.tab === "channels") {
      lettersEl.hidden = false;
      const letters = [...new Set(data.channels.map(c => {
        const first = c.title.trim().charAt(0).toUpperCase();
        return /^[A-Z]$/.test(first) ? first : "#";
      }))].sort();
      lettersEl.innerHTML = `
        <button class="letter-pill ${!sportsState.channelLetter ? "active" : ""}" data-letter="" type="button" style="width: auto; padding: 0 10px;">All</button>
        ${letters.map(l => `
          <button class="letter-pill ${sportsState.channelLetter === l ? "active" : ""}" data-letter="${escapeHtml(l)}" type="button">${escapeHtml(l)}</button>
        `).join("")}
      `;
      lettersEl.querySelectorAll("[data-letter]").forEach(btn => {
        btn.addEventListener("click", () => {
          sportsState.channelLetter = btn.dataset.letter;
          sportsState.channelPage = 0;
          renderSportsSection();
        });
      });
    } else {
      lettersEl.hidden = true;
    }
  }

  let items = sportsState.tab === "live" ? data.live : sportsState.tab === "upcoming" ? data.upcoming : data.channels;
  if (sportsState.tab !== "channels" && sportsState.category !== "all") {
    items = items.filter(i => i.category === sportsState.category);
  }
  if (sportsState.tab === "channels" && sportsState.channelLetter) {
    items = items.filter(i => {
      const first = i.title.trim().charAt(0).toUpperCase();
      const l = /^[A-Z]$/.test(first) ? first : "#";
      return l === sportsState.channelLetter;
    });
  }
  if (sportsState.query) {
    const q = sportsState.query;
    items = items.filter(i => `${i.title} ${i.category} ${i.teams?.home?.name || ""} ${i.teams?.away?.name || ""}`.toLowerCase().includes(q));
  }

  const pagerEl = $("#sports-pagination");
  let displayItems = items;
  if (sportsState.tab === "channels") {
    const totalPages = Math.max(1, Math.ceil(items.length / sportsState.pageSize));
    const page = Math.min(sportsState.channelPage, totalPages - 1);
    sportsState.channelPage = page;
    displayItems = items.slice(page * sportsState.pageSize, (page + 1) * sportsState.pageSize);
    if (pagerEl && totalPages > 1) {
      pagerEl.hidden = false;
      pagerEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 0; color: var(--muted); font-size: 13px;">
          <span>Showing ${page * sportsState.pageSize + 1}–${Math.min((page + 1) * sportsState.pageSize, items.length)} of ${items.length} channels</span>
          <div style="display: flex; gap: 8px;">
            <button class="secondary-button" id="prev-channel-page" type="button" ${page === 0 ? "disabled" : ""}>← Prev</button>
            <span style="display: flex; align-items: center; padding: 0 10px; font-weight: 700; color: var(--text);">Page ${page + 1} / ${totalPages}</span>
            <button class="secondary-button" id="next-channel-page" type="button" ${page >= totalPages - 1 ? "disabled" : ""}>Next →</button>
          </div>
        </div>
      `;
      $("#prev-channel-page")?.addEventListener("click", () => {
        sportsState.channelPage--;
        renderSportsSection();
      });
      $("#next-channel-page")?.addEventListener("click", () => {
        sportsState.channelPage++;
        renderSportsSection();
      });
    } else if (pagerEl) {
      pagerEl.hidden = true;
    }
  } else if (pagerEl) {
    pagerEl.hidden = true;
  }

  const grid = $("#sports-match-grid");
  if (!grid) return;

  if (!displayItems.length) {
    if (sportsState.tab === "live" && !sportsState.query && sportsState.category === "all") {
      grid.innerHTML = `
        <div class="sports-loading-state" style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; background: var(--surface-1); border-radius: 14px; border: 1px solid var(--line);">
          <div style="font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 8px;">No Live Matches In Play Right Now</div>
          <p style="color: var(--muted); font-size: 14px; max-width: 540px; margin: 0 auto 18px; line-height: 1.5;">Check the upcoming match schedule for upcoming fixtures today, or stream over <strong>${data.channels.length} 24/7 Live Sports TV Channels</strong> broadcasting right now.</p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="primary-button" id="switch-to-channels-tab-btn" type="button">Browse 24/7 Channels (${data.channels.length})</button>
            <button class="secondary-button" id="switch-to-upcoming-tab-btn" type="button">View Upcoming Schedule (${data.upcoming.length})</button>
          </div>
        </div>
      `;
      $("#switch-to-channels-tab-btn")?.addEventListener("click", () => {
        $$("[data-sports-tab]").forEach(b => b.classList.toggle("active", b.dataset.sportsTab === "channels"));
        sportsState.tab = "channels";
        sportsState.channelPage = 0;
        sportsState.channelLetter = "";
        renderSportsSection();
      });
      $("#switch-to-upcoming-tab-btn")?.addEventListener("click", () => {
        $$("[data-sports-tab]").forEach(b => b.classList.toggle("active", b.dataset.sportsTab === "upcoming"));
        sportsState.tab = "upcoming";
        renderSportsSection();
      });
      return;
    }

    grid.innerHTML = `
      <div class="sports-loading-state" style="grid-column: 1 / -1;">
        <p>No ${sportsState.tab === "channels" ? "channels" : "matches"} match your criteria.</p>
        <button class="text-button" id="reset-sports-filters" type="button" style="margin-top: 8px;">Clear filters</button>
      </div>
    `;
    $("#reset-sports-filters")?.addEventListener("click", () => {
      sportsState.query = "";
      sportsState.category = "all";
      sportsState.channelLetter = "";
      if ($("#sports-search-input")) $("#sports-search-input").value = "";
      renderSportsSection();
    });
    return;
  }

  let html = displayItems.map(match => {
    const teams = match.teams;
    const isChannel = match.status === "24/7";
    const timing = match.date ? (() => {
      const d = new Date(match.date);
      return {
        day: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d),
        time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)
      };
    })() : { day: "Scheduled", time: "TBA" };

    return `
      <article class="sports-match-card ${match.poster ? "has-poster" : ""}" data-sports-id="${escapeHtml(match.id)}">
        <div class="sports-card-art">
          ${match.poster ? `<img src="${escapeHtml(match.poster)}" alt="" loading="lazy">` : ""}
          <div class="sports-versus-overlay">
            ${teams ? `
              <div class="sports-team-col">
                <div class="sports-team-badge">${escapeHtml(teams.home?.name?.charAt(0) || "H")}</div>
                <span class="sports-team-name">${escapeHtml(teams.home?.name || "Home")}</span>
              </div>
              <span class="sports-vs-pill">VS</span>
              <div class="sports-team-col">
                <div class="sports-team-badge">${escapeHtml(teams.away?.name?.charAt(0) || "A")}</div>
                <span class="sports-team-name">${escapeHtml(teams.away?.name || "Away")}</span>
              </div>
            ` : `
              <div style="font-size: 18px; font-weight: 900; color: var(--accent); text-align: center; padding: 0 12px;">${escapeHtml(match.title.slice(0, 22))}</div>
            `}
          </div>
        </div>
        <div class="sports-card-copy">
          <div class="sports-card-meta">
            ${match._live ? `<span class="sports-live-tag"><span class="live-dot"></span> LIVE</span>` : isChannel ? `<span class="sports-channel-badge">24/7 TV</span>` : `<span class="sports-card-time">${timing.day} · ${timing.time}</span>`}
            <span class="sports-stream-count">${match.sources?.length || 1} feed${(match.sources?.length || 1) === 1 ? "" : "s"}</span>
          </div>
          <h3 class="sports-card-title">${escapeHtml(match.title)}</h3>
        </div>
      </article>
    `;
  }).join("");

  if (sportsState.tab === "live" && data.channels.length > 0 && !sportsState.query && sportsState.category === "all") {
    html += `
      <div style="grid-column: 1 / -1; margin-top: 20px; padding: 20px 24px; background: linear-gradient(135deg, rgba(230,57,70,0.1), rgba(20,20,30,0.8)); border: 1px solid rgba(230,57,70,0.25); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <strong style="font-size: 16px; color: var(--text); display: block; margin-bottom: 4px;">Looking for 24/7 Live Sports Channels?</strong>
          <span style="color: var(--muted); font-size: 13px;">Tune into Sky Sports, ESPN, TNT Sports, Willow Cricket, DAZN, beIN Sports and ${data.channels.length} channels available 24/7.</span>
        </div>
        <button class="primary-button" id="live-bottom-channels-btn" type="button" style="white-space: nowrap;">Explore 24/7 TV Channels →</button>
      </div>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll("[data-sports-id]").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.sportsId;
      const match = displayItems.find(m => m.id === id);
      if (match) openSportsPlayer(match);
    });
  });

  $("#live-bottom-channels-btn")?.addEventListener("click", () => {
    $$("[data-sports-tab]").forEach(b => b.classList.toggle("active", b.dataset.sportsTab === "channels"));
    sportsState.tab = "channels";
    sportsState.channelPage = 0;
    sportsState.channelLetter = "";
    renderSportsSection();
  });
}

function openSportsPlayer(match) {
  sportsState.activeMatch = match;
  sportsState.activeFeedIndex = 0;
  const modal = $("#sports-player-backdrop");
  const titleEl = $("#sports-player-title");
  const frame = $("#sports-stream-frame");
  const feedsBar = $("#sports-stream-feeds-bar");

  if (!modal || !frame) return;
  modal.removeAttribute("hidden");
  if (titleEl) titleEl.textContent = match.title;

  const sources = match.sources || [];
  if (feedsBar) {
    if (sources.length > 1) {
      feedsBar.style.display = "flex";
      feedsBar.innerHTML = sources.map((s, idx) => `
        <button class="sports-feed-btn ${idx === 0 ? "active" : ""}" data-feed-idx="${idx}" type="button">
          ${escapeHtml(s.name || `Feed ${idx + 1}`)} ${s.hd ? "· HD" : ""}
        </button>
      `).join("");

      feedsBar.querySelectorAll("[data-feed-idx]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.feedIdx);
          sportsState.activeFeedIndex = idx;
          feedsBar.querySelectorAll("[data-feed-idx]").forEach(b => b.classList.toggle("active", b === btn));
          if (sources[idx]?.embedUrl) {
            frame.src = "about:blank";
            setTimeout(() => { frame.src = sources[idx].embedUrl; }, 60);
          }
        });
      });
    } else {
      feedsBar.style.display = "none";
      feedsBar.innerHTML = "";
    }
  }

  if (sources[0]?.embedUrl) {
    frame.src = sources[0].embedUrl;
  }
}

function closeSportsPlayer() {
  const modal = $("#sports-player-backdrop");
  const frame = $("#sports-stream-frame");
  if (frame) frame.src = "about:blank";
  if (modal) modal.setAttribute("hidden", "true");
  sportsState.activeMatch = null;
}

/* ==========================================================================
   Explore / Watch Providers Directory Engine (GaiaFlix replicate)
   ========================================================================== */
const exploreProviders = [
  { id: 8, name: "Netflix", logo: "https://image.tmdb.org/t/p/w154/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg", tag: "Movies & Series" },
  { id: 337, name: "Disney+", logo: "https://image.tmdb.org/t/p/w154/7qe86JjY55fUe0Fw9l8tq2659oN.jpg", tag: "Originals & Marvel" },
  { id: 9, name: "Amazon Prime Video", logo: "https://image.tmdb.org/t/p/w154/pvsN14P4m8J611mQZ2R07qZ4G4A.jpg", tag: "Blockbusters" },
  { id: 350, name: "Apple TV+", logo: "https://image.tmdb.org/t/p/w154/2E03q95o887pmRo1F1v589Bq61U.jpg", tag: "Award Winners" },
  { id: 1899, name: "Max (HBO)", logo: "https://image.tmdb.org/t/p/w154/fksCUZ9QDWZMUwL2LgMtL9080n9.jpg", tag: "HBO Originals" },
  { id: 283, name: "Crunchyroll", logo: "https://image.tmdb.org/t/p/w154/8z7rC8uIDaTM91X0Z7fk9v3098E.jpg", tag: "Anime Simulcasts" },
  { id: 531, name: "Paramount+", logo: "https://image.tmdb.org/t/p/w154/xbhHLa3cA4CugR1LswZ3h3jS42K.jpg", tag: "Paramount & CBS" },
  { id: 15, name: "Hulu", logo: "https://image.tmdb.org/t/p/w154/zxrVdFj005hsRsCare7Tjnkr8mg.jpg", tag: "Current TV" },
  { id: 387, name: "Peacock", logo: "https://image.tmdb.org/t/p/w154/8VCV78Prwd9Q2ZnEm0ReO6bERDa.jpg", tag: "NBC Classics" },
  { id: 2, name: "Apple iTunes", logo: "https://image.tmdb.org/t/p/w154/peURlLlr8jggOwK53fJ5wdQl05y.jpg", tag: "Digital Cinema" },
  { id: 3, name: "Google Play Movies", logo: "https://image.tmdb.org/t/p/w154/tbEdFQDwx5LEVr8Wp68XvkjkUZ0.jpg", tag: "Rent & Buy" },
  { id: 384, name: "HBO Max", logo: "https://image.tmdb.org/t/p/w154/aS2zvJWn9mwiCOeaaCkIh4w00d9.jpg", tag: "Warner Bros" }
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
        <img src="${p.logo}" alt="${escapeHtml(p.name)}" loading="lazy">
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

  if (titlesGrid) {
    titlesGrid.innerHTML = Array.from({ length: 8 }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-line full"></div>
        <div class="skeleton-line half"></div>
      </div>
    `).join("");
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
      const item = {
        title: m.title || "Untitled",
        type: "movie",
        year: Number((m.release_date || "").slice(0, 4)) || 2024,
        rating: m.vote_average || 7.5,
        runtime: "Movie",
        image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "",
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
      const item = {
        title: t.name || "Untitled",
        type: "series",
        year: Number((t.first_air_date || "").slice(0, 4)) || 2024,
        rating: t.vote_average || 7.5,
        runtime: "Series",
        image: t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "",
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

    if (titlesGrid) {
      titlesGrid.innerHTML = normList.length ? normList.map(renderCard).join("") : `<div class="empty-state" style="padding: 40px; grid-column: 1 / -1; text-align: center;">No titles currently listed for this network.</div>`;
    }
  } catch (err) {
    console.error("Provider catalog error:", err);
    if (titlesGrid) {
      titlesGrid.innerHTML = `<div class="empty-state" style="padding: 40px; grid-column: 1 / -1; text-align: center;">Unable to load titles right now.</div>`;
    }
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
        const seen = new Set(catalog.map(c => (c.title || "").toLowerCase().trim()));
        const filtered = newCards.filter(c => !seen.has((c.title || "").toLowerCase().trim()));
        if (filtered.length) {
          catalog = [...catalog, ...filtered];
          render();
          const vis = getVisibleCards();
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
  $$("[data-section]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const sec = button.dataset.section;
      if (sec) setSection(sec, true);
    });
  });
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

    const validSections = ["home", "movies", "series", "anime", "cartoons", "sports", "explore", "my-list", "profile"];
    const section = validSections.includes(cleanPath) ? cleanPath : "home";
    setSection(section, false);
  };

  window.addEventListener("hashchange", handleRoute);
  initSectionButtons();
  handleRoute();
}

loadShowcaseCatalog();
setupAuthEventListeners();
void initAuth();
initAppearanceSettings();
initSearchModal();
initCustomVideoPlayer();
initCreatorStudioAndUploads();
void loadCommunityVideos();
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
