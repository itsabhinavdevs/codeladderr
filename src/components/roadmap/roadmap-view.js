import { getState } from "../../state/store.js";
import {
  getSheetProblems,
  getSubDoc,
  getAllSubDocs,
  getUserDoc,
} from "../../firebase/firestore.js";
import { navigateTo } from "../../router/router.js";
import { getDifficultyColor } from "../../utils/difficulty-colors.js";
import { formatDateId, todayId } from "../../utils/date.js";
import * as sheetMetadata from "../../data/sheet-metadata.js";

// Roadmap = a pannable/zoomable tree of DSA topics (left) + a stats/streak
// sidebar (right). The stats and streak-calendar widgets here overlap with
// what Phase 5's Dashboard will eventually show — they're built here because
// this page specifically asked for them, reusing the same contract functions
// (getSheetProblems / getSubDoc / getAllSubDocs) Dashboard would use.

const SHEET_IDS = [
  "dsa-patterns",
  "a2z",
  "blind75",
  "master-dsa",
  "risingbrain",
  "risingbrain-last100",
  "algomaster",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const NODE_W = 150;
const NODE_H = 40;

// Fixed tree layout (canvas-local coordinates). Every topic maps to the "a2z"
// sheet (the one comprehensive sheet spanning all patterns) except the final
// "Mixed Revision" node, which goes straight to the Revision section.
const NODES = [
  { id: "arrays-hashing", label: "Arrays & Hashing", x: 650, y: 50, sheetId: "a2z" },
  { id: "two-pointers", label: "Two Pointers", x: 500, y: 150, sheetId: "a2z" },
  { id: "stack", label: "Stack", x: 820, y: 150, sheetId: "a2z" },
  { id: "binary-search", label: "Binary Search", x: 430, y: 250, sheetId: "a2z" },
  { id: "sliding-window", label: "Sliding Window", x: 610, y: 250, sheetId: "a2z" },
  { id: "linked-list", label: "Linked List", x: 820, y: 250, sheetId: "a2z" },
  { id: "trees", label: "Trees", x: 650, y: 350, sheetId: "a2z" },
  { id: "fast-slow", label: "Fast & Slow", x: 560, y: 450, sheetId: "a2z" },
  { id: "backtracking", label: "Backtracking", x: 820, y: 450, sheetId: "a2z" },
  { id: "heap-pq", label: "Heap / Priority Queue", x: 560, y: 550, sheetId: "a2z" },
  { id: "graphs", label: "Graphs", x: 780, y: 550, sheetId: "a2z" },
  { id: "dp-1d", label: "1-D DP", x: 970, y: 550, sheetId: "a2z" },
  { id: "intervals", label: "Intervals", x: 380, y: 650, sheetId: "a2z" },
  { id: "kadane-greedy", label: "Kadane / Greedy", x: 560, y: 650, sheetId: "a2z" },
  { id: "advanced-graphs", label: "Advanced Graphs", x: 760, y: 650, sheetId: "a2z" },
  { id: "dp-2d", label: "2-D DP", x: 930, y: 650, sheetId: "a2z" },
  { id: "prefix-sum", label: "Prefix Sum", x: 1100, y: 650, sheetId: "a2z" },
  { id: "mixed-revision", label: "Mixed Revision", subtitle: "revise", x: 930, y: 750, sheetId: null },
];

const EDGES = [
  ["arrays-hashing", "two-pointers"],
  ["arrays-hashing", "stack"],
  ["two-pointers", "binary-search"],
  ["two-pointers", "sliding-window"],
  ["stack", "linked-list"],
  ["binary-search", "trees"],
  ["sliding-window", "trees"],
  ["linked-list", "trees"],
  ["trees", "fast-slow"],
  ["trees", "backtracking"],
  ["fast-slow", "heap-pq"],
  ["backtracking", "graphs"],
  ["backtracking", "dp-1d"],
  ["heap-pq", "intervals"],
  ["heap-pq", "kadane-greedy"],
  ["graphs", "advanced-graphs"],
  ["dp-1d", "dp-2d"],
  ["dp-1d", "prefix-sum"],
  ["intervals", "mixed-revision"],
  ["kadane-greedy", "mixed-revision"],
  ["advanced-graphs", "mixed-revision"],
  ["dp-2d", "mixed-revision"],
  ["prefix-sum", "mixed-revision"],
];

const CANVAS_W = 1300;
const CANVAS_H = 820;

// concepts-view.js seeds a new user's Concepts list from this on first visit.
// Derived from NODES so the two stay in sync automatically.
export const ROADMAP_TOPICS = NODES.map((n) => ({ id: n.id, label: n.label }));

let root = null;
let canvasEl = null;
let statsSlotEl = null;
let calendarSlotEl = null;

let zoom = 0.85;
let panX = 0;
let panY = 0;
let dragging = false;
let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

let sheetsData = []; // [{sheetId, problems, ticked}]
let statsScope = "all"; // "all" | a sheetId
let statsLoading = true;

let contributions = {}; // { [dateId]: count }
let lastActiveDate = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-indexed
let countdownInterval = null;
let noticeTimeout = null;
let noticeText = "";

function uid() {
  return getState().user?.uid ?? null;
}

// ---------------------------------------------------------------------------
// Tree canvas
// ---------------------------------------------------------------------------

function edgePath(from, to) {
  const x1 = from.x;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y - NODE_H / 2;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function handleNodeClick(node) {
  if (node.sheetId) {
    navigateTo("practice", { sheetId: node.sheetId });
  } else {
    navigateTo("revision");
  }
}

function renderCanvasInner() {
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const paths = EDGES.map(
    ([fromId, toId]) =>
      `<path d="${edgePath(nodeMap.get(fromId), nodeMap.get(toId))}" class="roadmap-view__edge" />`
  ).join("");

  const nodesHtml = NODES.map(
    (node) => `
      <button
        type="button"
        class="roadmap-view__node"
        data-node-id="${node.id}"
        style="left:${node.x - NODE_W / 2}px; top:${node.y - NODE_H / 2}px; width:${NODE_W}px;"
      >
        ${node.label}${node.subtitle ? `<span class="roadmap-view__node-subtitle">${node.subtitle}</span>` : ""}
      </button>`
  ).join("");

  return `
    <svg class="roadmap-view__edges" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${CANVAS_W}" height="${CANVAS_H}">
      ${paths}
    </svg>
    ${nodesHtml}
  `;
}

function applyTransform() {
  const inner = canvasEl.querySelector(".roadmap-view__canvas-inner");
  if (inner) {
    inner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
}

function setZoom(next) {
  zoom = Math.min(2, Math.max(0.4, next));
  applyTransform();
}

function attachCanvasInteractions() {
  const viewport = canvasEl.querySelector(".roadmap-view__canvas-viewport");

  viewport.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".roadmap-view__node")) return;
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, panX, panY };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("roadmap-view__canvas-viewport--dragging");
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    panX = dragStart.panX + (e.clientX - dragStart.x);
    panY = dragStart.panY + (e.clientY - dragStart.y);
    applyTransform();
  });

  const stopDrag = () => {
    dragging = false;
    viewport.classList.remove("roadmap-view__canvas-viewport--dragging");
  };
  viewport.addEventListener("pointerup", stopDrag);
  viewport.addEventListener("pointerleave", stopDrag);

  canvasEl.querySelector('[data-zoom="in"]').addEventListener("click", () => setZoom(zoom + 0.15));
  canvasEl.querySelector('[data-zoom="out"]').addEventListener("click", () => setZoom(zoom - 0.15));
  canvasEl.querySelector('[data-zoom="reset"]').addEventListener("click", () => {
    zoom = 0.85;
    panX = 0;
    panY = 0;
    applyTransform();
    canvasEl.classList.toggle("roadmap-view__canvas--fullscreen");
  });

  canvasEl.querySelectorAll(".roadmap-view__node").forEach((btn) => {
    btn.addEventListener("click", () => {
      const node = NODES.find((n) => n.id === btn.dataset.nodeId);
      if (node) handleNodeClick(node);
    });
  });
}

