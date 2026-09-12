import { navigateTo } from "../../router/router.js";
import { SECTIONS } from "../../data/sheet-metadata.js";

let container = null;
let isOpen = false;
let inputEl = null;

function filterSections(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SECTIONS;
  return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
}

function renderResults(query) {
  const resultsEl = container.querySelector("#search-overlay-results");
  if (!resultsEl) return;
  const results = filterSections(query);

  // TODO(Phase 6): once src/data/sheet-metadata.js carries real sheet entries and
  // problems are migrated into Firestore (sheets/{sheetId}/patterns/{patternId}/problems),
  // extend filterSections() to also search problem titles and render them here as a
  // second, separate result group that deep-links via navigateTo("practice", { sheetId, questionId }).

  resultsEl.innerHTML = results
    .map(
      (s) => `<button class="search-overlay__result" data-section="${s.id}">${s.label}</button>`
    )
    .join("");

  resultsEl.querySelectorAll(".search-overlay__result").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
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
          placeholder="Search sections…"
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
