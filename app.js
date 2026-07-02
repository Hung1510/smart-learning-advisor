require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const { getSuggestedCourses } = require("./0_learningFlow");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Redis } = require("@upstash/redis");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3010;
const SITE_URL = process.env.SITE_URL || "https://YOUR-DOMAIN.vercel.app";
const isProduction = process.env.NODE_ENV === "production";
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache TTL: 1 ngay (ms)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ===================== MIDDLEWARE =====================
// Security headers. CSP is whitelisted to the CDNs used in views/layout.ejs
// (jsdelivr, cdnjs) plus d3js.org (flowchart pages). 'unsafe-inline'/'unsafe-eval'
// are required because the app uses inline <script>/<style> and three.js.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://d3js.org",
          "https://www.gstatic.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://www.gstatic.com",
          "https://*.firebaseio.com",
          "wss://*.firebaseio.com",
          "https://*.googleapis.com",
        ],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "smart-learning-advisor-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 3600000,
    },
  }),
);

// ===================== PASSPORT GOOGLE =====================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3010/auth/google/callback",
    },
    (accessToken, refreshToken, params, profile, done) => {
      const email = profile.emails?.[0]?.value || "";
      return done(null, { email, name: profile.displayName, accessToken });
    },
  ),
);
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
app.use(passport.initialize());
app.use(passport.session());

// ===================== CACHE STORE =====================
// const studentCache = {};

// const studentsData = new Proxy(
//   {},
//   {
//     get(_, key) {
//       const entry = studentCache[key];
//       return entry ? entry.data : undefined;
//     },
//     set(_, key, value) {
//       setCache(key, value);
//       return true;
//     },
//     ownKeys() {
//       return Object.keys(studentCache);
//     },
//     getOwnPropertyDescriptor(_, key) {
//       if (studentCache[key]) return { enumerable: true, configurable: true };
//       return undefined;
//     },
//   },
// );

// function getCached(username) {
//   const entry = studentCache[username];
//   if (!entry) return null;
//   if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
//     delete studentCache[username];
//     return null;
//   }
//   return entry.data;
// }

// function setCache(username, data) {
//   studentCache[username] = { data, cachedAt: Date.now() };
//   console.log(`[cache] Luu cache cho '${username}' (het han sau 24h)`);
// }

// function clearCache(username) {
//   delete studentCache[username];
// }
async function getCached(username) {
  const data = await redis.get(`student:${username}`);
  return data || null;
}

async function setCache(username, data) {
  await redis.set(`student:${username}`, data, {
    ex: 86400,
  });

  console.log(`[redis] cache saved '${username}'`);
}

async function clearCache(username) {
  await redis.del(`student:${username}`);
}