function renderCanvas() {
  canvasEl.innerHTML = `
    <div class="roadmap-view__canvas-viewport">
      <div class="roadmap-view__canvas-inner">
        ${renderCanvasInner()}
      </div>
    </div>
    <div class="roadmap-view__zoom-controls">
      <button type="button" class="roadmap-view__zoom-btn" data-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" class="roadmap-view__zoom-btn" data-zoom="out" aria-label="Zoom out">&minus;</button>
      <button type="button" class="roadmap-view__zoom-btn" data-zoom="reset" aria-label="Toggle fullscreen">&#x26F6;</button>
    </div>
  `;
  applyTransform();
  attachCanvasInteractions();
}

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

function computeStats() {
  const relevant =
    statsScope === "all" ? sheetsData : sheetsData.filter((s) => s.sheetId === statsScope);

  const counts = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };

  relevant.forEach(({ problems, ticked }) => {
    problems.forEach((p) => {
      const bucket = counts[p.difficulty];
      if (!bucket) return;
      bucket.total += 1;
      if (ticked[p.id]) bucket.solved += 1;
    });
  });

  const total = DIFFICULTIES.reduce((sum, d) => sum + counts[d].total, 0);
  const solved = DIFFICULTIES.reduce((sum, d) => sum + counts[d].solved, 0);
  return { counts, total, solved };
}

