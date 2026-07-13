# Anti-Kuddus Protocol

**Digital classroom governance — anonymous reporting, smart seating, AI-assisted study, and real-time SOS alerts, all in one place.**

Anti-Kuddus Protocol is a single-page-per-feature web app built for one class/section at a time. Students sign up with a roll number, and the app gives them six tools: anonymous complaints, a seat planner, an AI study assistant, a corruption ledger, real-time SOS rescue alerts, and a rule checker. It's a static front end (vanilla HTML/CSS/JS, no build step) backed by Firebase (Auth + Firestore) for identity and real-time data, and a tiny Netlify Function that proxies AI requests to Gemini.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Local Setup](#local-setup)
- [Firebase Setup](#firebase-setup)
- [Environment Variables & AI Assistant](#environment-variables--ai-assistant)
- [Deploying](#deploying)
- [Project Structure](#project-structure)
- [UI Overview](#ui-overview)
- [Architectural Trade-offs](#architectural-trade-offs)
- [Known Limitations / Roadmap](#known-limitations--roadmap)

---

## Features

| Module | What it does |
|---|---|
| **Anonymous Complaints** | Students file complaints without revealing identity; captains review and act on them. |
| **Seat Planner** | Drag-and-drop / generated seating charts for the class. |
| **AI Study Assistant** | Paste study material and get it back as bullet points, a brief summary, detailed notes, Q&A pairs, or an ELI-a-12-year-old explanation — powered by Gemini via a server-side proxy. |
| **Corruption Ledger** | A running, auditable log of reported incidents/entries for class accountability. |
| **SOS Rescue** | One-tap panic button. Every captain with the dashboard or SOS page open gets a live push (via Firestore `onSnapshot`) within ~1 second, plus a sound and browser notification. |
| **Rule Checker** | Reference list of class rules students can check against. |

All six modules are reachable from the dashboard's module grid after signing in.

---

## Architecture

```
Browser (vanilla JS, no bundler)
 ├─ index.html / login.html / setup.html   → marketing + auth pages
 ├─ dashboard.html + pages/*.html          → the six feature modules
 ├─ js/firebase-config.js                  → single initializeApp() — everything else imports from here
 ├─ js/firebase-auth.js                    → Firebase Auth (email/password) + Firestore `users/{uid}` profile
 ├─ js/firebase-sos.js                     → Firestore `sos_alerts` collection, real-time via onSnapshot
 ├─ js/storage.js  (Storage)                → thin localStorage wrapper, prefix "akp_"
 ├─ js/modules/*.js                        → one file per feature, mostly reading/writing via Storage
 ├─ js/api.js       (GeminiAPI)             → fetch() wrapper that calls /api/summarize
 └─ js/app.js, ui.js, utils.js, auth.js    → shared shell: theming, nav, page guards, legacy helpers

Netlify
 ├─ netlify/functions/summarize.js         → holds GEMINI_API_KEY server-side, calls Gemini, returns text
 ├─ netlify/functions/ping.js              → health check for the Functions + /api/* redirect
 └─ netlify.toml                           → publishes repo root, redirects /api/* → /.netlify/functions/*

Firebase project (anti-kuddus-protocol-007)
 ├─ Authentication → Email/Password provider
 │    roll numbers are mapped to a synthetic email: roll<N>@akp-<CLASS_ID>.local
 ├─ Firestore
 │    users/{uid}        → profile: rollNumber, name, role, captainLevel, classId
 │    classes/{classId}  → shared class config (school, class, section, student count)
 │    sos_alerts/{id}    → real-time SOS events, security-ruled by role
 └─ firestore.rules       → default-deny; only users/classes/sos_alerts are opened up
```

### Auth model

- There's no username/email in the UI — students only ever see and type a **roll number**.
- `firebase-auth.js` converts that to a synthetic email (`roll<N>@akp-main.local`) so it can use standard Firebase Email/Password auth under the hood.
- On sign-up, a `users/{uid}` Firestore document is created with the student's profile (`role` is either `student` or `captain`), and the shared `classes/main` document is merged with school/class/section info.
- `guardPage()` (in `firebase-auth.js`) is called on every protected page; it listens to `onAuthStateChanged`, redirects signed-out visitors to `login.html`, and otherwise loads the profile and caches it into `Storage` so the rest of the app (which still reads `Storage.get('session')`) keeps working unmodified.

### Data model (hybrid, by design — see trade-offs below)

- **Firestore** (real, cross-device, shared): `users`, `classes`, `sos_alerts`.
- **`localStorage`** via the `Storage` helper (per-browser only): `rules`, `complaints`, `warnings`, `corruption`, `seatplan`, `summaries`, `config`, `session` (session is also a local cache of the Firestore profile).

### AI Study Assistant flow

1. Browser calls `js/api.js` → `POST /api/summarize`.
2. `netlify.toml` redirects `/api/*` → `/.netlify/functions/:splat`.
3. `netlify/functions/summarize.js` reads `GEMINI_API_KEY` from Netlify's environment, builds a prompt from one of five presets (`bullet`, `brief`, `detailed`, `qa`, `explain`), and calls Google's Gemini API (`gemini-flash-latest`).
4. The response text (or a friendly error) is returned to the browser. The API key never reaches client-side code.

---

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (for `npm install` and the Netlify CLI)
- A [Firebase](https://console.firebase.google.com/) project (free Spark plan is enough)
- A free [Gemini API key](https://aistudio.google.com/apikey) (only needed for the AI Study Assistant)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) — `npm install -g netlify-cli` (needed to run the serverless function locally; a plain static server won't proxy `/api/*`)

### Steps

```bash
# 1. Clone the repo
git clone <your-fork-or-repo-url>
cd Anti-Kuddus-Protocol

# 2. Install dependencies (currently just the Firebase SDK, used for reference/tooling —
#    the browser itself loads Firebase from the gstatic CDN, not from node_modules)
npm install

# 3. Configure Firebase (see "Firebase Setup" below), then paste your config
#    into js/firebase-config.js (it's committed with a placeholder-style project
#    already wired in — replace it with your own project's config).

# 4. Set up your local environment variables for the AI Study Assistant
cp .env.example .env.local
# then edit .env.local and set:
#   GEMINI_API_KEY=your_key_here

# 5. Run everything (static files + serverless functions) with Netlify Dev
netlify dev
```

`netlify dev` will serve the site (Netlify's `[build] publish = "."` config) and the `/api/*` redirect together, so both the static pages and the AI Study Assistant work locally exactly as they will in production.

> **Note:** Opening `index.html` directly from disk (or with a plain `python -m http.server`) will load the site and let you sign in, but `/api/summarize` won't resolve, so the AI Study Assistant will fail with a 404. Use `netlify dev` for full functionality.

### Quick sanity checks

- `http://localhost:8888/.netlify/functions/ping` → confirms functions are running and reports whether `GEMINI_API_KEY` is present.
- `http://localhost:8888/api/ping` → confirms the `/api/*` redirect in `netlify.toml` is working.

---

## Firebase Setup

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode is fine; the app ships its own rules).
4. Deploy `firestore.rules` from this repo (Firestore → Rules tab → paste and publish, or use the Firebase CLI: `firebase deploy --only firestore:rules`). The rules are default-deny except for:
   - `users/{uid}` — any signed-in user can read; a user can only create/update their own document.
   - `classes/{classId}` — any signed-in user can read/write (shared class config).
   - `sos_alerts/{alertId}` — any signed-in user can read and create their own alert; only users with `role == 'captain'` can update or delete.
5. Project settings → General → Your apps → add a Web app, and copy the resulting config object into `js/firebase-config.js` (replacing the placeholder `firebaseConfig`).
6. `CLASS_ID` in `js/firebase-config.js` is a fixed string (`'main'`) — this app is built for **one class/section per deployment**. Every student and captain who signs up shares that single `classes/main` document. To run multiple classes, deploy multiple instances (or extend the schema to support multi-tenancy — see Roadmap).

---

## Environment Variables & AI Assistant

| Variable | Where it's set | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Netlify → Site configuration → Environment variables (production); `.env.local` (local dev, gitignored) | Server-side key used only inside `netlify/functions/summarize.js`. Never exposed to the browser. |

The Firebase config in `js/firebase-config.js`, by contrast, is **not** a secret — Firebase web API keys are meant to be public and are scoped/protected by Firestore Security Rules, not by hiding the key.

---

## Deploying

The app is designed for **Netlify**:

1. Push the repo to GitHub/GitLab/etc. and connect it as a new Netlify site (or run `netlify deploy`).
2. `netlify.toml` already declares `functions = "netlify/functions"` and `publish = "."`, so no extra build configuration is needed.
3. Add `GEMINI_API_KEY` under Site configuration → Environment variables.
4. Deploy. Verify with `https://<your-site>.netlify.app/.netlify/functions/ping` and `https://<your-site>.netlify.app/api/ping`.

Any other static host (Vercel, Firebase Hosting, GitHub Pages, etc.) can serve the HTML/CSS/JS, but you'll need to reimplement the `/api/summarize` proxy in that platform's serverless-function format, since the AI Study Assistant depends on it.

---

## Project Structure

```
Anti-Kuddus-Protocol/
├── index.html              # Marketing / landing page
├── login.html               # Sign in (roll number + password)
├── setup.html                # Sign up / class setup
├── dashboard.html            # Post-login hub — module grid, mood meter, recent activity
├── pages/
│   ├── complaint.html        # Anonymous Complaints
│   ├── seats.html            # Seat Planner
│   ├── study.html            # AI Study Assistant
│   ├── corruption.html       # Corruption Ledger
│   ├── sos.html               # SOS Rescue
│   └── rules.html             # Rule Checker
├── js/
│   ├── firebase-config.js    # initializeApp() — single source of truth
│   ├── firebase-auth.js      # Auth + user profile (Firestore)
│   ├── firebase-sos.js       # Real-time SOS alerts (Firestore)
│   ├── storage.js            # localStorage wrapper (Storage)
│   ├── api.js                 # GeminiAPI — calls /api/summarize
│   ├── app.js / ui.js / utils.js / auth.js   # Shared shell (theme, nav, legacy helpers)
│   └── modules/               # One file per feature module
├── css/                        # global.css, layout.css, components.css, animations.css, dashboard.css,
│                                # landing.css, and one pages/*.css per module
├── netlify/functions/
│   ├── summarize.js            # Gemini proxy (holds the API key)
│   └── ping.js                  # Health check
├── firestore.rules
├── netlify.toml
├── .env.example
└── package.json
```

---

## UI Overview

> No screenshots were included with the uploaded project files, so this section describes each screen's layout in place of images. Drop PNGs into a `docs/screenshots/` folder and reference them here (e.g. `![Dashboard](docs/screenshots/dashboard.png)`) once you have them — happy to help produce them if you can share captures or run the app somewhere I can view it.

- **Landing (`index.html`)** — Hero section with a headline/CTA, a navbar with a shield-style logo, a "Powerful Modules" grid introducing all six features, and a "How It Works" walkthrough section.
- **Sign In (`login.html`)** — Roll number + password form; no email is ever shown to the student.
- **Sign Up (`setup.html`)** — Longer form: roll number, name, role (student/captain, with captain level), password, plus shared class fields (school name, class, section, student count).
- **Dashboard (`dashboard.html`)** — Personalized greeting ("Good morning, `<name>`"), a 6-tile **Modules** grid (Anonymous Complaints, Seat Planner, AI Study Assistant, Corruption Ledger, SOS Rescue, Rule Checker), a **Class Mood Meter** widget, and a **Recent Activity** feed with an empty state for new classes.
- **Module pages (`pages/*.html`)** — Each feature gets its own page and its own stylesheet (`css/pages/*.css`) but shares the global navbar/layout shell and theme toggle (light/dark, persisted via `Storage`).

---

## Architectural Trade-offs

- **Hybrid storage (Firestore + localStorage).** Auth, profiles, and SOS alerts were migrated to Firestore for real cross-device behavior; complaints, the corruption ledger, seat plans, rules, study summaries, and UI config still live in `localStorage` (`js/storage.js`). This keeps the migration incremental and low-risk, but it means those features are **per-browser, not shared across devices or classmates** — a captain won't see a complaint filed on someone else's laptop. `firestore.rules` already default-denies everything except the three migrated collections, so the schema is ready for the rest to move over incrementally.
- **No build step.** Plain ES modules loaded straight from HTML (`<script type="module">`), and the Firebase SDK is imported from the `gstatic.com` CDN rather than bundled from `node_modules`. This keeps local setup to "open `netlify dev`" with zero webpack/vite config, at the cost of no tree-shaking, no TypeScript, and relying on the browser's native ES module support.
- **Single class per deployment.** `CLASS_ID` is a hardcoded `'main'` constant rather than a URL param or multi-tenant field. Simpler security rules and a simpler mental model for one teacher's class, but scaling to many classes means running many deployments (or a schema change) rather than one shared app.
- **Roll number → synthetic email.** Reusing Firebase's Email/Password provider (`roll<N>@akp-<CLASS_ID>.local`) instead of building custom auth or a phone/OTP flow. Fast to ship and gets Firebase's battle-tested auth for free, but it means two students can't share a roll number across different class deployments without colliding synthetic emails, and password reset flows would need custom handling (there's no real inbox behind that address).
- **AI key kept server-side via a Netlify Function proxy**, rather than calling Gemini directly from the browser. Adds one moving part (a serverless function + `/api/*` redirect) but avoids ever shipping the Gemini API key to client-side code.
- **Firestore security relies on a `get()` lookup for role checks.** `isCaptain()` in `firestore.rules` does a `get(/databases/.../users/{uid})` read to check `role`, which is simple to write and matches the app's mental model of "captains can moderate," but costs an extra document read per rule evaluation and means a rules change is needed if roles ever need to be more granular (e.g. per-module permissions).

---

## Known Limitations / Roadmap

- Complaints, the corruption ledger, seat plans, rules, and study summaries are **not yet synced across devices** (see trade-offs above) — migrating them to Firestore behind the same rules pattern used for `sos_alerts` is the natural next step.
- Single-class-per-deployment model; multi-class/multi-tenant support would require a `CLASS_ID`-aware routing/config layer.
- No automated tests are included in this snapshot.
- `js/auth.js` (the pre-Firebase, localStorage-only auth) is still present alongside `js/firebase-auth.js` — confirm which pages still reference the old module before removing it.
