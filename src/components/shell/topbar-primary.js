import { getState, subscribe } from "../../state/store.js";
import { navigateTo } from "../../router/router.js";
import * as sidebar from "./sidebar.js";
import * as searchOverlay from "./search-overlay.js";
import * as profileDropdown from "./profile-dropdown.js";
import * as notificationsDropdown from "./notifications-dropdown.js";
import { LADDER_LOGO_SVG } from "./ladder-logo.js";

let container = null;
let unsubscribe = null;
let overlaysMounted = false;

function render() {
  if (!container) return;
  const { user, streak, hasUnreadNotifications } = getState();

  container.innerHTML = `
    <header class="topbar-primary">
      <button class="topbar-primary__icon-btn" id="hamburger-btn" aria-label="Toggle menu">
        <img src="/public/assets/icons/hamburger.svg" alt="" />
      </button>
      <button class="topbar-primary__logo-btn" id="logo-btn" aria-label="Go to dashboard">
        ${LADDER_LOGO_SVG}
        <span class="topbar-primary__brand-name">CODE <b>Ladder</b></span>
      </button>
      <div class="topbar-primary__spacer"></div>
      <div class="topbar-primary__streak" aria-label="${streak}-day streak">
        <img src="/public/assets/icons/flame.svg" alt="" />
        <span>${streak}</span>
      </div>
      <button class="topbar-primary__icon-btn${hasUnreadNotifications ? " has-unread" : ""}" id="bell-btn" aria-label="Notifications">
        <img src="/public/assets/icons/bell.svg" alt="" />
      </button>
      <button class="topbar-primary__icon-btn" id="search-btn" aria-label="Search">
        <img src="/public/assets/icons/search.svg" alt="" />
      </button>
      <button class="topbar-primary__avatar-btn" id="profile-btn" aria-label="Open profile menu">
        <img
          class="topbar-primary__avatar"
          src="${user && user.photoURL ? user.photoURL : "/public/assets/icons/avatar-fallback.svg"}"
          alt=""
        />
      </button>
    </header>
  `;

  container.querySelector("#hamburger-btn").addEventListener("click", () => sidebar.toggle());
  container.querySelector("#logo-btn").addEventListener("click", () => navigateTo("dashboard"));
  container.querySelector("#bell-btn").addEventListener("click", (event) => {
    notificationsDropdown.toggle(event.currentTarget);
  });
  container.querySelector("#search-btn").addEventListener("click", () => searchOverlay.toggle());
  container.querySelector("#profile-btn").addEventListener("click", (event) => {
    profileDropdown.toggle(event.currentTarget);
  });
}

export function mount(el) {
  container = el;
  render();
  unsubscribe = subscribe(() => render());

  if (!overlaysMounted) {
    const searchRoot = document.createElement("div");
    searchRoot.id = "search-overlay-root";
    document.body.appendChild(searchRoot);
    searchOverlay.mount(searchRoot);

    const profileRoot = document.createElement("div");
    profileRoot.id = "profile-dropdown-root";
    document.body.appendChild(profileRoot);
    profileDropdown.mount(profileRoot);

    const notificationsRoot = document.createElement("div");
    notificationsRoot.id = "notifications-dropdown-root";
    document.body.appendChild(notificationsRoot);
    notificationsDropdown.mount(notificationsRoot);

    overlaysMounted = true;
  }
}

export function unmount() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  container = null;
}
