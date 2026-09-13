import { getAllSubDocs, setSubDoc } from '../../firebase/firestore.js';

function injectStyles() {
  const href = new URL('./long-term-goal-card.css', import.meta.url).href;
  if (document.querySelector('link[data-style="long-term-goal-card"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'long-term-goal-card';
  document.head.appendChild(link);
}

let el = null;

function makeId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadGoals(uid) {
  const docs = await getAllSubDocs(uid, 'longTermGoals');
  return docs.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

async function saveGoal(uid, goalId, data) {
  await setSubDoc(uid, 'longTermGoals', goalId, data, true);
}

function render(container, uid, goals) {
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'long-term-goal-card';

  const header = document.createElement('h3');
  header.textContent = 'Long-Term Goals';
  card.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'long-term-goal-card__list';

  if (goals.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'long-term-goal-card__empty';
    empty.textContent = 'No long-term goals yet.';
    list.appendChild(empty);
  } else {
    goals.forEach((goal) => {
      const item = document.createElement('li');
      item.className = 'long-term-goal-card__item';
      if (goal.completed) item.classList.add('long-term-goal-card__item--completed');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!goal.completed;
      checkbox.addEventListener('change', async () => {
        await saveGoal(uid, goal.id, { completed: checkbox.checked });
        goal.completed = checkbox.checked;
        item.classList.toggle('long-term-goal-card__item--completed', checkbox.checked);
      });

      const text = document.createElement('span');
      text.className = 'long-term-goal-card__text';
      text.textContent = goal.text;

      const due = document.createElement('span');
      due.className = 'long-term-goal-card__due';
      due.textContent = goal.dueDate ? `Due ${goal.dueDate}` : '';

      item.append(checkbox, text, due);
      list.appendChild(item);
    });
  }

  const addRow = document.createElement('div');
  addRow.className = 'long-term-goal-card__add-row';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'long-term-goal-card__add-btn';
  addBtn.textContent = '+ Add Goal';

  const form = document.createElement('div');
  form.className = 'long-term-goal-card__form';
  form.hidden = true;

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Goal';
  textInput.className = 'long-term-goal-card__text-input';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'long-term-goal-card__date-input';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.className = 'long-term-goal-card__save-btn';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'long-term-goal-card__cancel-btn';

  form.append(textInput, dateInput, saveBtn, cancelBtn);

  addBtn.addEventListener('click', () => {
    addBtn.hidden = true;
    form.hidden = false;
    textInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    textInput.value = '';
    dateInput.value = '';
    form.hidden = true;
    addBtn.hidden = false;
  });

  saveBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) return;
    saveBtn.disabled = true;
    const id = makeId();
    await saveGoal(uid, id, {
      text,
      dueDate: dateInput.value || null,
      createdAt: new Date().toISOString(),
      completed: false,
    });
    saveBtn.disabled = false;
    const updated = await loadGoals(uid);
    render(container, uid, updated);
  });

  addRow.append(addBtn, form);
  card.appendChild(addRow);
  container.appendChild(card);
}

export async function mount(container, uid) {
  injectStyles();
  el = container;
  const goals = await loadGoals(uid);
  render(el, uid, goals);
}

export function unmount() {
  if (el) el.innerHTML = '';
  el = null;
}
