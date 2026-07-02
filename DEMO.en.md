<!-- Language: **English** · [Tiếng Việt](DEMO.md) -->

# DEMO — Smart Learning Advisor

A quick walkthrough for running and demoing the app.

## Running the app

The frontend (React) and backend (Express API + landing) run separately in dev.

```bash
# terminal 1 — backend
node app.js                     # http://localhost:3010

# terminal 2 — frontend
cd client
npm install
npm run dev                     # http://localhost:5173
```

Open **http://localhost:5173** for development.

To demo the full production experience (landing page + app together, like the live
site): `cd client && npm run build`, then `node app.js`, and open
**http://localhost:3010**.

> The live site is on Vercel — opening `/` there shows the SEO landing page, and
> "Đăng nhập" takes you into the React app.

## Demo login

Test-mode accounts are in `students.json`.

- **ID**: `1131fa2999d3`
- **Password**: `9006`
- **Major**: SWE

Other student IDs from `students.json` also work (test mode). You can also use
**Google (EIU)** login if OAuth is configured.

## What to demo

1. **Login** → lands on the Dashboard.
2. **Dashboard** — total courses, completed credits, average GPA, student info, quick actions.
3. **Grades** — transcript by year/semester; click a course row for its detail modal; "Print" for a printable view.
4. **AI Advisor** — try these:
   - Question: *"How can I improve my GPA?"* / *"Which courses should I prioritize?"*
   - Goal: *"Reach GPA > 3.5 next term"*
   - Difficulty: *"Low grades in math and programming"*

   The advice streams in live, then renders as a formatted report with tables.
5. **Course roadmap** — pan/scroll the D3 flowchart, toggle "Suggested courses", double-click a node for details, and use "Ask AI" to jump to the advisor pre-filled.
6. **Chat** — pick an advisor and send a message (real-time via Firebase).
7. **Curriculum editor** ("Sửa lộ trình") — full-screen node/edge editor for the flowcharts.

## Troubleshooting

- **Login 404 / "unauthorized"** → make sure `node app.js` is running and `api-routes.js` sits next to `app.js`.
- **A screen loads but is unstyled** → `client/public/style.css` is missing or empty (copy it from `public/css/style.css`).
- **Chat won't connect** → check the Helmet CSP allows Firebase (`gstatic.com`, `*.firebaseio.com`).
- **"Cannot find module"** → run `npm install` (once at the root for the backend, once in `client/` for the frontend).
- **Port already in use** → change `PORT` in your `.env`, or stop whatever's using `3010` / `5173`.

## Technical notes

- Responsive (Bootstrap 5), JWT-cookie sessions (1-hour expiry), AI analysis grounded in real transcript data.
- Feedback/advice storage is in-memory — ephemeral on Vercel (see README).
