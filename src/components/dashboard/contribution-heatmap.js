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

const WEEKS = 53;
const DAYS_PER_WEEK = 7;

let el = null;
let unsubscribe = null;

function buildDateGrid() {
  const today = new Date();
  const totalDays = WEEKS * DAYS_PER_WEEK;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  const dates = [];
  const cursor = new Date(start);
  while (dates.length < totalDays) {
    dates.push(formatDateId(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function levelForCount(count) {
  if (!count) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function render(container, countsById) {
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'contribution-heatmap';

  const grid = document.createElement('div');
  grid.className = 'contribution-heatmap__grid';

  const dates = buildDateGrid();
  for (let week = 0; week < WEEKS; week += 1) {
    const col = document.createElement('div');
    col.className = 'contribution-heatmap__week';
    for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
      const dateId = dates[week * DAYS_PER_WEEK + day];
      const count = countsById[dateId] || 0;
      const cell = document.createElement('div');
      cell.className = `contribution-heatmap__cell contribution-heatmap__cell--level-${levelForCount(count)}`;
      cell.title = `${dateId}: ${count} solved`;
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

export function mount(container, uid) {
  injectStyles();
  el = container;
  el.className = 'contribution-heatmap-slot';
  el.innerHTML = '<p class="contribution-heatmap__loading">Loading activity\u2026</p>';

  unsubscribe = subscribeToSubDocs(uid, 'contributions', (docs) => {
    const countsById = {};
    docs.forEach((d) => {
      countsById[d.id] = d.count || 0;
    });
    render(el, countsById);
  });
}

export function unmount() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (el) el.innerHTML = '';
  el = null;
}
