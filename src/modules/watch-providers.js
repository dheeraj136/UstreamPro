// "Where to watch" hub — TMDB watch-provider data (sourced from JustWatch).
//
// TMDB terms: watch-provider data must be attributed to JustWatch, and
// the app must show "This product uses the TMDB API but is not endorsed
// or certified by TMDB". TMDB returns no per-provider deep links, only a
// per-region TMDB watch page (`link`) that lists the providers and links
// on to them, so every provider entry links to that page. Ustream never
// streams, proxies or embeds a provider's content, and never bypasses a
// provider's ads, subscription or regional restrictions.

export const TMDB_ATTRIBUTION = "This product uses the TMDB API but is not endorsed or certified by TMDB.";
export const JUSTWATCH_ATTRIBUTION = "Streaming availability data provided by JustWatch.";
export const DEFAULT_REGIONS = ["IN", "US"];

// Display order and plain-language labels.
export const OFFER_GROUPS = [
  { key: "flatrate", label: "Stream", hint: "Included with a subscription" },
  { key: "free", label: "Free", hint: "Free to watch" },
  { key: "ads", label: "Free with ads", hint: "Free, supported by ads" },
  { key: "rent", label: "Rent", hint: "Pay once, watch for a limited time" },
  { key: "buy", label: "Buy", hint: "Pay once, keep it in your library" },
];

const REGION_NAMES = { IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia" };

export function regionName(code) {
  if (!code) return "";
  if (REGION_NAMES[code]) return REGION_NAMES[code];
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code) || code;
  } catch {
    return code;
  }
}

function hasOffers(entry) {
  return Boolean(entry) && OFFER_GROUPS.some((g) => Array.isArray(entry[g.key]) && entry[g.key].length > 0);
}

/**
 * Pick the region to show: the user's explicit choice if it has offers,
 * else the first preferred region (IN, then US) with offers.
 */
export function pickRegion(results, preferred = DEFAULT_REGIONS, explicit = "") {
  if (!results || typeof results !== "object") return { region: "", fallbackUsed: false };
  if (explicit) return hasOffers(results[explicit])
    ? { region: explicit, fallbackUsed: false }
    : { region: "", fallbackUsed: false };
  for (let i = 0; i < preferred.length; i += 1) {
    if (hasOffers(results[preferred[i]])) return { region: preferred[i], fallbackUsed: i > 0 };
  }
  return { region: "", fallbackUsed: false };
}

/**
 * Normalise a TMDB `/{type}/{id}/watch/providers` payload (or the
 * `watch/providers` object from append_to_response).
 */
