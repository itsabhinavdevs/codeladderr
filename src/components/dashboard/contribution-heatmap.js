import { subscribeToSubDocs } from '../../firebase/firestore.js';
import { formatDateId } from '../../utils/date.js';

function injectStyles() {
  const href = new URL('./contribution-heatmap.css', import.meta.url).href;
  if (document.querySelector('link[data-style="contribution-heatmap"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'contribution-heatmap';
  document.head.appendChild(link);
}

const DAYS_PER_WEEK = 7;
const ROLLING_WINDOW_DAYS = 365;
const PAST_YEARS_SHOWN = 1;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let el = null;
let unsubscribe = null;
let midnightTimer = null;
let optimisticListener = null;
let documentClickHandler = null;
let documentKeyHandler = null;
let lastCountsById = {};

// 'current' = rolling 365-day window ending today. A number (e.g. 2025) =
// that full calendar year, Jan 1 - Dec 31.
let viewMode = 'current';
let dropdownOpen = false;

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 1; i <= PAST_YEARS_SHOWN; i += 1) {
    years.push(currentYear - i);
  }
  return years;
}

// Groups consecutive days into one entry per real calendar month, so a
// column never mixes two months' days — a month's 1st always starts a
// fresh column, padded at the top with invisible cells for the weekdays
// before it (like a normal calendar). Works for both the rolling window
// and a fixed Jan-Dec year by taking an explicit start/end.
function buildMonthGroups(startDate, endDate) {
  const todayStr = formatDateId(new Date());
  const groups = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    let group = groups[groups.length - 1];

    if (!group || group.year !== year || group.month !== month) {
      group = { year, month, cells: [] };
      const weekday = cursor.getDay();
      for (let i = 0; i < weekday; i += 1) {
        group.cells.push({ placeholder: true });
      }
      groups.push(group);
    }

    const dateId = formatDateId(cursor);
    group.cells.push({ dateId, placeholder: dateId > todayStr });
    cursor.setDate(cursor.getDate() + 1);
  }

  groups.forEach((group) => {
    while (group.cells.length % DAYS_PER_WEEK !== 0) {
      group.cells.push({ placeholder: true });
    }
  });

  return groups;
}

function getGroupsForCurrentView() {
  if (viewMode === 'current') {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(todayMidnight);
    start.setDate(start.getDate() - (ROLLING_WINDOW_DAYS - 1));
    return {
      groups: buildMonthGroups(start, todayMidnight),
      periodLabel: 'in the past one year',
    };
  }

  const year = Number(viewMode);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return {
    groups: buildMonthGroups(start, end),
    periodLabel: `in ${year}`,
  };
}

