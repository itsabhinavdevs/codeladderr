// src/components/notes/notes-view.js
// Router mounts this directly for the "notes" section (contract: mount/unmount,
// same as dashboard.js / practice-hub.js). Cards link out to static external
// resources (Google Drive / Notion) — no Firestore reads, no per-user data.

function ensureStyle(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

// Static note set. TODO: replace each href with your real Google Drive / Notion link.
const NOTES = [
  { badge: "C++", title: "C++ Notes", href: "#" },
  { badge: "DSA", title: "C++ DSA by Love Babbar", href: "#" },
  { badge: "Algo", title: "Algorithm DSA by Abdul Bari", href: "#" },
  { badge: "OS", title: "Operating Systems", href: "#" },
  { badge: "DB", title: "Database Management Systems", href: "#" },
  { badge: "Java", title: "Java Core Concepts", href: "#" },
  { badge: "1", title: "System Design Basics", href: "#" },
  { badge: "2", title: "Interview Preparation Kit", href: "#" },
];

function cardMarkup(note) {
  return `
    <a
      class="notes-view__card"
      href="${note.href}"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="notes-view__badge">${note.badge}</span>
      <span class="notes-view__title">${note.title}</span>
      <span class="notes-view__footer">Open Google Drive notes</span>
    </a>`;
}

let rootEl = null;

export function mount(container) {
  ensureStyle("/src/components/notes/notes-view.css");
  rootEl = container;

  container.innerHTML = `
    <section class="notes-view">
      <header class="notes-view__header">
        <span class="notes-view__label">Notes</span>
        <h1 class="notes-view__heading">Coding Notes</h1>
        <p class="notes-view__subtitle">
          Quick access to your saved reference notes and cheat sheets.
        </p>
      </header>
      <div class="notes-view__grid" role="list">
        ${NOTES.map(cardMarkup).join("")}
      </div>
    </section>
  `;
}

export function unmount() {
  if (rootEl) rootEl.innerHTML = "";
  rootEl = null;
}
