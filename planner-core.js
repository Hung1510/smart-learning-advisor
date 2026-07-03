// EIU 4.0 scale. score field is unreliable for old cohorts (holds % like "90.0"),
// so GPA is computed from the LETTER grade, not from score.
const GRADE_POINTS = {
  A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, "D-": 0.7, F: 0.0,
};

// a course counts as PASSED/completed if grade is P, or a letter grade at or
// above this point. 1.0 = "D or better" (the usual floor). flip to 0.7 if EIU
// gives credit for D-.
const PASS_MIN_POINT = 1.0;

// electives are placeholder slots with no real course code, so no credits in
// courses.json. assume this per elective (most EIU courses are 4cr).
const DEFAULT_ELECTIVE_CREDITS = 4;

// next-semester bundle: fill up to CAP, aim for at least TARGET.
const DEFAULT_CREDIT_CAP = 18;
const DEFAULT_CREDIT_TARGET = 15;

const norm = (s) => String(s || "").trim().toUpperCase();
const isElecPlaceholder = (id) => norm(id).startsWith("ELEC");

// same program-derivation logic app.js/api-routes already use, kept in one place.
function programFor(student) {
  const cohortNumber = parseInt(String(student.cohort).slice(-2), 10);
  let p = student.major || "swe";
  if (cohortNumber >= 23) p += "23";
  else if (cohortNumber >= 21) p += "21";
  else p += "18";
  return p;
}

function gradePoint(course) {
  const g = (course.grade || "").trim();
  return Object.prototype.hasOwnProperty.call(GRADE_POINTS, g) ? GRADE_POINTS[g] : null;
}

// P passes. letter grade passes if point >= PASS_MIN_POINT. everything else
// (F, NP, W, I, X, IP, null/blank) does NOT count as passed.
function isPassed(course) {
  const g = (course.grade || "").trim();
  if (g === "P") return true;
  const pt = gradePoint(course);
  return pt !== null && pt >= PASS_MIN_POINT;
}

// a course is "in progress" if it's on the record but not yet passed/failed:
// grade IP, or blank/null. used so the planner doesn't re-suggest something
// the student is currently taking.
function isInProgress(course) {
  const g = (course.grade || "").trim();
  return g === "IP" || g === "";
}

// Set of passed course codes (normalized).
function passedSet(student) {
  const set = new Set();
  for (const c of student.courses || []) if (isPassed(c)) set.add(norm(c.id));
  return set;
}
function inProgressSet(student) {
  const set = new Set();
  for (const c of student.courses || []) if (isInProgress(c)) set.add(norm(c.id));
  return set;
}

// target -> [prereq source codes]
function buildPrereqMap(links) {
  const map = {};
  for (const l of links || []) {
    const t = norm(l.target);
    if (!map[t]) map[t] = [];
    map[t].push(norm(l.source));
  }
  return map;
}

// coursesData can be either an object keyed by course code ({ "CSE 101": {...} })
// or an array of course objects ([{ id: "CSE 101", ... }]). Handle both, so it
// doesn't matter which source the caller passes in.
function lookupCourse(id, coursesData) {
  if (!coursesData) return null;
  if (Array.isArray(coursesData)) {
    const key = norm(id);
    return coursesData.find((c) => c && (c.id === id || norm(c.id) === key)) || null;
  }
  return coursesData[id] || coursesData[norm(id)] || null;
}

function creditsOf(id, coursesData) {
  const c = lookupCourse(id, coursesData);
  return c && typeof c.credits === "number" ? c.credits : null;
}

function courseMeta(id, coursesData) {
  const c = lookupCourse(id, coursesData) || {};
  return {
    id,
    name: c.name || "",
    nameEg: c.nameEg || "",
    credits: typeof c.credits === "number" ? c.credits : null,
  };
}

// real (non-blank, non-elective-placeholder) nodes for a program.
function realNodes(prog) {
  return (prog.nodes || []).filter((n) => n.id && !isElecPlaceholder(n.id));
}

// ─────────────────────────────────────────────────────────────────────────
// NEXT SEMESTER PLANNER
// ─────────────────────────────────────────────────────────────────────────
function planNextSemester(student, drawData, coursesData, opts = {}) {
  const cap = opts.creditCap || DEFAULT_CREDIT_CAP;
  const target = opts.creditTarget || DEFAULT_CREDIT_TARGET;
  const program = programFor(student);
  const prog = drawData[program] || { nodes: [], links: [], ELEC: [] };

  const passed = passedSet(student);
  const inProg = inProgressSet(student);
  const prereqs = buildPrereqMap(prog.links);

  const eligible = [];
  const blocked = [];

  for (const node of realNodes(prog)) {
    const id = node.id;
    const key = norm(id);
    if (passed.has(key) || inProg.has(key)) continue; // done or currently taking

    const needed = prereqs[key] || [];
    const missing = needed.filter((p) => !passed.has(p));

    const entry = {
      ...courseMeta(id, coursesData),
      group: node.group || "",
      year: node.year, // curriculum priority (1.1, 2.3, ...)
    };

    if (missing.length === 0) {
      eligible.push(entry);
    } else {
      blocked.push({ ...entry, missing });
    }
  }

  // curriculum order: earlier year-slot first.
  eligible.sort((a, b) => (a.year || 99) - (b.year || 99));
  blocked.sort((a, b) => (a.year || 99) - (b.year || 99));

  // greedy bundle: take eligible in order until we'd exceed the cap.
  const suggested = [];
  let credits = 0;
  for (const e of eligible) {
    const c = e.credits ?? 0;
    if (credits + c > cap) continue;
    suggested.push(e);
    credits += c;
    if (credits >= target && suggested.length >= 4) break; // enough for one term
  }

  // electives the student still owes: count placeholder slots vs pool courses passed.
  const electives = electiveStatus(prog, passed, coursesData);

  return {
    program,
    creditCap: cap,
    creditTarget: target,
    suggested,
    suggestedCredits: credits,
    eligible,
    blocked,
    electives,
  };
}

