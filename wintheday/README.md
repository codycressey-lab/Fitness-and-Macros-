# Win The Day

A personal daily operating system. Bright, fast, and engineered around one
idea: **missing a day is part of the system, not a failure state.**

It is a web page with a shortcut on your phone — the same setup as the macros
app. No app store, nothing installed.

---

## Where things live

| Path | What it is |
|---|---|
| `wintheday/` | The app. Self-contained, no build step. |
| `wintheday/src/config/app.config.js` | **Every** checklist item, target, label, and greeting. Nothing personal is hardcoded anywhere else. |
| `coach/persona.js` | **The voice.** The coach's system prompt and per-screen instructions. This is the file to edit when a line doesn't sound right. |
| `wintheday/src/ai/fallbacks.js` | Hand-written lines used when the API is unreachable. |
| `api/coach.js` | The serverless function. The only thing that ever sees the API key. |

The macros app at the repo root is untouched and still deploys to GitHub Pages
exactly as it did before.

---

## Deploying (one time, ~3 minutes)

1. Go to **vercel.com** → **Add New… → Project** → import this repo.
2. Framework preset: **Other**. Leave every build setting empty — there's
   nothing to build.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |

4. Deploy. Vercel gives you a URL; `/` redirects to the app.

After that, every `git push` redeploys automatically.

### Put it on your phone

Open the URL in **Safari** → **Share** → **Add to Home Screen** → **Add**.
It opens full-screen with no browser bars and works offline.

---

## About the API key

The key is read from `process.env` inside `api/coach.js`, on Vercel's server.
It is never sent to the browser, never committed, and there is no code path in
`wintheday/` that could obtain it. The app only ever talks to `/api/coach`.

**One honest limitation:** the deployment URL is public and there is no login,
so in principle someone who found the URL could make requests against your
credits. `api/coach.js` mitigates this with a per-instance rate limit and a
context-size cap, which stops casual abuse but is not real authentication. If
that matters, the fix is Vercel's password protection on the deployment, or a
passcode gate in the app — say the word and it's a small change.

---

## If the API is down

The app never shows an error or a blank space. `wintheday/src/ai/fallbacks.js`
holds hand-written lines in the same voice, picked by situation (streak alive,
fresh start, start of week) and rotated by date so a given day always shows the
same line. A degraded morning still reads like it was meant.

The morning line is generated once per day and cached in `localStorage`, so
opening the app ten times costs one request.

---

## Your data

Everything lives in `localStorage` on your phone: settings, day records, and
journals, each under its own key. Journal writes are verified after the fact
rather than assumed. `exportAll()` in `src/core/store.js` produces a single
JSON file of everything — the export UI is on the build list.

---

## Design notes

- **Type.** Bricolage Grotesque (display) / Figtree (body) / DM Mono (numbers).
  All self-hosted in `wintheday/fonts/` — Google Fonts over CDN would break
  offline rendering.
- **Tokens.** `styles/tokens.css` is the single source of colour. Dusk mode
  swaps the semantic tokens wholesale rather than overriding components.
- **The Day Arc.** `src/ui/dayArc.js` owns both the arc and the page-wide sky,
  because they're one idea. Sun position is the real time of day; sky warmth is
  completion; each bead is a finished item parked at the hour it happened.
- **Motion.** One orchestrated entrance, then restraint. `prefers-reduced-motion`
  is respected throughout.
