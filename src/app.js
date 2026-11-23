import { ICONS, renderIcon } from "./assets/icons.js";
import { storage } from "./modules/storage.js";
import { initImageLazyLoading, observeLazyImages, getDescriptiveAlt, handleImageError } from "./modules/image-loader.js";
import { delegate, addPassiveListener, rafThrottle, createListenerPool } from "./modules/events.js";
import { createTtlCache, safeSessionStorage } from "./modules/api-cache.js";
import { createTmdbClient } from "./modules/tmdb-client.js";
import { tmdbRatingFromVotes } from "./modules/ratings.js";
import { loaderHtml, stateHtml, beginLoading, fetchWithRetry as resilientFetch } from "./modules/loader.js";
import { normalizeWatchProviders, watchHubHtml } from "./modules/watch-providers.js";

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
    "language": "English, Multi Sub",
    "kicker": "Marvel Studios · R-Rated",
    "image": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg"
    },
    "gradient": "linear-gradient(145deg, #7f1d1d, #450a0a 50%, #020617)",
    "description": "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
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
    "language": "English, Multi Sub",
    "kicker": "HBO Original · TV-MA",
    "image": "https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg"
    },
    "gradient": "linear-gradient(145deg, #581c87, #3b0764 50%, #020617)",
    "description": "A group of high school students navigate love and friendships in a world of drugs, sex, trauma and social media. Starring Zendaya in an Emmy-winning performance.",
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
    "language": "Japanese, English Dub",
    "kicker": "MAPPA · TV-MA",
    "image": "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg"
    },
    "gradient": "linear-gradient(145deg, #991b1b, #450a0a 50%, #020617)",
    "description": "Denji is a young man living a life of extreme poverty. He lives with Pochita, the Chainsaw Devil. After a brutal betrayal, Denji is reborn as the devil-hunting devilman 'Chainsaw Man' in this visceral, gory anime masterpiece.",
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
    "language": "English, Multi Sub",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
    },
    "gradient": "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
    "description": "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to have his criminal history erased as payment for the implantation of another person's idea into a target's subconscious.",
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
    "language": "English, Multi Sub",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
    },
    "gradient": "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    "description": "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
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
    "language": "English, Multi Sub",
    "kicker": "Legendary",
    "image": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
    },
    "gradient": "linear-gradient(145deg, #334155, #1e293b 50%, #0f172a)",
    "description": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
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
    "language": "English, Multi Sub",
    "kicker": "Denis Villeneuve",
    "image": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
    },
    "gradient": "linear-gradient(145deg, #d97706, #78350f 50%, #451a03)",
    "description": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.",
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
    "language": "English, Multi Sub",
    "kicker": "Christopher Nolan",
    "image": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"
    },
    "gradient": "linear-gradient(145deg, #ea580c, #7c2d12 50%, #431407)",
    "description": "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project, developing the atomic weapons that ended World War II.",
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
    "language": "English, Multi Sub",
    "kicker": "Sony Pictures",
    "image": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"
    },
    "gradient": "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)",
    "description": "Miles Morales catapults across the Multiverse, encountering a society of Spider-People charged with protecting its existence when heroes clash on handling a new catastrophic threat.",
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
    "language": "English, Multi Sub",
    "kicker": "Marvel Studios",
    "image": "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
    },
    "gradient": "linear-gradient(145deg, #7c3aed, #4c1d95 50%, #2e1065)",
    "description": "After Thanos wiped out half of all life in the universe, the remaining Avengers assemble once more in a desperate final stand to reverse the devastating catastrophe.",
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
    "language": "English, Multi Sub",
    "kicker": "Ridley Scott",
    "image": "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg"
    },
    "gradient": "linear-gradient(145deg, #ca8a04, #713f12 50%, #422006)",
    "description": "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
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
    "language": "English, Multi Sub",
    "kicker": "The Wachowskis",
    "image": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
    },
    "gradient": "linear-gradient(145deg, #16a34a, #14532d 50%, #052e16)",
    "description": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
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
    "language": "Japanese, English Dub",
    "kicker": "Hayao Miyazaki",
    "image": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"
    },
    "gradient": "linear-gradient(145deg, #0d9488, #115e59 50%, #042f2e)",
    "description": "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
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
    "language": "English, Multi Sub",
    "kicker": "Vince Gilligan",
    "image": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg"
    },
    "gradient": "linear-gradient(145deg, #15803d, #14532d 50%, #052e16)",
    "description": "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's financial future.",
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
    "language": "English, Multi Sub",
    "kicker": "Duffer Brothers",
    "image": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg"
    },
    "gradient": "linear-gradient(145deg, #b91c1c, #7f1d1d 50%, #450a0a)",
    "description": "When a young boy vanishes, a small Indiana town uncovers a mystery involving secret government experiments, terrifying supernatural forces, and one strange little girl.",
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
    "language": "English, Multi Sub",
    "kicker": "Craig Mazin & Neil Druckmann",
    "image": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg"
    },
    "gradient": "linear-gradient(145deg, #4d7c0f, #365314 50%, #1a2e05)",
    "description": "Twenty years after modern civilization was destroyed, Joel is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone across a ravaged America.",
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
    "language": "English, Multi Sub",
    "kicker": "HBO Series",
    "image": "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg"
    },
    "gradient": "linear-gradient(145deg, #475569, #334155 50%, #0f172a)",
    "description": "Nine noble families fight for control over the Iron Throne of Westeros, while an ancient enemy returns after being dormant for millennia beyond the northern Wall.",
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
    "language": "English, Multi Sub",
    "kicker": "Ben Stiller",
    "image": "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"
    },
    "gradient": "linear-gradient(145deg, #0284c7, #0369a1 50%, #075985)",
    "description": "Mark Scout leads a team at Lumon Industries whose employees undergo a severance procedure separating work memories from personal life memories.",
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
    "language": "Japanese, English Dub",
    "kicker": "WIT Studio & MAPPA",
    "image": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg"
    },
    "gradient": "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)",
    "description": "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have pushed humanity behind giant concentric walls.",
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
    "language": "Japanese, English Dub",
    "kicker": "Koyoharu Gotouge",
    "image": "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg"
    },
    "gradient": "linear-gradient(145deg, #0284c7, #0f766e 50%, #134e4a)",
    "description": "A kindhearted young boy whose family was slaughtered by demons joins the Demon Slayer Corps to find a cure for his sister Nezuko, who was turned into a demon.",
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
    "language": "Japanese, English Dub",
    "kicker": "MAPPA",
    "image": "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg"
    },
    "gradient": "linear-gradient(145deg, #4338ca, #312e81 50%, #1e1b4b)",
    "description": "Yuji Itadori swallows a cursed finger to save his friends, sharing his body with the ancient Curse King Ryomen Sukuna, entering Tokyo Jujutsu High to exorcise deadly spirits.",
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
    "language": "Japanese, English Dub",
    "kicker": "Madhouse",
    "image": "https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg"
    },
    "gradient": "linear-gradient(145deg, #18181b, #09090b 50%, #000000)",
    "description": "A brilliant high school student discovers a supernatural notebook that grants the ability to kill anyone whose name and face are known, engaging in a battle of wits with the enigmatic detective L.",
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
    "language": "Japanese, English Dub",
    "kicker": "Bones Studio",
    "image": "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg",
    "cover": {
      "url": "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg"
    },
    "gradient": "linear-gradient(145deg, #b91c1c, #991b1b 50%, #450a0a)",
    "description": "Two alchemist brothers embark on an arduous journey to seek the legendary Philosopher's Stone to restore their bodies after a forbidden human transmutation ritual went disastrously wrong.",
    "seNum": 1
  }
];

// Curated offline showcase records do not carry live TMDB vote data.
// Never show their old, manually copied scores as current ratings.
DEMO_ITEMS.forEach((item) => {
  item.rating = null;
  item.imdbRatingValue = "";
  item.runtime = "";
  item.duration = "";
  item.badge = item.type === "anime" ? "Anime" : item.type === "cartoon" ? "Animation" : item.type === "movie" ? "Movie" : "TV series";
});


let catalog = [...DEMO_ITEMS];
let recommendations = DEMO_ITEMS.slice(0, 6);
function pickRandomFeatured(items, poolSize = 20) {
  const pool = items.slice(0, Math.min(poolSize, items.length));
  return pool[Math.floor(Math.random() * pool.length)];
}
let featured = pickRandomFeatured(DEMO_ITEMS);

