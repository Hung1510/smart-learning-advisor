// ═══════════════════════════════════════════════════════════════════════════
// api-routes.js — ALL the React-migration backend routes in one place.
//
// Wire it up with ONE line in app.js (see the 3 steps in api-routes.README.md):
//     require("./api-routes")(app, {
//       requireAuth, loginLimiter, advisorLimiter,
//       advisorsData, coursesData, precomputedCache,
//       fetchStudentFromEIU, getFeedback, saveFeedback, generatePersonalizedAdvice,
//       loadDrawData, saveDrawData,   // Redis-backed curriculum persistence
//     });
//
// Place that call AFTER those helpers/middleware are defined and AFTER your
// landing/robots/sitemap routes, but BEFORE your old EJS page routes
// (/dashboard, /grades, ...). The SPA fallback here then serves the React app
// for those paths; your old EJS routes below become dead (delete later).
// ═══════════════════════════════════════════════════════════════════════════

const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

// course descriptions for the Grades modal (array of {id,name,english,objective})
let courseDescriptions = [];
try {
  courseDescriptions = require("./courseDescription.json");
} catch (e) {
  try {
    courseDescriptions = require("./public/js/courseDescription.json");
  } catch (e2) {
    console.warn("[api-routes] courseDescription.json not found — /api/course will 404");
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const isProduction = process.env.NODE_ENV === "production";
const stripPw = (s) => {
  if (!s) return s;
  const { password, ...rest } = s;
  return rest;
};

// ── build the advisor prompt context server-side (ported verbatim from advisor.js)
function buildAdvisorContext(student, precomputedCache, feedback, drawData) {
  const cohortNumber = parseInt(String(student.cohort).slice(-2));
  const formattedCourses = (student.courses || [])
    .map(
      (course) =>
        `• ${course.id} - Điểm: ${course.score}, Hạng: ${course.grade}, Học kỳ: ${course.semester}/${course.year || "?"}`
    )
    .join("\n");

  let program = student.major;
  if (cohortNumber >= 23) program += "23";
  else if (cohortNumber >= 21) program += "21";
  else program += "18";

  const data = drawData[program] || { nodes: [], links: [], ELEC: [] };

  let LearningPath =
    "1. Tất cả các môn học theo ngành (GENED: môn sơ nghành, SPEC: môn chuyên ngành, ELEC: môn tự chọn, CAPSTONE: môn chuyên môn theo từng hướng của ngành): \n";
  LearningPath += data.nodes
    .filter((course) => course.id !== "")
    .map((course) => `- ${course.id}, độ ưu tiên: ${course.year}, thuộc nhóm: ${course.group}`)
    .join("\n");
  LearningPath += "\n2. Tiên quyết giữa các môn học: \n";
  LearningPath += data.links
    .map((link) => `- Muốn học **${link.target}**, sinh viên cần hoàn thành **${link.source}**.`)
    .join("\n");
  LearningPath += "\n3. Nhóm các môn tự chọn: \n";
  const grouped = {};
  (data.ELEC || []).forEach((e) => {
    if (!grouped[e.id]) grouped[e.id] = [];
    grouped[e.id].push(e.name);
  });
  LearningPath += Object.entries(grouped)
    .map(([group, courses]) => `- Nhóm ${group} gồm các môn:\n  ${courses.join(",  ")}`)
    .join("\n");

  const { suggestedCourses } = precomputedCache[student.id].advisor;
  let fromFlowchart = suggestedCourses;
  const lastValid = [...feedback]
    .reverse()
    .find((it) => Array.isArray(it.courses) && it.courses.length > 0);
  if (lastValid) fromFlowchart = lastValid.courses;

  const suggested = `Những môn học được đề xuất cho sinh viên đăng ký vào kỳ sau: ${suggestedCourses.join(", ")}.`;
  const choosen = fromFlowchart.length
    ? `Những môn học sinh viên chọn đăng ký vào kỳ sau: ${fromFlowchart.join(", ")}.`
    : "";

  return { subject: formattedCourses, path: LearningPath, suggested, choosen };
}

module.exports = function registerApiRoutes(app, ctx) {
  const {
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
    loadDrawData,
    saveDrawData,
  } = ctx;

  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 3600000,
  };

  // ─────────────────────────── AUTH ───────────────────────────
  // POST /api/login  { studentId, password } -> { role, student?, redirect }
  app.post("/api/login", loginLimiter, async (req, res) => {
    const { studentId, password } = req.body;
    const advisor = advisorsData[studentId];

    if (advisor && advisor.password === password) {
      const token = jwt.sign({ id: studentId, role: "advisor" }, JWT_SECRET, { expiresIn: "1h" });
      res.cookie("token", token, cookieOpts);
      return res.json({ role: "advisor", redirect: "/advisor/dashboard" });
    }

    try {
      const studentData = await fetchStudentFromEIU(studentId, password);
      if (!studentData) return res.status(401).json({ error: "ID sinh viên hoặc mật khẩu không đúng!" });

      const token = jwt.sign({ id: studentId, password, role: "student" }, JWT_SECRET, { expiresIn: "1h" });
      res.cookie("token", token, cookieOpts);
      return res.json({ role: "student", student: stripPw(studentData), redirect: "/dashboard" });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Có lỗi xảy ra, vui lòng thử lại." });
    }
  });

  // GET /api/me -> { student }  (requireAuth re-fetches the student)
  app.get("/api/me", requireAuth, (req, res) => {
    res.json({ student: stripPw(req.student) });
  });

  // POST /api/logout
  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ ok: true });
  });

  // ─────────────────────────── DASHBOARD / GRADES ───────────────────────────
  app.get("/api/dashboard", requireAuth, (req, res) => {
    const { totalCourses, completedCourses, averageScore } = precomputedCache[req.student.id].dashboard;
    res.json({ totalCourses, completedCourses, averageScore });
  });

  app.get("/api/grades", requireAuth, (req, res) => {
    const { coursesByYear, completedCourses } = precomputedCache[req.student.id].grades;
    res.json({ student: stripPw(req.student), coursesByYear, completedCourses });
  });

  app.get("/api/course/:id", requireAuth, (req, res) => {
    const id = req.params.id.trim().toUpperCase();
    const c = courseDescriptions.find((x) => (x.id || "").trim().toUpperCase() === id);
    if (!c) return res.status(404).json({ error: "not found" });
    res.json({ name: c.name || "", english: c.english || "", objective: c.objective || "" });
  });

  // ─────────────────────────── ADVISOR (SSE) ───────────────────────────
  app.get("/api/advisor/context", requireAuth, (req, res) => {
    let dataFlow = [];
    if (req.session && req.session.advisorToken) {
      dataFlow = [
        "Các môn tôi chọn có yêu cầu kiến thức nền nào không?",
        "Tối ưu điểm số GPA nhưng vẫn học được kiến thức hữu ích.",
        "Không biết nên ưu tiên học phần nào trước trong lộ trình.",
      ];
      delete req.session.advisorToken;
      delete req.session.tokenIssuedAt;
    }
    res.json({ dataFlow });
  });

  app.post("/api/advisor", requireAuth, advisorLimiter, async (req, res) => {
    const { question, goals, difficulties } = req.body;
    const student = req.student;

    if (!student) return res.status(401).json({ error: true, fallback: "Bạn chưa đăng nhập 🚫" });
    if (!question) return res.status(400).json({ error: true, fallback: "Bạn chưa nhập câu hỏi 🤔" });

    // built server-side now (browser used to send these)
    const feedbackHistory = await getFeedback(student.id);
    const drawData = await loadDrawData();
    const { subject, path: learningPath, suggested, choosen } = buildAdvisorContext(
      student,
      precomputedCache,
      feedbackHistory,
      drawData
    );

    const userPrompt = `Câu hỏi: ${question}
Mục tiêu GPA: ${goals || "Không có"}
Khó khăn: ${difficulties || "Không có"}

GPA hiện tại + môn đã học: ${subject}
Lộ trình học: ${learningPath}
Môn đã đăng ký kỳ này: ${choosen}
Môn hệ thống đề xuất: ${suggested}

NGUYÊN TẮC PHÂN TÍCH:
- Mọi nhận xét phải dẫn chiếu số liệu cụ thể (điểm, tín chỉ, GPA).
- Không suy diễn, không giả định, không bịa dữ liệu.
- Thiếu dữ liệu → ghi rõ "Không đủ dữ liệu để kết luận".
- Không góp ý môn đã đạt B+ trở lên.
- Không đưa lời khuyên chung chung không gắn với số liệu.
- Tối đa 300 từ. Trả lời tiếng Việt.

FORMAT:
# 📊 Đánh giá tổng quan
Nhận xét ngắn dựa trên GPA hiện tại, tín chỉ tích lũy, xu hướng điểm.

# ⚠️ Môn cần cải thiện
Chỉ liệt kê môn dưới B+. Giải thích ảnh hưởng đến GPA bằng con số.

| Môn | Điểm hiện tại | Ảnh hưởng GPA | Mức độ ưu tiên |
|-----|--------------|---------------|----------------|
| ... | ...          | ...           | Cao/TB/Thấp    |

# 🎯 Khả năng đạt GPA mục tiêu
Tính toán dựa trên tín chỉ còn lại và điểm cần đạt.

| GPA mục tiêu | GPA hiện tại | Tín chỉ còn lại | Điểm trung bình cần đạt | Khả thi |
|--------------|-------------|-----------------|------------------------|---------|
| ...          | ...         | ...             | ...                    | Có/Không|

# 📚 Học phần đề xuất
Chọn từ danh sách môn được đề xuất. Lý do phải gắn với điểm yếu hoặc lộ trình.

| Môn | Lý do cụ thể |
|-----|-------------|
| ... | ...         |

# ✅ Hành động ưu tiên
Tối đa 3 hành động. Mỗi hành động gắn với môn học hoặc chỉ số cụ thể.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === "function") res.flush();
    };

    try {
      const apiResponse = await fetch("https://models.github.ai/inference/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 1500,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        console.error("Model error:", errText);
        send({ done: true, fullText: generatePersonalizedAdvice(student, question, goals, difficulties) });
        return res.end();
      }

      const decoder = new TextDecoder();
      let fullText = "";
      let lineBuffer = "";

      for await (const chunk of apiResponse.body) {
        lineBuffer += decoder.decode(chunk, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const token = parsed?.choices?.[0]?.delta?.content;
            if (typeof token === "string" && token.length > 0) {
              fullText += token;
              send({ token });
            }
          } catch (e) {}
        }
      }

      send({ done: true, fullText });
      res.end();
      await saveFeedback(student.id, {
        question,
        goals,
        difficulties,
        advice: fullText,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error /api/advisor:", error);
      send({ error: true, fallback: generatePersonalizedAdvice(student, question, goals, difficulties) });
      res.end();
    }
  });

  // ─────────────────────────── FLOWCHART ───────────────────────────
  app.get("/api/flowchart", requireAuth, async (req, res) => {
    const student = req.student;
    let { suggestedCourses } = precomputedCache[student.id].advisor;
    const feedback = await getFeedback(student.id);
    const lastValid = [...feedback].reverse().find((it) => Array.isArray(it.courses) && it.courses.length > 0);
    if (lastValid) suggestedCourses = lastValid.courses;

    const freshDrawData = await loadDrawData();

    res.json({ student: stripPw(student), suggestedCourses, drawData: freshDrawData, coursesData });
  });

  app.post("/api/flowchart", requireAuth, async (req, res) => {
    await saveFeedback(req.student.id, { courses: req.body.courses, timestamp: new Date().toISOString() });
    res.json({ success: true });
  });

  app.post("/api/advisor-token", requireAuth, (req, res) => {
    if (req.session) {
      req.session.advisorToken = true;
      req.session.tokenIssuedAt = Date.now();
    }
    res.json({ ok: true });
  });

  // ─────────────────────────── CHAT ───────────────────────────
  app.get("/api/chat", requireAuth, (req, res) => {
    const users = Object.entries(advisorsData).map(([id, a]) => ({ id, name: a.name }));
    res.json({ student: stripPw(req.student), users });
  });

  // ─────────────────────────── MANAGE FLOW ───────────────────────────
  app.get("/api/manageFlow", requireAuth, async (req, res) => {
    const freshDrawData = await loadDrawData();
    res.json({ drawData: freshDrawData });
  });

  app.post("/api/flowchartManager/save", requireAuth, async (req, res) => {
    try {
      await saveDrawData(req.body);
      res.json({ ok: true });
    } catch (err) {
      console.error("Save error:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─────────────────────────── SPA SERVING ───────────────────────────
  // serve the built React app. index:false so it does NOT hijack "/",
  // which stays your server-rendered landing page (SEO).
  app.use(express.static(path.join(__dirname, "client-dist"), { index: false }));

  // these paths return the React shell; React Router takes over client-side
  app.get(
    ["/login", "/dashboard", "/grades", "/advisor", "/flowchart", "/chat", "/manageFlow"],
    (req, res) => res.sendFile(path.join(__dirname, "client-dist", "index.html"))
  );
};