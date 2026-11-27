// Round-3 catalog dedupe + count-stability tests.
//
// src/app.js is a browser module, so these tests extract the pure
// dedupe/counter helpers verbatim from src/app.js and evaluate them in
// a small sandbox (no DOM, no network). If a helper is renamed or
// removed, extraction fails loudly instead of silently testing a stub.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appSrc = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app.js"),
  "utf8"
);

// Extract one top-level `function NAME(...) {...}` or
// `const NAME = (...) => {...}` from the app source, skipping strings
// and comments while brace-matching so braces inside literals do not
// throw the count off.
function extractFunction(src, name) {
  const head = new RegExp(`^(?:function ${name}\\s*\\(|const ${name} =)`, "m");
  const m = head.exec(src);
  assert.ok(m, `helper ${name} not found in src/app.js`);
  let i = src.indexOf("{", m.index);
  const start = m.index;
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
    i++;
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const HELPERS = [
  "canonicalTitleKey",
  "canonicalTitleKeys",
  "dedupeWorkKind",
  "dedupeYear",
  "dedupeYearsCompatible",
  "catalogItemKey",
  "catalogItemsMatch",
  "catalogHasCanonical",
  "isBetterEvidence",
  "buildCatalogMatchIndex",
  "catalogIndexHas",
  "dedupeCatalogItems",
  "appendCatalogItems",
  "freezeCatalogTotal",
  "frozenCounterTotal",
  "isUnreleasedDate",
  "isUnreleasedItem",
];

function loadHelpers() {
  const parts = [
    "const MAX_CATALOG_SIZE = 600;",
    "let catalog = [];",
    "let frozenCatalog = [];",
    "let frozenCatalogTotal = 0;",
    ...HELPERS.map((name) => extractFunction(appSrc, name)),
    `return { ${HELPERS.join(", ")}, _setCatalog: (items) => { catalog = items; }, _getCatalog: () => catalog, _getFrozen: () => frozenCatalog, _getFrozenTotal: () => frozenCatalogTotal };`,
  ];
  return new Function(parts.join("\n"))();
}

const h = loadHelpers();

// --- Fixtures mirroring the real normalizer outputs -----------------------

const demoSpiritedAway = {
  subjectId: "movie-spirited-away", title: "Spirited Away", type: "movie",
  category: "movie", year: 2001, releaseDate: "2001-07-20", rating: 8.6, seNum: 0,
};
const tmdbSpiritedAway = {
  tmdbId: "129", subjectId: "tmdb-129", title: "Spirited Away",
  originalTitle: "千と千尋の神隠し", type: "anime", category: "anime",
  mediaType: "movie", isJapaneseAnime: true, originalLanguage: "ja",
  year: 2001, releaseDate: "2001-07-20", rating: 8.6, seNum: 0,
};
// Same film re-typed by the /api/catalog anime fallback (no ids).
const fallbackSpiritedAway = {
  title: "Spirited Away", type: "anime", category: "anime",
  year: 2001, releaseDate: "2001-07-20", rating: 8.6, seNum: 0,
};
const demoSpiderVerse = {
  subjectId: "movie-spider-verse", title: "Spider-Man: Across the Spider-Verse",
  type: "movie", category: "movie", year: 2023, releaseDate: "2023-06-02",
  rating: 8.7, seNum: 0,
};
const tmdbSpiderVerse = {
  tmdbId: "569094", subjectId: "tmdb-569094",
  title: "Spider-Man: Across the Spider-Verse",
  originalTitle: "Spider-Man: Across the Spider-Verse", type: "cartoon",
  category: "cartoons", mediaType: "movie", isCartoon: true,
  year: 2023, releaseDate: "2023-05-31", rating: 8.7, seNum: 0,
};
const demoJujutsu = {
  subjectId: "anime-jujutsu-kaisen", title: "Jujutsu Kaisen", type: "anime",
  category: "anime", year: 2020, releaseDate: "2020-10-03", rating: 8.5, seNum: 2,
};
// TMDB's literal name for this show is all-caps.
const tmdbJujutsu = {
  tmdbId: "95479", subjectId: "tmdb-95479", title: "JUJUTSU KAISEN",
  originalTitle: "呪術廻戦", type: "anime", category: "anime", mediaType: "tv",
  isJapaneseAnime: true, originalLanguage: "ja",
  year: 2020, releaseDate: "2020-10-03", rating: 8.5, seNum: 1,
};
const tmdbCrayonEn = {
  tmdbId: "30623", subjectId: "tmdb-30623", title: "Crayon Shin-chan",
  originalTitle: "クレヨンしんちゃん", type: "series", category: "series",
  mediaType: "tv", originalLanguage: "ja",
  year: 1992, releaseDate: "1992-04-13", rating: 8.0, seNum: 1,
};
const kanaCrayon = {
  title: "クレヨンしんちゃん", type: "series", category: "series",
  mediaType: "tv", originalLanguage: "ja",
  year: 1992, releaseDate: "1992-04-13", rating: 8.0, seNum: 1,
};
const doctorWho1963 = {
  tmdbId: "100", title: "Doctor Who", type: "series", mediaType: "tv",
  year: 1963, releaseDate: "1963-11-23", rating: 8.0, seNum: 1,
};
const doctorWho2005 = {
  tmdbId: "101", title: "Doctor Who", type: "series", mediaType: "tv",
  year: 2005, releaseDate: "2005-03-26", rating: 8.0, seNum: 1,
};
const doraemon1979 = {
  tmdbId: "200", title: "Doraemon", type: "series", mediaType: "tv",
  year: 1979, releaseDate: "1979-04-02", rating: 8.0, seNum: 1,
};
const doraemon2005 = {
  tmdbId: "201", title: "Doraemon", type: "series", mediaType: "tv",
  year: 2005, releaseDate: "2005-04-15", rating: 8.0, seNum: 1,
};

test("live case: Spirited Away collapses across movie/anime labels and fallback copies", () => {
  const merged = h.dedupeCatalogItems([demoSpiritedAway, tmdbSpiritedAway, fallbackSpiritedAway]);
  assert.equal(merged.length, 1);
  // Best evidence wins: the TMDB-id copy survives.
  assert.equal(merged[0].tmdbId, "129");
});

test("live case: Spider-Verse collapses across movie/cartoon labels", () => {
  const merged = h.dedupeCatalogItems([demoSpiderVerse, tmdbSpiderVerse]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tmdbId, "569094");
});

test("live case: 'Jujutsu Kaisen' merges with TMDB's literal 'JUJUTSU KAISEN'", () => {
  assert.equal(h.catalogItemsMatch(demoJujutsu, tmdbJujutsu), true);
  const merged = h.dedupeCatalogItems([demoJujutsu, tmdbJujutsu]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tmdbId, "95479");
});

test("live case: 'Crayon Shin-chan' merges with 'クレヨンしんちゃん' via original title", () => {
  assert.equal(h.catalogItemsMatch(tmdbCrayonEn, kanaCrayon), true);
  const merged = h.dedupeCatalogItems([kanaCrayon, tmdbCrayonEn]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tmdbId, "30623");
});

test("title keys keep non-Latin scripts instead of collapsing them to ''", () => {
  assert.equal(h.canonicalTitleKey("クレヨンしんちゃん"), "クレヨンしんちゃん");
  assert.equal(h.canonicalTitleKey("千と千尋の神隠し"), "千と千尋の神隠し");
  assert.equal(h.canonicalTitleKey("Amélie"), "amelie");
  assert.equal(h.canonicalTitleKey("The Odyssey (2026)"), "odyssey");
});

test("two different Japanese titles in the same year do NOT merge", () => {
  const howl = {
    tmdbId: "20", title: "ハウルの動く城", originalTitle: "ハウルの動く城",
    type: "movie", mediaType: "movie", year: 2004, releaseDate: "2004-11-20",
    rating: 8.0, seNum: 0,
  };
  const steamboy = {
    tmdbId: "21", title: "スチームボーイ", originalTitle: "スチームボーイ",
    type: "movie", mediaType: "movie", year: 2004, releaseDate: "2004-07-17",
    rating: 8.0, seNum: 0,
  };
  assert.equal(h.dedupeCatalogItems([howl, steamboy]).length, 2);
});

test("must stay separate: Doctor Who 1963 vs 2005, Doraemon 1979 vs 2005", () => {
  const merged = h.dedupeCatalogItems([doctorWho1963, doctorWho2005, doraemon1979, doraemon2005]);
  assert.equal(merged.length, 4);
});

test("must stay separate: a movie and a series sharing title+year", () => {
  const movie = {
    tmdbId: "10", title: "Dune", type: "movie", mediaType: "movie",
    year: 2021, releaseDate: "2021-09-15", rating: 8.0, seNum: 0,
  };
  const series = {
    tmdbId: "11", title: "Dune", type: "series", mediaType: "tv",
    year: 2021, releaseDate: "2021-09-15", rating: 8.0, seNum: 1,
  };
  assert.equal(h.dedupeCatalogItems([movie, series]).length, 2);
});

test("a dateless copy (year defaulted to current) still merges with its dated twin", () => {
  const dateless = {
    title: "Spirited Away", type: "movie", year: 2026, releaseDate: "",
    rating: 8.6, seNum: 0,
  };
  assert.equal(h.dedupeCatalogItems([demoSpiritedAway, dateless]).length, 1);
});

test("round-2 regression: three 'The Odyssey' TMDB ids collapse to the best-rated one", () => {
  const make = (id, rating) => ({
    tmdbId: String(id), title: "The Odyssey", type: "movie", mediaType: "movie",
    year: 2026, releaseDate: "2026-07-17", rating, seNum: 0,
  });
  const merged = h.dedupeCatalogItems([make(1368337, 8.0), make(1756234, 4.0), make(1698863, 1.0)]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].rating, 8.0);
});

