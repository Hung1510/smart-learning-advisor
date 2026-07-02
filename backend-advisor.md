# backend: advisor SSE (/api/advisor)

in the EJS version, `advisor.js` built the AI prompt **in the browser** from
`drawData` (flowchart.json), the student's courses, suggested + chosen courses,
etc. that logic moves to the server now — the React client only sends
`{ question, goals, difficulties }`. everything else the model needs is built
here from data you already have (`req.student`, `flowchart.json`,
`precomputedCache`, `Students/<id>.json`).

## 1. helper: build the prompt context (ported from advisor.js)

```js
function buildAdvisorContext(student) {
  // --- formattedCourses (was `formattedCourses` in advisor.js) ---
  const formattedCourses = (student.courses || [])
    .map((c) => `• ${c.id} - Điểm: ${c.score}, Hạng: ${c.grade}, Học kỳ: ${c.semester}/${c.year || "?"}`)
    .join("\n");

  // --- pick the program key (major + cohort suffix) ---
  const cohortNumber = parseInt(String(student.cohort).slice(-2));
  let program = student.major;
  if (cohortNumber >= 23) program += "23";
  else if (cohortNumber >= 21) program += "21";
  else program += "18";

  // --- flowchart.json -> LearningPath ---
  let drawData = {};
  try {
    drawData = JSON.parse(fs.readFileSync(path.join(__dirname, "flowchart.json"), "utf8"));
  } catch (e) { /* ignore */ }
  const data = drawData[program] || { nodes: [], links: [], ELEC: [] };

  let LearningPath =
    "1. Tất cả các môn học theo ngành (GENED: môn sơ nghành, SPEC: môn chuyên ngành, ELEC: môn tự chọn, CAPSTONE: môn chuyên môn theo từng hướng của ngành): \n";
  LearningPath += data.nodes
    .filter((c) => c.id !== "")
    .map((c) => `- ${c.id}, độ ưu tiên: ${c.year}, thuộc nhóm: ${c.group}`)
    .join("\n");

  LearningPath += "\n2. Tiên quyết giữa các môn học: \n";
  LearningPath += data.links
    .map((l) => `- Muốn học **${l.target}**, sinh viên cần hoàn thành **${l.source}**.`)
    .join("\n");

  LearningPath += "\n3. Nhóm các môn tự chọn: \n";
  const grouped = {};
  (data.ELEC || []).forEach((e) => {
    (grouped[e.id] = grouped[e.id] || []).push(e.name);
  });
  LearningPath += Object.entries(grouped)
    .map(([g, courses]) => `- Nhóm ${g} gồm các môn:\n  ${courses.join(",  ")}`)
    .join("\n");

  // --- suggested + chosen courses ---
  const { suggestedCourses } = precomputedCache[student.id].advisor;
  let fromFlowchart = suggestedCourses;
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(__dirname, `./Students/${student.id}.json`), "utf8"));
    const lastValid = [...saved].reverse().find((it) => Array.isArray(it.courses) && it.courses.length > 0);
    if (lastValid) fromFlowchart = lastValid.courses || [];
  } catch (e) { /* none yet */ }

  const suggested = `Những môn học được đề xuất cho sinh viên đăng ký vào kỳ sau: ${suggestedCourses.join(", ")}.`;
  const choosen = fromFlowchart.length
    ? `Những môn học sinh viên chọn đăng ký vào kỳ sau: ${fromFlowchart.join(", ")}.`
    : "";

  return { subject: formattedCourses, path: LearningPath, suggested, choosen };
}
```

## 2. refactor the POST handler

your existing `/advisor` POST already builds `userPrompt` from
`{ subject, path, question, goals, difficulties, suggested, choosen }` and
streams SSE. change ONLY the top so those context fields come from the helper
instead of `req.body`, then leave the rest (userPrompt template + the SSE loop +
`saveFeedback`) exactly as-is:

```js
app.post("/api/advisor", requireAuth, advisorLimiter, async (req, res) => {
  const { question, goals, difficulties } = req.body;
  const student = req.student;

  if (!student) return res.status(401).json({ error: true, fallback: "Bạn chưa đăng nhập 🚫" });
  if (!question) return res.status(400).json({ error: true, fallback: "Bạn chưa nhập câu hỏi 🤔" });

  // built server-side now (was sent from the browser before)
  const { subject, path: learningPath, suggested, choosen } = buildAdvisorContext(student);

  const userPrompt = `Câu hỏi: ${question}
Mục tiêu GPA: ${goals || "Không có"}
Khó khăn: ${difficulties || "Không có"}
... (KEEP THE REST OF YOUR EXISTING userPrompt TEMPLATE UNCHANGED) ...`;

  // ---- everything below stays exactly as your current handler ----
  res.setHeader("Content-Type", "text/event-stream");
  // ... res.flushHeaders(), const send = ..., the fetch to models.github.ai,
  //     the token loop that does send({ token }), send({ done, fullText }),
  //     saveFeedback(...), and the catch -> send({ error, fallback }).
});
```

> the SSE frame shape (`data: {token}`, `data: {done,fullText}`, `data: {error,fallback}`)
> is unchanged, so the React reader in `Advisor.jsx` consumes it identically.

## 3. context endpoint (form pre-fill from flowchart)

`Advisor.jsx` calls `GET /api/advisor/context` on load to pre-fill the form when
the student arrived from the flowchart (your old `dataFlow` logic):

```js
app.get("/api/advisor/context", requireAuth, (req, res) => {
  let dataFlow = [];
  if (req.session.advisorToken) {
    dataFlow = [
      "Các môn tôi chọn có yêu cầu kiến thức nền nào không?",
      "Tối ưu điểm số GPA nhưng vẫn học được kiến thức hữu ích.",
      "Không biết nên ưu tiên học phần nào trước trong lộ trình.",
    ];
  }
  delete req.session.advisorToken;
  delete req.session.tokenIssuedAt;
  res.json({ dataFlow });
});
```

## note: feedback saving on Vercel

your `saveFeedback` writes to `Students/<id>.json` on disk. that works locally but
**silently fails on Vercel** (serverless filesystem is read-only / ephemeral). it's
been true since before this migration — flagging it because the advisor's "chosen
courses" pre-fill reads from those same files. if you want that to persist in prod,
move it to Upstash Redis (you already have it wired up). happy to do that when we
get to it — not blocking the React port.