// ===================== RATE LIMIT (Upstash) =====================
function rateLimit({ windowSec, max, prefix }) {
  return async (req, res, next) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        "unknown";
      const key = `rl:${prefix}:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      if (count > max) {
        res.setHeader("Retry-After", String(windowSec));
        return res
          .status(429)
          .send("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
      }
    } catch (e) {
      // fail-open: a redis hiccup shouldn't lock out real users
    }
    next();
  };
}

const loginLimiter = rateLimit({ windowSec: 600, max: 20, prefix: "login" }); // 20 tries / 10 min / IP
const advisorLimiter = rateLimit({ windowSec: 60, max: 15, prefix: "advisor" }); // 15 calls / min / IP
// ===================== HELPERS =====================
const gradeToGPA = {
  F: 0.0,
  "D-": 0.7,
  D: 1.0,
  "D+": 1.3,
  "C-": 1.7,
  C: 2.0,
  "C+": 2.3,
  "B-": 2.7,
  B: 3.0,
  "B+": 3.3,
  "A-": 3.7,
  A: 4.0,
  P: "P",
};

// ===================== isCompleted — ĐỊNH NGHĨA TRƯỚC KHI DÙNG =====================
function isCompleted(c) {
  // Real EIU API data
  if (c.ket_qua !== undefined) {
    return c.ket_qua === 1 && c.hien_thi_ket_qua === true;
  }
  // Test data (students.json): môn hoàn thành = có grade và không phải F
  const g = (c.grade || "").toUpperCase();
  return g !== "" && g !== "F";
}

// ===================== PRECOMPUTE CACHE =====================
const precomputedCache = {};

function precomputeStudentData(student) {
  const id = student.id;
  if (precomputedCache[id]) return;

  const courses = student.courses || [];

  // Dashboard data
  const totalCourses = courses.length;
  const completedCourses = courses.filter(isCompleted).length;

  let averageScore;

  // Ưu tiên GPA từ API thực tế
  if (student.gpa && !isNaN(parseFloat(student.gpa))) {
    averageScore = parseFloat(student.gpa).toFixed(2);
  } else {
    // Fallback: tự tính cho data test (students.json)
    const numericCourses = courses.filter(
      (c) =>
        c.score !== null &&
        c.score !== undefined &&
        c.score !== "P" &&
        !isNaN(parseFloat(c.score)),
    );
    const coursesWithCredit = numericCourses.filter(
      (c) => parseInt(c.so_tin_chi) > 0,
    );
    if (coursesWithCredit.length > 0) {
      const totalWeighted = coursesWithCredit.reduce(
        (sum, c) => sum + parseFloat(c.score) * parseInt(c.so_tin_chi),
        0,
      );
      const totalTinChi = coursesWithCredit.reduce(
        (sum, c) => sum + parseInt(c.so_tin_chi),
        0,
      );
      averageScore = (totalWeighted / totalTinChi).toFixed(2);
    } else {
      averageScore =
        numericCourses.length > 0
          ? (
              numericCourses.reduce((sum, c) => sum + parseFloat(c.score), 0) /
              numericCourses.length
            ).toFixed(2)
          : "0.00";
    }
  }

  // Grades data
  const coursesByYear = {};
  courses.forEach((course) => {
    const year = course.year || "Unknown";
    const semester = course.semester || "Unknown";
    if (!coursesByYear[year]) coursesByYear[year] = {};
    if (!coursesByYear[year][semester]) coursesByYear[year][semester] = [];

    const courseInfo = coursesData.find((c) => c.id === course.id);
    coursesByYear[year][semester].push({
      ...course,
      ten_mon: courseInfo?.name || courseInfo?.ten_mon || course.ten_mon || "-",
    });
  });

  // Advisor data
  const completedCourseIds = courses
    .filter((c) => (c.grade || "").toUpperCase() !== "F")
    .map((c) => c.id);
  const suggestedCourses =
    getSuggestedCourses(
      completedCourseIds,
      6,
      student.major,
      student.cohort,
      null,
    ) || [];

  precomputedCache[id] = {
    dashboard: { totalCourses, completedCourses, averageScore },
    grades: { coursesByYear, completedCourses },
    advisor: { suggestedCourses, completedCourseIds },
    computedAt: Date.now(),
  };

  console.log(`[precompute] Done for '${id}' — completed: ${completedCourses}/${totalCourses}`);
}

function renderWithLayout(res, view, data = {}) {
  const layoutData = {
    body: "",
    title: "Smart Learning Advisor",
    description: "Hệ thống tư vấn học tập thông minh cho sinh viên EIU",
    currentPage: "",
    student: data.student || res.locals.student,
    advisor: data.advisor || res.locals.advisor,
    hideNavigation: false,
    showFooter: false,
    bodyClass: "",
    mainClass: "container mt-4",
    pageStyles: "",
    pageScripts: "",
    breadcrumb: null,
    pageHeader: null,
    siteUrl: SITE_URL,
    ...data,
  };
  res.render(view, data, (err, html) => {
    if (err) {
      console.error("Render error:", err);
      return res.status(500).send("Error");
    }
    layoutData.body = html;
    res.render(layoutData.advisor ? "advisors/layout" : "layout", layoutData);
  });
}

function letterGrade(diem) {
  if (!diem && diem !== 0) return null;
  const d = parseFloat(diem);
  if (isNaN(d)) return null;
  if (d <= 4.0 && String(diem).includes(".")) {
    if (d >= 4.0) return "A";
    if (d >= 3.7) return "A-";
    if (d >= 3.3) return "B+";
    if (d >= 3.0) return "B";
    if (d >= 2.7) return "B-";
    if (d >= 2.3) return "C+";
    if (d >= 2.0) return "C";
    if (d >= 1.7) return "C-";
    if (d >= 1.3) return "D+";
    if (d >= 1.0) return "D";
    if (d >= 0.7) return "D-";
    return "F";
  }
  if (d >= 90) return "A";
  if (d >= 85) return "A-";
  if (d >= 80) return "B+";
  if (d >= 75) return "B";
  if (d >= 70) return "B-";
  if (d >= 65) return "C+";
  if (d >= 60) return "C";
  if (d >= 55) return "C-";
  if (d >= 50) return "D+";
  if (d >= 45) return "D";
  if (d >= 40) return "D-";
  return "F";
}

function detectMajor(tenNganh) {
  const t = (tenNganh || "").toLowerCase();
  if (t.includes("phần mềm") || t.includes("software")) return "swe";
  if (t.includes("mạng") || t.includes("network")) return "net";
  if (t.includes("trí tuệ") || t.includes("ai")) return "ai";
  return "swe";
}

function mapEIUDataToStudent(id, password, raw) {
  const info = raw?.thong_tin_sinh_vien?.data || {};
  const diemData = raw?.diem?.data || {};
  const dsDiem = diemData.ds_diem_hocky || [];

  const courses = [];
  dsDiem.forEach((hk) => {
    const hocKy = hk.hoc_ky || "";
    const namHoc = hocKy.slice(0, 4);
    const semester = hocKy.slice(4);
    (hk.ds_diem_mon_hoc || []).forEach((mon) => {
      const gradeChar = (mon.diem_tk_chu || "").trim().toUpperCase();
      const grade =
        gradeChar && gradeToGPA[gradeChar] !== undefined
          ? gradeChar
          : letterGrade(mon.diem_tk_so || null);
      courses.push({
        id: (mon.ma_mon || "").trim(),
        ten_mon: mon.ten_mon || "",
        gpa: diemData.dtb_tich_luy_he_4 || "",
        so_tin_chi: parseInt(mon.so_tin_chi) || 0,
        semester,
        year: namHoc,
        grade,
        ket_qua: mon.ket_qua,
        hien_thi_ket_qua: mon.hien_thi_ket_qua,
        score:
          gradeToGPA[grade] != null
            ? typeof gradeToGPA[grade] === "number"
              ? gradeToGPA[grade].toFixed(1)
              : gradeToGPA[grade]
            : null,
      });
    });
  });

  return {
    id: info.ma_sv,
    password,
    name: info.ten_day_du || info.ho_ten || id,
    email: info.email || "",
    major: detectMajor(info.ten_nganh || ""),
    cohort: (info.nien_khoa || "").split("-")[0] || "",
    gpa: diemData.dtb_tich_luy_he_4 || "",
    tinChiTichLuy: diemData.so_tin_chi_dat_tich_luy || "",
    courses,
  };
}

// ===================== FEEDBACK STORE =====================
// ===================== PERSISTENT STORAGE (Upstash Redis) =====================
// Feedback (advisor answers + chosen courses) now persists in Redis, so it
// survives Vercel cold starts. Same merge behaviour as before: a "courses-only"
// entry is replaced in place; any other entry is appended.
async function getFeedback(studentId) {
  const data = await redis.get(`feedback:${studentId}`);
  return Array.isArray(data) ? data : [];
}

async function saveFeedback(studentId, feedback) {
  const data = await getFeedback(studentId);
  let next;
  if ("courses" in feedback && Array.isArray(feedback.courses)) {
    let updated = false;
    next = data.map((entry) => {
      const onlyCourses = Object.keys(entry).every(
        (k) => k === "courses" || k === "timestamp",
      );
      if (onlyCourses) {
        updated = true;
        return feedback;
      }
      return entry;
    });
    if (!updated) next.push(feedback);
  } else {
    next = [...data, feedback];
  }
  await redis.set(`feedback:${studentId}`, next);
}

// Curriculum flowchart: Redis-first, with flowchart.json as the seed/fallback,
// so edits made in the manage-flow editor persist in production.
async function loadDrawData() {
  try {
    const fromRedis = await redis.get("flowchart:data");
    if (fromRedis && typeof fromRedis === "object" && Object.keys(fromRedis).length) {
      return fromRedis;
    }
  } catch (e) {}
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "flowchart.json"), "utf8"));
  } catch (e) {
    return {};
  }
}

async function saveDrawData(newData) {
  await redis.set("flowchart:data", newData);
  drawData = newData; // keep the in-memory copy in sync
  try {
    fs.writeFileSync(path.join(__dirname, "flowchart.json"), JSON.stringify(newData, null, 2), "utf8");
  } catch (e) {}
}

// ===================== FETCH STUDENT =====================

// [DISABLED] Fetch từ EIU Python API bằng username/password
// async function fetchStudentFromEIU(username, password) { ... }

// [TEST MODE] Fetch từ file students.json local
async function fetchStudentFromEIU(username, password) {
  const cached = await getCached(username);
  if (cached) {
    console.log(`[cache] Hit cho '${username}'`);
    return cached;
  }

  let studentsRaw = {};
  try {
    const data = fs.readFileSync(path.join(__dirname, "students.json"), "utf8");
    studentsRaw = JSON.parse(data);
  } catch (e) {
    console.error("[TEST] Không đọc được students.json:", e.message);
    return null;
  }

  const student = studentsRaw[username];
  if (!student) return null;

  // Chỉ check password khi có truyền vào (null = Google login, skip check)
  if (password !== null && student.password !== password) return null;

  // Luôn tính lại score từ grade
  (student.courses || []).forEach((course) => {
    course.so_tin_chi = parseInt(course.so_tin_chi) || 0;
    const grade = (course.grade || "").trim().toUpperCase();
    course.grade = grade;
    const gpa = gradeToGPA[grade];
    course.score =
      gpa !== undefined
        ? typeof gpa === "number"
          ? gpa.toFixed(1)
          : gpa
        : null;
  });

  await setCache(username, student);
  delete precomputedCache[username]; // tính lại fresh
  return student;
}

async function fetchStudentFromEIUGoogle(email) {
  const studentId = email.split("@")[0];

  const cached = await getCached(studentId);
  if (cached) {
    console.log(`[cache] Google hit cho '${studentId}'`);
    return cached;
  }

  const res = await fetch(`${PYTHON_API_URL}/fetch-student-google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;

  const student = mapEIUDataToStudent(studentId, null, json.data);
  await setCache(studentId, student);
  return student;
}

