import { getState, setState } from "../../state/store.js";
import { setUserField } from "../../firebase/firestore.js";

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export async function setTheme(theme) {
  applyTheme(theme);
  setState({ theme });
  localStorage.setItem("dsa-tracker-theme", theme);

  const { user } = getState();
  if (user) {
    try {
      await setUserField(user.uid, "theme", theme);
    } catch (err) {
      console.error("Failed to persist theme preference", err);
    }
  }
}

export function mount(el) {
  const { theme } = getState();
  el.innerHTML = `
    <div class="appearance-toggle">
      <span class="appearance-toggle__label">Appearance</span>
      <div class="appearance-toggle__switch" role="group" aria-label="Theme">
        <button
          class="appearance-toggle__option${theme === "dark" ? " appearance-toggle__option--active" : ""}"
          data-theme="dark"
        >
          Dark
        </button>
        <button
          class="appearance-toggle__option${theme === "light" ? " appearance-toggle__option--active" : ""}"
          data-theme="light"
        >
          Light
        </button>
      </div>
    </div>
  `;

  el.querySelectorAll(".appearance-toggle__option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nextTheme = btn.dataset.theme;
      await setTheme(nextTheme);
      el.querySelectorAll(".appearance-toggle__option").forEach((b) => {
        b.classList.toggle(
          "appearance-toggle__option--active",
          b.dataset.theme === nextTheme
        );
      });
    });
  });
}
