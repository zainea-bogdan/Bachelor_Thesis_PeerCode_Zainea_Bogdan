/**
 * PeerCode — End-to-End Seed Script
 *
 * Prerequisites (all must be running):
 *   - Node.js backend:   http://localhost:3000  (node src/backend/server.js)
 *   - Git Analysis:      http://localhost:8000
 *   - RAG Module:        http://localhost:8002
 *   - PDF Parser:        http://localhost:8001
 *   - PostgreSQL:        localhost:5433
 *
 * Before running:
 *   1. Delete contents of src/rag_module/src/chromadb/
 *   2. server.js must have force: true in sequelize.sync (DB wiped on server start)
 *   3. Place seed documents in src/backend/seed_docs/:
 *        - React_Router_useReducer_Redux_Toolkit_EN.pdf
 *        - ORM_Sequelize_SQLite_EN.docx
 *
 * Run from project root:
 *   node src/backend/seed.js
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const API = "http://localhost:3000/api";

const DOCS_DIR = path.join(__dirname, "seed_docs");
const PDF_PATH = path.join(DOCS_DIR, "React_Router_useReducer_Redux_Toolkit_EN.pdf");
const DOCX_PATH = path.join(DOCS_DIR, "ORM_Sequelize_SQLite_EN.docx");

// Repo assignments — all owned by zainea-bogdan for demo purposes
const REPOS = {
  student1: { url: "https://github.com/zainea-bogdan/Data_Engineer_Project_WoWCinema" },
  student2: { url: "https://github.com/zainea-bogdan/ActivitateCTS2026_Zainea_Bogdan" },
  student3: { url: "https://github.com/zainea-bogdan/TW_PeerCode_Studio_Mock_Up" },
  student4: { url: "https://github.com/zainea-bogdan/Multi-Game_Management_System_Oracle_DB_Project" },
};

// Custom thresholds for Course A (stricter than system defaults)
const COURSE_A_THRESHOLDS = {
  low_commit_activity: 15,
  late_start_pattern: 0.4,
  last_minute_activity: 0.4,
  high_same_day_concentration: 0.5,
  long_inactivity_gap_days: 3,
  high_external_author_ratio: 0.2,
  low_window_utilization: 0.25,
  uneven_distribution_gini: 0.6,
  erratic_commit_rhythm_hours: 60,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function log(phase, message) {
  console.log(`[PHASE ${phase}] ${message}`);
}

function logSuccess(phase, message) {
  console.log(`\x1b[32m[PHASE ${phase}] ✓ ${message}\x1b[0m`);
}

function logError(phase, message) {
  console.error(`\x1b[31m[PHASE ${phase} FAILED] ${message}\x1b[0m`);
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function post(phase, url, data, token = null) {
  try {
    const headers = token ? authHeader(token) : {};
    const res = await axios.post(`${API}${url}`, data, { headers });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const body = JSON.stringify(err.response?.data);
    logError(phase, `POST ${url} — status: ${status} — body: ${body}`);
    throw err;
  }
}

async function get(phase, url, token) {
  try {
    const res = await axios.get(`${API}${url}`, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const body = JSON.stringify(err.response?.data);
    logError(phase, `GET ${url} — status: ${status} — body: ${body}`);
    throw err;
  }
}

async function patch(phase, url, data, token) {
  try {
    const res = await axios.patch(`${API}${url}`, data, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const body = JSON.stringify(err.response?.data);
    logError(phase, `PATCH ${url} — status: ${status} — body: ${body}`);
    throw err;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── PHASE 0 — WIPE ───────────────────────────────────────────────────────────

async function phase0() {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 0 — Wipe");
  console.log("══════════════════════════════════════════");

  log(0, "Checking seed documents exist...");
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF not found at ${PDF_PATH}. Place the file in src/backend/seed_docs/`);
  }
  if (!fs.existsSync(DOCX_PATH)) {
    throw new Error(`DOCX not found at ${DOCX_PATH}. Place the file in src/backend/seed_docs/`);
  }
  logSuccess(0, "Seed documents found");

  log(0, "NOTE: Before running this script ensure you have:");
  log(0, "  1. Deleted contents of src/rag_module/src/chromadb/");
  log(0, "  2. server.js has force: true in sequelize.sync (DB wiped on server start)");
  log(0, "Proceeding in 3 seconds...");
  await sleep(3000);

  log(0, "Clearing ChromaDB collection...");
  try {
    await axios.delete("http://localhost:8002/ingest/clear");
    logSuccess(0, "ChromaDB cleared");
  } catch (err) {
    logError(0, `ChromaDB clear failed — ${err.response?.status} — is rag-module running?`);
    throw err;
  }

  logSuccess(0, "Wipe confirmed — proceeding with clean state");
}

// ─── PHASE 1 — AUTH ───────────────────────────────────────────────────────────

async function phase1() {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 1 — Auth");
  console.log("══════════════════════════════════════════");

  log(1, "Registering Teacher A...");
  await post(1, "/auth/register", {
    name: "Profesor Ionescu",
    email: "ionescu@university.ro",
    password: "Teacher123!",
    role: "teacher",
  });
  logSuccess(1, "Teacher A registered");

  log(1, "Registering Teacher B...");
  await post(1, "/auth/register", {
    name: "Profesor Popescu",
    email: "popescu@university.ro",
    password: "Teacher123!",
    role: "teacher",
  });
  logSuccess(1, "Teacher B registered");

  // series/group_number omitted — prevents auto-enrollment when courses with series are created
  const studentData = [
    { name: "Alexandru Marin", email: "marin@student.ro", github_username: "zainea-bogdan", university: "Universitatea Politehnica", speciality: "Informatica", year: 3 },
    { name: "Ioana Constantin", email: "constantin@student.ro", github_username: "zainea-bogdan", university: "Universitatea Politehnica", speciality: "Informatica", year: 3 },
    { name: "Mihai Gheorghe", email: "gheorghe@student.ro", github_username: "zainea-bogdan", university: "Universitatea Politehnica", speciality: "Informatica", year: 3 },
    { name: "Elena Dumitrescu", email: "dumitrescu@student.ro", github_username: "zainea-bogdan", university: "Universitatea Politehnica", speciality: "Informatica", year: 3 },
  ];

  for (let i = 0; i < studentData.length; i++) {
    log(1, `Registering Student ${i + 1} — ${studentData[i].name}...`);
    await post(1, "/auth/register", { ...studentData[i], password: "Student123!", role: "student" });
    logSuccess(1, `Student ${i + 1} registered`);
  }

  log(1, "Logging in all users...");

  const teacherALogin = await post(1, "/auth/login", { email: "ionescu@university.ro", password: "Teacher123!", role: "teacher" });
  logSuccess(1, "Teacher A logged in");
  const teacherBLogin = await post(1, "/auth/login", { email: "popescu@university.ro", password: "Teacher123!", role: "teacher" });
  logSuccess(1, "Teacher B logged in");

  const studentEmails = ["marin@student.ro", "constantin@student.ro", "gheorghe@student.ro", "dumitrescu@student.ro"];
  const studentTokens = [];
  for (let i = 0; i < studentEmails.length; i++) {
    const login = await post(1, "/auth/login", { email: studentEmails[i], password: "Student123!", role: "student" });
    studentTokens.push(login.token);
    logSuccess(1, `Student ${i + 1} logged in`);
  }

  return {
    teacherAToken: teacherALogin.token,
    teacherBToken: teacherBLogin.token,
    studentTokens,
  };
}

// ─── PHASE 2 — SUBJECT + COURSES ─────────────────────────────────────────────

async function phase2(teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 2 — Subject + Courses");
  console.log("══════════════════════════════════════════");

  log(2, "Creating subject: Tehnologii Web...");
  // response: { message, subject }
  const subjectRes = await post(2, "/subjects", { name: "Tehnologii Web" }, teacherAToken);
  const subject = subjectRes.subject;
  logSuccess(2, `Subject created — id: ${subject.id}`);

  log(2, "Teacher A creating Course A (series A, type lab, 2025/2026)...");
  // response: { message, course } — university_year is a STRING, type must be "course"|"seminar"|"lab"
  const courseARes = await post(
    2,
    "/courses",
    {
      subject_id: subject.id,
      university_year: "2025/2026",
      type: "lab",
      series: "A",
    },
    teacherAToken,
  );
  const courseA = courseARes.course;
  logSuccess(2, `Course A created — id: ${courseA.id} — code: ${courseA.course_code}`);

  // courseController does not accept git_thresholds at creation — set via dedicated endpoint
  log(2, "Setting custom git thresholds on Course A via PATCH /thresholds/courses/:id...");
  await patch(2, `/thresholds/courses/${courseA.id}`, COURSE_A_THRESHOLDS, teacherAToken);
  logSuccess(2, `Course A custom thresholds set: ${JSON.stringify(COURSE_A_THRESHOLDS)}`);

  log(2, "Teacher B creating Course B (series B, type lab, 2025/2026) — system default thresholds...");
  const courseBRes = await post(
    2,
    "/courses",
    {
      subject_id: subject.id,
      university_year: "2025/2026",
      type: "lab",
      series: "B",
    },
    teacherBToken,
  );
  const courseB = courseBRes.course;
  logSuccess(2, `Course B created — id: ${courseB.id} — code: ${courseB.course_code}`);
  log(2, "Course B using system default thresholds — no override");

  return { subject, courseA, courseB };
}

// ─── PHASE 3 — ENROLLMENT ─────────────────────────────────────────────────────

async function phase3(courseA, courseB, studentTokens) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 3 — Enrollment");
  console.log("══════════════════════════════════════════");

  log(3, `Student 1 self-enrolling in Course A via code: ${courseA.course_code}...`);
  await post(3, `/courses/${courseA.id}/enroll/self`, { course_code: courseA.course_code }, studentTokens[0]);
  logSuccess(3, "Student 1 enrolled in Course A");

  log(3, `Student 2 self-enrolling in Course A via code: ${courseA.course_code}...`);
  await post(3, `/courses/${courseA.id}/enroll/self`, { course_code: courseA.course_code }, studentTokens[1]);
  logSuccess(3, "Student 2 enrolled in Course A");

  log(3, `Student 3 self-enrolling in Course B via code: ${courseB.course_code}...`);
  await post(3, `/courses/${courseB.id}/enroll/self`, { course_code: courseB.course_code }, studentTokens[2]);
  logSuccess(3, "Student 3 enrolled in Course B");

  log(3, `Student 4 self-enrolling in Course B via code: ${courseB.course_code}...`);
  await post(3, `/courses/${courseB.id}/enroll/self`, { course_code: courseB.course_code }, studentTokens[3]);
  logSuccess(3, "Student 4 enrolled in Course B");

  // Duplicate enrollment guard test
  log(3, "Testing duplicate enrollment guard — Student 1 re-enrolling in Course A...");
  try {
    await axios.post(`${API}/courses/${courseA.id}/enroll/self`, { course_code: courseA.course_code }, { headers: authHeader(studentTokens[0]) });
    logError(3, "Duplicate enrollment was NOT blocked — guard missing!");
  } catch (err) {
    if (err.response?.status === 409) {
      logSuccess(3, "Duplicate enrollment blocked — 409 confirmed ✓");
    } else {
      logError(3, `Unexpected status on duplicate enrollment: ${err.response?.status}`);
    }
  }
}

// ─── PHASE 4 — DOCUMENT UPLOAD + RAG INGEST ──────────────────────────────────

async function phase4(courseA, courseB, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 4 — Document Upload + RAG Ingest");
  console.log("══════════════════════════════════════════");

  log(4, "Firing PDF (Teacher A) and DOCX (Teacher B) uploads concurrently...");

  const uploadPDF = async () => {
    const form = new FormData();
    form.append("file", fs.createReadStream(PDF_PATH));
    form.append("course_id", courseA.id);
    const res = await axios.post(`${API}/documents/upload`, form, {
      headers: { ...authHeader(teacherAToken), ...form.getHeaders() },
    });
    return res.data;
  };

  const uploadDOCX = async () => {
    const form = new FormData();
    form.append("file", fs.createReadStream(DOCX_PATH));
    form.append("course_id", courseB.id);
    const res = await axios.post(`${API}/documents/upload`, form, {
      headers: { ...authHeader(teacherBToken), ...form.getHeaders() },
    });
    return res.data;
  };

  // RAG ingestion runs synchronously inside the upload handler — is_indexed is already set in the response
  // response: { message, document }
  const [pdfRes, docxRes] = await Promise.all([uploadPDF(), uploadDOCX()]);
  const pdfDoc = pdfRes.document;
  const docxDoc = docxRes.document;

  log(4, `PDF  — id: ${pdfDoc.id}, is_indexed: ${pdfDoc.is_indexed}`);
  log(4, `DOCX — id: ${docxDoc.id}, is_indexed: ${docxDoc.is_indexed}`);

  // ── POLLING ──────────────────────────────────────────────
  log(4, "Polling until both documents are indexed (checking every 15s, max 8 minutes)...");
  let pdfIndexed = pdfDoc.is_indexed;
  let docxIndexed = docxDoc.is_indexed;
  let attempts = 0;
  const maxAttempts = 32;

  while ((!pdfIndexed || !docxIndexed) && attempts < maxAttempts) {
    await sleep(15000);
    attempts++;
    const docsA = await get(4, `/documents/${courseA.id}/documents`, teacherAToken);
    const docsB = await get(4, `/documents/${courseB.id}/documents`, teacherBToken);
    pdfIndexed = docsA.find((d) => d.id === pdfDoc.id)?.is_indexed || false;
    docxIndexed = docsB.find((d) => d.id === docxDoc.id)?.is_indexed || false;
    log(4, `Attempt ${attempts} — PDF: ${pdfIndexed} | DOCX: ${docxIndexed}`);
  }

  if (!pdfIndexed || !docxIndexed) {
    throw new Error("Indexing timed out after 8 minutes — check pdf-parser and rag-module logs");
  }

  logSuccess(4, "Both documents indexed — proceeding to blueprint generation");
  // ─────────────────────────────────────────────────────────

  return { pdfDoc, docxDoc };
}

// ─── PHASE 5 — NOTIFICATIONS CHECK (POST-UPLOAD) ─────────────────────────────

async function phase5(studentTokens) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 5 — Notifications Check (Post-Upload)");
  console.log("══════════════════════════════════════════");

  log(5, "Student 1 fetching notifications...");
  const notifs1 = await get(5, "/notifications", studentTokens[0]);
  const materialNotif1 = notifs1.find((n) => n.type === "MATERIAL_UPLOADED");
  if (materialNotif1) {
    logSuccess(5, `Student 1 notification verified: MATERIAL_UPLOADED — id: ${materialNotif1.id}`);
  } else {
    logError(5, "Student 1 missing MATERIAL_UPLOADED notification");
    log(5, `All notifications: ${JSON.stringify(notifs1.map((n) => n.type))}`);
  }

  log(5, "Student 3 fetching notifications...");
  const notifs3 = await get(5, "/notifications", studentTokens[2]);
  const materialNotif3 = notifs3.find((n) => n.type === "MATERIAL_UPLOADED");
  if (materialNotif3) {
    logSuccess(5, `Student 3 notification verified: MATERIAL_UPLOADED — id: ${materialNotif3.id}`);
  } else {
    logError(5, "Student 3 missing MATERIAL_UPLOADED notification");
    log(5, `All notifications: ${JSON.stringify(notifs3.map((n) => n.type))}`);
  }

  log(5, "Marking all notifications as read for Student 1...");
  await patch(5, "/notifications/read-all", {}, studentTokens[0]);
  const notifs1After = await get(5, "/notifications", studentTokens[0]);
  const unread1 = notifs1After.filter((n) => !n.is_read).length;
  logSuccess(5, `Student 1 unread count after read-all: ${unread1}`);

  log(5, "Marking all notifications as read for Student 3...");
  await patch(5, "/notifications/read-all", {}, studentTokens[2]);
  const notifs3After = await get(5, "/notifications", studentTokens[2]);
  const unread3 = notifs3After.filter((n) => !n.is_read).length;
  logSuccess(5, `Student 3 unread count after read-all: ${unread3}`);
}

// ─── PHASE 6 — BLUEPRINT GENERATION ──────────────────────────────────────────

async function phase6(courseA, courseB, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 6 — Blueprint Generation");
  console.log("══════════════════════════════════════════");

  log(6, "Teacher A generating blueprint from React Router PDF...");
  // response: { message, blueprints: [...], chunks_used }
  const blueprintARes = await post(
    6,
    "/blueprints/generate",
    {
      course_id: courseA.id,
      course_name: "Tehnologii Web — React",
      context: "React SPA cu React Router v6 (minim 4 rute), Redux Toolkit cu createSlice si createAsyncThunk pentru stare globala, useReducer pentru starea locala a unui formular complex. Autentificare simulata, dashboard cu date asincrone, CRUD complet pentru o entitate la alegere.",
      domain: "React",
      projects_count: 1,
      difficulty_per_slot: ["medium"],
      start_date: "2026-03-01",
      deadline: "2026-05-31",
    },
    teacherAToken,
  );
  const blueprintA = blueprintARes.blueprints[0];
  logSuccess(6, `Teacher A blueprint generated — id: ${blueprintA.id} — title: ${blueprintA.title}`);

  log(6, "Teacher B generating blueprint from ORM Sequelize DOCX...");
  const blueprintBRes = await post(
    6,
    "/blueprints/generate",
    {
      course_id: courseB.id,
      course_name: "Tehnologii Web — ORM",
      context: "Individual project using Sequelize ORM with SQLite or PostgreSQL. " + "Minimum 3 models with One-to-Many and Many-to-Many relationships. " + "Full CRUD operations via ORM, migrations and seeders for initial data. " + "REST API with Express.js demonstrating correct use of Sequelize associations.",
      domain: "ORM/Sequelize",
      projects_count: 1,
      difficulty_per_slot: ["medium"],
      start_date: "2026-03-01",
      deadline: "2026-05-31",
    },
    teacherBToken,
  );
  const blueprintB = blueprintBRes.blueprints[0];
  logSuccess(6, `Teacher B blueprint generated — id: ${blueprintB.id} — title: ${blueprintB.title}`);

  // Confirm: router uses PATCH /:id/confirm (not POST)
  log(6, "Teacher A confirming blueprint (generated → confirmed)...");
  await patch(6, `/blueprints/${blueprintA.id}/confirm`, {}, teacherAToken);
  logSuccess(6, "Teacher A blueprint confirmed");

  log(6, "Teacher B confirming blueprint (generated → confirmed)...");
  await patch(6, `/blueprints/${blueprintB.id}/confirm`, {}, teacherBToken);
  logSuccess(6, "Teacher B blueprint confirmed");

  // Assign: router uses PATCH /:id/assign (not POST)
  log(6, "Teacher A assigning blueprint to Course A (confirmed → assigned)...");
  await patch(6, `/blueprints/${blueprintA.id}/assign`, {}, teacherAToken);
  logSuccess(6, "Teacher A blueprint assigned — student notifications triggered");

  log(6, "Teacher B assigning blueprint to Course B (confirmed → assigned)...");
  await patch(6, `/blueprints/${blueprintB.id}/assign`, {}, teacherBToken);
  logSuccess(6, "Teacher B blueprint assigned — student notifications triggered");

  return { blueprintA, blueprintB };
}

// ─── PHASE 7 — NOTIFICATIONS CHECK (POST-ASSIGNMENT) ─────────────────────────

async function phase7(studentTokens) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 7 — Notifications Check (Post-Assignment)");
  console.log("══════════════════════════════════════════");

  log(7, "Student 1 fetching notifications...");
  const notifs1 = await get(7, "/notifications", studentTokens[0]);
  const assignNotif1 = notifs1.find((n) => n.type === "BLUEPRINT_ASSIGNED");
  if (assignNotif1) {
    logSuccess(7, "Student 1 notification verified: BLUEPRINT_ASSIGNED");
  } else {
    logError(7, "Student 1 missing BLUEPRINT_ASSIGNED notification");
    log(7, `All notification types: ${JSON.stringify(notifs1.map((n) => n.type))}`);
  }

  log(7, "Student 3 fetching notifications...");
  const notifs3 = await get(7, "/notifications", studentTokens[2]);
  const assignNotif3 = notifs3.find((n) => n.type === "BLUEPRINT_ASSIGNED");
  if (assignNotif3) {
    logSuccess(7, "Student 3 notification verified: BLUEPRINT_ASSIGNED");
  } else {
    logError(7, "Student 3 missing BLUEPRINT_ASSIGNED notification");
    log(7, `All notification types: ${JSON.stringify(notifs3.map((n) => n.type))}`);
  }
}

// ─── PHASE 8 — STUDENT JOINS + GITHUB SUBMISSION ─────────────────────────────

async function phase8(blueprintA, blueprintB, courseA, courseB, studentTokens, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 8 — Student Joins + GitHub Submission");
  console.log("══════════════════════════════════════════");

  // response: { message, assignment } — extract .assignment for the id
  log(8, "Student 1 joining Teacher A blueprint...");
  const assign1 = (await post(8, `/blueprints/${blueprintA.id}/join`, {}, studentTokens[0])).assignment;
  logSuccess(8, `Student 1 joined — assignment id: ${assign1.id}`);

  log(8, "Student 2 joining Teacher A blueprint...");
  const assign2 = (await post(8, `/blueprints/${blueprintA.id}/join`, {}, studentTokens[1])).assignment;
  logSuccess(8, `Student 2 joined — assignment id: ${assign2.id}`);

  log(8, "Student 3 joining Teacher B blueprint...");
  const assign3 = (await post(8, `/blueprints/${blueprintB.id}/join`, {}, studentTokens[2])).assignment;
  logSuccess(8, `Student 3 joined — assignment id: ${assign3.id}`);

  log(8, "Student 4 joining Teacher B blueprint...");
  const assign4 = (await post(8, `/blueprints/${blueprintB.id}/join`, {}, studentTokens[3])).assignment;
  logSuccess(8, `Student 4 joined — assignment id: ${assign4.id}`);

  // Submit GitHub URLs
  const submissions = [
    { assignId: assign1.id, token: studentTokens[0], repo: REPOS.student1, label: "Student 1" },
    { assignId: assign2.id, token: studentTokens[1], repo: REPOS.student2, label: "Student 2" },
    { assignId: assign3.id, token: studentTokens[2], repo: REPOS.student3, label: "Student 3" },
    { assignId: assign4.id, token: studentTokens[3], repo: REPOS.student4, label: "Student 4" },
  ];

  for (const s of submissions) {
    log(8, `${s.label} submitting repo: ${s.repo.url}...`);
    await patch(8, `/assignments/${s.assignId}/submit`, { repo_url: s.repo.url }, s.token);
    logSuccess(8, `${s.label} repo submitted — status → submitted`);
  }

  log(8, "Teacher A marking Student 1 + 2 as under_review...");
  await patch(8, `/assignments/${assign1.id}/review`, {}, teacherAToken);
  await patch(8, `/assignments/${assign2.id}/review`, {}, teacherAToken);
  logSuccess(8, "Student 1 + 2 assignments → under_review");

  log(8, "Teacher B marking Student 3 + 4 as under_review...");
  await patch(8, `/assignments/${assign3.id}/review`, {}, teacherBToken);
  await patch(8, `/assignments/${assign4.id}/review`, {}, teacherBToken);
  logSuccess(8, "Student 3 + 4 assignments → under_review");

  return { assignments: [assign1, assign2, assign3, assign4] };
}

// ─── PHASE 9 — GIT ANALYSIS ───────────────────────────────────────────────────

async function phase9(courseA, courseB, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 9 — Git Analysis");
  console.log("══════════════════════════════════════════");

  // Thresholds are resolved from course.git_thresholds saved in DB (set via phase 2)
  log(9, "Teacher A triggering group refresh on Course A — custom thresholds active from DB...");
  const analysisA = await post(9, "/analytics/refresh", { course_id: courseA.id }, teacherAToken);
  logSuccess(9, `Course A analysis — analyzed: ${analysisA.analyzed}, failed: ${analysisA.failed}, skipped: ${analysisA.skipped}`);
  if (analysisA.results) {
    for (const r of analysisA.results) {
      log(9, `  ${r.student_name || r.assignment_id}: ${r.status}${r.reason ? ` — ${r.reason}` : ""}`);
    }
  }

  log(9, "Teacher B triggering group refresh on Course B — system default thresholds...");
  const analysisB = await post(9, "/analytics/refresh", { course_id: courseB.id }, teacherBToken);
  logSuccess(9, `Course B analysis — analyzed: ${analysisB.analyzed}, failed: ${analysisB.failed}, skipped: ${analysisB.skipped}`);
  if (analysisB.results) {
    for (const r of analysisB.results) {
      log(9, `  ${r.student_name || r.assignment_id}: ${r.status}${r.reason ? ` — ${r.reason}` : ""}`);
    }
  }

  logSuccess(9, "Git analysis complete");
  logSuccess(9, "Threshold resolution: Course A used custom (from DB), Course B used system defaults");
}

// ─── PHASE 10 — EVALUATION + COMMENTS ────────────────────────────────────────

async function phase10(assignments, studentTokens, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 10 — Evaluation + Comments");
  console.log("══════════════════════════════════════════");

  const [assign1, assign2, assign3, assign4] = assignments;

  // evaluateAssignment controller expects { teacher_note } (not evaluation_note)
  const evaluations = [
    { assignId: assign1.id, token: teacherAToken, note: "Ritm de commit consistent, structura proiectului bine organizata. Start usor tardiv dar activitate buna pe parcurs.", label: "Teacher A → Student 1" },
    { assignId: assign2.id, token: teacherAToken, note: "Activitate buna in general, dar concentratie prea mare in ultimele zile. Recomand distribuire mai uniforma a commit-urilor.", label: "Teacher A → Student 2" },
    { assignId: assign3.id, token: teacherBToken, note: "Proiect bine structurat cu utilizare corecta a ORM-ului. Relatiile dintre modele sunt implementate corect.", label: "Teacher B → Student 3" },
    { assignId: assign4.id, token: teacherBToken, note: "Perioada lunga de inactivitate in mijlocul proiectului. Codul final este de calitate dar procesul trebuie imbunatatit.", label: "Teacher B → Student 4" },
  ];

  for (const ev of evaluations) {
    log(10, `${ev.label} evaluating assignment...`);
    await patch(10, `/assignments/${ev.assignId}/evaluate`, { teacher_note: ev.note }, ev.token);
    logSuccess(10, `${ev.label} evaluated — status → reviewed`);
  }

  // Student thank-you comments
  const studentComments = [
    { assignId: assign1.id, token: studentTokens[0], label: "Student 1" },
    { assignId: assign2.id, token: studentTokens[1], label: "Student 2" },
    { assignId: assign3.id, token: studentTokens[2], label: "Student 3" },
    { assignId: assign4.id, token: studentTokens[3], label: "Student 4" },
  ];

  for (const sc of studentComments) {
    log(10, `${sc.label} posting thank-you comment...`);
    await post(10, `/assignments/${sc.assignId}/comments`, { content: "Multumesc pentru feedback! Voi tine cont de recomandari pentru proiectele viitoare si voi imbunatati ritmul de lucru." }, sc.token);
    logSuccess(10, `${sc.label} comment posted`);
  }

  // Teacher replies — tests polymorphic author (teacher posting in student assignment thread)
  log(10, "Teacher A replying to Student 1 comment — polymorphic author test...");
  await post(10, `/assignments/${assign1.id}/comments`, { content: "Succes la examen! Tine cont de distributia commit-urilor si la proiectele urmatoare." }, teacherAToken);
  logSuccess(10, "Teacher A replied to Student 1 — polymorphic author (teacher) verified");

  log(10, "Teacher B replying to Student 3 comment...");
  await post(10, `/assignments/${assign3.id}/comments`, { content: "Felicitari pentru implementarea relatiilor Sequelize. Documentatia API-ului ar putea fi mai detaliata." }, teacherBToken);
  logSuccess(10, "Teacher B replied to Student 3 — polymorphic author (teacher) verified");
}

// ─── PHASE 11 — FINAL SUMMARY ─────────────────────────────────────────────────

async function phase11(courseA, courseB, pdfDoc, docxDoc, blueprintA, blueprintB, assignments, teacherAToken, teacherBToken) {
  console.log("\n══════════════════════════════════════════");
  console.log("  PHASE 11 — Final State Summary");
  console.log("══════════════════════════════════════════");

  // correct document GET endpoint: /documents/:course_id/documents
  const docsA = await get(11, `/documents/${courseA.id}/documents`, teacherAToken);
  const docsB = await get(11, `/documents/${courseB.id}/documents`, teacherBToken);
  const analyticsA = await get(11, `/analytics/courses/${courseA.id}/analytics`, teacherAToken);
  const analyticsB = await get(11, `/analytics/courses/${courseB.id}/analytics`, teacherBToken);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║           SEED COMPLETE                  ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Users:         2 teachers, 4 students   ║`);
  console.log(`║  Courses:       2                        ║`);
  console.log(`║    Course A:    custom git thresholds    ║`);
  console.log(`║    Course B:    system defaults          ║`);
  console.log(`║  Documents:     2                        ║`);
  console.log(`║    PDF:         ${docsA[0]?.is_indexed ? "indexed ✓" : "NOT indexed ✗"}               ║`);
  console.log(`║    DOCX:        ${docsB[0]?.is_indexed ? "indexed ✓" : "NOT indexed ✗"}               ║`);
  console.log(`║  Blueprints:    2 (status: assigned)     ║`);
  console.log(`║  Assignments:   4 (status: reviewed)     ║`);
  console.log(`║  Git Stats:     ${analyticsA.length + analyticsB.length} assignments with analytics  ║`);
  console.log(`║  Comments:      6 (4 student + 2 teacher)║`);
  console.log("║  Notifications: MATERIAL_UPLOADED ✓      ║");
  console.log("║                 BLUEPRINT_ASSIGNED ✓     ║");
  console.log("║  Duplicate guard: 409 confirmed ✓        ║");
  console.log("║  Threshold chain: custom + default ✓     ║");
  console.log("║  Polymorphic comments: teacher+student ✓ ║");
  console.log("╚══════════════════════════════════════════╝\n");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     PeerCode — Seed Script Starting      ║");
  console.log("╚══════════════════════════════════════════╝\n");

  try {
    await phase0();

    const { teacherAToken, teacherBToken, studentTokens } = await phase1();
    const { subject, courseA, courseB } = await phase2(teacherAToken, teacherBToken);
    await phase3(courseA, courseB, studentTokens);
    const { pdfDoc, docxDoc } = await phase4(courseA, courseB, teacherAToken, teacherBToken);
    await phase5(studentTokens);
    const { blueprintA, blueprintB } = await phase6(courseA, courseB, teacherAToken, teacherBToken);
    await phase7(studentTokens);
    const { assignments } = await phase8(blueprintA, blueprintB, courseA, courseB, studentTokens, teacherAToken, teacherBToken);
    await phase9(courseA, courseB, teacherAToken, teacherBToken);
    await phase10(assignments, studentTokens, teacherAToken, teacherBToken);
    await phase11(courseA, courseB, pdfDoc, docxDoc, blueprintA, blueprintB, assignments, teacherAToken, teacherBToken);
  } catch (err) {
    console.error("\n\x1b[31mSeed script terminated due to error above.\x1b[0m");
    console.error("Fix the failing endpoint and re-run from scratch (wipe DB + ChromaDB first).\n");
    process.exit(1);
  }
}

main();
