// src/components/practice/sheet-view.js
// Not router-mounted directly — practice-hub.js delegates here when params.sheetId is set.
// Exports mount/unmount so practice-hub can treat it the same way the router treats a section.

import { navigateTo } from "../../router/router.js";
import { getSubDoc, getSheetProblems, getAllSubDocs } from "../../firebase/firestore.js";
import { getState } from "../../state/store.js";
import { getDifficultyColor } from "../../utils/difficulty-colors.js";
import { getSheetMeta, getPatternOrder } from "../../data/sheet-metadata.js";
import * as patternSidebar from "./pattern-sidebar.js";
import * as problemRow from "./problem-row.js";
import * as notesModal from "./notes-editor-modal.js";
import { ensureStyle } from "./_ensure-style.js";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

let rootEl = null;
let clickHandler = null;
let inputHandler = null;
let changeHandler = null;
let highlightTimeout = null;

let allProblems = []; // [{id, patternId, title, difficulty, problemUrl, videoUrl}]
let ticked = {}; // {[questionId]: true}
let revisionIds = new Set(); // questionIds marked for revision, scoped to this sheet
let activeTab = "all"; // "all" | "revision"
let activePatternId = null; // null = all patterns
let searchTerm = "";
let difficultyFilter = null; // null = all
let currentSheetId = null;