async function fetchStudentByIdToken(idToken, email) {
  try {
    const studentId = email.split("@")[0];

    const cached = await getCached(studentId);
    if (cached) return cached;

    const apiRes = await fetch(`${PYTHON_API_URL}/fetch-student-google-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken, email }),
    });
    if (!apiRes.ok) return null;
    const json = await apiRes.json();
    if (!json.success) return null;

    const student = mapEIUDataToStudent(studentId, null, json.data);
    await setCache(studentId, student);
    return student;
  } catch (err) {
    console.error("fetchStudentByIdToken error:", err);
    return null;
  }
}

// ===================== FALLBACK ADVICE =====================
function generatePersonalizedAdvice(student, question, goals, difficulties) {
  const courses = student.courses || [];
  const numeric = courses.filter((c) => c.score && !isNaN(parseFloat(c.score)));
  const avgGPA =
    numeric.length > 0
      ? numeric.reduce((s, c) => s + parseFloat(c.score), 0) / numeric.length
      : 0;
  const weak = courses
    .filter((c) => c.score && parseFloat(c.score) < 2.5)
    .map((c) => c.id);
  const strong = courses
    .filter((c) => c.score && parseFloat(c.score) >= 3.5)
    .map((c) => c.id);

  let advice = `Xin chào ${student.name}!\n\n`;
  if (avgGPA >= 3.5) advice += "🎉 Kết quả học tập của bạn rất xuất sắc! ";
  else if (avgGPA >= 3.0) advice += "👍 Kết quả học tập của bạn khá tốt. ";
  else if (avgGPA >= 2.5)
    advice += "📚 Kết quả học tập ở mức trung bình, cần cải thiện. ";
  else advice += "⚠️ Kết quả học tập cần được cải thiện đáng kể. ";
  advice += `GPA hiện tại: ${avgGPA.toFixed(2)}.\n\n`;
  if (difficulties) advice += `🔍 **Khó khăn:** ${difficulties}\n\n`;
  if (goals) advice += `🎯 **Mục tiêu:** ${goals}\n\n`;
  if (weak.length) {
    advice += "⚡ **Môn cần cải thiện:**\n";
    weak.slice(0, 3).forEach((s) => (advice += `- ${s}\n`));
    advice += "\n";
  }
  if (strong.length) {
    advice += "⭐ **Môn học bạn giỏi:**\n";
    strong.slice(0, 3).forEach((s) => (advice += `- ${s}\n`));
    advice += "\n";
  }
  advice +=
    "📋 **Khuyến nghị:**\n1. Lập kế hoạch học tập theo tuần\n2. Tham gia hoạt động ngoại khóa\n3. Tận dụng tài nguyên học tập của trường\n4. Duy trì sức khỏe tinh thần\n\n🤝 Chúc bạn học tập tốt!";
  return advice;
}

// ===================== STATIC DATA =====================
const advisorsData = {
  advisor1: { name: "Cố vấn A", password: "123" },
  advisor2: { name: "Cố vấn B", password: "123" },
};
let drawData = {},
  coursesData = {};
try {
  drawData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "flowchart.json"), "utf8"),
  );
} catch (e) {}
try {
  coursesData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "public", "courseDescription.json"),
      "utf8",
    ),
  );
  console.log("[coursesData] Loaded:", coursesData.length, "items");
} catch (e) {
  console.error("[coursesData] Load failed:", e.message);
}

// ===================== AUTH MIDDLEWARE =====================
const requireAuth = async (req, res, next) => {
  const token = req.cookies.token;
  const unauth = () =>
    req.path.startsWith("/api")
      ? res.status(401).json({ error: "unauthorized" })
      : res.redirect("/login");

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

const requireAdvisorAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    if (decoded.role !== "advisor") return res.redirect("/login");
    req.user = decoded;
    req.advisor = advisorsData[decoded.id];
    next();
  } catch (err) {
    return res.redirect("/login");
  }
};

// ===================== ROUTES =====================
const LOGIN_3D_STYLES = '<link href="/css/login3d.css" rel="stylesheet">';
const LOGIN_3D_SCRIPTS =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' +
  '<script src="/js/login3d.js"></script>';

app.get("/", (req, res) => {
  // logged-in users skip the landing and go straight in
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
      if (decoded.role === "advisor") return res.redirect("/advisor/dashboard");
      return res.redirect("/dashboard");
    } catch (_) {
      /* bad/expired token -> just show the landing */
    }
  }
  // landing.ejs is self-contained, render it directly (NOT renderWithLayout)
  res.render("landing", { siteUrl: SITE_URL });
});

// ===================== SEO: robots + sitemap =====================
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
`User-agent: *
Disallow: /dashboard
Disallow: /grades
Disallow: /advisor
Disallow: /flowchart
Disallow: /manageFlow
Disallow: /chat
Disallow: /auth
Disallow: /login-aao-password

Sitemap: ${SITE_URL}/sitemap.xml
`,
  );
});

app.get("/sitemap.xml", (req, res) => {
  const lastmod = new Date().toISOString().split("T")[0];
  res.type("application/xml").send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
  );
});

// ===================== REACT SPA + /api ROUTES =====================
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
  loadDrawData,
  saveDrawData,
});

app.get("/login", (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex, follow");
  renderWithLayout(res, "login-content", {
    error: null,
    query: req.query,
    title: "Đăng nhập - Smart Learning Advisor",
    hideNavigation: true,
    bodyClass: "login-page",
    mainClass: "container-fluid h-100",
    pageStyles: LOGIN_3D_STYLES,
    pageScripts: LOGIN_3D_SCRIPTS,
  });
});

app.post("/login", loginLimiter, async (req, res) => {
  const { studentId, password } = req.body;
  const advisor = advisorsData[studentId];
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 3600000,
  };

  if (advisor && advisor.password === password) {
    const token = jwt.sign(
      { id: studentId, role: "advisor" },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1h" },
    );
    res.cookie("token", token, cookieOpts);
    return res.redirect("/advisor/dashboard");
  }

  try {
    const studentData = await fetchStudentFromEIU(studentId, password);
    if (!studentData) {
      return renderWithLayout(res, "login-content", {
        error: "ID sinh viên hoặc mật khẩu không đúng!",
        query: {},
        title: "Đăng nhập",
        hideNavigation: true,
        bodyClass: "login-page",
        mainClass: "container-fluid h-100",
        pageStyles: LOGIN_3D_STYLES,
        pageScripts: LOGIN_3D_SCRIPTS,
      });
    }

    const token = jwt.sign(
      { id: studentId, password, role: "student" },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1h" },
    );
    res.cookie("token", token, cookieOpts);
    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    return renderWithLayout(res, "login-content", {
      error: "Không thể kết nối hệ thống EIU. Vui lòng thử lại.",
      query: {},
      title: "Đăng nhập",
      hideNavigation: true,
      bodyClass: "login-page",
      mainClass: "container-fluid h-100",
      pageStyles: LOGIN_3D_STYLES,
      pageScripts: LOGIN_3D_SCRIPTS,
    });
  }
});

// ===================== GOOGLE OAUTH =====================
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?err=google" }),
  async (req, res) => {
    const email = req.user?.email;
    const accessToken = req.user?.accessToken;
    if (!email) return res.redirect("/login?err=no_email");

    const studentId = email.split("@")[0];
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 86400000,
    };

    let student = await getCached(studentId);

    if (!student && accessToken) {
      try {
        const apiRes = await fetch(
          `${PYTHON_API_URL}/fetch-student-google-access-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken }),
          },
        );
        const json = await apiRes.json();
        if (json.success) {
          student = mapEIUDataToStudent(studentId, null, json.data);
          await setCache(studentId, student);
        }
      } catch (e) {
        console.error("Google fetch error:", e);
      }
    }

    if (!student) return res.redirect("/login?err=eiu_auth");

    const token = jwt.sign(
      { id: studentId, role: "student", email },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "24h" },
    );
    res.cookie("token", token, cookieOpts);
    return res.redirect("/dashboard");
  },
);

