// src/components/practice/problem-row.js
// Internal helper used by sheet-view.js. Exports render(problem, options) -> HTMLElement
// rather than mount/unmount, since a sheet-view page renders many of these at once.
// Column layout matches sheet-view's table head: Question | Resource | Practice | Note | Revision | Difficulty.

import { getSubDoc, setSubDoc } from "../../firebase/firestore.js";
import { recordSolve } from "../../utils/contributions.js";
import { getState } from "../../state/store.js";
import { getDifficultyColor } from "../../utils/difficulty-colors.js";
import { ensureStyle } from "./_ensure-style.js";
import { getPlatformIcon } from "../../utils/platform-icons.js";

function labelFromPatternId(patternId) {
  return patternId
    .split("-")
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

const STAR_ICON = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.5l2.9 6.3 6.9.7-5.1 4.7 1.5 6.8L12 17.6l-6.2 3.4 1.5-6.8-5.1-4.7 6.9-.7L12 2.5z"
      stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none" />
  </svg>`;



/**
 * @param {{id,patternId,title,difficulty,problemUrl,videoUrl}} problem
 * @param {{
 *   ticked: boolean,
 *   revision: boolean,
 *   sheetId: string,
 *   onTickChange: (v:boolean) => void,
 *   onRevisionChange: (v:boolean) => void,
 *   onNotesClick: () => void,
 *   onTitleClick?: () => void
 * }} options
 */
export function render(problem, { ticked, revision, sheetId, onTickChange, onRevisionChange, onNotesClick, onTitleClick }) {
  ensureStyle("/src/components/practice/problem-row.css");

  const row = document.createElement("div");
  row.className = "problem-row";
  row.dataset.questionId = problem.id;
  row.innerHTML = `
    <span class="problem-row__cell problem-row__cell--question">
      <label class="problem-row__check-label">
        <input type="checkbox" class="problem-row__check" ${ticked ? "checked" : ""} />
      </label>
      <span class="problem-row__text">
        ${
          onTitleClick
            ? `<button type="button" class="problem-row__title problem-row__title--link">${problem.title}</button>`
            : `<span class="problem-row__title">${problem.title}</span>`
        }
        <span class="problem-row__pattern">${labelFromPatternId(problem.patternId)}</span>
      </span>
    </span>

    <span class="problem-row__cell problem-row__cell--resource">
      ${
        problem.resourceUrls && problem.resourceUrls.length
          ? problem.resourceUrls
              .map(
                (url) =>
                  `<a href="${url}" target="_blank" rel="noopener" class="problem-row__icon-link" aria-label="Open resource">${getPlatformIcon(url)}</a>`
              )
              .join("")
          : `<span class="problem-row__dash">-</span>`
      }
    </span>

    <span class="problem-row__cell problem-row__cell--practice">
      ${
        problem.problemUrl
          ? `<a href="${problem.problemUrl}" target="_blank" rel="noopener" class="problem-row__icon-link" aria-label="Open problem">${getPlatformIcon(problem.problemUrl)}</a>`
          : `<span class="problem-row__dash">-</span>`
      }
    </span>

    <span class="problem-row__cell problem-row__cell--note">
      <button type="button" class="problem-row__icon-btn" aria-label="Notes">+</button>
    </span>

    <span class="problem-row__cell problem-row__cell--revision">
      <button type="button" class="problem-row__icon-btn problem-row__revision-btn ${
        revision ? "problem-row__revision-btn--active" : ""
      }" aria-label="Toggle revision" aria-pressed="${revision}">${STAR_ICON}</button>
    </span>

    <span class="problem-row__cell problem-row__cell--difficulty">
      <span class="problem-row__difficulty-pill" style="--pill-color:${getDifficultyColor(
        problem.difficulty
      )}">${problem.difficulty}</span>
    </span>
  `;

  if (onTitleClick) {
    row.querySelector(".problem-row__title--link").addEventListener("click", onTitleClick);
  }

  const checkbox = row.querySelector(".problem-row__check");
  checkbox.addEventListener("change", async () => {
    const { user } = getState();
    if (!user) return;
    const nowTicked = checkbox.checked;
    const current = (await getSubDoc(user.uid, "progress", sheetId)) || { ticked: {} };
    const nextTicked = { ...current.ticked, [problem.id]: nowTicked };
    if (!nowTicked) delete nextTicked[problem.id];
    await setSubDoc(user.uid, "progress", sheetId, { ticked: nextTicked }, true);
    onTickChange?.(nowTicked);
    if (nowTicked) {
      await recordSolve(user.uid);
    }
  });

  row.querySelector(".problem-row__cell--note .problem-row__icon-btn").addEventListener("click", () => {
    onNotesClick?.();
  });

  const revisionBtn = row.querySelector(".problem-row__revision-btn");
  revisionBtn.addEventListener("click", async () => {
    const { user } = getState();
    if (!user) return;
    const current = await getSubDoc(user.uid, "questionData", problem.id);
    const nextRevision = !(current && current.revision);
    await setSubDoc(
      user.uid,
      "questionData",
      problem.id,
      {
        sheetId,
        title: problem.title,
        difficulty: problem.difficulty,
        revision: nextRevision,
      },
      true
    );
    revisionBtn.classList.toggle("problem-row__revision-btn--active", nextRevision);
    revisionBtn.setAttribute("aria-pressed", String(nextRevision));
    onRevisionChange?.(nextRevision);
  });

  return row;
}