function scopeOptionsMarkup() {
  const options = SHEET_IDS.map((id) => {
    const meta = sheetMetadata.getSheetMeta?.(id);
    return `<option value="${id}" ${statsScope === id ? "selected" : ""}>${meta?.name || id}</option>`;
  }).join("");
  return `<option value="all" ${statsScope === "all" ? "selected" : ""}>All Questions</option>${options}`;
}

function showNotice(text) {
  noticeText = text;
  clearTimeout(noticeTimeout);
  renderStats();
  noticeTimeout = setTimeout(() => {
    noticeText = "";
    renderStats();
  }, 2500);
}

function renderStats() {
  if (!statsSlotEl) return;

  if (statsLoading) {
    statsSlotEl.innerHTML = `<div class="roadmap-view__stats-loading">Loading progress&hellip;</div>`;
    return;
  }

  const { counts, total, solved } = computeStats();
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  statsSlotEl.innerHTML = `
    <div class="roadmap-view__stats-top">
      <div class="roadmap-view__stats-rows">
        ${DIFFICULTIES.map(
          (d) => `
          <div class="roadmap-view__stats-row">
            <span class="roadmap-view__stats-label" style="color:${getDifficultyColor(d)}">${d}</span>
            <span class="roadmap-view__stats-value">${counts[d].solved}/${counts[d].total}</span>
          </div>`
        ).join("")}
      </div>
      <div class="roadmap-view__ring">
        <svg viewBox="0 0 120 120" width="96" height="96">
          <circle cx="60" cy="60" r="54" class="roadmap-view__ring-track" />
          <circle cx="60" cy="60" r="54" class="roadmap-view__ring-value"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
        </svg>
        <span class="roadmap-view__ring-label">${solved}/${total}</span>
      </div>
    </div>

    <div class="roadmap-view__total-box">
      <span class="roadmap-view__total-label">Total Questions</span>
      <span class="roadmap-view__total-value">${total}</span>
    </div>

    <select class="roadmap-view__scope-select" aria-label="Stats scope">
      ${scopeOptionsMarkup()}
    </select>

    <div class="roadmap-view__actions">
      <button type="button" class="roadmap-view__action-btn" data-action="refresh" aria-label="Refresh">&#8635;</button>
      <button type="button" class="roadmap-view__action-btn" data-action="help" aria-label="Help">?</button>
      <button type="button" class="roadmap-view__action-btn" data-action="settings" aria-label="Settings">&#9881;</button>
    </div>

    ${noticeText ? `<p class="roadmap-view__notice">${noticeText}</p>` : ""}
  `;

  statsSlotEl.querySelector(".roadmap-view__scope-select").addEventListener("change", (e) => {
    statsScope = e.target.value;
    renderStats();
  });

  statsSlotEl.querySelector('[data-action="refresh"]').addEventListener("click", async () => {
    statsLoading = true;
    renderStats();
    await loadStats();
    statsLoading = false;
    renderStats();
  });

  statsSlotEl.querySelector('[data-action="help"]').addEventListener("click", () => {
    showNotice("Progress is tallied across every sheet's problems and your ticked checkboxes in Practice.");
  });

  statsSlotEl.querySelector('[data-action="settings"]').addEventListener("click", () => {
    showNotice("Settings is coming in a later phase.");
  });
}

async function loadStats() {
  const u = uid();
  if (!u) {
    sheetsData = [];
    return;
  }
  sheetsData = await Promise.all(
    SHEET_IDS.map(async (sheetId) => {
      const [problems, progress] = await Promise.all([
        getSheetProblems(sheetId),
        getSubDoc(u, "progress", sheetId),
      ]);
      return { sheetId, problems, ticked: (progress && progress.ticked) || {} };
    })
  );
}