// ===================== AAO PASSWORD FALLBACK =====================
app.get("/login-aao-password", (req, res) => {
  if (!req.session.pendingStudentId) return res.redirect("/login");
  renderWithLayout(res, "login-content", {
    error: req.query.err === "1" ? "Mật khẩu AAO không đúng, thử lại!" : null,
    query: { mode: "aao_password", studentId: req.session.pendingStudentId },
    title: "Xác nhận mật khẩu AAO",
    hideNavigation: true,
    bodyClass: "login-page",
    mainClass: "container-fluid h-100",
    pageStyles: LOGIN_3D_STYLES,
    pageScripts: LOGIN_3D_SCRIPTS,
  });
});

app.post("/login-aao-password", loginLimiter, async (req, res) => {
  const { password } = req.body;
  const studentId = req.session.pendingStudentId;
  const email = req.session.pendingEmail;
  if (!studentId) return res.redirect("/login");

  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 86400000,
  };
  try {
    const studentData = await fetchStudentFromEIU(studentId, password);
    if (!studentData) return res.redirect("/login-aao-password?err=1");

    delete req.session.pendingStudentId;
    delete req.session.pendingEmail;

    const token = jwt.sign(
      {
        id: studentId,
        role: "student",
        email: email || `${studentId}@student.eiu.edu.vn`,
      },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "24h" },
    );
    res.cookie("token", token, cookieOpts);
    return res.redirect("/dashboard");
  } catch (err) {
    console.error("AAO password error:", err);
    return res.redirect("/login-aao-password?err=1");
  }
});

