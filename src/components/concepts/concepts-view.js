// src/components/concepts/concepts-view.js
// Router-mounted section (contract: mount/unmount, same as dashboard.js /
// practice-hub.js). Two drag-and-drop columns backed by users/{uid}/concepts/{id}
// -> { name, learned, source: "roadmap"|"custom" }.
//
// Requires firestore.js to export deleteSubDoc(uid, subcollection, docId) —
// see firestore-addition-snippet.js if it isn't there yet.

import { getState } from "../../state/store.js";
import { getAllSubDocs, setSubDoc, deleteSubDoc } from "../../firebase/firestore.js";
import { ensureStyle } from "../practice/_ensure-style.js";
import { ROADMAP_TOPICS } from "../roadmap/roadmap-view.js";
import { LOADING_MARKUP } from "../shell/loading-indicator.js";

let rootEl = null;
let clickHandler = null;
let dragHandlers = null;
let concepts = []; // [{id, name, learned, source}]
let editingIds = new Set(); // concept ids currently showing their delete button
let addPopoverOpen = false;


const TOPIC_ORDER = new Map(ROADMAP_TOPICS.map((t, i) => [t.id, i]));

function sortConcepts(list) {
  return [...list].sort((a, b) => {
    const ai = TOPIC_ORDER.has(a.id) ? TOPIC_ORDER.get(a.id) : Infinity;
    const bi = TOPIC_ORDER.has(b.id) ? TOPIC_ORDER.get(b.id) : Infinity;
    return ai - bi;
  });
}

