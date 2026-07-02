# Wiring api-routes.js into app.js — 3 steps

`api-routes.js` replaces all six `backend-*.md` docs. Put the file at your project
root (next to `app.js`), then make these 3 edits to `app.js`.

## STEP 1 — register the routes (one line)

Add this ONCE, placed **after** these are all defined:
`requireAuth`, `loginLimiter`, `advisorLimiter`, `fetchStudentFromEIU`,
`getFeedback`, `saveFeedback`, `generatePersonalizedAdvice`, `advisorsData`,
`coursesData`, `precomputedCache` — and **after** your `/`, `/robots.txt`,
`/sitemap.xml` routes, but **before** your old EJS page routes
(`/dashboard`, `/grades`, `/advisor` GET, `/flowchart`, `/chat`, `/manageFlow`):

```js
require("./api-routes")(app, {
  requireAuth,
  loginLimiter,
  advisorLimiter,
  advisorsData,
  coursesData,
  precomputedCache,
  fetchStudentFromEIU,
  getFeedback,
  saveFeedback,
  generatePersonalizedAdvice,
  setDrawData: (d) => { drawData = d; }, // keeps your in-memory drawData in sync
});
```

Why "before the old routes": the SPA fallback inside the module serves the React
app for `/dashboard`, `/grades`, etc. Registering it before your old EJS handlers
means React wins immediately, and your old page routes below become dead code you
delete later (per MIGRATION-MAP.md). Everything the module needs is already
defined earlier in your file, so this placement is safe.

## STEP 2 — make requireAuth return 401 JSON for /api (not a redirect)

Your `requireAuth` currently does `res.redirect("/login")` on failure. A redirect
confuses `fetch()`. Make the two redirect lines api-aware:

```js
const requireAuth = async (req, res, next) => {
  const token = req.cookies.token;
  const unauth = () =>
    req.path.startsWith("/api")
      ? res.status(401).json({ error: "unauthorized" })   // API -> JSON
      : res.redirect("/login");                            // page -> redirect

  if (!token) return unauth();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    let student = await getCached(decoded.id);
    if (!student) {
      delete precomputedCache[decoded.id];
      student = await fetchStudentFromEIU(decoded.id, decoded.password || null);
    }
    if (!student) return unauth();
    precomputeStudentData(student);
    req.student = student;
    next();
  } catch (err) {
    return unauth();
  }
};
```

(Only the failure branches changed — the success path is identical to yours.)

## STEP 3 — widen the helmet CSP for Firebase (chat)

In your `helmet({ contentSecurityPolicy: { directives: {...} } })`, add the
Firebase/gstatic hosts, or chat silently fails:

```js
scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
            "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com",
            "https://d3js.org", "https://www.gstatic.com"],
connectSrc: ["'self'", "https://www.gstatic.com",
            "https://*.firebaseio.com", "wss://*.firebaseio.com",
            "https://*.googleapis.com"],
```

(leave the other directives as they are.)

---

## That's it

- `/api/login`, `/api/me`, `/api/logout`, `/api/dashboard`, `/api/grades`,
  `/api/course/:id`, `/api/advisor` (SSE) + `/api/advisor/context`,
  `/api/flowchart` (GET+POST), `/api/advisor-token`, `/api/chat`,
  `/api/manageFlow` (GET) + `/api/flowchartManager/save`, and the SPA fallback —
  all handled by the module.
- Login mirrors your real flow: advisor via `advisorsData`, students via
  `fetchStudentFromEIU`, student JWT carries the password so `requireAuth`
  re-fetches — identical to your current `/login`.
- The advisor SSE prompt + GitHub-models call + streaming are reproduced exactly;
  context (LearningPath etc.) is built server-side.

### notes / caveats (unchanged from before)
- `courseDescription.json` is auto-loaded from `./` or `./public/js/`. If it lives
  elsewhere, adjust the `require` at the top of `api-routes.js`.
- `saveFeedback` and the manageFlow `flowchart.json` write are **in-memory /
  ephemeral on Vercel** — won't persist across cold starts. Move to Redis when you
  want persistence.
- Advisor login through the React page returns `{ role:'advisor', redirect }`
  instead of a student object. The student app doesn't need it; if you want
  advisors to log in via React too, have `AuthContext.login` honor `data.redirect`.
