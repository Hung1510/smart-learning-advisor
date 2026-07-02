# WHERE EACH DOWNLOADED FILE GOES

your project root is:  D:\Project_Programming\student_advisor\smart_learning_advisor\
(the files you downloaded are sitting in the PARENT folder — move each into the
project at the path below).

⚠️ READ THESE 3 TRAPS FIRST
──────────────────
1. TWO package.json exist. The one you downloaded from me (~1 KB, React deps:
   react / react-dom / vite) is the CLIENT one → goes to `client/package.json`.
   It must NOT overwrite your existing backend package.json at the project root
   (the one with express, helmet, jsonwebtoken…). Leave that root one alone —
   you only ADD a "vercel-build" script to it by hand.
2. App.jsx was downloaded several times (it grew each screen). Keep ONLY the
   newest — the one whose imports include Login, Dashboard, Grades, Advisor,
   Flowchart, Chat, AND ManageFlow. Delete older copies.
3. flowchart.js / chat.js / flowchartMange.js you downloaded are my EDITED copies
   → they go in `client/public/js/`. They are NOT the same as the originals in
   your existing `public/js/` (leave those originals until the final delete step).
──────────────────

## FRONTEND — the React app  (create the `client/` folder)

| downloaded file        | move to                                   |
|------------------------|-------------------------------------------|
| index.html             | client/index.html                         |
| package.json (React)   | client/package.json                       |
| vite.config.js         | client/vite.config.js                     |
| main.jsx               | client/src/main.jsx                       |
| App.jsx (NEWEST)       | client/src/App.jsx                        |
| api.js                 | client/src/lib/api.js                     |
| formatAdvice.js        | client/src/lib/formatAdvice.js            |
| AuthContext.jsx        | client/src/context/AuthContext.jsx        |
| ProtectedRoute.jsx     | client/src/components/ProtectedRoute.jsx  |
| AppLayout.jsx          | client/src/components/AppLayout.jsx       |
| Login.jsx              | client/src/pages/Login.jsx                |
| Dashboard.jsx          | client/src/pages/Dashboard.jsx            |
| Grades.jsx             | client/src/pages/Grades.jsx               |
| Advisor.jsx            | client/src/pages/Advisor.jsx              |
| Flowchart.jsx          | client/src/pages/Flowchart.jsx            |
| Chat.jsx               | client/src/pages/Chat.jsx                 |
| ManageFlow.jsx         | client/src/pages/ManageFlow.jsx           |
| manageFlow.css         | client/src/pages/manageFlow.css           |
| manageFlowBody.html    | client/src/pages/manageFlowBody.html      |
| flowchart.js (EDITED)  | client/public/js/flowchart.js             |
| chat.js (EDITED)       | client/public/js/chat.js                  |
| flowchartMange.js      | client/public/js/flowchartMange.js        |

MANUAL (not a download): copy your existing `public/css/style.css`
   → `client/public/style.css`   (so the React screens are styled)

## CONFIG — project root

| downloaded file | move to                        | note                        |
|-----------------|--------------------------------|-----------------------------|
| vercel.json     | (root) vercel.json             | replace your current one    |

Also edit by hand (guided by the backend-*.md docs):
- app.js       → add all the /api/* routes + SPA serving + CSP update
- package.json (ROOT/backend, the one already there) → add:
      "vercel-build": "cd client && npm install && npm run build"

## REFERENCE DOCS — keep for yourself, NOT part of the app

put these anywhere (e.g. a `_migration-notes/` folder). they are instructions,
not code that ships:
- backend-api-changes.md              (auth /api pattern + SPA serving)
- backend-endpoints-dashboard-grades.md
- backend-advisor.md
- backend-flowchart.md
- backend-chat.md                     (includes the REQUIRED CSP update)
- backend-manageflow.md
- MIGRATION-MAP.md                    (the full tree + deletion order)
- PLACEMENT.md                        (this file)

## FROM THE EARLIER SEO WORK (if not already in place)

| file          | move to                    |
|---------------|----------------------------|
| landing.ejs   | views/landing.ejs          |
| og-image.png  | public/img/og-image.png    |
| layout.ejs    | views/layout.ejs           |

(build-og.js and og-image.svg are just the tools that generated the card — keep
in a tools folder or discard.)

## RESULTING TREE (the parts that matter)

```
smart_learning_advisor/
├── app.js                     ← edited (add /api routes, SPA serving, CSP)
├── package.json               ← your backend one + "vercel-build" script
├── vercel.json                ← replaced
├── flowchart.json  courses.json  students.json  courseDescription.json   (data, keep)
├── client/
│   ├── index.html  package.json  vite.config.js
│   ├── public/
│   │   ├── style.css           (copied from public/css/style.css)
│   │   └── js/
│   │       ├── flowchart.js  chat.js  flowchartMange.js   (edited copies)
│   └── src/
│       ├── main.jsx  App.jsx
│       ├── lib/        api.js  formatAdvice.js
│       ├── context/    AuthContext.jsx
│       ├── components/ ProtectedRoute.jsx  AppLayout.jsx
│       └── pages/      Login  Dashboard  Grades  Advisor  Flowchart  Chat  ManageFlow (.jsx)
│                       + manageFlow.css  manageFlow.html body
├── views/              landing.ejs (keep) + old *.ejs (delete at the end)
└── public/             img/og-image.png, css/style.css, js/ (old originals — delete at the end)
```

## FIRST RUN (sanity check locally)

```bash
# terminal 1 — backend (after you've added the /api routes)
node app.js                 # :3010

# terminal 2 — frontend
cd client
npm install
npm run dev                 # :5173, proxies /api + /auth to :3010
```
open http://localhost:5173 → login → click through all 6 screens.
when happy: `cd client && npm run build` produces `client-dist/`, which Express
serves in production. then follow MIGRATION-MAP.md's deletion order.
```
