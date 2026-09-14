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
  { badge: "C++", title: "C++ Notes", href: "https://app.notion.com/p/C-Notes-2425e71de6028084a5bec0c835fed7d8", cta: "Open in Notion" },
  { badge: "DSA", title: "C++ DSA by Love Babbar", href: "https://drive.google.com/file/d/1XIvpJxElA2Ka_JIWtT_m_UUvTFe4ThvO/view", cta: "Open in Drive" },
  { badge: "Algo", title: "Algorithm DSA by Abdul Bari", href: "https://drive.google.com/drive/folders/14_FJy4KWCCP7mSuC1G0mak3ORZPVj1Oo", cta: "Open in Drive" },
  { badge: "180", title: "Striver DSA 180 sheet Notes", href: "https://drive.google.com/drive/folders/1KijWBHOwW57dHg1Wr2plVwX-YajtIVVE", cta: "Open in Drive" },
  { badge: "DSA", title: "Striver DSA Handwritten Notes", href: "https://drive.google.com/file/d/10HliiBb9bIG45sz4xm-ysuSnXDHJiHWc/view", cta: "Open in Drive" },
  { badge: "OS", title: "Operating Systems", href: "https://drive.google.com/file/d/1qkoW-E2B8Rugn5YF8BXX55tnmQfUe_Jx/view", cta: "Open in Drive" },
  { badge: "DB", title: "Database Management Systems", href: "https://drive.google.com/file/d/1y3KKghRhQjKfbWhvLipMOCCemKd_XdTm/view", cta: "Open in Drive" },
  { badge: "Java", title: "Java Core Concepts", href: "https://drive.google.com/file/d/1w4RugY4SyQj48V0uEqVV1DeQoD51Pz0K/view", cta: "Open in Drive" },
  { badge: "75", title: "75 LeetCode DSA Q/A", href: "https://drive.google.com/file/d/10PMI6EhmUpQWStGvBkNOq2waOh45x_2j/view", cta: "Open in Drive" },
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
      <span class="notes-view__card-cta">${note.cta || "Open notes"}</span>
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