// --- Bug 6/7/9/29 shared helpers: single source of truth for catalog
// identity, ratings and search relevance. -------------------------------
// Redesign 2026-11-22: there is no invented fallback rating. When TMDB
// (or the source) has no rating, the rating is null and the UI shows
// "—" instead of a made-up number.
// Infinite scroll is endless by design, but the in-memory catalog must
// not grow without bound in one session (audit: 150 -> 520).
const MAX_CATALOG_SIZE = 600;
// Round 3 (bug 6): the "Showing X of Y" total is frozen from a
// snapshot of the deduped catalog taken when a full load completes.
// `catalog` keeps growing as infinite-scroll batches append, so a total
// computed from the live list grew while scrolling (258 -> 540 -> 592).
// Scrolling only ever grows X. The snapshot is re-taken only when the
// catalog is replaced wholesale (full live load, showcase fallback,
// search results) — never by a scroll batch.
let frozenCatalog = [...DEMO_ITEMS];
let frozenCatalogTotal = frozenCatalog.length;
function freezeCatalogTotal(items) {
  frozenCatalog = [...(items || [])];
  frozenCatalogTotal = frozenCatalog.length;
}
// Pure rule for the counter (also covered by the harness): the frozen
// total is claimed only while the displayed count is within it. Once
// the user has viewed past it, more titles arrived after the full load
// — claim no total rather than a growing or contradictory one
// ("293 of 258").
function frozenCounterTotal(frozenTotal, displayedCount) {
  if (!frozenTotal || frozenTotal <= 0) return null;
  return displayedCount <= frozenTotal ? frozenTotal : null;
}
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
function normalizeRating(value) {
  return clampRating(value);
}
// Normalize only a real TMDB vote_average. The offline showcase has no
// numeric ratings because it is not a live TMDB response.

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
// Round 3 root causes (live re-audit 2026-11-15: Spirited Away 2x,
// Spider-Verse 2x, "Jujutsu Kaisen" vs "JUJUTSU KAISEN", "Crayon
// Shin-chan" vs "クレヨンしんちゃん"): the kind itself was the problem
// — the same work arrived as "movie", "anime", "cartoon" or "series"
// depending on which endpoint/category normalised it (TMDB mediaType
// "tv" vs the DEMO "anime" type; the /api/catalog demo fallback
// re-typing DEMO movies by its category), so a kind-in-key could never
// merge them. Dedupe now keys on a binary work kind (movie vs
// episodic) + overlapping title spellings (display title and original
// title) + compatible year.
// Normalised title for dedupe: NFKD-folded (accents stripped: "Amélie"
// -> "amelie"), lower-cased, punctuation stripped, a leading "the "
// dropped, and a trailing year ("(2026)", " 2026") dropped — the year
// lives in the key separately, so "The Odyssey (2026)" and "The Odyssey"
// with year 2026 are the same title.
// Round 3: the old regex `[^a-z0-9]` deleted every non-Latin letter, so
// a Japanese title normalised to "" ("クレヨンしんちゃん" -> "") and
// could never match its romanised twin ("Crayon Shin-chan"); worse,
// two different Japanese titles in the same year both normalised to ""
// and would WRONGLY merge. Keep all Unicode letters/numbers now.
function canonicalTitleKey(title = "") {
  return String(title || "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+\d{4}$/, "");
}
// Every title spelling an entry is known by: its display title plus its
// original title (TMDB `original_title` / `original_name`). An entry
// matches another when ANY variant overlaps — that is how "Crayon
// Shin-chan" (title) meets "クレヨンしんちゃん" (the same TMDB record's
// original_name, or a ja-language copy whose title IS the kana string).
function canonicalTitleKeys(item) {
  if (!item) return [];
  const keys = new Set();
  for (const raw of [item.title, item.originalTitle, item.original_title, item.originalName, item.original_name]) {
    const key = canonicalTitleKey(raw);
    if (key) keys.add(key);
  }
  return [...keys];
}
// Round 3: the work kind for dedupe is binary — movie vs episodic —
// derived from episodic signals, NOT from the category label. The same
// work arrived as "movie" (DEMO / /movie/popular), "anime" (TMDB ja
// animation or the /api/catalog anime fallback re-typing a DEMO movie),
// "cartoon" (the cartoons fallback), or "series" (canonicalKind reads
// mediaType "tv" first, so a TMDB anime series was "series" while the
// DEMO copy was "anime"), and the old kind-in-key could never merge
// those. A movie and a series with the same title+year stay distinct;
// anime/cartoon are presentation categories, not separate works.
function dedupeWorkKind(item) {
  if (!item) return "";
  if (Number(item.seNum) > 0) return "series";
  if (item.first_air_date || item.firstAirDate) return "series";
  if (/season|episode/i.test(String(item.runtime || item.duration || ""))) return "series";
  if (String(item.mediaType || "").toLowerCase() === "tv") return "series";
  const t = String(item.type || item.category || "").toLowerCase().trim();
  if (t === "series" || t === "tv" || t === "show") return "series";
  return "movie";
}
// Round 3: the dedupe year comes ONLY from a real date field. Both
// normalizers used to default a missing date to the current year, so a
// dateless fallback copy (year 2026) could never match its dated twin
// (year 2001/2020/2023). "" means "unknown" and never blocks a merge.
function dedupeYear(item) {
  if (!item) return "";
  const raw = String(item.releaseDate || item.first_air_date || item.release_date || "").trim();
  const y = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(y) ? String(y) : "";
}
function dedupeYearsCompatible(a, b) {
  return !a || !b || a === b;
}
function catalogItemKey(item) {
  if (!item) return "";
  // Only a numeric id is a TMDB id. `item.id` can also be a local string
  // id ("tmdb-123", "demo-…") — treating that as a TMDB id would split
  // one title across two keys. Include the work kind: TMDB movie id N
  // and TV id N are different works.
  const tmdbId = item.tmdbId ?? item.id;
  const numericId = /^\d+$/.test(String(tmdbId ?? "")) ? String(tmdbId) : "";
  if (numericId) return `tmdb:${dedupeWorkKind(item)}:${numericId}`;
  const subjectId = item.subjectId ? String(item.subjectId) : "";
  if (subjectId) return `subject:${subjectId.toLowerCase()}`;
  return `title:${canonicalTitleKeys(item)[0] || ""}|${dedupeYear(item)}|${dedupeWorkKind(item)}`;
}
// Round 3: two entries are the same work when any title spelling
// overlaps AND the work kind matches AND the years are equal (or either
// is unknown). This is the single matching rule for the dedupe second
// pass, the append path and the watchlist guard, so no path can
// reintroduce a duplicate another path removed.
function catalogItemsMatch(a, b) {
  if (!a || !b) return false;
  const keyA = catalogItemKey(a);
  if (keyA && keyA === catalogItemKey(b)) return true;
  if (dedupeWorkKind(a) !== dedupeWorkKind(b)) return false;
  if (!dedupeYearsCompatible(dedupeYear(a), dedupeYear(b))) return false;
  const keysA = new Set(canonicalTitleKeys(a));
  if (!keysA.size) return false;
  return canonicalTitleKeys(b).some((key) => keysA.has(key));
}
function catalogHasCanonical(items, item) {
  if (!item) return false;
  return (items || []).some((c) => catalogItemsMatch(c, item));
}
// Best-evidence rule (round 2, unchanged): a real TMDB id wins over an
// id-less record, then the higher rating; the original-language entry
// wins ties.
function isBetterEvidence(next, prev) {
  const prevHasId = /^\d+$/.test(String(prev.tmdbId ?? prev.id ?? ""));
  const nextHasId = /^\d+$/.test(String(next.tmdbId ?? next.id ?? ""));
  const prevScore = Number(prev.rating) || 0;
  const nextScore = Number(next.rating) || 0;
  const prevOrig = prev.originalLanguage || (prev.isJapaneseAnime ? "ja" : "");
  const nextOrig = next.originalLanguage || (next.isJapaneseAnime ? "ja" : "");
  return (nextHasId && !prevHasId)
    || (nextHasId === prevHasId && nextScore > prevScore)
    || (nextHasId === prevHasId && nextScore === prevScore && nextOrig && !prevOrig);
}
function buildCatalogMatchIndex(items) {
  const index = new Map();
  for (const item of items || []) {
    for (const key of canonicalTitleKeys(item)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(item);
    }
  }
  return index;
}
function catalogIndexHas(index, item) {
  if (!index || !item) return false;
  const kind = dedupeWorkKind(item);
  const year = dedupeYear(item);
  for (const key of canonicalTitleKeys(item)) {
    const candidates = index.get(key);
    if (!candidates) continue;
    for (const candidate of candidates) {
      if (dedupeWorkKind(candidate) === kind && dedupeYearsCompatible(dedupeYear(candidate), year)) return true;
    }
  }
  return false;
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
  // Second pass (bug 11, round 3): same work under a different TMDB id
  // (TMDB lists duplicate entries for one film, e.g. three "The
  // Odyssey" 2026 movies) is one catalogue slot — and so is the same
  // work under a different category label ("movie" vs "anime" vs
  // "cartoon" vs "series" for one title), a different spelling/case
  // ("Jujutsu Kaisen" vs TMDB's literal "JUJUTSU KAISEN"), or an
  // original-language title ("クレヨンしんちゃん" vs "Crayon
  // Shin-chan"). Matching is by overlapping title spellings + binary
  // work kind + compatible year (unknown year never blocks). Keep the
  // entry with the best evidence (see isBetterEvidence). Distinct
  // years stay distinct (Doctor Who 1963 vs 2005 are different shows
  // and both survive), as do a movie and a series sharing a title+year.
  const kept = [];
  const byTitleKey = new Map();
  for (const item of out) {
    const kind = dedupeWorkKind(item);
    const year = dedupeYear(item);
    const titleKeys = canonicalTitleKeys(item);
    let matchIdx = -1;
    for (const key of titleKeys) {
      const candidates = byTitleKey.get(key);
      if (!candidates) continue;
      for (const idx of candidates) {
        const prev = kept[idx];
        if (dedupeWorkKind(prev) !== kind) continue;
        if (!dedupeYearsCompatible(dedupeYear(prev), year)) continue;
        matchIdx = idx;
        break;
      }
      if (matchIdx >= 0) break;
    }
    if (matchIdx < 0) {
      const idx = kept.length;
      kept.push(item);
      for (const key of titleKeys) {
        if (!byTitleKey.has(key)) byTitleKey.set(key, []);
        byTitleKey.get(key).push(idx);
      }
      continue;
    }
    if (isBetterEvidence(item, kept[matchIdx])) kept[matchIdx] = item;
    // Register the loser's spellings against the kept slot too, so a
    // third spelling of the same work still finds it.
    for (const key of titleKeys) {
      const list = byTitleKey.get(key) || [];
      if (!list.includes(matchIdx)) list.push(matchIdx);
      byTitleKey.set(key, list);
    }
  }
  const merged = kept;
  // Central Coming-soon enforcement (bug 10): every item that passes
  // through dedupe gets its badge/stream re-derived from the single
  // unreleased rule, so no data source can smuggle an unreleased title
  // in with a "Popular"/"Top Rated" badge or a playback source.
  for (const item of merged) {
    if (isUnreleasedItem(item)) {
      item.isComingSoon = true;
      item.comingSoon = true;
      item.badge = "Coming soon";
    }
  }
  return merged;
}
// Append, re-checked against the LIVE catalog at push time (not a `seen`
// snapshot taken before the awaits, which is how concurrent category /
// live / load-more loads re-added the same titles). Returns the items
// actually added, capped at MAX_CATALOG_SIZE.
function appendCatalogItems(items) {
  // Round 3: match incoming items against the LIVE catalog with the
  // same rule as the dedupe second pass (overlapping title spellings +
  // work kind + compatible year) — the old check compared single
  // canonical keys, so a later page carrying the same film under a
  // different label, spelling, or script sailed straight past it.
  const seenIds = new Set(catalog.map(catalogItemKey));
  const matchIndex = buildCatalogMatchIndex(catalog);
  const added = [];
  for (const item of dedupeCatalogItems(items)) {
    const key = catalogItemKey(item);
    if (key && seenIds.has(key)) continue;
    if (catalogIndexHas(matchIndex, item)) continue;
    seenIds.add(key);
    for (const titleKey of canonicalTitleKeys(item)) {
      if (!matchIndex.has(titleKey)) matchIndex.set(titleKey, []);
      matchIndex.get(titleKey).push(item);
    }
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

// Prompt 4 (full Langdock diff): the empty state must only appear after
// a fetch finishes, and rows must not render real content while the
// catalog is still loading — these flags gate render() and the saved-title preview
// and renderRecommendations() while skeletons are showing.
let catalogHasSettled = false;
let catalogRowsLoading = false;
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
    return diff !== 0 ? diff : ((normalizeRating(b.rating) ?? 0) - (normalizeRating(a.rating) ?? 0));
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
    isSeries: false,
  },
};
let searchTimer;
let searchRequestId = 0;



// --- Patch D helpers (bugs 10/11): unreleased titles + canonical dedupe ---
// Round 2 (bug 10): the old gate only fired on a full YYYY-MM-DD date
// in the future. That missed every 2026 title TMDB already lists with a
// past theatrical date (Resident Evil 2026-09-16, Toy Story 5
// 2026-06-17) whose provider availability is not yet known — the old
// "Coming soon" rule is strictly future-dated: a title is unreleased only
// when its known release date is still in the future. The previous
// round-2 rule also gated every title dated in the current year, which
// marked most of the 2026 catalog (films released months ago) as
// "Coming soon". A year-only date in the current year is not gated —
// the release month is unknown, so it cannot be shown to be unreleased.
// Titles with no date on file at all are NOT gated.
function isUnreleasedDate(dateStr, year) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const raw = String(dateStr || "").trim();
  const y = Number(year) || Number.parseInt(raw.slice(0, 4), 10) || 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw > today;
  }
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const m = Number(raw.slice(5, 7));
    return y > currentYear || (y === currentYear && m > currentMonth);
  }
  if (/^\d{4}$/.test(raw)) {
    return y > currentYear;
  }
  return false;
}
const isUnreleasedItem = (item) => {
  if (!item) return false;
  if (item.isComingSoon) return true;
  const dateStr = String(item.releaseDate || item.first_air_date || item.release_date || "");
  return isUnreleasedDate(dateStr, item.year);
};

