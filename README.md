# UstreamPro

A responsive movie, TV and anime discovery site. Browse catalog information, view official trailers, and find regional streaming, rental and purchase listings through TMDB. UstreamPro does not host or stream third-party films or shows; native video playback is limited to community uploads and official trailers.

## What it includes

- Responsive, keyboard-accessible dark interface with shared loading, empty and error states.
- TMDB catalog, search, credits, official trailers and watch-provider data.
- A **Where to watch** hub with India as the primary region and United States as the fallback. Availability is grouped by subscription, free/ad-supported, rent and buy when TMDB provides those listings.
- TVMaze search fallback for TV results when TMDB returns none. TVMaze results do not receive a rating.
- Ratings only from a real TMDB `vote_average` with at least one vote. Missing ratings, dates and runtime remain unavailable rather than being filled with guesses.
- Community-upload and account endpoints retained; no third-party embed or unofficial playback sources.

## Attribution

The site displays this notice: **This product uses the TMDB API but is not endorsed or certified by TMDB.**

Streaming availability data is supplied by JustWatch through TMDB. TV search fallback data is attributed to TVMaze in the app. Provider listings link to TMDB's regional watch page, which in turn links to providers when TMDB supplies that page.

## Deploy to Vercel

1. Import `dheeraj136/UstreamPro` into Vercel.
2. Keep the settings from `vercel.json`. It pins the Framework Preset to **Other** (`"framework": null`), runs `node scripts/build.mjs`, serves `public/`, and deploys each file in `api/` as its own Node.js function (`/api/tmdb`, `/api/config`).
3. In **Settings → Environment Variables**, add `TMDB_API_KEY` with your TMDB API v3 key for Production (and Preview, if you use preview deployments). Then redeploy, because environment variables only apply to new deployments.
4. Check the deployment:
   - **Deployment → Functions** should list `api/config` and `api/tmdb`, not a single `index` function.
   - `/api/config` should return `{"ok":true,"configured":true,...}` (it never returns the key).
   - `/api/tmdb?tmdbPath=/configuration` should return TMDB JSON.

### Why the framework is pinned

The site is static files plus two API functions; it is not a Node server. When the Framework Preset is **Node** (or another backend preset such as Express), Vercel looks for a server entry file named `app`, `index` or `server`. After the build, it found the browser bundle `public/app.js`, logged "Using public/app.js as the root entrypoint", and deployed it as a single `/index` function. That code crashes on the server with `ReferenceError: document is not defined`. Under that preset, the `api/` files are not deployed as functions, so `/api/tmdb` and `/api/config` return 500.

`"framework": null` in `vercel.json` selects **Other** and overrides the dashboard preset. With **Other**, `public/` is served as static files and each file in `api/` becomes its own function. The `functions` entry for `api/*.js` makes the build fail with a visible error if those functions are ever missing. Also set the dashboard Framework Preset to **Other** so the dashboard matches the repo.

If `TMDB_API_KEY` is missing, `/api/tmdb` responds with HTTP 503. If the proxy fails for any reason, the client turns it off for the rest of the session and calls TMDB directly with its existing fallback keys. Those keys are visible in the browser bundle. After the proxy has been confirmed working in production, remove the client fallbacks.

### OOMOL and TMDB

The site does not use OOMOL. OOMOL's hosted Connector requires a personal OOMOL API key on a trusted backend, so a browser can't call it directly. Its TMDB connection also exposes only seven actions: `search_movie`, `get_movie`, `search_tv`, `get_tv`, `get_person`, `list_trending` and `get_configuration`. That doesn't cover the endpoints the site needs, such as watch providers, videos, credits, discover, popular lists, or multi-search. Connecting TMDB in OOMOL is optional, for agents and the `oo` CLI. It doesn't affect the website.

## Local development

Requires Node.js 20 or newer. Install the dependencies listed in `package.json`, then prepare the environment file:

```bash
cp .env.example .env
```

Add your TMDB key to `.env` if you want to use the server-side proxy, then start the local server:

```bash
npm run dev
```

The site is served at `http://localhost:4174` by default. To choose another port, set `PORT` in `.env`. The local server loads `.env` before it handles API requests.

To build the static output without starting the server:

```bash
npm run build
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_API_KEY` | Recommended | Server-side key used by `/api/tmdb`. Unset means the proxy returns 503 and the client falls back to its bundled keys. |
| `PORT` | No | Local server port; defaults to `4174`. |
| `HOST` | No | Local server bind address; defaults to `0.0.0.0`. |

Use `.env.example` as the template. Do not commit `.env` or put a private key in frontend code.

## Project layout

```text
api/                    Vercel API handlers for TMDB and public config status
assets/                 Site icons, logo and images
lib/                    Local API router, authentication and community-video routes
scripts/build.mjs        Static asset build and hash-based cache busting
scripts/server.mjs       Local static and API server
src/app.js               Single-page app and hash navigation
src/index.html            Accessible page shell
src/styles.css            Theme and responsive layout
src/modules/              Loader, cache, TMDB, ratings and watch-provider helpers
tests/                    Node test suite
vercel.json               Vercel build, security headers and route configuration
.env.example              Environment variable template
```

The build intentionally leaves prior content-hashed JavaScript and CSS files in place. Vercel can fail while collecting output if a file is removed after it has already been traced during the same build; old hashes are harmless because the page references the current hashes.

## Verify changes

```bash
npm test
npm run build
```

## Current limitations

- Watch-provider results depend on TMDB/JustWatch coverage and may be empty for a title or region. The fallback region is the United States; it may not reflect the viewer's location.
- Provider cards open the TMDB watch page, not a provider-specific deep link.
- Curated showcase entries have no rating until TMDB data is loaded. TVMaze fallback results remain unrated.
- Live API calls and browser-device layouts should be checked after deployment; offline local checks cannot guarantee upstream availability.
