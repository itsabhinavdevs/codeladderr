import { getState } from "../../state/store.js";
import { getAllSubDocs } from "../../firebase/firestore.js";
import { navigateTo } from "../../router/router.js";
import { getDifficultyColor } from "../../utils/difficulty-colors.js";

// Flat list over users/{uid}/questionData, filtered to docs where the user
// has actually written something (notes/approach/pattern/companies/
// mySolution/optimizedSolution). This is a read-only index into content
// Practice's notes-editor-modal already wrote — no new writes happen here.

const NOTE_FIELDS = [
  "notes",
  "approach",
  "pattern",
  "companies",
  "mySolution",
  "optimizedSolution",
];

let root = null;

function hasContent(doc) {
  return NOTE_FIELDS.some((field) => (doc[field] || "").toString().trim().length > 0);
}

function uid() {
  return getState().user?.uid ?? null;
}

function render(items) {
  if (!root) return;
  root.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "learning-view";

  const header = document.createElement("div");
  header.className = "learning-view__header";
  header.innerHTML = `
    <h1 class="learning-view__title">Learning</h1>
    <p class="learning-view__subtitle">Questions you've added notes, approach, or solutions to.</p>
  `;
  wrap.appendChild(header);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "learning-view__empty";
    empty.textContent =
      "Nothing here yet. Add notes to a question in Practice and it'll show up here.";
    wrap.appendChild(empty);
    root.appendChild(wrap);
    return;
  }

  const list = document.createElement("ul");
  list.className = "learning-view__list";

  items.forEach((doc) => {
    const item = document.createElement("li");
    item.className = "learning-view__item";
    item.addEventListener("click", () => {
      navigateTo("practice", { sheetId: doc.sheetId, questionId: doc.id });
    });

    const title = document.createElement("span");
    title.className = "learning-view__item-title";
    title.textContent = doc.title || "Untitled question";

    const dot = document.createElement("span");
    dot.className = "learning-view__item-dot";
    dot.style.backgroundColor = getDifficultyColor(doc.difficulty);

    item.appendChild(title);
    item.appendChild(dot);
    list.appendChild(item);
  });

  wrap.appendChild(list);
  root.appendChild(wrap);
}

export async function mount(container) {
  root = container;
  root.innerHTML = `<div class="learning-view__loading">Loading…</div>`;
  const u = uid();
  const docs = u ? await getAllSubDocs(u, "questionData") : [];
  const items = docs.filter(hasContent);
  render(items);
}

export function unmount() {
  if (root) root.innerHTML = "";
  root = null;
}
