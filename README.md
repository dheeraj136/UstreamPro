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
2. Keep the build settings from `vercel.json`: build command `node scripts/build.mjs`, output directory `public`.
3. In the Vercel project's **Settings → Environment Variables**, add `TMDB_API_KEY` with your TMDB API v3 key. Apply it to the environments you use, then redeploy.
4. Open the deployed site and confirm the catalog loads. The API key is used by the server-side TMDB proxy and is not returned by the public configuration endpoint.

If `TMDB_API_KEY` is missing, `/api/tmdb` responds with HTTP 503. The client then tries the existing public fallback keys. Those fallback keys are visible in the browser bundle; for production, set the server variable and remove the client fallbacks after confirming the proxy works.

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