export function normalizeWatchProviders(payload, { preferred = DEFAULT_REGIONS, explicit = "" } = {}) {
  const results = payload?.results && typeof payload.results === "object" ? payload.results : {};
  const regionsWithOffers = Object.keys(results).filter((code) => hasOffers(results[code]));
  // This product promises India first and United States as fallback;
  // never accidentally show availability for an unrelated third region.
  const ordered = preferred.filter((code) => regionsWithOffers.includes(code));
  const { region, fallbackUsed } = pickRegion(results, preferred, explicit);
  const entry = region ? results[region] : null;
  const isTmdbWatchLink = (value) => typeof value === "string"
    && /^https:\/\/www\.themoviedb\.org\/(?:movie|tv)\/[0-9][A-Za-z0-9-]*\/watch(?:[/?#]|$)/.test(value);
  const tmdbLink = (entry && isTmdbWatchLink(entry.link) ? entry.link : "")
    || preferred.map((code) => results[code]?.link).find(isTmdbWatchLink)
    || "";
  const groups = entry
    ? OFFER_GROUPS
      .map((g) => ({
        ...g,
        providers: (entry[g.key] || [])
          .slice()
          .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
          .map((p) => ({
            id: p.provider_id,
            name: String(p.provider_name || "").trim(),
            logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : "",
          }))
          .filter((p) => p.name),
      }))
      .filter((g) => g.providers.length > 0)
    : [];
  return {
    region,
    regionLabel: regionName(region),
    preferredMissing: Boolean(region) && fallbackUsed ? preferred[0] : "",
    fallbackUsed,
    regions: ordered,
    link: tmdbLink,
    groups,
    isEmpty: groups.length === 0,
  };
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Markup for the hub body. `title` is the title's display name. */
export function watchHubHtml(hub, { title = "", tmdbPageUrl = "", extraNote = "" } = {}) {
  const attribution = `<p class="watch-hub__attribution">Streaming availability data provided by <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">JustWatch<span class="sr-only"> (opens in a new tab)</span></a>. ${esc(TMDB_ATTRIBUTION)}</p>`;
  if (!hub || hub.isEmpty) {
    const officialTmdbLink = tmdbPageUrl || hub?.link || "";
    const fallbackLink = officialTmdbLink
      ? ` <a class="watch-hub__link" href="${esc(officialTmdbLink)}" target="_blank" rel="noopener noreferrer">View ${esc(title)} on TMDB<span class="sr-only"> (opens in a new tab)</span></a>`
      : "";
    return `<div class="watch-hub__empty" role="status">`
      + `<p class="watch-hub__empty-title">No authorised streaming, rental or purchase options are listed for ${esc(title || "this title")} in India or the United States right now.</p>`
      + `<p class="watch-hub__empty-text">Availability changes often. Check your provider's own app, or look again later.${fallbackLink}</p>`
      + (extraNote ? `<p class="watch-hub__empty-text">${esc(extraNote)}</p>` : "")
      + `</div>${attribution}`;
  }
  const regionOptions = hub.regions.length > 1
    ? `<label class="watch-hub__region"><span>Region</span><select data-watch-region aria-label="Choose your region for watch options">`
      + hub.regions.map((code) => `<option value="${esc(code)}"${code === hub.region ? " selected" : ""}>${esc(regionName(code))}</option>`).join("")
      + `</select></label>`
    : `<p class="watch-hub__region-static">Region: ${esc(hub.regionLabel)}</p>`;
  const fallbackNote = hub.fallbackUsed
    ? `<p class="watch-hub__note">Nothing is listed for ${esc(regionName(hub.preferredMissing))}, so showing ${esc(hub.regionLabel)}. Providers may not be available where you are.</p>`
    : "";
  const groupsHtml = hub.groups.map((g) => `
    <div class="watch-hub__group">
      <h4 class="watch-hub__group-title">${esc(g.label)} <span class="watch-hub__group-hint">${esc(g.hint)}</span></h4>
      <ul class="watch-hub__providers" role="list">
        ${g.providers.map((p) => `
        <li>
          ${hub.link
            ? `<a class="watch-provider" href="${esc(hub.link)}" target="_blank" rel="noopener noreferrer" title="${esc(`${g.label} on ${p.name} — opens TMDB's watch page`)}">
                ${p.logo ? `<img src="${esc(p.logo)}" alt="" width="46" height="46" loading="lazy" decoding="async">` : `<span class="watch-provider__fallback" aria-hidden="true">${esc(p.name.slice(0, 1))}</span>`}
                <span class="watch-provider__name">${esc(p.name)}</span>
                <span class="sr-only"> — ${esc(g.label)}, opens TMDB's watch page in a new tab</span>
              </a>`
            : `<div class="watch-provider" title="${esc(`${g.label} on ${p.name}`)}">
                ${p.logo ? `<img src="${esc(p.logo)}" alt="" width="46" height="46" loading="lazy" decoding="async">` : `<span class="watch-provider__fallback" aria-hidden="true">${esc(p.name.slice(0, 1))}</span>`}
                <span class="watch-provider__name">${esc(p.name)}</span>
              </div>`}
        </li>`).join("")}
      </ul>
    </div>`).join("");
  const tmdbLink = hub.link
    ? `<a class="watch-hub__link" href="${esc(hub.link)}" target="_blank" rel="noopener noreferrer">See all options and prices on TMDB<span class="sr-only"> (opens in a new tab)</span></a>`
    : "";
  return `<div class="watch-hub__toolbar">${regionOptions}${tmdbLink}</div>${fallbackNote}${groupsHtml}`
    + `<p class="watch-hub__disclaimer">Ustream doesn't host or stream these titles. Links open the provider listing on TMDB; sign-in, subscription, rental or purchase terms are set by each provider.</p>`
    + attribution;
}
