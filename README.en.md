<!-- Language: **English** · [Tiếng Việt](README.md) -->

# Smart Learning Advisor

An AI-powered academic advising app for EIU students: view grades, track GPA,
explore a course-prerequisite roadmap, and get personalized learning advice.

Built as a **React (Vite) single-page app** on top of an **Express JSON API**,
with a server-rendered landing page for SEO. Deployed on **Vercel**.

## Features

- **Login** — student ID + password (via the EIU service, or `students.json` in test mode), or Google OAuth
- **Dashboard** — overview of courses, completed credits, and GPA
- **Grades** — full transcript by year/semester, GPA calc, printable, with a per-course detail modal
- **AI Advisor** — streaming, personalized advice built from your transcript + roadmap (GitHub-hosted model, SSE)
- **Course roadmap** — interactive D3 prerequisite flowchart with suggested courses
- **Chat** — real-time messaging with advisors (Firebase Realtime DB)
- **Curriculum editor** — a full-screen D3 editor to manage the flowcharts

## Tech stack

- **Frontend**: React 18 + Vite, React Router, Bootstrap 5, Font Awesome
- **Backend**: Node.js + Express (JSON API in `api-routes.js`), JWT cookie auth
- **Landing page**: server-rendered EJS (`views/landing.ejs`) — kept server-side for SEO/crawlability
- **Data / infra**: Upstash Redis (cache), Firebase Realtime DB (chat), GitHub-hosted models (AI), D3 (flowchart)
- **Security**: Helmet (CSP, HSTS), per-IP rate limiting on login + advisor
- **Hosting**: Vercel (Express as a serverless function + the built React app)

## Project structure

```
smart_learning_advisor/
├── app.js                  # Express app: landing, robots/sitemap, auth, then requires api-routes
├── api-routes.js           # ALL /api/* routes + SPA serving (the React backend)
├── vercel.json             # build + security headers
├── package.json            # backend deps + "vercel-build" (builds the client)
├── students.json  courses.json  flowchart.json  courseDescription.json   # data
├── client/                 # the React app
│   ├── index.html  vite.config.js  package.json
│   ├── public/             # style.css + edited js (flowchart/chat/flowchartMange)
│   └── src/
│       ├── main.jsx  App.jsx
│       ├── lib/            # api.js, formatAdvice.js
│       ├── context/        # AuthContext.jsx
│       ├── components/     # AppLayout.jsx, ProtectedRoute.jsx
│       └── pages/          # Login, Dashboard, Grades, Advisor, Flowchart, Chat, ManageFlow
├── views/landing.ejs       # public SEO landing page (server-rendered)
└── public/                 # Express static: og-image, css, js, Search Console file
```

## Running locally

You need Node 22+. There are two modes.

### Development (fast, hot-reload)

```bash
# terminal 1 — backend API + landing
node app.js                     # http://localhost:3010

# terminal 2 — React dev server
cd client
npm install
npm run dev                     # http://localhost:5173  (proxies /api and /auth to :3010)
```
Open **http://localhost:5173**. This serves the React app directly (no landing page — that only lives on the Express side).

### Production preview (identical to Vercel)

```bash
cd client && npm run build      # outputs ../client-dist
cd ..
node app.js
```
Open **http://localhost:3010** — Express serves the landing page at `/` and the built React app for everything else, exactly like production.

## Environment variables

Create a `.env` at the project root (and set the same keys in Vercel → Settings → Environment Variables):

```
SITE_URL=https://your-domain.vercel.app
JWT_SECRET=<random>
SESSION_SECRET=<random>
GITHUB_TOKEN=<token for the AI model>
GOOGLE_CLIENT_ID=<oauth client id>
GOOGLE_CLIENT_SECRET=<oauth client secret>
GOOGLE_CALLBACK_URL=https://your-domain.vercel.app/auth/google/callback
UPSTASH_REDIS_REST_URL=<...>
UPSTASH_REDIS_REST_TOKEN=<...>
PYTHON_API_URL=<EIU data service>
```
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
Never commit `.env` — keep it in `.gitignore`.

## Deploying

Push to the `main` branch. Vercel runs the `vercel-build` script
(`cd client && npm install && npm run build`), then serves `app.js` as a function
with the built React app. The public landing page stays crawlable for SEO; the
app screens are `noindex`.

## Demo login

Test-mode accounts live in `students.json` — e.g. ID `1131fa2999d3`, password `9006`.

## Notes

- AI advice and chosen-course feedback are stored in memory, which is **ephemeral on Vercel** (won't persist across cold starts). Move to Redis for durable storage.
- The curriculum editor's "Save" writes `flowchart.json` on disk — also ephemeral on Vercel.
