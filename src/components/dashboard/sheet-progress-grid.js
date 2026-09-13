import { getSheetProblems, getSubDoc } from '../../firebase/firestore.js';
import { SHEETS } from '../../data/sheet-metadata.js';
import { assetUrl } from '../../utils/asset-path.js';
import { navigateTo } from '../../router/router.js';
import { createProgressRing } from './progress-ring.js';

const PRIMARY_SHEET_ID = 'dsa-patterns';

function injectStyles() {
  const href = new URL('./sheet-progress-grid.css', import.meta.url).href;
  if (document.querySelector('link[data-style="sheet-progress-grid"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'sheet-progress-grid';
  document.head.appendChild(link);
}

let el = null;

async function computeSheetStats(uid, sheetId) {
  const [problems, progressDoc] = await Promise.all([
    getSheetProblems(sheetId),
    getSubDoc(uid, 'progress', sheetId),
  ]);
  const ticked = progressDoc?.ticked ?? {};

  const stats = {
    solved: 0,
    total: problems.length,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    easyTotal: 0,
    mediumTotal: 0,
    hardTotal: 0,
  };

  problems.forEach((p) => {
    const totalKey = `${p.difficulty.toLowerCase()}Total`;
    const solvedKey = `${p.difficulty.toLowerCase()}Count`;
    if (totalKey in stats) stats[totalKey] += 1;
    if (ticked[p.id]) {
      stats.solved += 1;
      if (solvedKey in stats) stats[solvedKey] += 1;
    }
  });

  return stats;
}

function aggregateStats(statsList) {
  return statsList.reduce(
    (acc, s) => ({
      solved: acc.solved + s.solved,
      total: acc.total + s.total,
      easyCount: acc.easyCount + s.easyCount,
      mediumCount: acc.mediumCount + s.mediumCount,
      hardCount: acc.hardCount + s.hardCount,
      easyTotal: acc.easyTotal + s.easyTotal,
      mediumTotal: acc.mediumTotal + s.mediumTotal,
      hardTotal: acc.hardTotal + s.hardTotal,
    }),
    { solved: 0, total: 0, easyCount: 0, mediumCount: 0, hardCount: 0, easyTotal: 0, mediumTotal: 0, hardTotal: 0 }
  );
}

function renderSheetBlock(sheetMeta, stats, { withLogo = false, onClick = null } = {}) {
  const block = document.createElement('div');
  block.className = 'sheet-progress-grid__block';

  if (onClick) {
    block.classList.add('sheet-progress-grid__block--clickable');
    block.addEventListener('click', onClick);
  }

  if (withLogo && sheetMeta?.logoPath) {
    const logo = document.createElement('img');
    logo.src = assetUrl(sheetMeta.logoPath);
    logo.alt = `${sheetMeta.name} logo`;
    logo.className = 'sheet-progress-grid__logo';
    block.appendChild(logo);
  }

  if (sheetMeta?.name) {
    const title = document.createElement('div');
    title.className = 'sheet-progress-grid__title';
    title.textContent = sheetMeta.name;
    block.appendChild(title);
  }

  block.appendChild(createProgressRing(stats));

  const subcards = document.createElement('div');
  subcards.className = 'sheet-progress-grid__subcards';
  [
    { label: 'Easy', solved: stats.easyCount, total: stats.easyTotal, cls: 'easy' },
    { label: 'Medium', solved: stats.mediumCount, total: stats.mediumTotal, cls: 'medium' },
    { label: 'Hard', solved: stats.hardCount, total: stats.hardTotal, cls: 'hard' },
  ].forEach(({ label, solved, total, cls }) => {
    const sub = document.createElement('div');
    sub.className = `sheet-progress-grid__subcard sheet-progress-grid__subcard--${cls}`;
    sub.innerHTML = `<span class="sheet-progress-grid__subcard-label">${label}</span><span class="sheet-progress-grid__subcard-value">${solved}/${total}</span>`;
    subcards.appendChild(sub);
  });
  block.appendChild(subcards);

  return block;
}

export async function mount(container, uid) {
  injectStyles();
  el = container;
  el.className = 'sheet-progress-grid';
  el.innerHTML = '<p class="sheet-progress-grid__loading">Loading progress\u2026</p>';

  const primaryMeta = SHEETS.find((s) => s.id === PRIMARY_SHEET_ID);
  const otherMetas = SHEETS.filter((s) => s.id !== PRIMARY_SHEET_ID);

  const [primaryStats, otherStatsList] = await Promise.all([
    computeSheetStats(uid, PRIMARY_SHEET_ID),
    Promise.all(otherMetas.map((s) => computeSheetStats(uid, s.id))),
  ]);

  el.innerHTML = '';

  const primaryBlock = renderSheetBlock(primaryMeta, primaryStats, {
    withLogo: true,
    onClick: () => navigateTo('practice', { sheetId: PRIMARY_SHEET_ID }),
  });
  primaryBlock.classList.add('sheet-progress-grid__block--primary');
  el.appendChild(primaryBlock);

  const combinedStats = aggregateStats(otherStatsList);

  const othersWrap = document.createElement('div');
  othersWrap.className = 'sheet-progress-grid__others sheet-progress-grid__others--faded';
  othersWrap.setAttribute('role', 'button');
  othersWrap.tabIndex = 0;
  othersWrap.appendChild(renderSheetBlock({ name: 'Other Sheets' }, combinedStats));

  const othersDetail = document.createElement('div');
  othersDetail.className = 'sheet-progress-grid__others-detail';
  othersDetail.hidden = true;

  otherMetas.forEach((sheetMeta, i) => {
    const block = renderSheetBlock(sheetMeta, otherStatsList[i], {
      withLogo: true,
      onClick: (e) => {
        e.stopPropagation();
        navigateTo('practice', { sheetId: sheetMeta.id });
      },
    });
    othersDetail.appendChild(block);
  });

  const toggle = () => {
    const expanded = othersDetail.hidden;
    othersDetail.hidden = !expanded;
    othersWrap.classList.toggle('sheet-progress-grid__others--faded', !expanded);
  };
  othersWrap.addEventListener('click', toggle);
  othersWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  el.append(othersWrap, othersDetail);
}

export function unmount() {
  if (el) el.innerHTML = '';
  el = null;
}
