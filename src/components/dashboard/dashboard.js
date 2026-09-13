import { getCurrentUser } from '../../firebase/auth.js';
import { mount as mountTodayGoal, unmount as unmountTodayGoal } from './today-goal-card.js';
import { mount as mountLongTermGoal, unmount as unmountLongTermGoal } from './long-term-goal-card.js';
import { mount as mountSheetGrid, unmount as unmountSheetGrid } from './sheet-progress-grid.js';
import { mount as mountHeatmap, unmount as unmountHeatmap } from './contribution-heatmap.js';

function injectStyles() {
  const href = new URL('./dashboard.css', import.meta.url).href;
  if (document.querySelector('link[data-style="dashboard"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'dashboard';
  document.head.appendChild(link);
}

let root = null;

export function mount(container, params = {}) {
  injectStyles();

  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = "";


  root = document.createElement('div');
  root.className = 'dashboard';

  const goalsRow = document.createElement('div');
  goalsRow.className = 'dashboard__goals-row';

  const todaySlot = document.createElement('div');
  todaySlot.className = 'dashboard__today-goal';
  const longTermSlot = document.createElement('div');
  longTermSlot.className = 'dashboard__long-term-goal';

  goalsRow.append(todaySlot, longTermSlot);

  const sheetGridSlot = document.createElement('div');
  sheetGridSlot.className = 'dashboard__sheet-grid';
  const heatmapSlot = document.createElement('div');
  heatmapSlot.className = 'dashboard__heatmap';

  root.append(goalsRow, sheetGridSlot, heatmapSlot);
  container.appendChild(root);

  mountTodayGoal(todaySlot, user.uid);
  mountLongTermGoal(longTermSlot, user.uid);
  mountSheetGrid(sheetGridSlot, user.uid);
  mountHeatmap(heatmapSlot, user.uid);
}

export function unmount() {
  unmountTodayGoal();
  unmountLongTermGoal();
  unmountSheetGrid();
  unmountHeatmap();
  if (root) {
    root.remove();
    root = null;
  }
}