function levelForCount(count) {
  if (!count) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function computeStats(groups, countsById) {
  let total = 0;
  let activeDays = 0;
  let maxStreak = 0;
  let currentStreak = 0;

  groups.forEach((group) => {
    group.cells.forEach((cell) => {
      if (cell.placeholder) return;
      const count = countsById[cell.dateId] || 0;
      total += count;
      if (count > 0) {
        activeDays += 1;
        currentStreak += 1;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });
  });

  return { total, activeDays, maxStreak };
}

function closeDropdown() {
  if (!dropdownOpen) return;
  dropdownOpen = false;
  if (el) render(el, lastCountsById);
}

function render(container, countsById) {
  lastCountsById = countsById;
  container.innerHTML = '';

  const { groups, periodLabel } = getGroupsForCurrentView();
  const { total, activeDays, maxStreak } = computeStats(groups, countsById);

  const wrap = document.createElement('div');
  wrap.className = 'contribution-heatmap';

  // Header: submissions count + info icon (left), stats + year dropdown (right)
  const header = document.createElement('div');
  header.className = 'contribution-heatmap__header';

  const summary = document.createElement('div');
  summary.className = 'contribution-heatmap__summary';
  summary.innerHTML = `
    <span class="contribution-heatmap__count">${total} submissions ${periodLabel}</span>
    <span class="contribution-heatmap__info" title="Problems solved in the selected period">&#9432;</span>
  `;

  const meta = document.createElement('div');
  meta.className = 'contribution-heatmap__meta';

  const activeDaysSpan = document.createElement('span');
  activeDaysSpan.className = 'contribution-heatmap__meta-item';
  activeDaysSpan.innerHTML = `Total active days: <strong>${activeDays}</strong>`;

  const maxStreakSpan = document.createElement('span');
  maxStreakSpan.className = 'contribution-heatmap__meta-item';
  maxStreakSpan.innerHTML = `Max streak: <strong>${maxStreak}</strong>`;

  const rangeWrap = document.createElement('div');
  rangeWrap.className = 'contribution-heatmap__range';

  const rangeBtn = document.createElement('button');
  rangeBtn.type = 'button';
  rangeBtn.className = 'contribution-heatmap__range-btn';
  rangeBtn.setAttribute('aria-expanded', String(dropdownOpen));
  rangeBtn.innerHTML = `
    <span>${viewMode === 'current' ? 'Current' : viewMode}</span>
    <svg class="contribution-heatmap__range-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
  `;
  rangeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
    render(el, lastCountsById);
  });

  const rangeMenu = document.createElement('ul');
  rangeMenu.className = 'contribution-heatmap__range-menu';
  rangeMenu.hidden = !dropdownOpen;

  ['current', ...getYearOptions()].forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'contribution-heatmap__range-option';
    if (opt === viewMode) li.classList.add('contribution-heatmap__range-option--active');
    li.textContent = opt === 'current' ? 'Current' : String(opt);
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      viewMode = opt;
      dropdownOpen = false;
      render(el, lastCountsById);
    });
    rangeMenu.appendChild(li);
  });

  rangeWrap.append(rangeBtn, rangeMenu);
  meta.append(activeDaysSpan, maxStreakSpan, rangeWrap);
  header.append(summary, meta);

  // Grid + month labels
  const scroll = document.createElement('div');
  scroll.className = 'contribution-heatmap__scroll';

  const body = document.createElement('div');
  body.className = 'contribution-heatmap__body';

  const grid = document.createElement('div');
  grid.className = 'contribution-heatmap__grid';

  const monthsRow = document.createElement('div');
  monthsRow.className = 'contribution-heatmap__months';

  groups.forEach((group, groupIndex) => {
    const numCols = group.cells.length / DAYS_PER_WEEK;

    for (let col = 0; col < numCols; col += 1) {
      const weekEl = document.createElement('div');
      weekEl.className = 'contribution-heatmap__week';
      if (col === 0 && groupIndex > 0) {
        weekEl.classList.add('contribution-heatmap__week--gap-before');
      }

      for (let row = 0; row < DAYS_PER_WEEK; row += 1) {
        const cellData = group.cells[col * DAYS_PER_WEEK + row];
        const cellEl = document.createElement('div');
        if (cellData.placeholder) {
          cellEl.className = 'contribution-heatmap__cell contribution-heatmap__cell--future';
        } else {
          const count = countsById[cellData.dateId] || 0;
          cellEl.className = `contribution-heatmap__cell contribution-heatmap__cell--level-${levelForCount(count)}`;
          cellEl.title = `${cellData.dateId}: ${count} solved`;
        }
        weekEl.appendChild(cellEl);
      }

      grid.appendChild(weekEl);

      const labelEl = document.createElement('span');
      labelEl.className = 'contribution-heatmap__month';
      if (col === 0) {
        labelEl.textContent = MONTH_NAMES[group.month];
        if (groupIndex > 0) labelEl.classList.add('contribution-heatmap__month--gap-before');
      }
      monthsRow.appendChild(labelEl);
    }
  });

  body.append(grid, monthsRow);
  scroll.appendChild(body);

  wrap.append(header, scroll);
  container.appendChild(wrap);
}

function msUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2, 0);
  return next.getTime() - now.getTime();
}

function scheduleMidnightRefresh() {
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(() => {
    // Only the "current" rolling view depends on what day it is; a past
    // year's grid never changes, so no need to force it to re-render.
    if (el && viewMode === 'current') render(el, lastCountsById);
    scheduleMidnightRefresh();
  }, msUntilNextLocalMidnight());
}

// Lets other parts of the app (e.g. wherever a "mark solved" action fires)
// tell the heatmap to light up today's cell immediately, without waiting
// for the Firestore round trip. Fire:
//   window.dispatchEvent(new CustomEvent('cl:contribution-recorded', { detail: { dateId: todayId() } }))
// right after a problem is marked solved.
function handleOptimisticUpdate(e) {
  const dateId = e?.detail?.dateId;
  if (!dateId || !el) return;
  lastCountsById = { ...lastCountsById, [dateId]: (lastCountsById[dateId] || 0) + 1 };
  if (viewMode === 'current') render(el, lastCountsById);
}

export function mount(container, uid) {
  injectStyles();
  el = container;
  el.className = 'contribution-heatmap-slot';
  el.innerHTML = '<p class="contribution-heatmap__loading">Loading activity\u2026</p>';
  viewMode = 'current';
  dropdownOpen = false;

  unsubscribe = subscribeToSubDocs(uid, 'contributions', (docs) => {
    const countsById = {};
    docs.forEach((d) => {
      countsById[d.id] = d.count || 0;
    });
    render(el, countsById);
  });

  scheduleMidnightRefresh();

  optimisticListener = handleOptimisticUpdate;
  window.addEventListener('cl:contribution-recorded', optimisticListener);

  documentClickHandler = () => closeDropdown();
  document.addEventListener('click', documentClickHandler);

  documentKeyHandler = (e) => {
    if (e.key === 'Escape') closeDropdown();
  };
  document.addEventListener('keydown', documentKeyHandler);
}

export function unmount() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  clearTimeout(midnightTimer);
  midnightTimer = null;
  if (optimisticListener) {
    window.removeEventListener('cl:contribution-recorded', optimisticListener);
    optimisticListener = null;
  }
  if (documentClickHandler) {
    document.removeEventListener('click', documentClickHandler);
    documentClickHandler = null;
  }
  if (documentKeyHandler) {
    document.removeEventListener('keydown', documentKeyHandler);
    documentKeyHandler = null;
  }
  if (el) el.innerHTML = '';
  el = null;
  lastCountsById = {};
  viewMode = 'current';
  dropdownOpen = false;
}
