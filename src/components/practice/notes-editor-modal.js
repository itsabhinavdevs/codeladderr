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

  overlayEl = document.createElement("div");
  overlayEl.className = "notes-modal-overlay";
  overlayEl.innerHTML = `
    <div class="notes-modal" role="dialog" aria-modal="true" aria-label="Notes for ${problem.title}">
      <header class="notes-modal__header">
        <h2 class="notes-modal__title">${problem.title}</h2>
        <button type="button" class="notes-modal__close" aria-label="Close">&times;</button>
      </header>
      <div class="notes-modal__body">
        ${FIELDS.map(
          (field) => `
          <section class="notes-modal__field" data-field="${field.key}">
            <label class="notes-modal__label">${field.label}</label>
            <textarea class="notes-modal__textarea" rows="3">${
              existing[field.key] ? String(existing[field.key]) : ""
            }</textarea>
            <div class="notes-modal__actions">
              <button type="button" class="notes-modal__cancel" data-action="cancel">Cancel</button>
              <button type="button" class="notes-modal__save" data-action="save">Save</button>
            </div>
            <span class="notes-modal__status" aria-live="polite"></span>
          </section>`
        ).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener("click", async (event) => {
    if (event.target === overlayEl || event.target.closest(".notes-modal__close")) {
      close();
      return;
    }
    const fieldSection = event.target.closest(".notes-modal__field");
    if (!fieldSection) return;
    const key = fieldSection.dataset.field;
    const textarea = fieldSection.querySelector(".notes-modal__textarea");
    const status = fieldSection.querySelector(".notes-modal__status");

    if (event.target.dataset.action === "cancel") {
      textarea.value = existing[key] ? String(existing[key]) : "";
      status.textContent = "";
      return;
    }
    if (event.target.dataset.action === "save") {
      if (!user) return;
      status.textContent = "Saving...";
      await setSubDoc(
        user.uid,
        "questionData",
        problem.id,
        {
          sheetId,
          title: problem.title,
          difficulty: problem.difficulty,
          [key]: textarea.value,
          updatedAt: new Date().toISOString(),
        },
        true
      );
      existing[key] = textarea.value;
      status.textContent = "Saved";
      setTimeout(() => {
        if (status.isConnected) status.textContent = "";
      }, 1500);
    }
  });

  keydownHandler = (event) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", keydownHandler);
}
