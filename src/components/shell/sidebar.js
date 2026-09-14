import { getState, subscribe } from "../../state/store.js";
import { navigateTo } from "../../router/router.js";
import { signOutUser } from "../../firebase/auth.js";
import { LADDER_LOGO_SVG } from "./ladder-logo.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "practice", label: "Practice" },
  { id: "notes", label: "Notes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "concepts", label: "Concepts" },
  { id: "learning", label: "Learning" },
  { id: "revision", label: "Revision" },
];

let container = null;
let unsubscribe = null;
let isOpen = false;

function render() {
  if (!container) return;
  const { user, currentSection } = getState();

  container.innerHTML = `
    <div class="sidebar__backdrop${isOpen ? " sidebar__backdrop--visible" : ""}" id="sidebar-backdrop"></div>
    <nav class="sidebar__panel${isOpen ? " sidebar__panel--open" : ""}" id="sidebar-panel" aria-hidden="${!isOpen}">
      <div class="sidebar__header">
        <button class="sidebar__logo-btn" id="sidebar-logo-btn" aria-label="Go to dashboard">
          ${LADDER_LOGO_SVG}
          <span class="sidebar__brand-name">CODE <b>Ladderr</b></span>
        </button>
        <button class="sidebar__close-btn" id="sidebar-close-btn" aria-label="Close menu">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <ul class="sidebar__nav">
        ${NAV_ITEMS.map(
          (item) => `
          <li>
            <button
              class="sidebar__nav-link${item.id === currentSection ? " sidebar__nav-link--active" : ""}"
              data-section="${item.id}"
            >
              ${item.label}
            </button>
          </li>`
        ).join("")}
      </ul>
      <div class="sidebar__profile">
        <img
          class="sidebar__profile-avatar"
          src="${user && user.photoURL ? user.photoURL : "/assets/icons/avatar-fallback.svg"}"
          alt=""
        />
        <span class="sidebar__profile-name">${user ? user.displayName || user.email : ""}</span>
        <button class="sidebar__signout-btn" id="sidebar-signout-btn">Sign out</button>
      </div>
    </nav>
  `;

  container.querySelector("#sidebar-logo-btn").addEventListener("click", () => {
    navigateTo("dashboard");
    close();
  });

  container.querySelector("#sidebar-close-btn").addEventListener("click", close);

  container.querySelectorAll(".sidebar__nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
      close();
    });
  });

  container.querySelector("#sidebar-signout-btn").addEventListener("click", async () => {
    await signOutUser();
    navigateTo("login");
  });

  container.querySelector("#sidebar-backdrop").addEventListener("click", close);
}

export function open() {
  isOpen = true;
  render();
}

export function close() {
  isOpen = false;
  render();
}

export function toggle() {
  isOpen = !isOpen;
  render();
}

export function mount(el) {
  container = el;
  render();
  unsubscribe = subscribe(() => render());
}

export function unmount() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  container = null;
  isOpen = false;
}