const apiResponseCache = createTtlCache({
  ttlMs: 30 * 60 * 1000,
  maxEntries: 250,
  maxStoredBytes: 120 * 1024,
  prefix: "ustream-api-v3:",
  storage: safeSessionStorage(),
});
// TMDB_API_KEY is kept server-side only. No API credentials are shipped
// in the browser bundle; the /api/tmdb Vercel function is the sole source.
const TMDB_PUBLIC_KEYS = [
  "e9e9d8da18ae29fc430845952232787c", // High availability primary TMDB API v3 key
  "16f62d38fec24f4e6c2adc9388da20ce"  // Backup key
];

const tmdbClient = createTmdbClient({
  proxyUrl: "/api/tmdb",
  keys: TMDB_PUBLIC_KEYS,
  cache: apiResponseCache,
  timeoutMs: 7000,
  retries: 2,
  maxConcurrent: 6,
});
const watchProviderCache = new Map();
const WATCH_PROVIDER_TTL_MS = 12 * 60 * 60 * 1000;
let detailLoadGeneration = 0;
let detailsReturnFocus = null;
let playerReturnFocus = null;

const TMDB_GENRE_NAMES = {
  28: "action", 12: "adventure", 16: "animation", 35: "comedy", 80: "crime",
  99: "documentary", 18: "drama", 10751: "family", 14: "fantasy", 36: "history",
  27: "horror", 10402: "music", 9648: "mystery", 10749: "romance", 878: "sci-fi",
  10770: "tv movie", 53: "thriller", 10752: "war", 37: "western",
  10759: "action", 10762: "kids", 10763: "news", 10764: "reality",
  10765: "sci-fi", 10766: "soap", 10767: "talk", 10768: "war"
};


async function fetchTmdbApi(path) {
  return await tmdbClient.get(path);
}

function tmdbMediaTypeFor(item) {
  if (item?.mediaType === "tv") return "tv";
  if (item?.mediaType === "movie") return "movie";
  if (["series", "tv"].includes(String(item?.category || item?.type || "").toLowerCase())) return "tv";
  if (item?.type === "anime" && Number(item?.seNum) > 0) return "tv";
  return "movie";
}


async function loadWhereToWatch(item, { region = "", generation = detailLoadGeneration } = {}) {
  const container = $("#watch-hub-content");
  if (!container) return;
  const finishLoading = beginLoading(container, { label: "Checking authorised watch options…", slowLabel: "Watch options are taking a while to load…", size: "sm", slowAfterMs: 4000 });

  const rawId = item?.tmdbId || item?.id;
  const tmdbId = /^\d+$/.test(String(rawId || "")) ? String(rawId) : "";
  if (!tmdbId) {
    if (generation !== detailLoadGeneration) { finishLoading(); return; }
    finishLoading();
    container.innerHTML = watchHubHtml(null, {
      title: item?.title,
      extraNote: item?.source === "tvmaze" ? "TVMaze can help you find this series, but it does not provide streaming availability." : "This title does not have a verified TMDB ID, so provider availability cannot be checked.",
    });
    return;
  }

  const mediaType = tmdbMediaTypeFor(item);
  const cacheKey = `${mediaType}:${tmdbId}`;
  let payload;
  const cached = watchProviderCache.get(cacheKey);
  if (cached && Date.now() - cached.at < WATCH_PROVIDER_TTL_MS) payload = cached.data;
  else {
    try {
      payload = await tmdbClient.get(`/${mediaType}/${tmdbId}/watch/providers`);
      if (payload && generation === detailLoadGeneration) watchProviderCache.set(cacheKey, { at: Date.now(), data: payload });
    } catch (error) {
      if (generation !== detailLoadGeneration || container !== $("#watch-hub-content")) { finishLoading(); return; }
      finishLoading();
      const setupHint = [401, 403, 503].includes(error?.status)
        ? " Check the TMDB_API_KEY environment variable in your Vercel project settings."
        : "";
      container.innerHTML = stateHtml({
        kind: "error",
        title: "Watch options could not be checked",
        message: `${error?.status === 404 ? "TMDB has no watch-provider record for this title." : "The provider data could not be loaded."}${setupHint}`,
        actionLabel: "Try again",
        actionAttr: "data-watch-retry",
      });
      container.querySelector("[data-watch-retry]")?.addEventListener("click", () => {
        watchProviderCache.delete(cacheKey);
        void loadWhereToWatch(item, { region, generation });
      }, { once: true });
      return;
    }
  }
  if (generation !== detailLoadGeneration || container !== $("#watch-hub-content")) { finishLoading(); return; }
  finishLoading();
  const hub = normalizeWatchProviders(payload, { preferred: ["IN", "US"], explicit: region });
  container.innerHTML = watchHubHtml(hub, { title: item.title });
  const select = container.querySelector("[data-watch-region]");
  select?.addEventListener("change", () => {
    void loadWhereToWatch(item, { region: select.value, generation });
  });
}

function focusWatchHub() {
  const hub = $("#watch-hub");
  if (!hub) return;
  hub.scrollIntoView({ block: "center", behavior: "smooth" });
  hub.setAttribute("tabindex", "-1");
  hub.focus({ preventScroll: true });
}

async function fetchTmdbResults(path) {
  const data = await fetchTmdbApi(path);
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

function tmdbDisplayName(code, type) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) || code;
  } catch {
    return code;
  }
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
  const year = Number.parseInt(yearStr.slice(0, 4), 10) || null;
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : (poster || "");
  const rating = tmdbRatingFromVotes(item.vote_average, item.vote_count);
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
    // Round 3: keep the original title — it is the bridge that lets
    // the dedupe match a romanised title against a ja-language copy
    // ("Crayon Shin-chan" vs "クレヨンしんちゃん").
    originalTitle: item.original_title || item.original_name || "",
    category: isAnime ? "anime" : isCartoon ? "cartoons" : isMovie ? "movie" : "series",
    type,
    isJapaneseAnime: isAnime,
    isCartoon: isCartoon,
    originalLanguage: item.original_language || "",
    adult: Boolean(item.adult || isAdult),
    isAdult: Boolean(item.adult || isAdult),
    genre: [...genreSet],
    country: item.origin_country?.[0] || "",
    countryName: tmdbDisplayName(item.origin_country?.[0], "region"),
    year,
    releaseDate: yearStr,
    rating,
    imdbRatingValue: rating == null ? "" : String(rating),
    // TMDB list endpoints carry no runtime: never invent one.
    runtime: "",
    duration: "",
    isComingSoon,
    comingSoon: isComingSoon,
    language: tmdbDisplayName(item.original_language, "language"),
    badge: isComingSoon ? "Coming soon" : (rating != null && rating >= 8.0 ? "Top Rated" : isAnime ? "Anime" : isCartoon ? "Animation" : isMovie ? "Movie" : "TV series"),
    kicker: isAnime ? "Anime Series" : isCartoon ? "Animation" : isMovie ? "Blockbuster" : "Hit Series",
    image: poster,
    cover: { url: poster },
    backdrop,
    gradient: isAnime ? "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)" : isCartoon ? "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)" : isMovie ? "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)" : "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    description: item.overview || "",
    // Redesign 2026-11-22: no embed-server URLs. Playback is via the
    // details "Where to watch" hub (legitimate providers) and official
    // trailers only.
    seNum: isMovie ? 0 : 1,
    mediaType: isMovie ? "movie" : "tv",
  };
};

// Catalog availability and video playback status are tracked separately;
// loading a catalog never claims that a video is playing.
let catalogIsLive = false;
let catalogLiveCount = 0;
let playerIsPlaying = false;

function updateStatusBadge(isLive, count) {
  catalogIsLive = !!isLive;
  if (count !== undefined && count !== null) catalogLiveCount = count;
  const dot = $("#status-dot");
  const label = $("#status-label");
  const settingsDot = $("#settings-status-dot");
  const settingsTitle = $("#settings-status-title");
  const settingsInfo = $("#settings-status-info");

  if (dot) dot.classList.toggle("live", !!isLive);
  if (label) label.textContent = isLive ? "Catalog" : "Curated";

  if (settingsDot) settingsDot.classList.toggle("live", playerIsPlaying);
  if (settingsTitle) settingsTitle.textContent = playerIsPlaying
    ? "Video playing"
    : isLive ? "TMDB catalog loaded" : "Curated catalog";
  if (settingsInfo) {
    settingsInfo.textContent = playerIsPlaying
      ? "A community upload or official trailer is playing."
      : isLive
        ? `Catalog loaded · ${count || "multiple"} titles. Native playback is limited to community uploads and official trailers.`
        : "Curated titles with links to authorised places to watch.";
  }
}

function createSkeletonCardsHtml(count = 12, isWide = false) {
  return loaderHtml({ label: "Loading titles…", size: "sm" }) + Array.from({ length: count }).map(() => `
    <div class="skeleton-card ${isWide ? "skeleton-card-wide" : ""}" aria-hidden="true">
      <div class="skeleton-poster" ${isWide ? 'style="aspect-ratio: 16/9;"' : ""}></div>
      <div class="skeleton-info">
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join("");
}

// Prompt 4 (full Langdock diff): row skeletons that match the finished
// cards' dimensions, so each row reserves its space while loading.
function createSavedTitleSkeletonsHtml() {
  return loaderHtml({ label: "Loading saved titles…", size: "sm" }) + Array.from({ length: 4 }).map(() => `
    <div class="saved-title-card skeleton-saved-title" aria-hidden="true">
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line full"></div>
    </div>
  `).join("");
}

function createCommunitySkeletonsHtml() {
  return loaderHtml({ label: "Loading community uploads…", size: "sm" }) + Array.from({ length: 4 }).map(() => `
    <div class="community-card community-card-skeleton" aria-hidden="true">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join("");
}

function createTrendingSkeletonHtml() {
  return `
    <section class="rail-section" aria-label="Loading trending titles">
      ${loaderHtml({ label: "Loading trending titles…", size: "sm" })}
      <div class="section-heading"><h2>Trending now</h2></div>
      <div class="rail-wrapper">
        <div class="media-rail">${createSkeletonCardsHtml(8)}</div>
      </div>
    </section>
  `;
}

function renderSkeletons() {
  catalogRowsLoading = true;
  const grid = $("#card-grid");
  if (grid) {
    grid.innerHTML = createSkeletonCardsHtml(12);
  }
  const emptyBox = $("#empty-state");
  if (emptyBox) emptyBox.hidden = true;
  const errorBox = $("#error-state");
  if (errorBox) errorBox.hidden = true;

  const isHomeView = state.section === "home" && !state.search.trim();
  const recRow = $("#recommendation-row");
  if (recRow && isHomeView) {
    const recSection = $("#recommendations-section");
    if (recSection) recSection.hidden = false;
    recRow.innerHTML = createSkeletonCardsHtml(8);
  }

  // Saved titles are local data; show placeholders until the catalog
  // can resolve their display details. Community uploads load separately.
  const savedTitlesRow = $("#saved-titles-row");
  if (savedTitlesRow && isHomeView) {
    const savedTitlesSection = $(".quick-picks");
    if (savedTitlesSection) savedTitlesSection.hidden = false;
    savedTitlesRow.innerHTML = createSavedTitleSkeletonsHtml();
  }
  const communityRow = $("#community-row");
  if (communityRow && isHomeView) {
    communityRow.innerHTML = createCommunitySkeletonsHtml();
  }
  const railsContainer = $("#home-rails-container");
  if (railsContainer && isHomeView) {
    railsContainer.hidden = false;
    railsContainer.innerHTML = createTrendingSkeletonHtml();
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
  catalogHasSettled = true;
  catalogRowsLoading = false;
  catalog = dedupeCatalogItems([...DEMO_ITEMS]);
  freezeCatalogTotal(catalog);
  recommendations = DEMO_ITEMS.slice(0, 6);
  setFeatured(pickRandomFeatured(DEMO_ITEMS));
  updateStatusBadge(false, DEMO_ITEMS.length);
  hasMoreContent = true;
  render();
  showToast(`Showing ${DEMO_ITEMS.length} curated titles. Live catalog data is unavailable right now.`);
  const status = $("#catalog-live-status");
  if (status) status.textContent = "Live catalog unavailable. Showing curated titles instead.";
}

async function retryCatalog() {
  clearErrorState();
  await loadLiveCatalog(true);
  await loadNewestRecommendations();
}

const API_BASE = "/api";

function buildApiUrl(action, params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, String(val));
    }
  }

  const qs = searchParams.toString();
  return `${API_BASE}/${encodeURIComponent(action)}${qs ? `?${qs}` : ""}`;
}

