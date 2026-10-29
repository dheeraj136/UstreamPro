import { handleAuthRoute } from "./auth-routes.js";
import { handleVideoRoute } from "./video-routes.js";

const RAPID_API_BASE = process.env.RAPID_API_BASE || "https://moviebox-api.p.rapidapi.com";
const RAPID_API_HOST = process.env.RAPID_API_HOST || "moviebox-api.p.rapidapi.com";
let rapidApiKey = (process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "").trim();

const json = (res, status, payload, req = null) => {
  if (typeof res.setHeader === "function") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-allow-methods", "GET, HEAD, POST, OPTIONS");
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
  }

  // Vercel / Express helper
  if (typeof res.status === "function") {
    const s = res.status(status);
    if (s && typeof s.json === "function") {
      if (req?.method === "HEAD" && typeof s.end === "function") return s.end();
      return s.json(payload);
    }
  }

  if (typeof res.json === "function") {
    if (typeof res.statusCode !== "undefined") res.statusCode = status;
    return res.json(payload);
  }

  // Node native http.ServerResponse
  if (typeof res.writeHead === "function") {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
    });
    if (req?.method === "HEAD") return res.end();
    return res.end(JSON.stringify(payload));
  }

  if (typeof res.statusCode !== "undefined") res.statusCode = status;
  if (req?.method === "HEAD" && typeof res.end === "function") return res.end();
  if (typeof res.end === "function") return res.end(JSON.stringify(payload));
  if (typeof res.send === "function") return res.send(JSON.stringify(payload));
};

