// src/components/practice/practice-hub.js
// Router mounts THIS file for the "practice" section (contract: mount/unmount).
// With no sheetId param -> render the hub (hero + goal banner + search + sheet list).
// With params.sheetId    -> delegate to sheet-view.js (deep link into a sheet/question).

import { navigateTo } from "../../router/router.js";
import { SHEETS } from "../../data/sheet-metadata.js";
import { getState, subscribe } from "../../state/store.js";
import * as sheetView from "./sheet-view.js";
import { ensureStyle } from "./_ensure-style.js";
import { LADDER_LOGO_SVG } from "../shell/ladder-logo.js";

let rootEl = null;
let clickHandler = null;
let inputHandler = null;
let storeUnsubscribe = null;

function sheetCardMarkup(sheet) {
  return `
    <button
      class="practice-hub__card"
      role="listitem"
      data-sheet-id="${sheet.id}"
      data-sheet-name="${sheet.name.toLowerCase()}"
      style="--card-accent:${sheet.accent}"
    >
      <img class="practice-hub__logo" src="${sheet.logoPath}" alt="" />
      <span class="practice-hub__card-text">
        <span class="practice-hub__name">${sheet.name}</span>
        <span class="practice-hub__desc">${sheet.description}</span>
      </span>
      <span class="practice-hub__arrow" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>`;
}

function renderList(container) {
  const list = container.querySelector(".practice-hub__list");
  if (list) list.innerHTML = SHEETS.map(sheetCardMarkup).join("");
}

function applyFilter(container, query) {
  const q = query.trim().toLowerCase();
  container.querySelectorAll(".practice-hub__card").forEach((card) => {
    const matches = !q || card.dataset.sheetName.includes(q);
    card.hidden = !matches;
  });
}

function renderGoalBanner() {
  const solvedToday = getState().todayContributionCount > 0;
  if (solvedToday) return "";
  return `
    <div class="practice-hub__goal">
      <span class="practice-hub__goal-icon" aria-hidden="true">!</span>
      <div class="practice-hub__goal-text">
        <span class="practice-hub__goal-title">Daily DSA Goal</span>
        <span class="practice-hub__goal-sub">Stay consistent. Solve at least one problem today!</span>
      </div>
      <button class="practice-hub__goal-cta" type="button">View Roadmap</button>
    </div>`;
}

function renderHub(container) {
  container.innerHTML = `
    <section class="practice-hub">
      <header class="practice-hub__hero">
      <div class="practice-hub__glow" aria-hidden="true">
        ${LADDER_LOGO_SVG}
      </div>
        <span class="practice-hub__badge">
          <span class="practice-hub__badge-dot" aria-hidden="true"></span>
          Premium DSA Ecosystem
        </span>
        <h1 class="practice-hub__title">
          DSA <span class="practice-hub__title-accent">Sheets</span>
        </h1>
        <p class="practice-hub__subtitle">
          Unlock your potential. Select a practice ecosystem to access
          structured, top-tier DSA materials.
        </p>
        <div class="practice-hub__goal-slot"></div>
      </header>

      <div class="practice-hub__search">
        <svg class="practice-hub__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          class="practice-hub__search-input"
          type="text"
          placeholder="Search practice ecosystems..."
          aria-label="Search practice ecosystems"
        />
      </div>

      <div class="practice-hub__list" role="list"></div>


    </section>
  `;

  container.querySelector(".practice-hub__goal-slot").innerHTML = renderGoalBanner();
  renderList(container);

  clickHandler = (event) => {
    if (event.target.closest(".practice-hub__goal-cta")) {
      navigateTo("roadmap");
      return;
    }
    const card = event.target.closest(".practice-hub__card");
    if (!card) return;
    navigateTo("practice", { sheetId: card.dataset.sheetId });
  };
  container.addEventListener("click", clickHandler);

  const searchInput = container.querySelector(".practice-hub__search-input");
  inputHandler = (event) => applyFilter(container, event.target.value);
  searchInput.addEventListener("input", inputHandler);

  storeUnsubscribe = subscribe(() => {
    const slot = container.querySelector(".practice-hub__goal-slot");
    if (slot) slot.innerHTML = renderGoalBanner();
  });
}

export function mount(container, params = {}) {
  ensureStyle("/src/components/practice/practice-hub.css");
  rootEl = container;
  if (params && params.sheetId) {
    sheetView.mount(container, params);
  } else {
    renderHub(container);
  }
}

export function unmount() {
  sheetView.unmount();
  if (rootEl && clickHandler) {
    rootEl.removeEventListener("click", clickHandler);
  }
  if (storeUnsubscribe) {
    storeUnsubscribe();
  }
  clickHandler = null;
  inputHandler = null;
  storeUnsubscribe = null;
  rootEl = null;
}
