# Paco's Binder — frontend

A React front end for the underwriting rules-engine API — pick a product, answer its
questions, get a decision, or manage the product catalog itself.

## Deployment

Live at **https://paco-uw-web.vercel.app** (Vercel), talking to the API at
`https://underwriting-api-4ky9.onrender.com` (Render). `VITE_API_URL` is set to that
Render URL in Vercel's project settings — Vite bakes it into the build at deploy time, so
changing it means redeploying. The API's `ALLOWED_ORIGINS` includes this exact Vercel
origin (no trailing slash — a browser's `Origin` header never has one).

## What it does

**Quote console.** Pick a product from the catalog, answer its questions, submit them,
then run either evaluation model (Model A — full, or Model B — short-circuit). A session
panel shows the outcome plus which rule decided it and which answer(s) drove it, with a
running history of every evaluation on the current quote.

**Admin.** Gated by an admin key entered on the page (never stored, just held in memory
for the tab). Two modes:

- **Build new** — create a product, add its questions, then the rules that decide it.
- **Browse catalog** — look up any existing product's questions and rules.

## Calling the API

Every request goes through `src/lib/api.js` — one exported function per endpoint
(`getProducts`, `createQuote`, `evaluateQuote`, ...), all funneling into a single
`request()` helper that wraps `fetch`. That helper attaches `X-Quote-Token` for the
per-quote calls and `X-Admin-Key` for the admin calls, and turns any non-2xx response into
an `ApiError` carrying the API's `detail` message, so components can just catch `ApiError`
and show `.detail` directly instead of parsing responses themselves. The base URL comes
from `VITE_API_URL`.

## Project structure

```
src/
  main.jsx              React entry point, mounts App
  App.jsx               Shell: wordmark, session chip, nav tabs; switches between the
                        Quote console and Admin views
  index.css             All styling
  components/
    QuoteConsole.jsx    Product picker, question form, session/evaluation panel
    AdminPage.jsx       Admin shell: mode toggle, admin key input
    AdminForms.jsx      Form fields for building a new product/question/rule
    CatalogBrowser.jsx  Browse catalog: an existing product's questions and rules
    Badge.jsx           Outcome badge (accept / increase_premium / refer_to_insurer / decline)
  lib/
    api.js              Fetch wrapper, one function per API endpoint
    data.js             UI vocabulary constants (outcome labels, answer types, operators)
    format.js           Small display formatting helpers
    adminDrafts.js      Empty-draft factories for the Admin build forms
index.html              Vite HTML entry
vite.config.js          Vite + React plugin config
.env.example            VITE_API_URL example
```

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint      # oxlint
```

Needs the API running and reachable at `VITE_API_URL` (defaults to
`http://localhost:8000`). Admin actions need the API's `ADMIN_API_KEY` value, pasted into
the "Admin key" field on the Admin page.

Point `VITE_API_URL` at the deployed API (`https://underwriting-api-4ky9.onrender.com`)
instead of running it locally, if you want this app to run against real deployed data —
see "Deployment" above for the live version of both.
