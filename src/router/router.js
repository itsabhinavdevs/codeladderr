import { setState } from "../state/store.js";

// section name -> mount(container, params) function.
// Later phases register their real section components here; for Phase 1 only
// a placeholder "dashboard" entry exists so the shell has something to render.
const registry = new Map();

registry.set("dashboard", {
  mount(container) {
    container.textContent = "Dashboard placeholder";
  },
  unmount() {},
});

const routeChangeCallbacks = new Set();
let currentMountedSection = null;
let containerEl = null;

const VALID_SECTIONS = [
  "dashboard",
  "practice",
  "notes",
  "roadmap",
  "concepts",
  "learning",
  "revision",
];

/**
 * Parses the current location.hash into { section, params }.
 * Hash shape: #section=<name>&sheetId=<id>&questionId=<id>
 */
export function getCurrentRoute() {
  const raw = window.location.hash.replace(/^#/, "");
  const search = new URLSearchParams(raw);
  const section = search.get("section") || "dashboard";
  const params = {};
  if (search.has("sheetId")) params.sheetId = search.get("sheetId");
  if (search.has("questionId")) params.questionId = search.get("questionId");
  return { section, params };
}

function buildHash(section, params = {}) {
  const search = new URLSearchParams({ section, ...params });
  return `#${search.toString()}`;
}

function render(section, params) {
  const entry = registry.get(section);

  if (!entry) {
    // Later phases will have every section registered; for now, log and stop.
    console.info(`[router] "${section}" is not implemented yet.`);
    return;
  }

  if (currentMountedSection && registry.has(currentMountedSection)) {
    const prev = registry.get(currentMountedSection);
    if (typeof prev.unmount === "function") prev.unmount();
  }

  if (containerEl) {
    entry.mount(containerEl, params);
  }
  currentMountedSection = section;
  setState({ currentSection: section });
}

/**
 * Navigates to a section. "login" is a real page redirect (public/login.html),
 * not part of the in-app hash router.
 */
// Add this helper function
//correct redirct link for local and production
function getRedirectPath(page) {
  const isLocalDev = window.location.pathname.includes('/public');
  return isLocalDev ? `/public/${page}` : `/${page}`;
}

export function navigateTo(section, params = {}) {
  if (section === "login") {
    window.location.href = getRedirectPath("login.html");
    return;
  }

  if (!VALID_SECTIONS.includes(section)) {
    console.info(`[router] Unknown section "${section}".`);
    return;
  }

  window.location.hash = buildHash(section, params);
  // The hashchange listener (registered in initRouter) handles the actual render.
}

export function onRouteChange(callback) {
  routeChangeCallbacks.add(callback);
  return () => routeChangeCallbacks.delete(callback);
}

/**
 * Wires up the router to a container element and starts listening for hash
 * changes. Call once, from main.js, after the user is confirmed signed in.
 */
export function initRouter(container) {
  containerEl = container;

  const handle = () => {
    const route = getCurrentRoute();
    routeChangeCallbacks.forEach((cb) => cb(route));
    render(route.section, route.params);
  };

  window.addEventListener("hashchange", handle);
  handle(); // render whatever route is already in the URL (or default to dashboard)
}