// ---------------------------------------------------------------------------
// Streak calendar card
// ---------------------------------------------------------------------------

function msUntilLocalMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function renderCalendar() {
  if (!calendarSlotEl) return;

  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = todayId();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(`<span class="roadmap-view__cal-cell roadmap-view__cal-cell--empty"></span>`);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateId = formatDateId(new Date(calendarYear, calendarMonth, day));
    const hasActivity = (contributions[dateId] || 0) > 0;
    const isToday = dateId === today;
    const isLastActive = dateId === lastActiveDate;

    const classes = ["roadmap-view__cal-cell"];
    if (isToday) classes.push("roadmap-view__cal-cell--today");
    else if (isLastActive) classes.push("roadmap-view__cal-cell--last-active");

    cells.push(`
      <span class="${classes.join(" ")}">
        ${day}
        ${hasActivity && !isLastActive ? '<span class="roadmap-view__cal-dot"></span>' : ""}
      </span>
    `);
  }

  const streak = getState().streak || 0;

  calendarSlotEl.innerHTML = `
    <div class="roadmap-view__cal-nav">
      <button type="button" class="roadmap-view__cal-nav-btn" data-cal-nav="prev" aria-label="Previous month">&lsaquo;</button>
      <span class="roadmap-view__cal-month">${monthLabel}</span>
      <button type="button" class="roadmap-view__cal-nav-btn" data-cal-nav="next" aria-label="Next month">&rsaquo;</button>
    </div>

    <div class="roadmap-view__cal-streak-row">
      <span class="roadmap-view__cal-streak">Streak ${streak} day${streak === 1 ? "" : "s"}</span>
      <span class="roadmap-view__cal-countdown" data-countdown>${formatCountdown(msUntilLocalMidnight())} left</span>
    </div>

    <div class="roadmap-view__cal-weekdays">
      ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span>${d}</span>`).join("")}
    </div>
    <div class="roadmap-view__cal-grid">${cells.join("")}</div>
  `;

  calendarSlotEl.querySelector('[data-cal-nav="prev"]').addEventListener("click", () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar();
  });

  calendarSlotEl.querySelector('[data-cal-nav="next"]').addEventListener("click", () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
  });
}

function startCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const el = calendarSlotEl?.querySelector("[data-countdown]");
    if (el) el.textContent = `${formatCountdown(msUntilLocalMidnight())} left`;
  }, 1000);
}

async function loadCalendarData() {
  const u = uid();
  if (!u) {
    contributions = {};
    lastActiveDate = null;
    return;
  }
  const [contribDocs, userDoc] = await Promise.all([
    getAllSubDocs(u, "contributions"),
    getUserDoc(u),
  ]);
  contributions = Object.fromEntries(contribDocs.map((d) => [d.id, d.count || 0]));
  lastActiveDate = userDoc?.lastActiveDate || null;
}

// ---------------------------------------------------------------------------
// Mount / unmount
// ---------------------------------------------------------------------------

export async function mount(container) {
  root = container;
  zoom = 0.85;
  panX = 0;
  panY = 0;
  statsLoading = true;
  statsScope = "all";
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();

  root.innerHTML = `
    <div class="roadmap-view">
      <div class="roadmap-view__canvas" data-canvas></div>
      <aside class="roadmap-view__sidebar">
        <div class="roadmap-view__stats-card" data-stats-slot></div>
        <div class="roadmap-view__calendar-card" data-calendar-slot></div>
      </aside>
    </div>
  `;

  canvasEl = root.querySelector("[data-canvas]");
  statsSlotEl = root.querySelector("[data-stats-slot]");
  calendarSlotEl = root.querySelector("[data-calendar-slot]");

  renderCanvas();
  renderStats();
  renderCalendar();
  startCountdown();

  await Promise.all([loadStats(), loadCalendarData()]);

  // mount() may resolve after unmount() was called (fast section switching).
  if (root !== container) return;

  statsLoading = false;
  renderStats();
  renderCalendar();
}

export function unmount() {
  clearInterval(countdownInterval);
  clearTimeout(noticeTimeout);
  countdownInterval = null;
  noticeTimeout = null;
  root = null;
  canvasEl = null;
  statsSlotEl = null;
  calendarSlotEl = null;
  sheetsData = [];
  contributions = {};
  lastActiveDate = null;
}
