import { navigateTo } from "../../router/router.js";
import { getState, subscribe } from "../../state/store.js";

const TABS = [
  { id: "practice", label: "Practice" },
  { id: "notes", label: "Notes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "concepts", label: "Concepts" },
  { id: "learning", label: "Learning" },
  { id: "revision", label: "Revision" },
];

let container = null;
let unsubscribe = null;

function render() {
  if (!container) return;
  const { currentSection } = getState();

  container.innerHTML = `
    <nav class="topbar-secondary">
      ${TABS.map(
        (tab) =>
          `<button
            class="topbar-secondary__tab${tab.id === currentSection ? " topbar-secondary__tab--active" : ""}"
            data-section="${tab.id}"
          >${tab.label}</button>`
      ).join("")}
    </nav>
  `;

  container.querySelectorAll(".topbar-secondary__tab").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.section));
  });
}

export function mount(el) {
  container = el;
  render();
  unsubscribe = subscribe(() => render());
}

export function unmount() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  if (container) container.innerHTML = "";
  container = null;
}
