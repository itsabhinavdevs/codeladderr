// src/components/practice/notes-editor-modal.js
// Internal helper used by sheet-view.js / problem-row.js. Exports open(problem, sheetId)
// and close() rather than mount/unmount, since it's a transient overlay, not a page section.

import { getSubDoc, setSubDoc } from "../../firebase/firestore.js";
import { getState } from "../../state/store.js";
import { ensureStyle } from "./_ensure-style.js";

const FIELDS = [
  { key: "notes", label: "Notes" },
  { key: "approach", label: "Approach" },
  { key: "pattern", label: "Pattern" },
  { key: "companies", label: "Companies" },
  { key: "mySolution", label: "My Solution" },
  { key: "optimizedSolution", label: "Optimized Solution" },
];

let overlayEl = null;
let keydownHandler = null;

export function close() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
}

export async function open(problem, sheetId) {
  ensureStyle("/src/components/practice/notes-editor-modal.css");
  close(); // only one instance at a time

  const { user } = getState();
  const existing = (user && (await getSubDoc(user.uid, "questionData", problem.id))) || {};

  let activeKey = "notes"; // Notes open by default
  const draft = {};
  FIELDS.forEach((f) => {
    draft[f.key] = existing[f.key] ? String(existing[f.key]) : "";
  });

  overlayEl = document.createElement("div");
  overlayEl.className = "notes-modal-overlay";
  overlayEl.innerHTML = `
    <div class="notes-modal" role="dialog" aria-modal="true" aria-label="Notes for ${problem.title}">
      <header class="notes-modal__header">
        <h2 class="notes-modal__title">${problem.title}</h2>
        <button type="button" class="notes-modal__close" aria-label="Close">&times;</button>
      </header>

      <div class="notes-modal__body">
        <label class="notes-modal__label" data-active-label></label>
        <textarea class="notes-modal__textarea" data-active-textarea rows="8"></textarea>
      </div>

      <div class="notes-modal__tabs" role="tablist">
        ${FIELDS.map(
          (field) => `
          <button
            type="button"
            class="notes-modal__tab"
            data-tab="${field.key}"
            role="tab"
            aria-selected="${field.key === activeKey}"
          >${field.label}</button>`
        ).join("")}
      </div>

      <div class="notes-modal__actions">
        <button type="button" class="notes-modal__cancel" data-action="cancel">Cancel</button>
        <button type="button" class="notes-modal__save" data-action="save">Save</button>
      </div>
      <span class="notes-modal__status" aria-live="polite"></span>
    </div>
  `;
  document.body.appendChild(overlayEl);

  const labelEl = overlayEl.querySelector("[data-active-label]");
  const textareaEl = overlayEl.querySelector("[data-active-textarea]");
  const statusEl = overlayEl.querySelector(".notes-modal__status");

  function renderActiveField() {
    const field = FIELDS.find((f) => f.key === activeKey);
    labelEl.textContent = field.label;
    textareaEl.value = draft[activeKey];
    overlayEl.querySelectorAll(".notes-modal__tab").forEach((btn) => {
      const isActive = btn.dataset.tab === activeKey;
      btn.classList.toggle("notes-modal__tab--active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
    statusEl.textContent = "";
  }
  renderActiveField();

  textareaEl.addEventListener("input", () => {
    draft[activeKey] = textareaEl.value;
  });

  overlayEl.addEventListener("click", async (event) => {
    if (event.target === overlayEl || event.target.closest(".notes-modal__close")) {
      close();
      return;
    }

    const tabBtn = event.target.closest(".notes-modal__tab");
    if (tabBtn) {
      activeKey = tabBtn.dataset.tab;
      renderActiveField();
      return;
    }

    if (event.target.dataset.action === "cancel") {
      draft[activeKey] = existing[activeKey] ? String(existing[activeKey]) : "";
      textareaEl.value = draft[activeKey];
      statusEl.textContent = "";
      return;
    }

    if (event.target.dataset.action === "save") {
      if (!user) return;
      statusEl.textContent = "Saving...";
      await setSubDoc(
        user.uid,
        "questionData",
        problem.id,
        {
          sheetId,
          title: problem.title,
          difficulty: problem.difficulty,
          [activeKey]: draft[activeKey],
          updatedAt: new Date().toISOString(),
        },
        true
      );
      existing[activeKey] = draft[activeKey];
      statusEl.textContent = "Saved";
      setTimeout(() => {
        if (statusEl.isConnected) statusEl.textContent = "";
      }, 1500);
    }
  });

  keydownHandler = (event) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", keydownHandler);
}