// ===================== LOGOUT =====================
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// ===================== STUDENT PAGES =====================
app.get("/dashboard", requireAuth, (req, res) => {
  const student = req.student;
  const { totalCourses, completedCourses, averageScore } =
    precomputedCache[student.id].dashboard;

  renderWithLayout(res, "dashboard-content", {
    student,
    totalCourses,
    completedCourses,
    averageScore,
    moment,
    title: `Dashboard - ${student.name}`,
    currentPage: "dashboard",
    breadcrumb: [{ name: "Dashboard", icon: "fas fa-tachometer-alt" }],
  });
});

app.get("/grades", requireAuth, (req, res) => {
  const student = req.student;
  const { coursesByYear, completedCourses } = precomputedCache[student.id].grades;

  renderWithLayout(res, "grades-content", {
    student,
    coursesByYear,
    completedCourses,
    moment,
    title: `Bảng điểm - ${student.name}`,
    currentPage: "grades",
    breadcrumb: [{ name: "Bảng điểm", icon: "fas fa-chart-line" }],
  });
});

app.get("/advisor", requireAuth, (req, res) => {
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

  const student = req.student;
  let { suggestedCourses } = precomputedCache[student.id].advisor;

  let fromFlowchart = suggestedCourses;
  try {
    const data = fs.readFileSync(
      path.join(__dirname, `./Students/${student.id}.json`),
      "utf8",
    );
    const suggest = JSON.parse(data);
    const lastValid = [...suggest]
      .reverse()
      .find((item) => Array.isArray(item.courses) && item.courses.length > 0);
    if (lastValid) fromFlowchart = lastValid.courses || [];
  } catch (e) {
    /* no saved courses yet */
  }

  let drawData = {};
  try {
    drawData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "flowchart.json"), "utf8"),
    );
  } catch (e) {
    console.error("Error loading flowchart:", e);
  }

  delete req.session.pendingCourses;
  renderWithLayout(res, "advisor-content", {
    student,
    suggestedCourses,
    drawData,
    fromFlowchart,
    dataFlow,
    title: `Tư vấn AI - ${student.name}`,
    currentPage: "advisor",
    breadcrumb: [{ name: "Tư vấn AI", icon: "fas fa-robot" }],
    pageScripts: '<script src="/js/advisor.js"></script>',
  });
});

