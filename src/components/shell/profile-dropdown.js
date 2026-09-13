import { navigateTo } from "../../router/router.js";
import { signOutUser } from "../../firebase/auth.js";
import { getState } from "../../state/store.js";
import * as appearanceToggle from "./appearance-toggle.js";

let container = null;
let panelEl = null;
let isOpen = false;
let anchorEl = null;

function positionPanel() {
  if (!panelEl || !anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  panelEl.style.top = `${rect.bottom + 8}px`;
  panelEl.style.right = `${window.innerWidth - rect.right}px`;
}

function initials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Icon + chevron menu row, matching the original profile dropdown's layout.
// Profile / Billing / What's New are stubs for now (no destination yet) —
// same pattern the Shared Contract used for Settings before Phase 6 wires it.
function menuItemMarkup({ id, label, iconPath, chevron = true }) {
  return `
    <li>
      <button type="button" class="profile-dropdown__menu-item" id="${id}">
        <span class="profile-dropdown__menu-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${iconPath}
          </svg>
          <span>${label}</span>
        </span>
        ${
          chevron
            ? `<svg class="profile-dropdown__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>`
            : ""
        }
      </button>
    </li>`;
}

function render() {
  if (!container) return;
  const { user, streak } = getState();
  const streakValue = streak || 0;

  container.innerHTML = `
    <div class="profile-dropdown${isOpen ? " profile-dropdown--open" : ""}" id="profile-dropdown-panel">
      <div class="profile-dropdown__header">
        <div class="profile-dropdown__avatar">
          ${
            user && user.photoURL
              ? `<img src="${user.photoURL}" alt="" />`
              : initials(user && (user.displayName || user.email))
          }
        </div>
        <div class="profile-dropdown__user-info">
          <strong class="profile-dropdown__user-name">${(user && (user.displayName || user.email)) || "Guest"}</strong>
          <span class="profile-dropdown__user-email">${(user && user.email) || ""}</span>
        </div>
      </div>

      <div class="profile-dropdown__streak-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 23c-4.97 0-9-3.58-9-8 0-4.04 3.03-7.55 6.94-9.67.57-.31 1.25.21 1.07.84-.48 1.68.21 3.44 1.74 4.19 1.48.72 3.25.18 4.09-1.22.42-.71 1.39-.77 1.83-.11C20.35 11.53 21 13.7 21 15c0 4.42-4.03 8-9 8z" />
        </svg>
        <span>${streakValue}d streak</span>
      </div>

      <div class="profile-dropdown__divider"></div>

      <ul class="profile-dropdown__menu-list">
        ${menuItemMarkup({
          id: "profile-dropdown-profile",
          label: "Profile",
          iconPath: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`,
        })}
        ${menuItemMarkup({
          id: "profile-dropdown-settings",
          label: "Settings",
          iconPath: `<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>`,
        })}
        ${menuItemMarkup({
          id: "profile-dropdown-billing",
          label: "Billing",
          iconPath: `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>`,
        })}
        ${menuItemMarkup({
          id: "profile-dropdown-whats-new",
          label: "What's New",
          iconPath: `<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>`,
        })}
      </ul>

      <div class="profile-dropdown__item profile-dropdown__item--appearance" id="profile-dropdown-appearance"></div>

      <div class="profile-dropdown__divider"></div>

      <button type="button" class="profile-dropdown__logout-btn" id="profile-dropdown-signout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        <span>Log out</span>
      </button>
    </div>
  `;

  panelEl = container.querySelector("#profile-dropdown-panel");
  positionPanel();

  // Profile / Billing / What's New have no destination yet — stubs, same
  // pattern as Settings before Phase 6 builds settings/account-details.js.
  ["profile-dropdown-profile", "profile-dropdown-settings", "profile-dropdown-billing", "profile-dropdown-whats-new"].forEach(
    (id) => {
      const btn = container.querySelector(`#${id}`);
      if (btn) btn.addEventListener("click", () => close());
    }
  );

  appearanceToggle.mount(container.querySelector("#profile-dropdown-appearance"));

  container.querySelector("#profile-dropdown-signout").addEventListener("click", async () => {
    close();
    await signOutUser();
    navigateTo("login");
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
}

export function unmount() {
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("keydown", onKeydown);
  container = null;
  panelEl = null;
  isOpen = false;
}
