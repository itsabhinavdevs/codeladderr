import { navigateTo } from "../../router/router.js";

const TABS = [
  { id: "practice", label: "Practice" },
  { id: "notes", label: "Notes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "concepts", label: "Concepts" },
  { id: "learning", label: "Learning" },
  { id: "revision", label: "Revision" },
];

let container = null;

export function mount(el) {
  container = el;
  container.innerHTML = `
    <nav class="topbar-secondary">
      ${TABS.map(
        (tab) => `<button class="topbar-secondary__tab" data-section="${tab.id}">${tab.label}</button>`
      ).join("")}
    </nav>
  `;

  container.querySelectorAll(".topbar-secondary__tab").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.section));
  });
}

export function unmount() {
  if (container) container.innerHTML = "";
  container = null;
}
