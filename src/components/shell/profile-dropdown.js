import { navigateTo } from "../../router/router.js";
import { signOutUser } from "../../firebase/auth.js";
import { getState } from "../../state/store.js";
import * as appearanceToggle from "./appearance-toggle.js";

// Paste just the file ID from your Drive share link, e.g. for
//   https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing
// the ID is the part between /d/ and /view:
//   1AbCdEfGhIjKlMnOp
// The file's Drive sharing must be set to "Anyone with the link" or it will
// fail to load regardless of which URL format is used below.
const BILLING_IMAGE_FILE_ID = "1_HJ4nCjoGjTZxvrq62doRbVbBalX1SlX";

// Drive's `thumbnail` endpoint is the reliable way to embed a Drive image in
// a plain <img> tag — `uc?export=view` frequently breaks (redirects or a
// virus-scan interstitial that <img> can't follow, showing a broken-icon).
// `sz=w1000` asks for a version up to 1000px wide; adjust if you want it
// sharper/smaller.
const BILLING_IMAGE_URL = `https://drive.google.com/thumbnail?id=${BILLING_IMAGE_FILE_ID}&sz=w1000`;
// Used only if the thumbnail URL fails to load (see the onerror handler
// below) — kept as a second attempt since Drive's behavior here isn't 100%
// consistent across every file/account.
const BILLING_IMAGE_FALLBACK_URL = `https://drive.google.com/uc?export=view&id=${BILLING_IMAGE_FILE_ID}`;

let container = null;
let panelEl = null;
let isOpen = false;
let anchorEl = null;

let billingPopupEl = null;
let isBillingPopupOpen = false;

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
// Profile / What's New are stubs for now (no destination yet) — same
// pattern the Shared Contract used for Settings before Phase 6 wired it.
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

  // Profile / What's New remain unbuilt stubs — clicking them just closes
  // the menu. Billing now opens the image popup instead (see below).
  ["profile-dropdown-profile", "profile-dropdown-whats-new"].forEach((id) => {
    const btn = container.querySelector(`#${id}`);
    if (btn) btn.addEventListener("click", () => close());
  });

  container.querySelector("#profile-dropdown-settings").addEventListener("click", () => {
    close();
    navigateTo("settings");
  });

  container.querySelector("#profile-dropdown-billing").addEventListener("click", () => {
    close();
    openBillingPopup();
  });

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

// ---------- Billing image popup ----------
// A small centered card showing one image, appended straight to <body> (not
// the topbar container) so it isn't clipped by any ancestor's overflow.
// Closes on: clicking the dark backdrop, pressing Escape, or clicking
// anywhere outside the popup card. Clicking the image itself does nothing.

function renderBillingPopup() {
  if (billingPopupEl) return;

  billingPopupEl = document.createElement("div");
  billingPopupEl.className = "billing-popup-backdrop";
  billingPopupEl.innerHTML = `
    <div class="billing-popup-card" role="dialog" aria-modal="true" aria-label="Billing">
      <button type="button" class="billing-popup-close" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <img
        src="${BILLING_IMAGE_URL}"
        alt="Billing"
        referrerpolicy="no-referrer"
        onerror="this.dataset.failed ? (this.replaceWith(Object.assign(document.createElement('p'),{className:'billing-popup-error',textContent:'Image failed to load — check the Drive file is shared as \\'Anyone with the link\\'.'}))) : (this.dataset.failed='1', this.src='${BILLING_IMAGE_FALLBACK_URL}')"
      />
    </div>
  `;

  document.body.appendChild(billingPopupEl);

  // Clicking the backdrop (anything outside the card) closes it.
  billingPopupEl.addEventListener("click", (event) => {
    if (event.target === billingPopupEl) closeBillingPopup();
  });

  billingPopupEl.querySelector(".billing-popup-close").addEventListener("click", closeBillingPopup);
}

function onBillingKeydown(event) {
  if (event.key === "Escape") closeBillingPopup();
}

export function openBillingPopup() {
  if (isBillingPopupOpen) return;
  isBillingPopupOpen = true;
  renderBillingPopup();
  // Next frame, so the transition (opacity/scale) actually animates in
  // rather than snapping straight to the open state.
  requestAnimationFrame(() => {
    if (billingPopupEl) billingPopupEl.classList.add("billing-popup-backdrop--open");
  });
  document.addEventListener("keydown", onBillingKeydown);
}

export function closeBillingPopup() {
  if (!isBillingPopupOpen || !billingPopupEl) return;
  isBillingPopupOpen = false;
  billingPopupEl.classList.remove("billing-popup-backdrop--open");
  document.removeEventListener("keydown", onBillingKeydown);
  const elToRemove = billingPopupEl;
  billingPopupEl = null;
  setTimeout(() => elToRemove.remove(), 200);
}

export function mount(el) {
  container = el;
  render();
}

export function unmount() {
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("keydown", onKeydown);
  closeBillingPopup();
  container = null;
  panelEl = null;
  isOpen = false;
}