// =====================================================================
// /advisor POST — SSE Streaming, Vercel-compatible
// =====================================================================
app.post("/advisor", requireAuth, advisorLimiter, async (req, res) => {
  const {
    subject,
    path: learningPath,
    question,
    goals,
    difficulties,
    suggested,
    choosen,
  } = req.body;

  const student = req.student;

  if (!student)
    return res
      .status(401)
      .json({ error: true, fallback: "Bạn chưa đăng nhập 🚫" });
  if (!question)
    return res
      .status(400)
      .json({ error: true, fallback: "Bạn chưa nhập câu hỏi 🤔" });

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

  // try {
  //   const apiResponse = await fetch(
  //     "https://openrouter.ai/api/v1/chat/completions",
  //     {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  //         "HTTP-Referer": process.env.APP_URL || "http://localhost:3010",
  //         "X-OpenRouter-Title": "SmartLearning AI",
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         model: "openai/gpt-oss-20b:free",
  //         messages: [{ role: "user", content: userPrompt }],
  //         max_tokens: 1500,
  //         temperature: 0.7,
  //         stream: true,
  //       }),
  //     },
  //   );
  try {
  const apiResponse = await fetch(
    "https://models.github.ai/inference/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        stream: true,
      }),
    }
  );
    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error("OpenRouter error:", errText);
      const fallback = generatePersonalizedAdvice(
        student,
        question,
        goals,
        difficulties,
      );
      send({ done: true, fullText: fallback });
      res.end();
      return;
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
        } catch (e) {
          /* bỏ qua chunk lỗi parse */
        }
      }
    }

    send({ done: true, fullText });
    res.end();

    saveFeedback(student.id, {
      question,
      goals,
      difficulties,
      advice: fullText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error /advisor:", error);
    const fallback = generatePersonalizedAdvice(
      student,
      question,
      goals,
      difficulties,
    );
    send({ error: true, fallback });
    res.end();
  }
});

