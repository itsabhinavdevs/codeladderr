// src/components/settings/account-details.js
//
// Phase 6. Displays displayName/email/photoURL/joinedAt from getUserDoc(uid).
// "Delete Account" opens a confirmation dialog; on confirm, wipes Firestore
// data then the Auth user, then routes to login. Mounted by the router's
// "settings" section entry, inside the normal shell.

import { getState } from "../../state/store.js";
import { getUserDoc, deleteUserData } from "../../firebase/firestore.js";
import { deleteAuthUser } from "../../firebase/auth.js";
import { navigateTo } from "../../router/router.js";
import { LOADING_MARKUP } from "../shell/loading-indicator.js";

let rootEl = null;

export async function mount(container) {
  const { user } = getState();

  container.innerHTML = `
    <div class="account-details">
      <h1 class="account-details__title">Account</h1>
      <div class="account-details__card" data-profile-card>
        <div class="account-details__loading">${LOADING_MARKUP}</div>
      </div>

      <div class="account-details__danger-zone">
        <h2 class="account-details__danger-title">Danger zone</h2>
        <p class="account-details__danger-copy">
          Deleting your account permanently removes all your progress, notes,
          goals, and streak data. This cannot be undone.
        </p>
        <button class="account-details__delete-btn" data-action="delete-account">
          Delete Account
        </button>
      </div>

      <div class="account-details__confirm-dialog" data-confirm-dialog hidden>
        <div class="account-details__confirm-backdrop" data-action="cancel-delete"></div>
        <div class="account-details__confirm-panel">
          <h3>Delete your account?</h3>
          <p>This permanently deletes all your data. Type <strong>DELETE</strong> to confirm.</p>
          <input type="text" data-confirm-input placeholder="DELETE" />
          <div class="account-details__confirm-actions">
            <button data-action="cancel-delete">Cancel</button>
            <button class="account-details__confirm-btn" data-action="confirm-delete" disabled>
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  rootEl = container.querySelector(".account-details");

  const profileCard = rootEl.querySelector("[data-profile-card]");
  const doc = user?.uid ? await getUserDoc(user.uid) : null;
  renderProfileCard(profileCard, doc, user);

  const dialog = rootEl.querySelector("[data-confirm-dialog]");
  const confirmInput = rootEl.querySelector("[data-confirm-input]");
  const confirmBtn = rootEl.querySelector('[data-action="confirm-delete"]');

  rootEl.querySelector('[data-action="delete-account"]').addEventListener("click", () => {
    dialog.hidden = false;
    confirmInput.value = "";
    confirmBtn.disabled = true;
  });

  rootEl.querySelectorAll('[data-action="cancel-delete"]').forEach((el) =>
    el.addEventListener("click", () => {
      dialog.hidden = true;
    })
  );

  confirmInput.addEventListener("input", () => {
    confirmBtn.disabled = confirmInput.value.trim() !== "DELETE";
  });

  confirmBtn.addEventListener("click", async () => {
    if (confirmInput.value.trim() !== "DELETE") return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting...";

    try {
      await deleteUserData(user.uid);
      await deleteAuthUser();
      navigateTo("login");
    } catch (err) {
      console.error("[account-details] failed to delete account", err);
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Delete permanently";
      alert("Something went wrong deleting your account. Please try again.");
    }
  });
}

export function unmount() {
  rootEl = null;
}

function renderProfileCard(container, doc, authUser) {
  const displayName = doc?.displayName || authUser?.displayName || "";
  const email = doc?.email || authUser?.email || "";
  const photoURL = doc?.photoURL || authUser?.photoURL || "/assets/icons/avatar-fallback.svg";
  const joinedAt = doc?.joinedAt?.toDate ? doc.joinedAt.toDate() : null;

  container.innerHTML = `
    <img class="account-details__avatar" src="${photoURL}" alt="" />
    <div class="account-details__fields">
      <div class="account-details__field">
        <span class="account-details__field-label">Name</span>
        <span class="account-details__field-value"></span>
      </div>
      <div class="account-details__field">
        <span class="account-details__field-label">Email</span>
        <span class="account-details__field-value"></span>
      </div>
      <div class="account-details__field">
        <span class="account-details__field-label">Joined</span>
        <span class="account-details__field-value"></span>
      </div>
    </div>
  `;

  const values = container.querySelectorAll(".account-details__field-value");
  values[0].textContent = displayName;
  values[1].textContent = email;
  values[2].textContent = joinedAt ? joinedAt.toLocaleDateString() : "Unknown";
}