function labelFromPatternId(patternId) {
  return patternId
    .split("-")
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function groupByPattern(problems) {
  const map = new Map();
  problems.forEach((p) => {
    if (!map.has(p.patternId)) map.set(p.patternId, []);
    map.get(p.patternId).push(p);
  });
  return map;
}

function patternSummaries() {
  const grouped = groupByPattern(allProblems);
  const summaries = [...grouped.entries()].map(([patternId, problems]) => ({
    patternId,
    total: problems.length,
    solved: problems.filter((p) => ticked[p.id]).length,
  }));

  const order = getPatternOrder(currentSheetId);
  if (order) {
    const rank = new Map(order.map((id, i) => [id, i]));
    summaries.sort((a, b) => {
      const ra = rank.has(a.patternId) ? rank.get(a.patternId) : Infinity;
      const rb = rank.has(b.patternId) ? rank.get(b.patternId) : Infinity;
      if (ra !== rb) return ra - rb;
      return a.patternId.localeCompare(b.patternId); // unlisted ids: alphabetical fallback
    });
  }

  return summaries;
}

function overallSummary() {
  return { total: allProblems.length, solved: allProblems.filter((p) => ticked[p.id]).length };
}

function visibleProblems() {
  return allProblems.filter((p) => {
    if (activeTab === "revision" && !revisionIds.has(p.id)) return false;
    if (activePatternId && p.patternId !== activePatternId) return false;
    if (difficultyFilter && p.difficulty !== difficultyFilter) return false;
    if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
}

function renderProgressPanel() {
  const { total, solved } = overallSummary();
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const easy = allProblems.filter((p) => p.difficulty === "Easy");
  const medium = allProblems.filter((p) => p.difficulty === "Medium");
  const hard = allProblems.filter((p) => p.difficulty === "Hard");
  const solvedOf = (list) => list.filter((p) => ticked[p.id]).length;

  return `
    <div class="sheet-view__panel">
      <div class="sheet-view__ring" style="--ring-pct:${pct}">
        <span class="sheet-view__ring-value">${pct}%</span>
      </div>
      <div class="sheet-view__panel-text">
        <span class="sheet-view__panel-label">Overall Progress</span>
        <span class="sheet-view__panel-value">${solved} / ${total}</span>
      </div>
      <div class="sheet-view__legend">
        ${[
          ["Easy", easy],
          ["Medium", medium],
          ["Hard", hard],
        ]
          .map(
            ([label, list]) => `
          <span class="sheet-view__legend-item">
            <span class="sheet-view__legend-dot" style="background:${getDifficultyColor(label)}"></span>
            ${label} <strong>${solvedOf(list)}/${list.length}</strong>
          </span>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function patternOptionsMarkup() {
  const summaries = patternSummaries();
  return `
    <option value="">All problems</option>
    ${summaries
      .map((s) => `<option value="${s.patternId}">${labelFromPatternId(s.patternId)}</option>`)
      .join("")}
  `;
}

function renderRows(container) {
  const list = container.querySelector(".problem-table__rows");
  const rows = visibleProblems();
  list.innerHTML = "";

  if (!rows.length) {
    list.innerHTML = `<div class="problem-table__empty">No questions match this view.</div>`;
  } else {
    rows.forEach((problem) => {
      const rowEl = problemRow.render(problem, {
        ticked: !!ticked[problem.id],
        revision: revisionIds.has(problem.id),
        sheetId: currentSheetId,
        onTickChange: (nowTicked) => {
          ticked[problem.id] = nowTicked;
          refreshSummaries(container);
        },
        onRevisionChange: (nowRevision) => {
          if (nowRevision) revisionIds.add(problem.id);
          else revisionIds.delete(problem.id);
          if (activeTab === "revision") renderRows(container);
        },
        onNotesClick: () => notesModal.open(problem, currentSheetId),
        onTitleClick: () => navigateTo("practice", { sheetId: currentSheetId, questionId: problem.id }),
      });
      list.appendChild(rowEl);
    });
  }

  const solved = allProblems.filter((p) => ticked[p.id]).length;
  container.querySelector(".sheet-view__subtitle").textContent =
    `${rows.length}/${allProblems.length} shown \u00b7 ${solved}/${allProblems.length} solved overall`;
}

function refreshSummaries(container) {
  container.querySelector(".sheet-view__panel-slot").innerHTML = renderProgressPanel();
  patternSidebar.update({
    patterns: patternSummaries(),
    allSummary: overallSummary(),
    activePatternId,
  });
}

export async function mount(container, params = {}) {
  ensureStyle("/src/components/practice/sheet-view.css");
  ensureStyle("/src/components/practice/problem-table.css");
  rootEl = container;
  currentSheetId = params.sheetId;
  activeTab = "all";
  activePatternId = null;
  searchTerm = "";
  difficultyFilter = null;

  const meta = getSheetMeta(currentSheetId);
  container.innerHTML = `
    <section class="sheet-view">
      <header class="sheet-view__header">
        <div class="sheet-view__heading">
          <span class="sheet-view__eyebrow">Practice</span>
          <h1 class="sheet-view__title">${meta ? meta.name : currentSheetId}</h1>
          <p class="sheet-view__subtitle">Loading&hellip;</p>
        </div>
        <button class="sheet-view__back" type="button">&larr; Back</button>
      </header>

      <div class="sheet-view__panel-slot"></div>

      <div class="sheet-view__toolbar">
        <div class="sheet-view__tabs" role="tablist">
          <button type="button" class="sheet-view__tab sheet-view__tab--active" data-tab="all" role="tab" aria-selected="true">All Problems</button>
          <button type="button" class="sheet-view__tab" data-tab="revision" role="tab" aria-selected="false">Revision</button>
        </div>
        <input class="sheet-view__search" type="search" placeholder="Search problems..." />
        <select class="sheet-view__select sheet-view__pattern-select" aria-label="Filter by pattern">
          ${patternOptionsMarkup()}
        </select>
        <select class="sheet-view__select sheet-view__difficulty-select" aria-label="Filter by difficulty">
          <option value="">Difficulty</option>
          ${DIFFICULTIES.map((d) => `<option value="${d}">${d}</option>`).join("")}
        </select>
        <button type="button" class="sheet-view__random">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          Random Problem
        </button>
      </div>

      <div class="sheet-view__body">
        <aside class="sheet-view__sidebar" data-pattern-sidebar></aside>
        <div class="problem-table">
          <div class="problem-table__head">
            <span>Question</span>
            <span>Resource</span>
            <span>Practice</span>
            <span>Note</span>
            <span>Revision</span>
            <span>Difficulty</span>
          </div>
          <div class="problem-table__rows" aria-live="polite"></div>
        </div>
      </div>
    </section>
  `;

  const { user } = getState();
  const [problems, progressDoc, questionDataDocs] = await Promise.all([
    getSheetProblems(currentSheetId),
    user ? getSubDoc(user.uid, "progress", currentSheetId) : Promise.resolve(null),
    user ? getAllSubDocs(user.uid, "questionData") : Promise.resolve([]),
  ]);

  // mount() may resolve after unmount() was called (fast section switching) — bail out.
  if (rootEl !== container) return;

  allProblems = problems;
  ticked = (progressDoc && progressDoc.ticked) || {};
  revisionIds = new Set(
    questionDataDocs.filter((d) => d.sheetId === currentSheetId && d.revision).map((d) => d.id)
  );

  container.querySelector(".sheet-view__panel-slot").innerHTML = renderProgressPanel();
  container.querySelector(".sheet-view__pattern-select").innerHTML = patternOptionsMarkup();

  patternSidebar.mount(container.querySelector("[data-pattern-sidebar]"), {
    patterns: patternSummaries(),
    allSummary: overallSummary(),
    activePatternId,
    onSelect: (patternId) => {
      activePatternId = patternId === activePatternId ? null : patternId;
      patternSidebar.setActive(activePatternId);
      container.querySelector(".sheet-view__pattern-select").value = activePatternId || "";
      renderRows(container);
    },
  });

  renderRows(container);

  clickHandler = (event) => {
    if (event.target.closest(".sheet-view__back")) {
      navigateTo("practice");
      return;
    }

    const tabBtn = event.target.closest(".sheet-view__tab");
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      container.querySelectorAll(".sheet-view__tab").forEach((btn) => {
        const isActive = btn === tabBtn;
        btn.classList.toggle("sheet-view__tab--active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      renderRows(container);
      return;
    }

    if (event.target.closest(".sheet-view__random")) {
      const rows = visibleProblems();
      if (!rows.length) return;
      const pick = rows[Math.floor(Math.random() * rows.length)];
      const target = container.querySelector(`[data-question-id="${pick.id}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("problem-row--highlight");
        clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => target.classList.remove("problem-row--highlight"), 2000);
      }
    }
  };
  container.addEventListener("click", clickHandler);

  inputHandler = (event) => {
    if (!event.target.classList.contains("sheet-view__search")) return;
    searchTerm = event.target.value;
    renderRows(container);
  };
  container.addEventListener("input", inputHandler);

  changeHandler = (event) => {
    if (event.target.classList.contains("sheet-view__pattern-select")) {
      activePatternId = event.target.value || null;
      patternSidebar.setActive(activePatternId);
      renderRows(container);
      return;
    }
    if (event.target.classList.contains("sheet-view__difficulty-select")) {
      difficultyFilter = event.target.value || null;
      renderRows(container);
    }
  };
  container.addEventListener("change", changeHandler);

  if (params.patternId) {
    activePatternId = params.patternId;
    patternSidebar.setActive(activePatternId);
    container.querySelector(".sheet-view__pattern-select").value = activePatternId;
    renderRows(container);
  }

  if (params.questionId) {
    requestAnimationFrame(() => {
      const target = container.querySelector(`[data-question-id="${params.questionId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("problem-row--highlight");
      }
    });
  }
}

export function unmount() {
  notesModal.close();
  patternSidebar.unmount();
  clearTimeout(highlightTimeout);
  if (rootEl) {
    if (clickHandler) rootEl.removeEventListener("click", clickHandler);
    if (inputHandler) rootEl.removeEventListener("input", inputHandler);
    if (changeHandler) rootEl.removeEventListener("change", changeHandler);
  }
  clickHandler = null;
  inputHandler = null;
  changeHandler = null;
  rootEl = null;
  allProblems = [];
  ticked = {};
  revisionIds = new Set();
}