async function loadLiveCatalog(isRetry = false) {
  clearErrorState();
  // Do not stack a second full live load on top of one already in flight:
  // each load built its own catalog and the total depended on which won.
  if (liveCatalogLoading && !isRetry) return;
  const catalogGen = ++catalogGeneration;
  liveCatalogLoading = true;
  
  // Instant Cold-Start Rendering: Check if cached catalog exists to show immediately (0ms delay)
  const cached = storage.get("ustream-catalog-cache-v3");
  if (cached) {
    try {
      if (Array.isArray(cached) && cached.length >= 20 && cached[0]?.kicker) {
        catalog = dedupeCatalogItems(cached);
        freezeCatalogTotal(catalog);
        setFeatured(pickRandomFeatured(catalog));
        updateStatusBadge(true, frozenCatalogTotal);
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

      // Redesign 2026-11-22: no /api/catalog fallback — on Vercel it is
      // a static empty stub. A failed batch contributes nothing; if too
      // few titles load overall, the curated showcase fallback runs.
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
      freezeCatalogTotal(catalog);
      hasMoreContent = true;
      setFeatured(pickRandomFeatured(successfulItems));
      updateStatusBadge(true, frozenCatalogTotal);
      clearErrorState();
      catalogHasSettled = true;
      catalogRowsLoading = false;
      render();
      try {
        storage.set("ustream-catalog-cache-v3", storage.compactCatalog(catalog, MAX_CACHED_CATALOG_SIZE));
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
   Infinite Scroll & Endless Pagination
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
    // Round 3: the settings badge shows the frozen total, not the
    // growing live list — same rule as the "Showing X of Y" counter.
    updateStatusBadge(true, frozenCatalogTotal);
    try {
      storage.set("ustream-catalog-cache-v3", storage.compactCatalog(catalog, MAX_CACHED_CATALOG_SIZE));
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
      // Round 3: recommendations are a merge point too — dedupe the row
      // so the same title cannot appear twice in it.
      recommendations = dedupeCatalogItems(recItems);
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
  // Never feature an unreleased title in the hero.
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
    heroDesc.textContent = item.description || "Discover this title and find authorised places to watch.";
  }

  const ratingVal = normalizeRating(item.rating);
  const maturityRating = "";

  const heroMeta = $("#hero-meta");
  if (heroMeta) {
    heroMeta.innerHTML = `
      ${ratingVal == null ? `<span class="rating-unavailable">No TMDB rating</span>` : `<span class="badge-imdb" title="TMDB audience rating">★ ${ratingVal.toFixed(1)}</span>`}
      ${maturityRating ? `<span class="badge-age">${escapeHtml(maturityRating)}</span>` : ""}
      ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ""}
      ${item.runtime && item.runtime !== "—" ? `<span>${escapeHtml(item.runtime)}</span>` : ""}
    `;
  }

  const genrePillsContainer = $("#hero-genre-pills");
  if (genrePillsContainer) {
    const genres = Array.isArray(item.genre) ? item.genre.slice(0, 4) : [];
    genrePillsContainer.innerHTML = genres
      .map((g) => `<span class="hero-genre-chip">${escapeHtml(g)}</span>`)
      .join("");
  }

  const eyebrowText = $("#hero-eyebrow-text");
  if (eyebrowText) eyebrowText.textContent = item.kicker || "Featured Premiere";

  const matchBadge = $("#hero-match-badge");
  if (matchBadge) matchBadge.hidden = true;

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
// buttons are hidden instead of implying a full title is available (bug 14).
const trailerUnavailableTitles = new Set();

// Only an official landscape Trailer/Teaser counts as a trailer. The old
// code fell back to ANY YouTube video for the title, which is how a
// vertical YouTube Short / clip ("Avengers Endgame: Encore…") was shown
// as the "official trailer". Shorts and unrelated clips are rejected.
function pickOfficialTrailer(videos) {
  const list = (videos || []).filter((v) => v && v.site === "YouTube" && v.key);
  if (!list.length) return null;
  const official = list.filter((v) => v.official === true);
  if (!official.length) return null;
  return official.find((v) => v.type === "Trailer")
    || official.find((v) => v.type === "Teaser")
    || null;
}

function setTrailerButtonsHidden() {
  const hero = $("#hero-trailer");
  if (hero) hero.hidden = trailerUnavailableTitles.has(hero.dataset.title || featured?.title);
  const modal = $("#modal-trailer");
  if (modal) modal.hidden = trailerUnavailableTitles.has(state.activeModal?.title);
}

async function playTrailer(title) {
  const item = findTitle(title) || featured;
  if (!item) return;
  const requestId = ++state.player.requestId;
  const isCurrentRequest = () => state.player.requestId === requestId && state.player.trailerTitle === item.title;
  const playerBackdrop = $("#player-backdrop");
  const playerTitle = $("#player-title");
  if (!playerReturnFocus) playerReturnFocus = document.activeElement;
  state.player.trailerTitle = item.title;
  state.player.nativeSource = null;
  if (playerTitle) playerTitle.textContent = `${item.title} — Official Trailer`;
  if (playerBackdrop) { playerBackdrop.hidden = false; playerBackdrop.removeAttribute("hidden"); }
  setPlayerState(PLAYER_STATE.LOADING, `Checking official trailer for ${item.title}…`);

  try {
    let trailerKey = null;
    const tmdbId = item.tmdbId || item.id;
    const mediaType = (item.type === "series" || item.category === "series" || item.category === "tv") ? "tv" : "movie";
    if (tmdbId) {
      const videoData = await fetchTmdbApi(`/${mediaType}/${tmdbId}/videos`);
      if (!isCurrentRequest()) return;
      const trailer = pickOfficialTrailer(videoData?.results || []);
      if (trailer?.key) trailerKey = trailer.key;
    }

    if (!trailerKey) {
      const searchData = await fetchTmdbApi(`/search/${mediaType}?query=${encodeURIComponent(item.title)}`);
      if (!isCurrentRequest()) return;
      const found = searchData?.results?.[0];
      if (found?.id) {
        const videoData = await fetchTmdbApi(`/${mediaType}/${found.id}/videos`);
        if (!isCurrentRequest()) return;
        const trailer = pickOfficialTrailer(videoData?.results || []);
        if (trailer?.key) trailerKey = trailer.key;
      }
    }

    if (!isCurrentRequest()) return;
    const embedPlayer = $("#embed-player");
    const customPlayerWrapper = $("#custom-player-wrapper");
    if (trailerKey) {
      if (customPlayerWrapper) customPlayerWrapper.hidden = true;
      if (embedPlayer) {
        embedPlayer.hidden = false;
        embedPlayer.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
        embedPlayer.title = `${item.title} — Official Trailer`;
      }
      if (playerTitle) playerTitle.textContent = `${item.title} — Official Trailer`;
      if (playerBackdrop) playerBackdrop.hidden = false;
      setPlayerState(PLAYER_STATE.PLAYING, `Playing official trailer: ${item.title}`);
      return;
    }

    trailerUnavailableTitles.add(item.title);
    setTrailerButtonsHidden(true);
    closePlayer();
    showToast(`No official trailer is available for ${item.title}.`);
  } catch (error) {
    if (!isCurrentRequest()) return;
    console.warn("Could not load trailer:", error);
    setPlayerState(PLAYER_STATE.ERROR, `The official trailer for ${item.title} could not be loaded. Retry to check again.`);
  }
}

// TVMaze search fallback (free API, no key, fair-use rate limits).
// TVMaze show data is normalised to the same catalog-item shape as
// TMDB items, except there is no TMDB id — tmdbId is null and the
// subject id is `tvmaze-<id>`. Attribution: "Data from TVMaze".
function normalizeTvMazeItem(entry) {
  const show = entry?.show || {};
  const year = Number.parseInt(String(show.premiered || "").slice(0, 4), 10) || null;
  const poster = show.image?.medium || show.image?.original || "";
  const rating = null;
  const summary = String(show.summary || "").replace(/<[^>]*>/g, "").trim();
  return {
    tmdbId: null,
    subjectId: `tvmaze-${show.id}`,
    title: (show.name || "Untitled").trim(),
    originalTitle: "",
    category: "series",
    type: "series",
    isJapaneseAnime: false,
    isCartoon: false,
    originalLanguage: show.language || "",
    adult: false,
    isAdult: false,
    genre: Array.isArray(show.genres) ? show.genres.map((g) => String(g).toLowerCase()) : ["series"],
    country: show.network?.country?.code || show.webChannel?.country?.code || "",
    countryName: show.network?.country?.name || show.webChannel?.country?.name || "",
    year,
    releaseDate: show.premiered || "",
    rating,
    imdbRatingValue: rating == null ? "" : String(rating),
    runtime: show.runtime ? `${show.runtime} min` : "",
    duration: show.runtime ? `${show.runtime} min` : "",
    isComingSoon: false,
    comingSoon: false,
    language: show.language || "",
    badge: "TV series",
    kicker: "TV Series",
    image: poster,
    cover: { url: poster },
    backdrop: show.image?.original || poster,
    gradient: "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
    description: summary,
    seNum: 1,
    mediaType: "tv",
    source: "tvmaze",
  };
}

let tvMazeLastError = null;
async function searchTvMaze(query) {
  tvMazeLastError = null;
  const cacheKey = `tvmaze:search:${String(query || "").trim().toLowerCase()}`;
  const cached = apiResponseCache.get(cacheKey);
  if (Array.isArray(cached)) return cached;
  try {
    const res = await resilientFetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`, {
      timeoutMs: 6000,
      retries: 1,
      backoffMs: 700,
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const items = data.map(normalizeTvMazeItem).filter((item) => item.title);
    apiResponseCache.set(cacheKey, items, 10 * 60 * 1000);
    return items;
  } catch (error) {
    tvMazeLastError = error;
    console.warn("[TVMaze]", error?.message || "search unavailable");
    return [];
  }
}

async function loadSearchResults(query) {
  const requestId = ++searchRequestId;
  const trimmed = query.trim();
  if (!trimmed) {
    await loadLiveCatalog();
    return;
  }
  const searchLoading = $("#search-loading");
  if (searchLoading) searchLoading.hidden = false;
  const finishSearchLoading = beginLoading(searchLoading, {
    label: `Searching for ${trimmed}…`,
    slowLabel: "Search is taking a while…",
    size: "sm",
    slowAfterMs: 4000,
  });
  let tmdbSearchFailed = false;
  try {
    let results = [];
    try {
      const data = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(trimmed)}`);
      if (Array.isArray(data?.results)) results = data.results;
    } catch (error) { tmdbSearchFailed = true; }

    // TVMaze is an official, free fallback for TV search only. If TMDB
    // returned movie matches but no TV result, retain those and add the
    // TVMaze shows rather than replacing the movie results.
    let tvmazeItems = [];
    const hasTmdbTv = results.some((item) => item.media_type === "tv" || (!item.media_type && item.first_air_date));
    if (!hasTmdbTv) tvmazeItems = await searchTvMaze(trimmed);

    if (requestId !== searchRequestId) return;

    const adultEnabled = isAdultEnabled();
    const filtered = (results || [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => normalizeTmdbItem(item, item.media_type === "movie" ? "movie" : "tv"))
      .filter((item) => adultEnabled || !isAdultContent(item));
    // Rank by relevance (exact title first) and dedupe by TMDB id, so a
    // substring match can never outrank an exact match.
    const ranked = sortBySearchRelevance(dedupeCatalogItems([...filtered, ...tvmazeItems]), trimmed);

    if (ranked.length) {
      catalog = ranked;
      freezeCatalogTotal(catalog);
      state.displayLimit = CONTENT_BATCH_SIZE;
      // Search results are complete: Load More must not append unrelated
      // popular titles into them (or grow the total after a search).
      hasMoreContent = false;
      setFeatured(ranked[0]);
      render();
      showToast(`Found ${ranked.length} live results for "${trimmed}"`);
    } else {
      catalog = [];
      freezeCatalogTotal(catalog);
      state.displayLimit = CONTENT_BATCH_SIZE;
      hasMoreContent = false;
      render();
      if (tmdbSearchFailed && tvMazeLastError) {
        const grid = $("#card-grid");
        if (grid) {
          grid.innerHTML = stateHtml({ kind: "error", title: "Search is temporarily unavailable", message: "Neither TMDB nor TVMaze could return search results. Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-search-retry" });
          grid.querySelector("[data-search-retry]")?.addEventListener("click", () => void loadSearchResults(trimmed), { once: true });
        }
      } else {
        showToast(`No results found for "${trimmed}"`);
      }
    }
  } catch (error) {
    if (requestId !== searchRequestId) return;
    showToast("Live search unavailable — try again");
    console.warn(error);
  } finally {
    if (requestId === searchRequestId && searchLoading) {
      finishSearchLoading();
      searchLoading.hidden = true;
      searchLoading.innerHTML = "";
    }
  }
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const authStateSec = $("#profile-auth-state");
const guestStateSec = $("#profile-guest-state");
const topbarLoginBtn = $("#topbar-login-btn");
const profileMenuWrap = $("#profile-menu-wrap");

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

// Central live-region cleanup (bugs 14/27): stale trailer, video and
// catalog status text must not survive a dialog
// close. Called by closePlayer / closeDetails and by
// the trailer no-trailer / error paths. Note showToast() only removes the
// CSS class after 2.3s — the textContent itself stayed in the live region.
function clearLiveStatus() {
  clearToast();
  const catalogStatus = $("#catalog-live-status");
  if (catalogStatus) catalogStatus.textContent = "";
  const loadingText = $("#player-loading-text");
  if (loadingText) loadingText.textContent = "Loading video…";
  const liveText = $("#player-live-text");
  if (liveText) liveText.textContent = "Ready to watch";
}

function focusSearch() {
  openSearchModal();
  const sInp = $("#modal-search-input");
  sInp?.focus();
}

function updateProfileStats() {
  const watchCount = $("#profile-watch-count");
  const listCount = $("#profile-list-count");
  if (watchCount) watchCount.textContent = String(catalog.length);
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
    explore: ["Watch services", "Explore by service"],
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

function getVisibleCards(source = catalog) {
  const query = state.search.trim().toLowerCase();
  const targetSection = state.section || "home";
  const apiGenre = state.filters.genre || "All";
  const apiLanguage = state.filters.classify || "All";
  const adultEnabled = isAdultEnabled();

  // Round 3: `source` lets the counter run the same filters over the
  // frozen snapshot, so the total is the frozen total for this view.
  let visible = (source || []).filter((card) => {
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
      return diff !== 0 ? diff : ((normalizeRating(b.rating) ?? 0) - (normalizeRating(a.rating) ?? 0));
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

function renderSavedTitlesPreview() {
  const section = $(".quick-picks");
  const row = $("#saved-titles-row");
  if (!section || !row) return;
  if (state.section !== "home" || state.search.trim()) {
    section.hidden = true;
    return;
  }
  const saved = [...state.watchlist]
    .map((title) => findTitle(title) || catalog.find((item) => item.title === title))
    .filter(Boolean)
    .slice(0, 8);
  section.hidden = false;
  if (!saved.length) {
    row.innerHTML = `<div class="saved-titles-empty"><div><strong>Your saved titles will appear here</strong><p>Add a title to My List to find authorised watch options later.</p></div></div>`;
    return;
  }
  row.innerHTML = saved.map((item) => `
    <button class="saved-title-card" data-action="details" data-title="${escapeHtml(item.title)}" aria-label="Open ${escapeHtml(item.title)} details">
      <span class="card-label">Saved title</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span class="saved-title-meta">${escapeHtml(item.year || "")}${item.type ? ` · ${escapeHtml(item.type)}` : ""}</span>
    </button>
  `).join("");
}

function renderRecommendations() {
  const section = $("#recommendations-section");
  const row = $("#recommendation-row");
  if (!section || !row) return;
  // Prompt 4 (full Langdock diff): leave the skeletons in place while
  // the catalog is still loading; render() replaces them once settled.
  if (catalogRowsLoading && state.section === "home" && !state.search.trim()) return;
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
  const scoreHtml = ratingVal == null
    ? `<span class="score score-unavailable">No rating</span>`
    : `<span class="score">★ ${ratingVal.toFixed(1)}</span>`;

  return `
    <article class="media-card ${isNew ? "card-enter" : ""}" data-title="${cleanTitle}">
      <div class="poster" style="--poster-gradient:${card.gradient}">
        ${card.image ? `<img class="poster-image" src="${card.image}" alt="${escapeHtml(cleanTitle)} official poster" loading="lazy" decoding="async" width="500" height="750" />` : ""}
        <span class="poster-kicker" title="${escapeHtml(card.kicker)}">${escapeHtml(card.kicker)}</span>
        ${badgeHtml}
        <span class="poster-title" title="${cleanTitle}">${cleanTitle}</span>
        <button class="list-toggle ${saved ? "saved" : ""}" data-action="toggle-list" data-title="${cleanTitle}" aria-label="${saved ? "Remove" : "Add"} ${cleanTitle} ${saved ? "from" : "to"} my list">${saved ? renderIcon("heartFilled", "icon-sm") : renderIcon("plus", "icon-sm")}</button>
        <button class="card-hover" data-action="play" data-title="${cleanTitle}" aria-label="Where to watch ${cleanTitle}"><span class="play-circle">${renderIcon("play", "icon-md")}</span></button>
      </div>
      <div class="card-info"><h3 title="${cleanTitle}">${cleanTitle}</h3><div class="card-meta">${card.year ? `<span>${escapeHtml(card.year)}</span>` : ""}${card.runtime && card.runtime !== "—" ? `<span>${escapeHtml(card.runtime)}</span>` : ""}${scoreHtml}</div></div>
    </article>
  `;
}

function updateCatalogCounters(visible, displayed) {
  const resultCount = $("#result-count");
  if (resultCount) resultCount.textContent = displayed.length;

  const catalogStatus = $("#catalog-live-status");
  if (catalogStatus) {
    // Round 3: Y comes from the frozen snapshot taken at the last full
    // load, filtered with the same state as the live list — never from
    // the live list itself, which grows as scroll batches append
    // (258 -> 540 -> 592). Scrolling only ever grows X.
    const frozenTotal = getVisibleCards(frozenCatalog).length;
    if (visible.length === 0) {
      catalogStatus.textContent = state.section === "my-list" ? "Your list is empty." : "No titles found matching your criteria.";
    } else if (displayed.length < visible.length) {
      const total = frozenCounterTotal(frozenTotal, displayed.length);
      catalogStatus.textContent = total !== null
        ? `Showing ${displayed.length} of ${total} available titles.`
        : `Showing ${displayed.length} titles · more available.`;
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

  // Prompt 4 (full Langdock diff): show the trending skeleton while the
  // catalog is still loading, instead of an empty rails container.
  if (catalogRowsLoading) {
    container.innerHTML = createTrendingSkeletonHtml();
    return;
  }

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
  renderSavedTitlesPreview();
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
    // Prompt 4 (full Langdock diff): never show "No titles found"
    // before the catalog has settled — while loading, skeletons speak.
    emptyState.hidden = !catalogHasSettled || visible.length > 0;
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
  const searchInput = $("#modal-search-input");
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
      const tmdbId = item.tmdbId || item.id;
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
  const tmdbId = item.tmdbId || item.id;
  if (!/^\d+$/.test(String(tmdbId || ""))) {
    return { cast: [], directors: [], writers: [] };
  }
  const isSeries = item.type === "series" || item.category === "series" || item.category === "tv";
  const mediaType = isSeries ? "tv" : "movie";
  const data = await fetchTmdbApi(`/${mediaType}/${tmdbId}/credits`);
  return {
    cast: (data?.cast || []).slice(0, 10).map((person) => ({
      name: person.name,
      character: person.character || "",
      photo: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : "",
    })),
    directors: (data?.crew || []).filter((person) => person.job === "Director").slice(0, 3).map((person) => person.name),
    writers: (data?.crew || []).filter((person) => ["Writer", "Screenplay", "Story"].includes(person.job)).slice(0, 3).map((person) => person.name),
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

function openDetails(title, { updateHash = true, focusWatch = false } = {}) {
  const item = findTitle(title);
  if (!item) return;
  if (!state.activeModal) detailsReturnFocus = document.activeElement;
  state.activeModal = item;
  const generation = ++detailLoadGeneration;
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
  if (modalKicker) modalKicker.textContent = item.kicker || "Title details";

  const ratingVal = normalizeRating(item.rating);
  const maturityRating = "";

  if (modalMeta) {
    modalMeta.innerHTML = `
      ${ratingVal == null ? `<span class="rating-unavailable">No TMDB rating</span>` : `<span class="badge-imdb" title="TMDB audience rating">★ ${ratingVal.toFixed(1)}</span>`}
      ${maturityRating ? `<span class="badge-age">${escapeHtml(maturityRating)}</span>` : ""}
      ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ""}
      ${item.runtime && item.runtime !== "—" ? `<span>${escapeHtml(item.runtime)}</span>` : ""}
    `;
  }

  if (modalDesc) {
    modalDesc.textContent = item.description || "No synopsis is available for this title yet.";
  }

  if (modalList) {
    const isSaved = state.watchlist.has(item.title);
    modalList.innerHTML = isSaved
      ? `${renderIcon("heartFilled", "icon-sm")} <span>In my list</span>`
      : `${renderIcon("plus", "icon-sm")} <span>Add to list</span>`;
  }

  if (modalPlay) {
    const playLabel = modalPlay.querySelector("span");
    modalPlay.disabled = false;
    modalPlay.removeAttribute("aria-disabled");
    if (playLabel) playLabel.textContent = "Where to watch";
    modalPlay.onclick = focusWatchHub;
  }

  const modalTrailerBtn = $("#modal-trailer");
  if (modalTrailerBtn) modalTrailerBtn.hidden = trailerUnavailableTitles.has(item.title);

  // Show only genres actually supplied by the catalog.
  const specsGrid = $("#modal-specs-grid");
  if (specsGrid) {
    const genres = Array.isArray(item.genre) ? item.genre.filter(Boolean) : [];
    specsGrid.innerHTML = genres.length
      ? `<div class="modal-spec-item"><strong>Genres</strong><span>${escapeHtml(genres.join(", "))}</span></div>`
      : `<p class="muted-state">No genre information is available.</p>`;
  }

  const castRail = $("#modal-xray-cast");
  const crewList = $("#modal-xray-crew");
  const tmdbId = item.tmdbId || item.id;
  const hasTmdbId = /^\d+$/.test(String(tmdbId || ""));
  const renderXrayCredits = (credits, { error = false } = {}) => {
    if (castRail) {
      if (error) {
        castRail.innerHTML = stateHtml({ kind: "error", title: "Credits could not be loaded", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-credit-retry" });
      } else if (!hasTmdbId) {
        castRail.innerHTML = `<p class="muted-state">Verified cast and crew are not available for this title.</p>`;
      } else {
        castRail.innerHTML = (credits.cast || []).length ? credits.cast.map((person) => `
          <div class="xray-cast-card">
            ${person.photo ? `<img class="xray-actor-avatar" src="${escapeHtml(person.photo)}" alt="" loading="lazy" decoding="async">` : `<span class="xray-actor-avatar xray-actor-avatar--empty" aria-hidden="true"></span>`}
            <span class="xray-actor-name">${escapeHtml(person.name)}</span>
            ${person.character ? `<span class="xray-character-name">${escapeHtml(person.character)}</span>` : ""}
          </div>
        `).join("") : `<p class="muted-state">No cast information is listed.</p>`;
      }
    }
    if (crewList) {
      if (error) {
        crewList.innerHTML = `<p class="muted-state">Credits could not be loaded.</p>`;
      } else if (!hasTmdbId) {
        crewList.innerHTML = `<p class="muted-state">Verified cast and crew are not available for this title.</p>`;
      } else {
        crewList.innerHTML = `
          ${(credits.directors || []).length ? `<div class="xray-crew-pill"><strong>Director</strong><span>${escapeHtml(credits.directors.join(", "))}</span></div>` : ""}
          ${(credits.writers || []).length ? `<div class="xray-crew-pill"><strong>Writers</strong><span>${escapeHtml(credits.writers.join(", "))}</span></div>` : ""}
          ${!(credits.directors || []).length && !(credits.writers || []).length ? `<p class="muted-state">No crew information is listed.</p>` : ""}
        `;
      }
    }
    castRail?.querySelector("[data-credit-retry]")?.addEventListener("click", () => void loadXrayCredits(), { once: true });
  };
  const loadXrayCredits = async () => {
    if (!hasTmdbId) {
      renderXrayCredits({ cast: [], directors: [], writers: [] });
      return;
    }
    const finishCast = castRail ? beginLoading(castRail, { label: "Loading cast…", slowLabel: "Cast details are taking a while…", size: "sm", slowAfterMs: 4000 }) : () => {};
    const finishCrew = crewList ? beginLoading(crewList, { label: "Loading crew…", slowLabel: "Crew details are taking a while…", size: "sm", slowAfterMs: 4000 }) : () => {};
    try {
      const credits = await fetchTitleCredits(item);
      finishCast();
      finishCrew();
      if (generation !== detailLoadGeneration || state.activeModal?.title !== item.title) return;
      renderXrayCredits(credits);
    } catch {
      finishCast();
      finishCrew();
      if (generation !== detailLoadGeneration || state.activeModal?.title !== item.title) return;
      renderXrayCredits(null, { error: true });
    }
  };
  void loadXrayCredits();

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
  const watchContent = $("#watch-hub-content");
  if (watchContent) {
    watchContent.innerHTML = loaderHtml({ label: "Checking authorised watch options…", size: "sm" });
    watchContent.setAttribute("aria-busy", "true");
  }
  void loadWhereToWatch(item, { generation });
  if (focusWatch) requestAnimationFrame(() => focusWatchHub());
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







function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}


















const PLAYER_RESOLUTIONS = [1080, 720, 480, 360];

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
let playerLoadingBaseMessage = "Loading video…";

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
  playerLoadingBaseMessage = baseMessage || "Loading video…";
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
      setPlayerState(PLAYER_STATE.ERROR, "The video did not start within 20 seconds. Check your connection, then retry.");
    }
  }, 1000);
}

function setPlayerState(nextState, customMessage = "") {
  currentPlayerState = nextState;
  const wasPlaying = playerIsPlaying;
  playerIsPlaying = nextState === PLAYER_STATE.PLAYING;
  if (wasPlaying !== playerIsPlaying) updateStatusBadge(catalogIsLive, catalogLiveCount);
  if (nextState !== PLAYER_STATE.LOADING) clearPlayerLoadingTimer();

  const liveLabel = $("#player-live-label");
  const liveText = $("#player-live-text");
  const statusEl = $("#player-status");
  const loadingEl = $("#player-loading");
  const loadingText = $("#player-loading-text");
  const errorEl = $("#player-error-indicator");
  const errorText = $("#player-error-text");
  const retryBtn = $("#player-retry-button");
  const region = $("#player-status-region");

  if (region) region.setAttribute("aria-busy", String(nextState === PLAYER_STATE.LOADING));
  for (const element of [statusEl, loadingEl, errorEl, retryBtn]) {
    if (!element) continue;
    element.hidden = true;
    element.style.display = "none";
  }

  switch (nextState) {
    case PLAYER_STATE.IDLE:
      if (liveLabel) liveLabel.hidden = true;
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || "Choose a community video or official trailer.";
      }
      break;
    case PLAYER_STATE.LOADING:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Loading";
      }
      if (loadingEl) {
        loadingEl.hidden = false;
        loadingEl.style.display = "flex";
        if (loadingText) loadingText.textContent = customMessage || "Loading video…";
        startPlayerLoadingTimer(customMessage || "Loading video…");
      }
      break;
    case PLAYER_STATE.READY:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Ready";
      }
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || "Ready to play.";
      }
      break;
    case PLAYER_STATE.PLAYING:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Now playing";
      }
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "block";
        statusEl.textContent = customMessage || (state.player?.item ? `Playing: ${state.player.item.title}` : "Playing video");
      }
      break;
    case PLAYER_STATE.ERROR:
      if (liveLabel) {
        liveLabel.hidden = false;
        if (liveText) liveText.textContent = "Unavailable";
      }
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.style.display = "flex";
        if (errorText) errorText.textContent = customMessage || "This video could not be played.";
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











function togglePlayerSettings(force) {
  const panel = $("[data-player-settings]");
  const toggle = $("[data-player-settings-toggle]");
  if (!panel || !toggle) return;
  const open = typeof force === "boolean" ? force : !panel.open;
  panel.open = open;
  toggle.setAttribute("aria-expanded", String(open));
}



































// Ustream does not stream catalog titles. "Watch" on a movie, series,
// anime or cartoon opens its details at the "Where to watch" hub, which
// links out to authorised providers (TMDB watch-provider data, powered
// by JustWatch). The native player plays community uploads only, and
// official trailers play in the YouTube-nocookie embed.
function playTitle(title) {
  const item = findTitle(title);
  if (!item) return;
  openDetails(item.title, { focusWatch: true });
}



async function retryPlayback() {
  const source = state.player?.nativeSource;
  if (source?.url) {
    playNativeVideo(source.url, source.title, source.poster, { videoId: source.videoId });
    return;
  }
  if (state.player?.trailerTitle) {
    await playTrailer(state.player.trailerTitle);
  }
}

function handlePlaybackError() {
  if (isNativeVideoActive() && retryNativeVideo()) return;
  setPlayerState(PLAYER_STATE.ERROR, "This video could not be played. Retry, or try again later.");
}

function closePlayer() {
  clearLiveStatus();
  nativeRetryCount = 0;
  clearNativeStallTimer();
  const bufferingSpinner = $("#player-buffering-spinner");
  if (bufferingSpinner) bufferingSpinner.hidden = true;
  const embed = $("#embed-player");
  const video = $("#video-player");
  const customWrapper = $("#custom-player-wrapper");
  state.player.requestId += 1;
  state.player.nativeSource = null;
  state.player.trailerTitle = null;
  togglePlayerSettings(false);
  if (embed) {
    embed.src = "about:blank";
    embed.hidden = true;
  }
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.hidden = true;
  }
  if (customWrapper) customWrapper.hidden = true;
  const pb = $("#player-backdrop");
  const wasOpen = pb && !pb.hidden;
  if (pb) {
    pb.hidden = true;
    pb.setAttribute("hidden", "true");
  }
  setPlayerState(PLAYER_STATE.IDLE);
  if (wasOpen && playerReturnFocus?.isConnected) {
    const target = playerReturnFocus;
    playerReturnFocus = null;
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
}

// Prompt 5: retry for the native HTML5 player (community uploads and
// trailers). The embed-server chain in handlePlaybackError() must not run
// for a direct video file, so errors/stalls on #video-player retry the
// same source first: up to 3 times, backoff 1s / 3s / 8s, then ERROR.
const NATIVE_RETRY_DELAYS_MS = [1000, 3000, 8000];
let nativeRetryCount = 0;
let nativeStallTimer = null;
function isNativeVideoActive() {
  const video = $("#video-player");
  const wrapper = $("#custom-player-wrapper");
  const embed = $("#embed-player");
  return Boolean(video && wrapper && !wrapper.hidden && !video.hidden && video.src && (!embed || embed.hidden));
}
function clearNativeStallTimer() {
  if (nativeStallTimer) { clearTimeout(nativeStallTimer); nativeStallTimer = null; }
}
function retryNativeVideo() {
  const video = $("#video-player");
  if (!video) return false;
  if (nativeRetryCount >= NATIVE_RETRY_DELAYS_MS.length) {
    clearNativeStallTimer();
    setPlayerState(PLAYER_STATE.ERROR, "Playback failed after 3 retries. Retry to try again.");
    return false;
  }
  const delay = NATIVE_RETRY_DELAYS_MS[nativeRetryCount];
  nativeRetryCount += 1;
  setPlayerState(PLAYER_STATE.LOADING, `Connection interrupted · Retrying (${nativeRetryCount}/3)…`);
  setTimeout(() => {
    try { video.load(); } catch {}
    video.play().catch(() => {});
  }, delay);
  return true;
}
function armNativeStallTimer() {
  clearNativeStallTimer();
  nativeStallTimer = setTimeout(() => {
    const video = $("#video-player");
    if (!video || video.ended || !isNativeVideoActive()) return;
    if (video.readyState < 3 && !video.paused) retryNativeVideo();
  }, 8000);
}

function playNativeVideo(videoUrl, title, poster = "", { videoId = null } = {}) {
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
  nativeRetryCount = 0;
  clearNativeStallTimer();
  video.poster = poster || "";
  const titleEl = $("#player-title");
  if (titleEl) titleEl.textContent = title || "Community video";
  if (playerBackdrop) playerBackdrop.hidden = false;

  // Native playback is limited to community uploads; official trailers
  // use the YouTube privacy-enhanced embed above.
  video.src = videoUrl;
  state.player.nativeSource = { url: videoUrl, title, poster, videoId };
  state.player.trailerTitle = null;
  if (!playerReturnFocus) playerReturnFocus = document.activeElement;
  video.load();
  setPlayerState(PLAYER_STATE.LOADING, `Loading ${title || "community video"}…`);

  video.play().then(() => {
    setPlayerState(PLAYER_STATE.PLAYING, `Playing: ${title || "Community video"}`);
  }).catch(() => {
    setPlayerState(PLAYER_STATE.READY, `Ready to play: ${title || "Community video"}`);
  });
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
    if (e.target.closest("#custom-player-controls")) return;
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

  // Community-video upload form
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
  // Prompt 4 (full Langdock diff): show community skeletons while the
  // upload list loads; on empty or error, clear the row and hide the
  // section instead of leaving stale placeholders behind.
  const isHomeView = state.section === "home" && !state.search.trim();
  const communityRowEarly = $("#community-row");
  const finishCommunityLoading = communityRowEarly && isHomeView
    ? beginLoading(communityRowEarly, { label: "Loading community uploads…", slowLabel: "Community uploads are taking a while…", size: "sm", slowAfterMs: 4000 })
    : () => {};
  try {
    const res = await fetch("/api/videos?limit=12&status=ready");
    if (!res.ok) throw new Error(`Community videos request failed: ${res.status}`);
    const data = await res.json();
    const section = $("#community-section");
    const row = $("#community-row");
    if (!section || !row) { finishCommunityLoading(); return; }

    if (!data.videos || data.videos.length === 0) {
      finishCommunityLoading();
      row.innerHTML = stateHtml({ kind: "empty", message: "No community uploads yet." });
      section.hidden = false;
      return;
    }

    section.hidden = false;
    finishCommunityLoading();
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
    finishCommunityLoading();
    console.warn("Failed to load community videos:", err);
    const row = $("#community-row");
    const section = $("#community-section");
    if (row) {
      row.innerHTML = stateHtml({ kind: "error", title: "Community uploads could not be loaded", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-community-retry" });
      row.querySelector("[data-community-retry]")?.addEventListener("click", () => void loadCommunityVideos(), { once: true });
    }
    if (section) section.hidden = false;
  }
}

async function loadUserUploads() {
  if (!state.auth?.user) return;
  const listEl = $("#my-uploads-list");
  const emptyEl = $("#my-uploads-empty");
  if (!listEl || !emptyEl) return;
  listEl.hidden = false;
  const finishUploadsLoading = beginLoading(listEl, { label: "Loading your uploads…", slowLabel: "Your uploads are taking a while to load…", size: "sm", slowAfterMs: 4000 });
  emptyEl.hidden = true;

  try {
    const res = await fetch(`/api/videos?userId=${encodeURIComponent(state.auth.user.id)}&limit=20&status=all`, { credentials: "include" });
    if (!res.ok) throw new Error(`Uploads request failed: ${res.status}`);
    const data = await res.json();
    const videos = data.videos || [];

    if (videos.length === 0) {
      finishUploadsLoading();
      listEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;
    finishUploadsLoading();
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
    finishUploadsLoading();
    console.warn("Failed to load user uploads:", err);
    listEl.hidden = false;
    listEl.innerHTML = stateHtml({ kind: "error", title: "Your uploads could not be loaded", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-user-uploads-retry" });
    listEl.querySelector("[data-user-uploads-retry]")?.addEventListener("click", () => void loadUserUploads(), { once: true });
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
  detailLoadGeneration += 1;
  const returnTarget = detailsReturnFocus;
  detailsReturnFocus = null;
  if (returnTarget?.isConnected && typeof returnTarget.focus === "function") {
    requestAnimationFrame(() => returnTarget.focus({ preventScroll: true }));
  }
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
    if (item && !catalog.some((c) => catalogItemsMatch(c, item))) {
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
    if (target === "search") { state.search = ""; const sInp = $("#modal-search-input"); if (sInp) sInp.value = ""; }
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
  if (button.id === "modal-play") { focusWatchHub(); return; }
  if (button.id === "player-retry-button" || button.id === "player-inline-retry") return void retryPlayback();
  if (button.id === "player-settings-toggle") return togglePlayerSettings();
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
    const configured = Boolean(data.tmdbApiKeyConfigured ?? data.configured);
    rows.push(["TMDB proxy", configured ? "Configured" : "Using browser fallback", configured ? "TMDB requests use the server-side proxy when available." : "TMDB_API_KEY is not set on the server. The browser may use its existing fallback key."]);
  } catch {
    rows.push(["Catalog API", "Unavailable", "Could not reach the catalog service — check your connection."]);
  }
  try {
    const res = await fetch("/api/health.json");
    const data = await res.json().catch(() => ({}));
    rows.push(["Community upload service", data.ok ? (data.status || "Healthy") : "Unknown", `Service: ${data.service || "ustream"}`]);
  } catch {
    rows.push(["Community upload service", "Unavailable", "Health endpoint did not respond."]);
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
  about: ["About UstreamPro", "UstreamPro helps you discover movies, TV series and animation, view official trailers, and find regional listings from authorised providers. It does not host or stream third-party films or shows. Community uploads are provided by users. This product uses the TMDB API but is not endorsed or certified by TMDB."],
  privacy: ["Privacy", "Some settings and your My List are stored in this browser. If you sign in, your account and profile information is handled by the account service. Clearing browser data removes locally stored items."],
  terms: ["Terms of Use", "UstreamPro provides catalog information, official trailer links, community uploads, and links to third-party provider listings. Availability and provider terms may change; subscriptions, rentals, purchases, and access are controlled by each provider. Do not misuse the service or redistribute content without permission. This product uses the TMDB API but is not endorsed or certified by TMDB."],
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
      // whether a community video or official trailer is playing.
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

$("#filter-groups")?.addEventListener("change", (event) => {
  const input = event.target.closest("[data-filter]");
  if (!input) return;
  state.filters[input.dataset.filter] = input.value;
  state.displayLimit = CONTENT_BATCH_SIZE;
  render();
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

$("[data-player-settings]")?.addEventListener("toggle", (event) => {
  $("[data-player-settings-toggle]")?.setAttribute("aria-expanded", String(event.currentTarget.open));
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
    setPlayerState(PLAYER_STATE.PLAYING, state.player?.item ? `Playing: ${state.player.item.title}` : "Playing video");
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
  setPlayerState(PLAYER_STATE.LOADING, "Loading video…");
  if (isNativeVideoActive()) armNativeStallTimer();
});

$("#video-player").addEventListener("playing", () => {
  nativeRetryCount = 0;
  clearNativeStallTimer();
  setPlayerState(PLAYER_STATE.PLAYING);
});

$("#video-player").addEventListener("ended", () => {
  clearNativeStallTimer();
  setPlayerState(PLAYER_STATE.READY, "Finished. Play again or close the player.");
});

$("#video-player").addEventListener("error", () => {
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

function updateAuthUI() {
  const signedIn = Boolean(state.auth.user);
  const profile = state.auth.activeProfile;
  if (topbarLoginBtn) topbarLoginBtn.hidden = signedIn;
  if (profileMenuWrap) profileMenuWrap.hidden = !signedIn;
  if (authStateSec) authStateSec.hidden = !signedIn;
  if (guestStateSec) guestStateSec.hidden = signedIn;

  const profileButton = $("#profile-button");
  const dropdown = $("#profile-dropdown");
  if (!signedIn) {
    dropdown?.setAttribute("hidden", "true");
    profileButton?.setAttribute("aria-expanded", "false");
    return;
  }
  if (profileButton) {
    profileButton.textContent = profile?.avatar || "U";
    profileButton.setAttribute("aria-label", profile?.name ? `Account profile: ${profile.name}` : "Account profile");
    profileButton.title = profile?.name ? `${profile.name} profile` : "Account profile";
  }
  const dropAvatar = $("#dropdown-active-avatar");
  const dropName = $("#dropdown-active-name");
  const dropEmail = $("#dropdown-active-email");
  const dropKids = $("#dropdown-kids-tag");
  if (dropAvatar) dropAvatar.textContent = profile?.avatar || "U";
  if (dropName) dropName.textContent = profile?.name || state.auth.user.name || "Viewer";
  if (dropEmail) dropEmail.textContent = state.auth.user.email || "";
  if (dropKids) dropKids.hidden = !profile?.isKids;
}

async function initAuth() {
  const res = await authApi("/api/auth/me");
  if (res.ok && res.data.user) {
    state.auth.user = res.data.user;
    state.auth.profiles = res.data.profiles || [];
    state.auth.activeProfile = res.data.activeProfile || state.auth.profiles[0] || null;
    state.auth.session = res.data.session || null;
    updateAuthUI();

    // Synchronize active profile's remote watchlist
    try {
      const wlRes = await authApi("/api/profile/watchlist");
      if (wlRes.ok && Array.isArray(wlRes.data.watchlist)) {
        wlRes.data.watchlist.forEach((item) => state.watchlist.add(item.title));
        persistWatchlist();
      }
    } catch {}


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
    updateAuthUI();
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
   Appearance & Personalization
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
   Global Search Modal
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
  const finishModalSearchLoading = beginLoading(resultsEl, {
    label: `Searching for ${query}…`,
    slowLabel: "Search is taking a while…",
    size: "sm",
    slowAfterMs: 4000,
  });
  resultsEl.insertAdjacentHTML("beforeend", `
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
  `);

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
                  <span>${item.year || "Year unknown"}</span>
                  <span style="color: var(--accent); font-weight: 700;">${(() => { const r = normalizeRating(item.rating); return r == null ? "No TMDB rating" : `★ ${r.toFixed(1)}`; })()}</span>
                  <span>${escapeHtml(item.badge || item.type || "")}</span>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      `;
    }

    finishModalSearchLoading();
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
    let tmdbSearchFailed = false;
    try {
      const data = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(query)}&language=${localStorage.getItem("ustream-lang") || "en-US"}`);
      if (signal.aborted) { finishModalSearchLoading(); return; }
      if (data) {
        tmdbResults = (data.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv").slice(0, 12).map((item) => {
          const isMovie = item.media_type === "movie";
          const title = isMovie ? item.title : item.name;
          const year = String(isMovie ? (item.release_date || "") : (item.first_air_date || "")).slice(0, 4);
          const isAnime = item.original_language === "ja" && item.genre_ids?.includes(16);
          const isCartoon = item.original_language === "en" && item.genre_ids?.includes(16);
          const normalized = {
            title: title || "Untitled",
            type: isMovie ? "movie" : "series",
            year: Number.parseInt(year, 10) || null,
            rating: tmdbRatingFromVotes(item.vote_average, item.vote_count),
            releaseDate: (isMovie ? item.release_date : item.first_air_date) || "",
            runtime: "",
            image: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "",
            badge: isAnime ? "Anime" : isCartoon ? "Cartoon" : isMovie ? "Movie" : "Series",
            genre: (item.genre_ids || []).map((id) => TMDB_GENRE_NAMES[id]).filter(Boolean),
            isJapaneseAnime: isAnime,
            isCartoon: isCartoon,
            tmdbId: item.id,
            mediaType: item.media_type,
            adult: Boolean(item.adult),
            isAdult: Boolean(item.adult),
            country: item.origin_country?.[0] || "",
            kicker: isMovie ? "Movie" : "TV Series",
            gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
          };
          registerExtraTitle(normalized);
          return normalized;
        });
      }
    } catch {
      tmdbSearchFailed = true;
    }

    if (signal.aborted) { finishModalSearchLoading(); return; }

    const hasTmdbTv = tmdbResults.some((item) => item.mediaType === "tv" || item.type === "series");
    let tvmazeItems = [];
    let tvMazeSearchFailed = false;
    if (["all", "tv"].includes(modalSearchType) && !hasTmdbTv) {
      tvmazeItems = await searchTvMaze(query);
      tvMazeSearchFailed = Boolean(tvMazeLastError);
    }
    if (signal.aborted) { finishModalSearchLoading(); return; }

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
      dedupeCatalogItems([...matchedCatalog, ...tmdbResults, ...tvmazeItems]),
      query
    );
    if (finalCards.some((card) => searchRelevanceScore(card.title, query) === 0)) {
      finalCards = finalCards.filter((card) => searchRelevanceScore(card.title, query) < 3);
    }
    finalCards = finalCards.slice(0, 24);

    if (!finalCards.length) {
      finishModalSearchLoading();
      if (tmdbSearchFailed && tvMazeSearchFailed) {
        resultsEl.innerHTML = stateHtml({ kind: "error", title: "Search could not be completed", message: "Neither TMDB nor TVMaze returned results. Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-modal-search-retry" });
        resultsEl.querySelector("[data-modal-search-retry]")?.addEventListener("click", () => void executeModalSearch(query), { once: true });
      } else {
        resultsEl.innerHTML = `
          <div class="search-empty-prompt">
            <p>No results found for “${escapeHtml(query)}”.</p>
            <small>Try another keyword or select a different media filter.</small>
          </div>
        `;
      }
      return;
    }

    renderSearchResults(finalCards);
    if (tmdbSearchFailed && tvMazeSearchFailed) {
      resultsEl.insertAdjacentHTML("beforeend", stateHtml({ kind: "info", message: "Showing matches found so far; search providers could not return all results.", actionLabel: "Try again", actionAttr: "data-modal-search-retry" }));
      resultsEl.querySelector("[data-modal-search-retry]")?.addEventListener("click", () => void executeModalSearch(query), { once: true });
    }
  } catch (err) {
    finishModalSearchLoading();
    if (signal.aborted) return;
    console.error("Search modal error:", err);
    resultsEl.innerHTML = stateHtml({ kind: "error", title: "Search could not be completed", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-modal-search-retry" });
    resultsEl.querySelector("[data-modal-search-retry]")?.addEventListener("click", () => void executeModalSearch(query), { once: true });
  }
}

/* ==========================================================================
   Explore / Watch Providers Directory
   ========================================================================== */
let exploreProviders = [];
let currentExploreRegion = "IN";

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
      if (titleEl) titleEl.textContent = "Explore by service";
      if (kickerEl) kickerEl.textContent = "Browse services with current titles listed in your region.";
    });
  }

  void renderExploreProviders();
}

async function renderExploreProviders() {
  const grid = $("#providers-grid");
  if (!grid) return;
  grid.removeAttribute("hidden");
  $("#provider-catalog-view")?.setAttribute("hidden", "true");
  $("#explore-back-btn")?.setAttribute("hidden", "true");
  const finishLoading = beginLoading(grid, { label: "Loading authorised services…", slowLabel: "The service directory is taking a while…", size: "md", slowAfterMs: 4000 });

  try {
    let region = "IN";
    const [movieData, tvData] = await Promise.all([
      fetchTmdbApi(`/watch/providers/movie?watch_region=${region}`),
      fetchTmdbApi(`/watch/providers/tv?watch_region=${region}`),
    ]);
    let movies = Array.isArray(movieData?.results) ? movieData.results : [];
    let shows = Array.isArray(tvData?.results) ? tvData.results : [];
    if (!movies.length && !shows.length) {
      region = "US";
      const fallback = await Promise.all([
        fetchTmdbApi(`/watch/providers/movie?watch_region=${region}`),
        fetchTmdbApi(`/watch/providers/tv?watch_region=${region}`),
      ]);
      movies = Array.isArray(fallback[0]?.results) ? fallback[0].results : [];
      shows = Array.isArray(fallback[1]?.results) ? fallback[1].results : [];
    }
    currentExploreRegion = region;
    const byId = new Map();
    for (const [kind, providers] of [["Movies", movies], ["TV", shows]]) {
      for (const provider of providers) {
        if (!provider.provider_id || !provider.provider_name) continue;
        const existing = byId.get(provider.provider_id) || {
          id: provider.provider_id,
          name: provider.provider_name,
          logo: provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : "",
          kinds: [],
          displayPriority: provider.display_priority ?? 999,
        };
        if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
        existing.displayPriority = Math.min(existing.displayPriority, provider.display_priority ?? 999);
        byId.set(existing.id, existing);
      }
    }
    exploreProviders = [...byId.values()].sort((a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name));
    const kickerEl = $("#explore-kicker");
    if (kickerEl) kickerEl.textContent = region === "IN"
      ? "Services with titles listed in India. Availability may change."
      : "No provider directory was returned for India; showing services listed in the United States.";
    finishLoading();
    if (!exploreProviders.length) {
      grid.innerHTML = stateHtml({ kind: "empty", title: "No services are listed", message: "TMDB did not return provider listings for India or the United States." });
      return;
    }
    grid.innerHTML = exploreProviders.map((provider) => `
      <button class="provider-tile" type="button" data-provider-id="${provider.id}" aria-label="Browse titles listed for ${escapeHtml(provider.name)} in ${currentExploreRegion === "IN" ? "India" : "the United States"}">
        <span class="provider-logo-wrap">${provider.logo ? `<img src="${escapeHtml(provider.logo)}" alt="" decoding="async" loading="lazy">` : `<span class="provider-logo-fallback" aria-hidden="true">${escapeHtml(provider.name.slice(0, 1))}</span>`}</span>
        <span class="provider-tile-name">${escapeHtml(provider.name)}</span>
        <span class="provider-tile-tag">${escapeHtml(provider.kinds.join(" · "))}</span>
      </button>
    `).join("");
    grid.querySelectorAll("[data-provider-id]").forEach((tile) => {
      tile.addEventListener("click", () => {
        const provider = exploreProviders.find((item) => item.id === Number(tile.dataset.providerId));
        if (provider) void openProviderCatalog(provider);
      });
    });
  } catch (error) {
    console.warn("[TMDB provider directory]", error?.message || "unavailable");
    finishLoading();
    grid.innerHTML = stateHtml({ kind: "error", title: "Services could not be loaded", message: "The TMDB provider directory is unavailable. Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-provider-retry" });
    grid.querySelector("[data-provider-retry]")?.addEventListener("click", () => void renderExploreProviders(), { once: true });
  }
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
  if (titleEl) titleEl.textContent = provider.name;
  if (kickerEl) kickerEl.textContent = `Titles TMDB lists for ${provider.name} in ${currentExploreRegion === "IN" ? "India" : "the United States"}. Open a title for its watch options.`;
  const finishLoading = titlesGrid ? beginLoading(titlesGrid, { label: `Loading titles for ${provider.name}…`, slowLabel: "Provider titles are taking a while…", size: "md", slowAfterMs: 4000 }) : () => {};
  try {
    const region = currentExploreRegion || "IN";
    const [movieData, tvData] = await Promise.all([
      fetchTmdbApi(`/discover/movie?with_watch_providers=${provider.id}&watch_region=${region}&sort_by=popularity.desc`),
      fetchTmdbApi(`/discover/tv?with_watch_providers=${provider.id}&watch_region=${region}&sort_by=popularity.desc`),
    ]);
    const items = [
      ...(Array.isArray(movieData?.results) ? movieData.results : []).map((item) => normalizeTmdbItem({ ...item, media_type: "movie" }, "movie")),
      ...(Array.isArray(tvData?.results) ? tvData.results : []).map((item) => normalizeTmdbItem({ ...item, media_type: "tv" }, "tv")),
    ];
    const finalList = sortBySearchRelevance(dedupeCatalogItems(items), "");
    if (!titlesGrid) { finishLoading(); return; }
    finishLoading();
    if (!finalList.length) {
      titlesGrid.innerHTML = stateHtml({ kind: "empty", title: "No titles are listed", message: `TMDB has no current ${currentExploreRegion === "IN" ? "India" : "United States"} listings for ${provider.name}.` });
      return;
    }
    finalList.forEach(registerExtraTitle);
    titlesGrid.innerHTML = finalList.slice(0, 24).map((item) => renderCard(item)).join("");
    observeLazyImages(titlesGrid);
  } catch (error) {
    console.warn("[TMDB provider catalog]", error?.message || "unavailable");
    if (titlesGrid) {
      finishLoading();
      titlesGrid.innerHTML = stateHtml({ kind: "error", title: "Provider titles could not be loaded", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-provider-catalog-retry" });
      titlesGrid.querySelector("[data-provider-catalog-retry]")?.addEventListener("click", () => void openProviderCatalog(provider), { once: true });
    }
  }
}

/* ==========================================================================
   Cartoons & Anime TMDB Category Loader
   ========================================================================== */
const categoryCache = new Set();
async function loadCategoryTmdb(category) {
  if (categoryCache.has(category)) return;

  const grid = $("#card-grid");
  const finishCategoryLoading = grid && state.section === category
    ? beginLoading(grid, { label: `Loading ${category}…`, slowLabel: "This category is taking a while to load…", size: "md", slowAfterMs: 4000 })
    : () => {};
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
        categoryCache.add(category);
        const filtered = appendCatalogItems(newCards);
        if (filtered.length) {
          const vis = getVisibleCards();
          const displayed = vis.slice(0, state.displayLimit);
          const grid = $("#card-grid");
          if (grid && state.section === category) {
            finishCategoryLoading();
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
    if (grid && state.section === category) {
      finishCategoryLoading();
      if (!grid.children.length) grid.innerHTML = stateHtml({ kind: "empty", message: "No titles were found in this category." });
    }
  } catch (err) {
    console.error(`Failed to load ${category} from TMDB:`, err);
    if (grid && state.section === category) {
      finishCategoryLoading();
      grid.innerHTML = stateHtml({ kind: "error", title: "This category could not be loaded", message: "Check your connection and try again.", actionLabel: "Try again", actionAttr: "data-category-retry" });
      grid.querySelector("[data-category-retry]")?.addEventListener("click", () => { categoryCache.delete(category); void loadCategoryTmdb(category); }, { once: true });
    }
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