test("append path: a later batch cannot reintroduce a duplicate, new titles still append", () => {
  h._setCatalog(h.dedupeCatalogItems([demoSpiritedAway, tmdbSpiritedAway]));
  assert.equal(h._getCatalog().length, 1);
  const added = h.appendCatalogItems([
    fallbackSpiritedAway,
    { tmdbId: "999", title: "Brand New Title", type: "movie", mediaType: "movie", year: 2024, releaseDate: "2024-01-01", rating: 7.0, seNum: 0 },
  ]);
  assert.equal(added.length, 1);
  assert.equal(added[0].title, "Brand New Title");
  assert.equal(h._getCatalog().length, 2);
});

test("frozen total: unchanged while scrolling and appending batches", () => {
  const initial = Array.from({ length: 258 }, (_, i) => ({
    tmdbId: String(1000 + i), title: `Catalog Title ${i + 1}`, type: "movie",
    mediaType: "movie", year: 2000 + (i % 25), releaseDate: `${2000 + (i % 25)}-01-01`,
    rating: 7.0, seNum: 0,
  }));
  h._setCatalog(h.dedupeCatalogItems(initial));
  h.freezeCatalogTotal(h._getCatalog());
  assert.equal(h._getFrozenTotal(), 258);
  // Simulate three scroll batches: 40 genuinely new titles plus 10
  // duplicates of already-loaded ones each time.
  for (let batch = 0; batch < 3; batch++) {
    const incoming = [];
    for (let i = 0; i < 40; i++) {
      incoming.push({
        tmdbId: String(5000 + batch * 40 + i), title: `Batch ${batch} Title ${i}`,
        type: "movie", mediaType: "movie", year: 2020, releaseDate: "2020-01-01",
        rating: 7.0, seNum: 0,
      });
    }
    for (let i = 0; i < 10; i++) incoming.push({ ...initial[i] });
    h.appendCatalogItems(incoming);
    // The live catalog grows; the frozen total must not.
    assert.equal(h._getFrozenTotal(), 258);
    assert.equal(h.frozenCounterTotal(h._getFrozenTotal(), 35), 258);
    assert.equal(h.frozenCounterTotal(h._getFrozenTotal(), 258), 258);
  }
  assert.equal(h._getCatalog().length, 258 + 120);
  // Once the user has viewed past the frozen total, no total is claimed.
  assert.equal(h.frozenCounterTotal(258, 259), null);
  assert.equal(h.frozenCounterTotal(0, 10), null);
});

test("built public/app.js evaluates top-level initializers without TDZ or ReferenceError", async () => {
  const prevDoc = globalThis.document;
  const noopEl = {
    addEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    classList: { toggle: () => {}, add: () => {}, remove: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  globalThis.document = {
    querySelector: () => noopEl,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  try {
    await assert.doesNotReject(() => import("../public/app.js"));
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});