function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `concept-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cardMarkup(concept) {
  const isEditing = editingIds.has(concept.id);
  const isCustom = concept.source === "custom";
  return `
    <div class="concepts-view__card" draggable="true" data-concept-id="${concept.id}">
      <span class="concepts-view__card-name">${concept.name}</span>
      ${
        isCustom
          ? `<span class="concepts-view__card-actions">
              <button type="button" class="concepts-view__modify-btn" aria-label="Modify concept" aria-expanded="${isEditing}">⋮</button>
              ${
                isEditing
                  ? `<button type="button" class="concepts-view__delete-btn" aria-label="Delete concept">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>`
                  : ""
              }
            </span>`
          : ""
      }
    </div>`;
}

function columnCardsMarkup(list, emptyText) {
  if (!list.length) {
    return `<div class="concepts-view__empty">${emptyText}</div>`;
  }
  return list.map(cardMarkup).join("");
}

function renderColumns(container) {
  const yetList = concepts.filter((c) => !c.learned);
  const learnedList = concepts.filter((c) => c.learned);
  container.querySelector('[data-column="yet"]').innerHTML = columnCardsMarkup(
    yetList,
    "Drag a concept out once you start learning it."
  );
  container.querySelector('[data-column="learned"]').innerHTML = columnCardsMarkup(
    learnedList,
    "Drag a concept here once you've learned it."
  );
}

function closePopover(container) {
  addPopoverOpen = false;
  const popover = container.querySelector(".concepts-view__popover");
  if (popover) popover.hidden = true;
}

export async function mount(container) {
  ensureStyle("/src/components/concepts/concepts-view.css");
  rootEl = container;
  concepts = [];
  editingIds = new Set();
  addPopoverOpen = false;

  container.innerHTML = `
    <section class="concepts-view">
      <header class="concepts-view__header">
        <span class="concepts-view__eyebrow">Concepts</span>
        <h1 class="concepts-view__heading">Concept Tracker</h1>
        <p class="concepts-view__subtitle">Drag a concept between columns as you learn it.</p>
      </header>

      <div class="concepts-view__board">
        <div class="concepts-view__column">
          <div class="concepts-view__column-header">
            <span class="concepts-view__column-title concepts-view__column-title--yellow">Yet to Learn</span>
            <span class="concepts-view__add-wrap">
              <button type="button" class="concepts-view__add-btn" aria-label="Add concept">+</button>
              <span class="concepts-view__tooltip">Add new concept</span>
              <div class="concepts-view__popover" hidden>
                <input type="text" class="concepts-view__popover-input" placeholder="Concept name..." maxlength="80" />
                <button type="button" class="concepts-view__popover-add">Add</button>
              </div>
            </span>
          </div>
          <div class="concepts-view__cards" data-column="yet">${LOADING_MARKUP}</div>
        </div>

        <div class="concepts-view__column">
          <div class="concepts-view__column-header">
            <span class="concepts-view__column-title concepts-view__column-title--green">Learned</span>
          </div>
          <div class="concepts-view__cards" data-column="learned">${LOADING_MARKUP}</div>
        </div>
      </div>
    </section>
  `;

  const { user } = getState();
  if (user) {
    concepts = await getAllSubDocs(user.uid, "concepts");
    // mount() may resolve after unmount() was called (fast section switching) — bail out.
    if (rootEl !== container) return;

    if (concepts.length === 0) {
      // First visit for this user — seed from the roadmap topic list.
      concepts = ROADMAP_TOPICS.map((t) => ({
        id: t.id,
        name: t.label,
        learned: false,
        source: "roadmap",
      }));
      await Promise.all(
        concepts.map((c) =>
          setSubDoc(user.uid, "concepts", c.id, { name: c.name, learned: c.learned, source: c.source }, true)
        )
      );
    }
  }
  concepts = sortConcepts(concepts);

  renderColumns(container);

  clickHandler = async (event) => {
    const addBtn = event.target.closest(".concepts-view__add-btn");
    if (addBtn) {
      addPopoverOpen = !addPopoverOpen;
      const popover = container.querySelector(".concepts-view__popover");
      popover.hidden = !addPopoverOpen;
      if (addPopoverOpen) popover.querySelector("input").focus();
      return;
    }

    const popoverAddBtn = event.target.closest(".concepts-view__popover-add");
    if (popoverAddBtn) {
      const input = container.querySelector(".concepts-view__popover-input");
      const name = input.value.trim();
      if (!name) return;
      const { user } = getState();
      if (!user) return;
      const id = generateId();
      const newConcept = { name, learned: false, source: "custom" };
      await setSubDoc(user.uid, "concepts", id, newConcept, true);
      concepts.push({ id, ...newConcept });
      input.value = "";
      closePopover(container);
      renderColumns(container);
      return;
    }

    const modifyBtn = event.target.closest(".concepts-view__modify-btn");
    if (modifyBtn) {
      const card = modifyBtn.closest(".concepts-view__card");
      const id = card.dataset.conceptId;
      if (editingIds.has(id)) editingIds.delete(id);
      else editingIds.add(id);
      renderColumns(container);
      return;
    }

    const deleteBtn = event.target.closest(".concepts-view__delete-btn");
    if (deleteBtn) {
      const card = deleteBtn.closest(".concepts-view__card");
      const id = card.dataset.conceptId;
      const { user } = getState();
      if (!user) return;
      await deleteSubDoc(user.uid, "concepts", id);
      concepts = concepts.filter((c) => c.id !== id);
      editingIds.delete(id);
      renderColumns(container);
      return;
    }

    if (addPopoverOpen && !event.target.closest(".concepts-view__add-wrap")) {
      closePopover(container);
    }
  };
  container.addEventListener("click", clickHandler);

  // ---- drag and drop (native HTML5 DnD, no library) ----
  let draggingId = null;

  const dragStart = (event) => {
    const card = event.target.closest(".concepts-view__card");
    if (!card) return;
    draggingId = card.dataset.conceptId;
    event.dataTransfer.setData("text/plain", draggingId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("concepts-view__card--dragging");
  };

  const dragEnd = (event) => {
    const card = event.target.closest(".concepts-view__card");
    if (card) card.classList.remove("concepts-view__card--dragging");
    draggingId = null;
    container
      .querySelectorAll(".concepts-view__cards--drop-hover")
      .forEach((el) => el.classList.remove("concepts-view__cards--drop-hover"));
  };

  const dragOver = (event) => {
    const zone = event.target.closest(".concepts-view__cards");
    if (!zone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    zone.classList.add("concepts-view__cards--drop-hover");
  };

  const dragLeave = (event) => {
    const zone = event.target.closest(".concepts-view__cards");
    if (zone) zone.classList.remove("concepts-view__cards--drop-hover");
  };

  const drop = async (event) => {
    const zone = event.target.closest(".concepts-view__cards");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("concepts-view__cards--drop-hover");
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id) return;

    const targetLearned = zone.dataset.column === "learned";
    const concept = concepts.find((c) => c.id === id);
    if (!concept || concept.learned === targetLearned) return;

    concept.learned = targetLearned;
    renderColumns(container);

    const { user } = getState();
    if (user) {
      await setSubDoc(user.uid, "concepts", id, { learned: targetLearned }, true);
    }
  };

  container.addEventListener("dragstart", dragStart);
  container.addEventListener("dragend", dragEnd);
  container.addEventListener("dragover", dragOver);
  container.addEventListener("dragleave", dragLeave);
  container.addEventListener("drop", drop);

  dragHandlers = { dragStart, dragEnd, dragOver, dragLeave, drop };
}

export function unmount() {
  if (rootEl) {
    if (clickHandler) rootEl.removeEventListener("click", clickHandler);
    if (dragHandlers) {
      rootEl.removeEventListener("dragstart", dragHandlers.dragStart);
      rootEl.removeEventListener("dragend", dragHandlers.dragEnd);
      rootEl.removeEventListener("dragover", dragHandlers.dragOver);
      rootEl.removeEventListener("dragleave", dragHandlers.dragLeave);
      rootEl.removeEventListener("drop", dragHandlers.drop);
    }
  }
  clickHandler = null;
  dragHandlers = null;
  rootEl = null;
  concepts = [];
  editingIds = new Set();
}