export const DEMO_ITEMS = [
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
    "category": "movie",
    "type": "movie",
    "genre": [
      "animation",
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
    "category": "movie",
    "type": "movie",
    "genre": [
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

export const EPISODE_MAP = {
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
        { ep: 1, season: 1, name: `${item.title} - Episode 1`, resourceLink: item.playUrl?.url || item.video, resolution: 1080 },
        { ep: 2, season: 1, name: `${item.title} - Episode 2`, resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", resolution: 1080 },
        { ep: 3, season: 1, name: `${item.title} - Episode 3`, resourceLink: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", resolution: 1080 },
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
      "x-api-key": rapidApiKey,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(3500),
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
    const host = url.hostname.toLowerCase();
    const allowed = [
      "bcdn.hakunaymatata.com",
      "commondatastorage.googleapis.com",
      "storage.googleapis.com",
      "image.tmdb.org",
      "api.themoviedb.org"
    ];
    return url.protocol === "https:" && (allowed.includes(host) || host.endsWith(".hakunaymatata.com") || host.endsWith(".googleapis.com"));
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

export const handler = async (req, res) => {
  try {
    const headers = req.headers || {};
    let rawPath = headers["x-vercel-original-url"] || req.url || headers["x-matched-path"] || "/";
    if (rawPath.startsWith("/api/index") || rawPath.startsWith("/api/server")) {
      const orig = headers["x-vercel-original-url"] || req.url;
      if (orig && !orig.startsWith("/api/index") && !orig.startsWith("/api/server")) {
        rawPath = orig;
      }
    }
    const requestUrl = new URL(rawPath, "http://localhost");
    
    // Normalize pathname
    if (!requestUrl.pathname.startsWith("/api")) {
      requestUrl.pathname = `/api${requestUrl.pathname.startsWith("/") ? "" : "/"}${requestUrl.pathname}`;
    }
    if (requestUrl.pathname.startsWith("/api/api/")) {
      requestUrl.pathname = requestUrl.pathname.replace(/^\/api\/api\//, "/api/");
    }
    requestUrl.pathname = requestUrl.pathname.replace(/\.js$/, "");

    if (requestUrl.pathname === "/api" || requestUrl.pathname === "/api/" || requestUrl.pathname === "/api/index") {
      const endpoint = requestUrl.searchParams.get("endpoint") || requestUrl.searchParams.get("path");
      if (endpoint) {
        requestUrl.pathname = endpoint.startsWith("/") ? `/api${endpoint}` : `/api/${endpoint}`;
      }
    }

    if (req.method === "OPTIONS") {
      const origin = req.headers?.origin;
      const optHeaders = {
        "access-control-allow-origin": origin || "*",
        "access-control-allow-headers": "content-type, authorization",
        "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
        ...(origin ? { "access-control-allow-credentials": "true" } : {})
      };
      if (typeof res.setHeader === "function") {
        for (const [k, v] of Object.entries(optHeaders)) res.setHeader(k, v);
      }
      if (typeof res.status === "function") {
        const s = res.status(204);
        if (s && typeof s.end === "function") return s.end();
      }
      if (typeof res.writeHead === "function") {
        res.writeHead(204, optHeaders);
      }
      if (typeof res.end === "function") return res.end();
      return;
    }

    // Authentication and Profile endpoints
    if (requestUrl.pathname.startsWith("/api/auth") || requestUrl.pathname.startsWith("/api/profile") || requestUrl.pathname.startsWith("/api/profiles")) {
      const handled = await handleAuthRoute(req, res, requestUrl.pathname);
      if (handled) return;
    }

    // Video Upload, Streaming & Management endpoints
    if (requestUrl.pathname.startsWith("/api/videos")) {
      const handled = await handleVideoRoute(req, res, requestUrl.pathname);
      if (handled) return;
    }

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

    if (requestUrl.pathname === "/api" || requestUrl.pathname === "/api/") {
      return json(res, 200, {
        ok: true,
        service: "ustream",
        version: "1.0.0",
        configured: !!rapidApiKey,
        mode: rapidApiKey ? "live" : "demo"
      }, req);
    }

    if (requestUrl.pathname === "/healthz" || requestUrl.pathname === "/api/healthz") {
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

    if (requestUrl.pathname === "/api/sports") {
      try {
        const response = await fetch("https://bintvjson.lovable.app/api/public/bintvjson", {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        return json(res, 200, data, req);
      } catch (err) {
        return json(res, 502, { error: "Failed to fetch sports events", message: err.message }, req);
      }
    }

    if (requestUrl.pathname === "/api/livetv" || requestUrl.pathname === "/api/tv") {
      const apiKey = (process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "").trim();
      const host = process.env.RAPIDAPI_LIVE_TV_HOST || "live-tv-api1.p.rapidapi.com";
      if (!apiKey) {
        return json(res, 200, { ok: true, source: "demo-channels", channels: [] }, req);
      }
      try {
        const response = await fetch(`https://${host}/tv`, {
          headers: {
            Accept: "application/json",
            "x-rapidapi-host": host,
            "x-rapidapi-key": apiKey,
          },
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        if (response.ok && (Array.isArray(data) || Array.isArray(data?.channels) || Array.isArray(data?.data))) {
          const channels = Array.isArray(data) ? data : (data.channels || data.data || []);
          return json(res, 200, { ok: true, source: "live-tv-api1", channels }, req);
        }
        return json(res, 200, {
          ok: true,
          source: "provider-upstream-warning",
          upstreamMessage: data.messages || data.message || "Upstream provider unreachable",
          channels: []
        }, req);
      } catch (err) {
        return json(res, 502, { ok: false, error: "Failed to connect to LIVE TV API", message: err.message }, req);
      }
    }

    const DEFAULT_TMDB_KEY = "e9e9d8da18ae29fc430845952232787c";

    if (requestUrl.pathname.startsWith("/api/tmdb/")) {
      const tmdbKey = (process.env.TMDB_API_KEY || DEFAULT_TMDB_KEY).trim();
      if (!tmdbKey) {
        return json(res, 200, { results: [] }, req);
      }
      const tmdbPath = requestUrl.pathname.replace(/^\/api\/tmdb/, "");
      const tmdbUrl = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
      requestUrl.searchParams.forEach((val, key) => {
        if (key !== "api_key") tmdbUrl.searchParams.set(key, val);
      });
      tmdbUrl.searchParams.set("api_key", tmdbKey);
      try {
        const response = await fetch(tmdbUrl.href, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        });
        const data = await response.json();
        return json(res, response.status, data, req);
      } catch (err) {
        return json(res, 502, { error: "Failed to proxy TMDB request", message: err.message }, req);
      }
    }

    if (requestUrl.pathname === "/api/catalog") {
      const category = requestUrl.searchParams.get("category") || "tv";
      const page = requestUrl.searchParams.get("page") || "1";
      const tmdbKey = (process.env.TMDB_API_KEY || DEFAULT_TMDB_KEY).trim();
      if (tmdbKey) {
        try {
          let tmdbPath = `/trending/all/day?page=${page}`;
          if (category === "movie") tmdbPath = `/movie/popular?page=${page}`;
          else if (category === "tv" || category === "series") tmdbPath = `/tv/popular?page=${page}`;
          else if (category === "anime") tmdbPath = `/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
          else if (category === "cartoons" || category === "cartoon") tmdbPath = `/discover/tv?with_genres=16&with_original_language=en&sort_by=popularity.desc&page=${page}`;

          const tmdbUrl = `https://api.themoviedb.org/3${tmdbPath}${tmdbPath.includes("?") ? "&" : "?"}api_key=${tmdbKey}`;
        const response = await fetch(tmdbUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const tmdbData = await response.json();
          if (Array.isArray(tmdbData?.results) && tmdbData.results.length) {
            const liveItems = tmdbData.results.map((t) => {
              const isMovie = category === "movie" || t.media_type === "movie" || (!t.first_air_date && !!t.release_date);
              const isAnime = category === "anime" || (t.original_language === "ja" && (t.genre_ids || []).includes(16));
              const isCartoon = category === "cartoons" || category === "cartoon" || (t.original_language === "en" && (t.genre_ids || []).includes(16));
              const type = isAnime ? "anime" : isCartoon ? "cartoon" : isMovie ? "movie" : "series";
              const title = (t.title || t.name || t.original_title || t.original_name || "Untitled").trim();
              const yearStr = t.release_date || t.first_air_date || "";
              const year = parseInt(yearStr.slice(0, 4), 10) || new Date().getFullYear();
              const poster = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "";
              const backdrop = t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : poster;
              const rating = t.vote_average ? Number(t.vote_average.toFixed(1)) : 8.0;
              const tmdbId = String(t.id);
              return {
                tmdbId,
                subjectId: `tmdb-${tmdbId}`,
                title,
                category: type === "cartoon" ? "cartoons" : type,
                type,
                genre: isAnime ? ["anime"] : isCartoon ? ["animation", "cartoon"] : isMovie ? ["movie", "action"] : ["series", "drama"],
                country: t.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
                countryName: t.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
                year,
                releaseDate: yearStr,
                rating,
                imdbRatingValue: String(rating),
                runtime: isMovie ? "Feature film" : "Series",
                duration: isMovie ? "Feature film" : "Series",
                language: t.original_language === "ja" ? "Japanese, English Dub" : "English, Multi Sub",
                badge: rating >= 8.0 ? "Top Rated" : "Popular",
                kicker: isAnime ? "Anime Series" : isCartoon ? "Animation" : isMovie ? "Blockbuster" : "Hit Series",
                image: poster,
                cover: { url: poster },
                backdrop,
                gradient: isAnime ? "linear-gradient(145deg, #b45309, #78350f 50%, #451a03)" : isCartoon ? "linear-gradient(145deg, #db2777, #831843 50%, #4c0519)" : isMovie ? "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)" : "linear-gradient(145deg, #0369a1, #0c4a6e 50%, #082f49)",
                description: t.overview || `Stream ${title} in high definition on Ustream.`,
                video: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51`,
                playUrl: { url: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51` },
                hasResource: true,
                seNum: isMovie ? 0 : 1,
                mediaType: isMovie ? "movie" : "tv",
              };
            });
            return json(res, 200, { code: 0, message: "ok", data: { items: liveItems } }, req);
          }
        }
      } catch (err) {
        console.warn("TMDB catalog fetch failed, checking fallbacks:", err.message);
      }
    }

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
      const tmdbKey = (process.env.TMDB_API_KEY || DEFAULT_TMDB_KEY).trim();
      if (query && tmdbKey) {
        try {
          const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`;
          const response = await fetch(searchUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
          if (response.ok) {
            const data = await response.json();
            const items = (data.results || [])
              .filter((t) => t.media_type === "movie" || t.media_type === "tv")
              .map((t) => {
                const isMovie = t.media_type === "movie";
                const isAnime = t.original_language === "ja" && (t.genre_ids || []).includes(16);
                const isCartoon = t.original_language === "en" && (t.genre_ids || []).includes(16);
                const type = isAnime ? "anime" : isCartoon ? "cartoon" : isMovie ? "movie" : "series";
                const title = (t.title || t.name || t.original_title || t.original_name || "Untitled").trim();
                const yearStr = t.release_date || t.first_air_date || "";
                const year = parseInt(yearStr.slice(0, 4), 10) || new Date().getFullYear();
                const poster = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : "";
                const backdrop = t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : poster;
                const rating = t.vote_average ? Number(t.vote_average.toFixed(1)) : 8.0;
                const tmdbId = String(t.id);
                return {
                  tmdbId,
                  subjectId: `tmdb-${tmdbId}`,
                  title,
                  category: type === "cartoon" ? "cartoons" : type,
                  type,
                  genre: isAnime ? ["anime"] : isCartoon ? ["animation"] : isMovie ? ["movie"] : ["series"],
                  country: t.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
                  countryName: t.origin_country?.[0] || (isAnime ? "Japan" : "United States"),
                  year,
                  releaseDate: yearStr,
                  rating,
                  imdbRatingValue: String(rating),
                  runtime: isMovie ? "Feature film" : "Series",
                  duration: isMovie ? "Feature film" : "Series",
                  language: t.original_language === "ja" ? "Japanese, English Dub" : "English, Multi Sub",
                  badge: rating >= 8.0 ? "Top Rated" : "Popular",
                  kicker: isAnime ? "Anime Series" : isCartoon ? "Animation" : isMovie ? "Blockbuster" : "Hit Series",
                  image: poster,
                  cover: { url: poster },
                  backdrop,
                  gradient: "linear-gradient(145deg, #1e293b, #0f172a 50%, #020617)",
                  description: t.overview || `Stream ${title} in high definition on Ustream.`,
                  video: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51`,
                  playUrl: { url: `https://vidlink.pro/${isMovie ? "movie" : "tv"}/${tmdbId}${isMovie ? "" : "/1/1"}?primaryColor=e7ff51` },
                  hasResource: true,
                  seNum: isMovie ? 0 : 1,
                  mediaType: isMovie ? "movie" : "tv",
                };
              });
            return json(res, 200, { code: 0, message: "ok", data: { items } }, req);
          }
        } catch (err) {
          console.warn("TMDB search failed, falling back:", err.message);
        }
      }
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
        (Array.isArray(item.genre) ? item.genre.join(" ") : String(item.genre || "")).toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query)
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

    return json(res, 404, { error: "API endpoint not found", path: requestUrl.pathname }, req);
  } catch (error) {
    const status = Number(error.statusCode) || 502;
    console.error(`[Server Request Error] Status: ${status}, Message:`, error.message, error.rawBody || "");
    return json(res, status, { error: error.message || "RapidAPI request failed", details: error.payload?.message || error.rawBody || undefined }, req);
  }
};

export default handler;
