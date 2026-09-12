// src/components/practice/pattern-sidebar.js
// Internal helper used by sheet-view.js — not router-mounted, so its API is its own
// (mount/setActive/update/unmount) rather than the section mount(container, params) contract.

import { ensureStyle } from "./_ensure-style.js";

function labelFromPatternId(patternId) {
  // getSheetProblems() only gives us the patternId slug, not a display name, so
  // prettify it: "a2z-step-1-1-arrays" -> "A2Z Step 1 1 Arrays".
  return patternId
    .split("-")
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

let rootEl = null;
let clickHandler = null;
let inputHandler = null;
let onSelectCb = null;
let itemsCache = []; // [{patternId, label, total, solved, pct}]

function itemMarkup(item, isActive) {
  return `
    <button
      type="button"
      class="pattern-sidebar__item ${isActive ? "pattern-sidebar__item--active" : ""}"
      data-pattern-id="${item.patternId ?? ""}"
      data-pattern-label="${item.label.toLowerCase()}"
    >
      <span class="pattern-sidebar__text">
        <span class="pattern-sidebar__label">${item.label}</span>
        <span class="pattern-sidebar__sub">${item.solved}/${item.total} solved</span>
      </span>
      <span class="pattern-sidebar__badge">${item.pct}%</span>
    </button>`;
}

function renderList(container, activePatternId) {
  const list = container.querySelector(".pattern-sidebar__list");
  list.innerHTML = itemsCache
    .map((item) => itemMarkup(item, (item.patternId || null) === activePatternId))
    .join("");
}

/**
 * @param {{
 *   patterns: Array<{patternId, label, total, solved}>,
 *   allSummary: {total, solved},
 *   activePatternId: string|null,
 *   onSelect: (patternId: string|null) => void
 * }} opts
 */
export function mount(container, { patterns, allSummary, activePatternId, onSelect }) {
  ensureStyle("/src/components/practice/pattern-sidebar.css");
  rootEl = container;
  onSelectCb = onSelect;

  const pct = (solved, total) => (total ? Math.round((solved / total) * 100) : 0);

  itemsCache = [
    {
      patternId: null,
      label: "All Patterns",
      total: allSummary.total,
      solved: allSummary.solved,
      pct: pct(allSummary.solved, allSummary.total),
    },
    ...patterns.map((p) => ({
      patternId: p.patternId,
      label: labelFromPatternId(p.patternId),
      total: p.total,
      solved: p.solved,
      pct: pct(p.solved, p.total),
    })),
  ];

  container.innerHTML = `
    <nav class="pattern-sidebar" aria-label="Patterns">
      <span class="pattern-sidebar__heading">Pattern</span>
      <input
        type="text"
        class="pattern-sidebar__search"
        placeholder="Search pattern"
        aria-label="Search pattern"
      />
      <div class="pattern-sidebar__list"></div>
    </nav>
  `;

  renderList(container, activePatternId);

  clickHandler = (event) => {
    const btn = event.target.closest(".pattern-sidebar__item");
    if (!btn) return;
    onSelectCb?.(btn.dataset.patternId || null);
  };
  container.addEventListener("click", clickHandler);

  inputHandler = (event) => {
    if (!event.target.classList.contains("pattern-sidebar__search")) return;
    const q = event.target.value.trim().toLowerCase();
    container.querySelectorAll(".pattern-sidebar__item").forEach((btn) => {
      btn.hidden = !btn.dataset.patternLabel.includes(q);
    });
  };
  container.addEventListener("input", inputHandler);
}

export function setActive(patternId) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".pattern-sidebar__item").forEach((btn) => {
    const isActive = (btn.dataset.patternId || null) === patternId;
    btn.classList.toggle("pattern-sidebar__item--active", isActive);
  });
}

/** Called by sheet-view after ticked/revision state changes so counts stay live. */
export function update({ patterns, allSummary, activePatternId }) {
  if (!rootEl) return;
  const pct = (solved, total) => (total ? Math.round((solved / total) * 100) : 0);
  itemsCache = [
    {
      patternId: null,
      label: "All Patterns",
      total: allSummary.total,
      solved: allSummary.solved,
      pct: pct(allSummary.solved, allSummary.total),
    },
    ...patterns.map((p) => ({
      patternId: p.patternId,
      label: labelFromPatternId(p.patternId),
      total: p.total,
      solved: p.solved,
      pct: pct(p.solved, p.total),
    })),
  ];
  renderList(rootEl, activePatternId);
}

export function unmount() {
  if (rootEl) {
    if (clickHandler) rootEl.removeEventListener("click", clickHandler);
    if (inputHandler) rootEl.removeEventListener("input", inputHandler);
  }
  rootEl = null;
  clickHandler = null;
  inputHandler = null;
  onSelectCb = null;
  itemsCache = [];
}
