import { setState } from "../../state/store.js";
import { subscribeToCollection } from "../../firebase/firestore.js";

const LAST_OPENED_KEY = "dsat_notifications_last_opened";

let container = null;
let panelEl = null;
let anchorEl = null;
let isOpen = false;
let unsubscribeFirestore = null;
let notifications = [];
let lastOpenedAt = Number(localStorage.getItem(LAST_OPENED_KEY) || 0);

function positionPanel() {
  if (!panelEl || !anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  panelEl.style.top = `${rect.bottom + 8}px`;
  panelEl.style.right = `${window.innerWidth - rect.right}px`;
}

function formatDate(value) {
  const date = value && typeof value.toDate === "function" ? value.toDate() : null;
  return date ? date.toLocaleDateString() : "";
}

function hasUnread() {
  return notifications.some((n) => {
    const created = n.createdAt && typeof n.createdAt.toDate === "function" ? n.createdAt.toDate().getTime() : 0;
    return created > lastOpenedAt;
  });
}

// Bell icon lives in topbar-primary.js, which re-renders its own innerHTML
// on every store change (see topbar-primary.js's render()). Rather than
// reaching into that DOM directly (which would get wiped on the next
// re-render), push unread status through the shared store — the same
// pattern already used for `streak` — so topbar-primary's existing
// subscribe(() => render()) picks it up naturally.
function syncUnreadState() {
  setState({ hasUnreadNotifications: hasUnread() });
}

function render() {
  if (!container) return;

  container.innerHTML = `
    <div class="notifications-dropdown${isOpen ? " notifications-dropdown--open" : ""}" id="notifications-dropdown-panel">
      <div class="notifications-dropdown__header">Notifications</div>
      <div class="notifications-dropdown__list" id="notifications-dropdown-list"></div>
      <div class="notifications-dropdown__empty" id="notifications-dropdown-empty">No notifications yet.</div>
    </div>
  `;

  panelEl = container.querySelector("#notifications-dropdown-panel");
  positionPanel();
  renderList();
}

function renderList() {
  if (!container) return;
  const listEl = container.querySelector("#notifications-dropdown-list");
  const emptyEl = container.querySelector("#notifications-dropdown-empty");
  if (!listEl || !emptyEl) return;

  emptyEl.style.display = notifications.length ? "none" : "block";

  listEl.innerHTML = notifications
    .map(
      (n) => `
      <div class="notifications-dropdown__item">
        <div class="notifications-dropdown__item-title"></div>
        <div class="notifications-dropdown__item-body"></div>
        <div class="notifications-dropdown__item-date">${formatDate(n.createdAt)}</div>
      </div>`
    )
    .join("");

  // Set text via textContent (not innerHTML) to avoid interpreting
  // admin-authored title/body as markup.
  const items = listEl.querySelectorAll(".notifications-dropdown__item");
  items.forEach((item, i) => {
    item.querySelector(".notifications-dropdown__item-title").textContent = notifications[i].title || "";
    item.querySelector(".notifications-dropdown__item-body").textContent = notifications[i].body || "";
  });
}

function onDocumentClick(event) {
  if (!isOpen) return;
  if (panelEl && panelEl.contains(event.target)) return;
  if (anchorEl && anchorEl.contains(event.target)) return;
  close();
}

function onKeydown(event) {
  if (event.key === "Escape") close();
}

export function open(anchor) {
  anchorEl = anchor || anchorEl;
  isOpen = true;
  render();
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("keydown", onKeydown);

  lastOpenedAt = Date.now();
  localStorage.setItem(LAST_OPENED_KEY, String(lastOpenedAt));
  syncUnreadState();
}

export function close() {
  isOpen = false;
  render();
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("keydown", onKeydown);
}

export function toggle(anchor) {
  if (isOpen) {
    close();
  } else {
    open(anchor);
  }
}

export function mount(el) {
  container = el;
  render();

  unsubscribeFirestore = subscribeToCollection(
    "notifications",
    (docs) => {
      notifications = docs;
      renderList();
      syncUnreadState();
    },
    { orderByField: "createdAt", direction: "desc" }
  );
}

export function unmount() {
  if (unsubscribeFirestore) unsubscribeFirestore();
  unsubscribeFirestore = null;
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("keydown", onKeydown);
  container = null;
  panelEl = null;
  isOpen = false;
  notifications = [];
}