app.post("/advisor-token", requireAuth, (req, res) => {
  const token = crypto.randomBytes(16).toString("hex");
  req.session.advisorToken = token;
  req.session.tokenIssuedAt = Date.now();
  res.json({ token });
});

app.get("/flowchart", requireAuth, (req, res) => {
  const student = req.student;
  let { suggestedCourses } = precomputedCache[student.id].advisor;

  const feedback = getFeedback(student.id);
  const lastValid = [...feedback]
    .reverse()
    .find((item) => Array.isArray(item.courses) && item.courses.length > 0);
  if (lastValid) suggestedCourses = lastValid.courses;

  // Đọc lại file mỗi lần thay vì dùng global cache
  let freshDrawData = drawData;
  try {
    freshDrawData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "flowchart.json"), "utf8")
    );
  } catch (e) {}

  renderWithLayout(res, "flowChart", {
    student,
    suggestedCourses,
    drawData: freshDrawData,
    coursesData,
    title: `Xem lộ trình - ${student.name}`,
    currentPage: "flowchart",
    breadcrumb: [{ name: "Lộ trình", icon: "fas fa-diagram-project" }],
    pageScripts: '<script src="/js/flowchart.js"></script>',
  });
});

app.post("/flowchart", requireAuth, (req, res) => {
  saveFeedback(req.student.id, {
    courses: req.body.courses,
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true });
});

