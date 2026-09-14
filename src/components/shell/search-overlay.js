import { navigateTo } from "../../router/router.js";
import { SECTIONS, SHEETS } from "../../data/sheet-metadata.js";
import { getSheetProblems } from "../../firebase/firestore.js";
// NOTE: assumes Phase 3's sheet-metadata.js exports the 7-sheet array as
// `SHEETS` alongside `SECTIONS`. Rename this import if Phase 3 used a
// different name.

let container = null;
let isOpen = false;
let inputEl = null;

// Populated lazily the first time the overlay is opened, then reused for
// every keystroke after that — avoids re-fetching all 7 sheets on every
// character typed. Array<{id, sheetId, patternId, title, difficulty}>.
let problemCache = null;
let isLoadingProblems = false;

function filterSections(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SECTIONS;
  return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
}

function filterProblems(query) {
  const q = query.trim().toLowerCase();
  if (!q || !problemCache) return [];
  return problemCache.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 8);
}

// Fetches and caches every sheet's problems once, per Phase 6's task list.
async function ensureProblemCache() {
  if (problemCache || isLoadingProblems) return;
  isLoadingProblems = true;

  try {
    const perSheet = await Promise.all(
      SHEETS.map(async (sheet) => {
        const problems = await getSheetProblems(sheet.id);
        return problems.map((p) => ({ ...p, sheetId: sheet.id }));
      })
    );
    problemCache = perSheet.flat();
  } catch (err) {
    console.error("[search-overlay] failed to load problem cache", err);
    problemCache = [];
  } finally {
    isLoadingProblems = false;
    if (inputEl && isOpen) renderResults(inputEl.value);
  }
}

function renderResults(query) {
  const resultsEl = container.querySelector("#search-overlay-results");
  if (!resultsEl) return;

  const sectionResults = filterSections(query);
  const problemResults = filterProblems(query);
  const q = query.trim();

  if (!sectionResults.length && !problemResults.length) {
    resultsEl.innerHTML = `<div class="search-overlay__empty">${
      q
        ? isLoadingProblems
          ? "Loading problems…"
          : "No matches."
        : "Type to search sections or problems."
    }</div>`;
    return;
  }

  const sectionsHtml = sectionResults.length
    ? `<div class="search-overlay__group-heading">Sections</div>` +
      sectionResults
        .map((s) => `<button class="search-overlay__result" data-section="${s.id}">${s.label}</button>`)
        .join("")
    : "";

  const problemsHtml = problemResults.length
    ? `<div class="search-overlay__group-heading">Problems</div>` +
      problemResults
        .map(
          (p) =>
            `<button class="search-overlay__result" data-sheet-id="${p.sheetId}" data-question-id="${p.id}"></button>`
        )
        .join("")
    : "";

  resultsEl.innerHTML = sectionsHtml + problemsHtml;

  // Set text via textContent to avoid interpreting problem titles as markup.
  resultsEl.querySelectorAll("[data-question-id]").forEach((btn, i) => {
    btn.textContent = problemResults[i].title;
  });

  resultsEl.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
      close();
    });
  });

  resultsEl.querySelectorAll("[data-question-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo("practice", { sheetId: btn.dataset.sheetId, questionId: btn.dataset.questionId });
      close();
    });
  });
}

function render() {
  if (!container) return;
  container.innerHTML = `
    <div class="search-overlay${isOpen ? " search-overlay--open" : ""}" id="search-overlay">
      <div class="search-overlay__backdrop" id="search-overlay-backdrop"></div>
      <div class="search-overlay__panel">
        <input
          class="search-overlay__input"
          id="search-overlay-input"
          type="text"
          placeholder="Search sections or problems…"
          autocomplete="off"
        />
        <div class="search-overlay__results" id="search-overlay-results"></div>
      </div>
    </div>
  `;

  inputEl = container.querySelector("#search-overlay-input");
  inputEl.addEventListener("input", () => renderResults(inputEl.value));
  container.querySelector("#search-overlay-backdrop").addEventListener("click", close);
  renderResults("");

  if (isOpen) {
    inputEl.focus();
  }
}

function onKeydown(event) {
  if (event.key === "Escape") close();
}

export function open() {
  isOpen = true;
  render();
  document.addEventListener("keydown", onKeydown);
  ensureProblemCache();
}

export function close() {
  isOpen = false;
  render();
  document.removeEventListener("keydown", onKeydown);
}

export function toggle() {
  if (isOpen) {
    close();
  } else {
    open();
  }
}

export function mount(el) {
  container = el;
  render();
}

export function unmount() {
  document.removeEventListener("keydown", onKeydown);
  container = null;
  isOpen = false;
}