// which elective groups still need filling, + eligible options from the pool.
function electiveStatus(prog, passed, coursesData) {
  // count required slots per elective group id (from placeholder nodes)
  const slots = {};
  for (const n of prog.nodes || []) {
    if (n.id && isElecPlaceholder(n.id)) {
      const gid = norm(n.id);
      slots[gid] = (slots[gid] || 0) + 1;
    }
  }
  // pool: group id -> [course codes]
  const pool = {};
  for (const e of prog.ELEC || []) {
    const gid = norm(e.id);
    if (!pool[gid]) pool[gid] = [];
    pool[gid].push(e.name);
  }

  const groups = [];
  for (const [gid, count] of Object.entries(slots)) {
    const options = pool[gid] || [];
    const filled = options.filter((code) => passed.has(norm(code)));
    const remaining = Math.max(0, count - filled.length);
    groups.push({
      group: gid,
      slotsRequired: count,
      slotsFilled: filled.length,
      slotsRemaining: remaining,
      filledCourses: filled,
      openOptions: remaining > 0
        ? options.filter((code) => !passed.has(norm(code))).map((code) => courseMeta(code, coursesData))
        : [],
    });
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────────────────
// DEGREE AUDIT
// ─────────────────────────────────────────────────────────────────────────
function degreeAudit(student, drawData, coursesData, opts = {}) {
  const elecCr = opts.electiveCredits || DEFAULT_ELECTIVE_CREDITS;
  const program = programFor(student);
  const prog = drawData[program] || { nodes: [], links: [], ELEC: [] };
  const passed = passedSet(student);

  // ---- required (non-elective) courses, grouped by curriculum group ----
  const categories = {}; // group -> {required, done, requiredCredits, doneCredits, remaining:[]}
  const ensure = (g) => (categories[g] ||= {
    group: g, coursesRequired: 0, coursesDone: 0,
    creditsRequired: 0, creditsDone: 0, remaining: [],
  });

  for (const node of realNodes(prog)) {
    const g = node.group || "OTHER";
    const cat = ensure(g);
    const cr = creditsOf(node.id, coursesData) ?? 0;
    cat.coursesRequired += 1;
    cat.creditsRequired += cr;
    if (passed.has(norm(node.id))) {
      cat.coursesDone += 1;
      cat.creditsDone += cr;
    } else {
      cat.remaining.push({ ...courseMeta(node.id, coursesData), year: node.year });
    }
  }

  // ---- elective slots as their own category ----
  const elec = electiveStatus(prog, passed, coursesData);
  const elecSlotsReq = elec.reduce((s, x) => s + x.slotsRequired, 0);
  const elecSlotsDone = elec.reduce((s, x) => s + x.slotsFilled, 0);
  if (elecSlotsReq > 0) {
    categories["ELECTIVE"] = {
      group: "ELECTIVE",
      coursesRequired: elecSlotsReq,
      coursesDone: elecSlotsDone,
      creditsRequired: elecSlotsReq * elecCr,
      creditsDone: elecSlotsDone * elecCr,
      remaining: [],
      detail: elec,
    };
  }

  // ---- totals ----
  let creditsRequired = 0, creditsDone = 0, coursesRequired = 0, coursesDone = 0;
  for (const c of Object.values(categories)) {
    creditsRequired += c.creditsRequired;
    creditsDone += c.creditsDone;
    coursesRequired += c.coursesRequired;
    coursesDone += c.coursesDone;
  }
  const creditsRemaining = Math.max(0, creditsRequired - creditsDone);
  const pctComplete = creditsRequired ? Math.round((creditsDone / creditsRequired) * 100) : 0;

  // ---- GPA (only graded letter courses; P/NP/W/IP excluded) ----
  let qualityPoints = 0, gpaCredits = 0;
  for (const c of student.courses || []) {
    const pt = gradePoint(c);
    if (pt === null) continue; // P/NP/W/etc — no grade point
    const cr = creditsOf(c.id, coursesData);
    if (cr == null || cr === 0) continue;
    qualityPoints += pt * cr;
    gpaCredits += cr;
  }
  const gpa = gpaCredits ? +(qualityPoints / gpaCredits).toFixed(2) : null;

  // rough projected terms left: ~15 cr/term
  const perTerm = opts.creditsPerTerm || DEFAULT_CREDIT_TARGET;
  const termsLeft = creditsRemaining ? Math.ceil(creditsRemaining / perTerm) : 0;

  return {
    program,
    pctComplete,
    coursesRequired,
    coursesDone,
    creditsRequired,
    creditsDone,
    creditsRemaining,
    gpa,
    gpaCredits,
    qualityPoints: +qualityPoints.toFixed(1),
    termsLeft,
    // numbers the frontend needs for a "GPA needed to hit target" calculator:
    //   requiredAvg = (targetGPA*(gpaCredits+remaining) - qualityPoints) / remaining
    categories: Object.values(categories),
  };
}

module.exports = {
  GRADE_POINTS,
  PASS_MIN_POINT,
  programFor,
  isPassed,
  gradePoint,
  passedSet,
  buildPrereqMap,
  planNextSemester,
  degreeAudit,
};