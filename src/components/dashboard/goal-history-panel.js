import { getAllSubDocs } from '../../firebase/firestore.js';
import { LOADING_MARKUP } from "../shell/loading-indicator.js";


function injectStyles() {
  const href = new URL('./goal-history-panel.css', import.meta.url).href;
  if (document.querySelector('link[data-style="goal-history-panel"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'goal-history-panel';
  document.head.appendChild(link);
}

let el = null;

export async function mount(container, uid) {
  injectStyles();
  el = container;
  el.className = 'goal-history-panel';
  el.innerHTML = LOADING_MARKUP;

  const docs = await getAllSubDocs(uid, 'dailyGoals');
  const last7 = docs
    .sort((a, b) => (a.id < b.id ? 1 : -1))
    .slice(0, 7);

  el.innerHTML = '';
  const heading = document.createElement('h4');
  heading.className = 'goal-history-panel__heading';
  heading.textContent = 'Last 7 Days';
  el.appendChild(heading);

  if (last7.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'goal-history-panel__empty';
    empty.textContent = 'No goal history yet.';
    el.appendChild(empty);
    return;
  }

  last7.forEach((doc) => {
    const group = document.createElement('div');
    group.className = 'goal-history-panel__group';

    const date = document.createElement('div');
    date.className = 'goal-history-panel__date';
    date.textContent = doc.id;

    const list = document.createElement('ul');
    list.className = 'goal-history-panel__list';

    if (!doc.goals || doc.goals.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'goal-history-panel__no-goal';
      empty.textContent = 'No goal set';
      list.appendChild(empty);
    } else {
      doc.goals.forEach((g) => {
        const item = document.createElement('li');
        item.textContent = g.text;
        list.appendChild(item);
      });
    }

    group.append(date, list);
    el.appendChild(group);
  });
}

export function unmount() {
  if (el) el.innerHTML = '';
  el = null;
}
