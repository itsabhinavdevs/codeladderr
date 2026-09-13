import { getSubDoc, setSubDoc } from '../../firebase/firestore.js';
import { todayId } from '../../utils/date.js';
import { mount as mountHistory, unmount as unmountHistory } from './goal-history-panel.js';

function injectStyles() {
  const href = new URL('./today-goal-card.css', import.meta.url).href;
  if (document.querySelector('link[data-style="today-goal-card"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'today-goal-card';
  document.head.appendChild(link);
}

let el = null;
let historyOverlay = null;

async function loadGoals(uid) {
  const doc = await getSubDoc(uid, 'dailyGoals', todayId());
  return doc?.goals ?? [];
}

async function addGoal(uid, text) {
  const doc = await getSubDoc(uid, 'dailyGoals', todayId());
  const goals = doc?.goals ?? [];
  goals.push({ text, createdAt: new Date().toISOString() });
  await setSubDoc(uid, 'dailyGoals', todayId(), { goals }, true);
}

function openHistory(uid) {
  if (historyOverlay) return;
  historyOverlay = document.createElement('div');
  historyOverlay.className = 'today-goal-card__history-overlay';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'today-goal-card__history-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeHistory);

  const panelSlot = document.createElement('div');
  historyOverlay.append(closeBtn, panelSlot);
  document.body.appendChild(historyOverlay);
  mountHistory(panelSlot, uid);
}

function closeHistory() {
  if (!historyOverlay) return;
  unmountHistory();
  historyOverlay.remove();
  historyOverlay = null;
}

function render(container, uid, goals) {
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'today-goal-card';

  const header = document.createElement('div');
  header.className = 'today-goal-card__header';
  header.innerHTML = '<h3>Today\u2019s Goal</h3>';

  const historyBtn = document.createElement('button');
  historyBtn.type = 'button';
  historyBtn.className = 'today-goal-card__history-btn';
  historyBtn.textContent = 'History';
  historyBtn.addEventListener('click', () => openHistory(uid));
  header.appendChild(historyBtn);

  const list = document.createElement('ul');
  list.className = 'today-goal-card__list';
  if (goals.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'today-goal-card__empty';
    empty.textContent = 'No goals set for today yet.';
    list.appendChild(empty);
  } else {
    goals.forEach((g) => {
      const item = document.createElement('li');
      item.className = 'today-goal-card__item';
      item.textContent = g.text;
      list.appendChild(item);
    });
  }

  const addRow = document.createElement('div');
  addRow.className = 'today-goal-card__add-row';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'today-goal-card__add-btn';
  addBtn.textContent = '+ Add Goal';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'today-goal-card__input-wrap';
  inputWrap.hidden = true;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'today-goal-card__input';
  input.placeholder = 'What do you want to solve today?';

  const setBtn = document.createElement('button');
  setBtn.type = 'button';
  setBtn.className = 'today-goal-card__set-btn';
  setBtn.textContent = 'Set Goal';

  inputWrap.append(input, setBtn);

  addBtn.addEventListener('click', () => {
    addBtn.hidden = true;
    inputWrap.hidden = false;
    input.focus();
  });

  setBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    setBtn.disabled = true;
    await addGoal(uid, text);
    setBtn.disabled = false;
    input.value = '';
    const updated = await loadGoals(uid);
    render(container, uid, updated);
  });

  addRow.append(addBtn, inputWrap);
  card.append(header, list, addRow);
  container.appendChild(card);
}

export async function mount(container, uid) {
  injectStyles();
  el = container;
  const goals = await loadGoals(uid);
  render(el, uid, goals);
}

export function unmount() {
  closeHistory();
  if (el) el.innerHTML = '';
  el = null;
}
