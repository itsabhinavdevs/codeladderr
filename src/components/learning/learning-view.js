// src/components/learning/learning-view.js
// Router-mounted section (contract: mount/unmount, same as dashboard.js /
// practice-hub.js / revision-view.js). Shows every question the user has
// added notes/approach/pattern/companies/mySolution/optimizedSolution to,
// across all sheets, rendered with the exact same building blocks Practice's
// sheet-view and Revision use (problem-table.css shell + problem-row.js rows)
// so all three never look or behave out of sync.

import { navigateTo } from "../../router/router.js";
import { getAllSubDocs, getSheetProblems, getSubDoc } from "../../firebase/firestore.js";
import { getState } from "../../state/store.js";
import * as problemRow from "../practice/problem-row.js";
import * as notesModal from "../practice/notes-editor-modal.js";
import { ensureStyle } from "../practice/_ensure-style.js";
import { LOADING_MARKUP } from "../shell/loading-indicator.js";

const NOTE_FIELDS = [
  "notes",
  "approach",
  "pattern",
  "companies",
  "mySolution",
  "optimizedSolution",
];

function hasContent(doc) {
  return NOTE_FIELDS.some((field) => (doc[field] || "").toString().trim().length > 0);
}

let rootEl = null;
let items = []; // [{ problem: {id,patternId,title,difficulty,problemUrl,videoUrl}, sheetId, ticked, revision }]

function renderRows(container) {
  const list = container.querySelector(".problem-table__rows");
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<div class="problem-table__empty">Nothing here yet. Add notes, approach, or a solution to a question in Practice and it'll show up here.</div>`;
    return;
  }

  items.forEach((item) => {
    const rowEl = problemRow.render(item.problem, {
      ticked: item.ticked,
      revision: item.revision,
      sheetId: item.sheetId,
      onTickChange: (nowTicked) => {
        item.ticked = nowTicked;
      },
      onRevisionChange: (nowRevision) => {
        // Unlike Revision's list, this list's membership is driven by note
        // content, not the revision flag — so toggling revision here just
        // updates the row's star, it never removes the item.
        item.revision = nowRevision;
      },
      onNotesClick: () => notesModal.open(item.problem, item.sheetId),
      onTitleClick: () => navigateTo("practice", { sheetId: item.sheetId, questionId: item.problem.id }),
    });
    list.appendChild(rowEl);
  });
}

export async function mount(container) {
  ensureStyle("/src/components/practice/problem-table.css");
  ensureStyle("/src/components/practice/problem-row.css");
  ensureStyle("/src/components/learning/learning-view.css");
  rootEl = container;
  items = [];

  container.innerHTML = `
    <section class="learning-view">
      <header class="learning-view__header">
        <h1 class="learning-view__heading">Learning</h1>
        <p class="learning-view__subtitle">Questions you've added notes, approach, or solutions to.</p>
      </header>
      <div class="problem-table">
        <div class="problem-table__head">
          <span>Question</span>
          <span>Resource</span>
          <span>Practice</span>
          <span>Note</span>
          <span>Revision</span>
          <span>Difficulty</span>
        </div>
        <div class="problem-table__rows" aria-live="polite">${LOADING_MARKUP}</div>
      </div>
    </section>
  `;

  const { user } = getState();
  if (!user) {
    renderRows(container);
    return;
  }

  const questionDataDocs = await getAllSubDocs(user.uid, "questionData");
  const withContent = questionDataDocs.filter(hasContent);
  const sheetIds = [...new Set(withContent.map((d) => d.sheetId))];

  const [problemsBySheet, progressBySheet] = await Promise.all([
    Promise.all(sheetIds.map((id) => getSheetProblems(id))),
    Promise.all(sheetIds.map((id) => getSubDoc(user.uid, "progress", id))),
  ]);

  // mount() may resolve after unmount() was called (fast section switching) — bail out.
  if (rootEl !== container) return;

  const problemsBySheetId = new Map(
    sheetIds.map((id, i) => [id, new Map(problemsBySheet[i].map((p) => [p.id, p]))])
  );
  const tickedBySheetId = new Map(
    sheetIds.map((id, i) => [id, (progressBySheet[i] && progressBySheet[i].ticked) || {}])
  );

  items = withContent.map((doc) => {
    // Prefer the live sheet record (has problemUrl/videoUrl/patternId); fall
    // back to what was captured on the questionData doc if the problem can't
    // be found (e.g. removed from the sheet since being flagged).
    const problem = problemsBySheetId.get(doc.sheetId)?.get(doc.id) || {
      id: doc.id,
      patternId: doc.pattern || "unknown",
      title: doc.title,
      difficulty: doc.difficulty,
      problemUrl: null,
      videoUrl: null,
    };
    return {
      problem,
      sheetId: doc.sheetId,
      ticked: !!tickedBySheetId.get(doc.sheetId)?.[doc.id],
      revision: !!doc.revision,
    };
  });

  renderRows(container);
}

export function unmount() {
  notesModal.close();
  rootEl = null;
  items = [];
}
