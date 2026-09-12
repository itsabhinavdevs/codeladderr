import { navigateTo } from "../../router/router.js";
import { signOutUser } from "../../firebase/auth.js";
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

function render() {
  if (!container) return;
  container.innerHTML = `
    <div class="profile-dropdown${isOpen ? " profile-dropdown--open" : ""}" id="profile-dropdown-panel">
      <button class="profile-dropdown__item" id="profile-dropdown-settings">Settings</button>
      <div class="profile-dropdown__item profile-dropdown__item--appearance" id="profile-dropdown-appearance"></div>
      <button class="profile-dropdown__item profile-dropdown__item--danger" id="profile-dropdown-signout">
        Sign out
      </button>
    </div>
  `;

  panelEl = container.querySelector("#profile-dropdown-panel");
  positionPanel();

  container.querySelector("#profile-dropdown-settings").addEventListener("click", () => {
    // Phase 6 builds settings/account-details.js; this hook will route there.
    close();
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