app.get("/manageFlow", requireAuth, (req, res) => {
  const student = req.student;

  renderWithLayout(res, "manageFlow", {
    student,
    drawData,
    title: `Sửa lộ trình - ${student.name}`,
    currentPage: "manageFlow",
    breadcrumb: [{ name: "Sửa lộ trình", icon: "fas fa-cogs" }],
    pageScripts: '<script src="/js/flowchartMange.js"></script>',
  });
});

app.post("/flowchartManager/save", requireAuth, (req, res) => {
  try {
    const newData = req.body;
    const filePath = path.join(__dirname, "flowchart.json");
    
    // LOG ĐỂ DEBUG
    console.log("Writing to:", filePath);
    console.log("Data keys:", Object.keys(newData));
    
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), "utf8");
    drawData = newData;
    res.json({ ok: true });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// ===================== ADVISOR PAGES =====================
app.get("/advisor/dashboard", requireAdvisorAuth, (req, res) => {
  renderWithLayout(res, "advisors/dashboard-content", {
    advisor: req.advisor,
    currentPage: "dashboard",
    title: "Trang chính cố vấn",
    breadcrumb: [{ name: "Dashboard", icon: "fas fa-tachometer-alt" }],
    headerTitle: "Trang chính Cố vấn học tập",
    headerSubtitle: "Giám sát, hỗ trợ và đồng hành cùng sinh viên EIU",
    headerIcon: "fas fa-chalkboard-teacher",
  });
});

app.get("/advisor/chat", requireAdvisorAuth, (req, res) => {
  // const students = Object.entries(studentCache).map(([id, entry]) => ({
  //   id,
  //   name: entry.data.name,
  // }));
  const students = [];
  renderWithLayout(res, "advisors/chat", {
    advisor: req.advisor,
    users: students,
    title: "Nhắn tin",
    currentPage: "chat",
    breadcrumb: [{ name: "Nhắn tin", icon: "fas fa-comment" }],
    pageScripts: '<script src="/js/chat.js" type="module"></script>',
  });
});

app.get("/chat", requireAuth, (req, res) => {
  const advisors = Object.entries(advisorsData).map(([id, a]) => ({
    id,
    name: a.name,
  }));
  renderWithLayout(res, "chat", {
    student: req.student,
    users: advisors,
    title: `Nhắn tin - ${req.student.name}`,
    currentPage: "chat",
    breadcrumb: [{ name: "Nhắn tin", icon: "fas fa-comment" }],
    pageScripts: '<script src="/js/chat.js" type="module"></script>',
  });
});

// ===================== START =====================
if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`Smart Learning Advisor running on http://localhost:${PORT}`),
  );
}

app.get("/courseDescription.json", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "courseDescription.json"));
});

module.exports = app;