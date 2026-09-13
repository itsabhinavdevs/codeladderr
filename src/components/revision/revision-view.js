// src/components/revision/revision-view.js
// Router-mounted section (contract: mount/unmount, same as dashboard.js /
// practice-hub.js). Shows every question flagged for revision across all
// sheets, rendered with the exact same building blocks Practice's sheet-view
// uses (problem-table.css shell + problem-row.js rows) so the two never look
// out of sync.

import { navigateTo } from "../../router/router.js";
import { getAllSubDocs, getSheetProblems, getSubDoc } from "../../firebase/firestore.js";
import { getState } from "../../state/store.js";
import * as problemRow from "../practice/problem-row.js";
import * as notesModal from "../practice/notes-editor-modal.js";
import { ensureStyle } from "../practice/_ensure-style.js";

let rootEl = null;
let items = []; // [{ problem: {id,patternId,title,difficulty,problemUrl,videoUrl}, sheetId, ticked }]

function renderRows(container) {
  const list = container.querySelector(".problem-table__rows");
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<div class="problem-table__empty">No questions flagged for revision yet.</div>`;
    return;
  }

  items.forEach((item) => {
    const rowEl = problemRow.render(item.problem, {
      ticked: item.ticked,
      revision: true, // everything shown here is, by definition, flagged
      sheetId: item.sheetId,
      onTickChange: (nowTicked) => {
        item.ticked = nowTicked;
      },
      onRevisionChange: (nowRevision) => {
        // Unstarring here removes it from this list immediately. The
        // underlying write already happened inside problem-row.js, so
        // Practice's sheet-view will reflect this the next time it loads.
        if (!nowRevision) {
          items = items.filter((it) => it.problem.id !== item.problem.id);
          renderRows(container);
        }
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
  ensureStyle("/src/components/revision/revision-view.css");
  rootEl = container;
  items = [];

  container.innerHTML = `
    <section class="revision-view">
      <header class="revision-view__header">
        <h1 class="revision-view__heading">Revision</h1>
        <p class="revision-view__subtitle">Questions you've flagged to come back to.</p>
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
        <div class="problem-table__rows" aria-live="polite"></div>
      </div>
    </section>
  `;

  const { user } = getState();
  if (!user) {
    renderRows(container);
    return;
  }

  const questionDataDocs = await getAllSubDocs(user.uid, "questionData");
  const flagged = questionDataDocs.filter((d) => d.revision);
  const sheetIds = [...new Set(flagged.map((d) => d.sheetId))];

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

  items = flagged.map((doc) => {
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
    };
  });

  renderRows(container);
}

export function unmount() {
  notesModal.close();
  rootEl = null;
  items = [];
}
