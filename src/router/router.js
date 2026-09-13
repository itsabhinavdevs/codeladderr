import { setState } from "../state/store.js";
import * as topbarPrimary from "../components/shell/topbar-primary.js";
import * as topbarSecondary from "../components/shell/topbar-secondary.js";
import * as sidebar from "../components/shell/sidebar.js";
import * as footer from "../components/shell/footer.js";
import * as practiceHub from "../components/practice/practice-hub.js";
import * as notesView from "../components/notes/notes-view.js";
import * as roadmapView from "../components/roadmap/roadmap-view.js";
import * as conceptsView from "../components/concepts/concepts-view.js";
import * as learningView from "../components/learning/learning-view.js";
import * as revisionView from "../components/revision/revision-view.js";
import * as dashboard from "../components/dashboard/dashboard.js";

const VALID_SECTIONS = new Set([
  "dashboard",
  "practice",
  "notes",
  "roadmap",
  "concepts",
  "learning",
  "revision",
]);

// section name -> { mount(container, params), unmount?() }
const sectionRegistry = new Map([
  [
    "dashboard",
    dashboard
  ],
  [
    "practice",
    practiceHub
  ],
  [
    "notes",
    notesView
  ],
  [
    "roadmap",
    roadmapView
  ],
  [
    "concepts",
    conceptsView
  ],
  [
    "learning",
    learningView
  ],
  [
    "revision",
    revisionView
  ],
]);

const routeListeners = new Set();
let currentMountedSection = null;
let activeModule = null;
let shellMounted = false;

// Local dev (plain `npx serve .`) has no rewrite rules, so the real path is
// /public/<page>. On Netlify, netlify.toml redirects "/" and "/login.html"
// to their /public/ equivalents, so a root-relative path works there.
// Deciding by hostname only (never by the current pathname) keeps this
// correct no matter where the redirect is triggered from, including after
// hash-based navigation has changed the visible URL.
function getRedirectPath(page) {
  const isLocalDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return isLocalDev ? `/public/${page}` : `/${page}`;
}

/**
 * Parses the current location.hash into { section, params }.
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

/**
 * Builds the persistent layout (navbars, sidebar, footer) if it doesn't exist yet.
 */
function ensureShellLayout(root) {
  if (shellMounted) return;

  root.innerHTML = `
    <div id="shell-topbar-primary"></div>
    <div id="shell-topbar-secondary" hidden></div>
    <div id="shell-sidebar"></div>
    <main id="shell-main"><div id="section-content"></div></main>
    <div id="shell-footer"></div>
  `;

  topbarPrimary.mount(document.getElementById("shell-topbar-primary"));
  sidebar.mount(document.getElementById("shell-sidebar"));
  footer.mount(document.getElementById("shell-footer"));
  shellMounted = true;
}

/**
 * Shows/hides the secondary topbar depending on the active section.
 */
function updateTopbarSecondary(section) {
  const el = document.getElementById("shell-topbar-secondary");
  if (!el) return;

  if (section === "dashboard") {
    el.hidden = false;
    topbarSecondary.mount(el);
  } else {
    if (typeof topbarSecondary.unmount === "function") {
      topbarSecondary.unmount();
    }
    el.hidden = true;
    el.innerHTML = "";
  }
}

/**
 * Core rendering logic triggered by URL changes.
 */
function render(section, params) {
  const root = document.getElementById("app-content");

  if (!root) {
    console.error("[router] Root element #app-content not found.");
    return;
  }

  // 1. Ensure layout exists and update contextual UI
  ensureShellLayout(root);
  updateTopbarSecondary(section);

  // 2. Unmount previous section
  if (activeModule && typeof activeModule.unmount === "function") {
    activeModule.unmount();
  }

  // 3. Mount new section
  const contentEl = document.getElementById("section-content");
  contentEl.innerHTML = "";
  const entry = sectionRegistry.get(section);

  if (entry) {
    entry.mount(contentEl, params);
    activeModule = entry;
  } else {
    console.info(`[router] No component registered yet for section "${section}"`);
    contentEl.innerHTML = "";
    activeModule = null;
  }

  // 4. Update state
  currentMountedSection = section;
  setState({ currentSection: section });
}

/**
 * API to trigger a navigation event.
 */
export function navigateTo(section, params = {}) {
  if (section === "login") {
    window.location.href = getRedirectPath("login.html");
    return;
  }

  if (!VALID_SECTIONS.has(section)) {
    console.info(`[router] Unknown section "${section}".`);
    return;
  }

  // By updating the hash, we trigger the 'hashchange' listener in initRouter.
  // This ensures the back button and URL remain the source of truth.
  window.location.hash = buildHash(section, params);
}

export function onRouteChange(callback) {
  routeListeners.add(callback);
  return () => routeListeners.delete(callback);
}

/**
 * Initializes the router. Call this ONCE in your main.js after confirming user auth.
 */
export function initRouter() {
  const handle = () => {
    const route = getCurrentRoute();

    // Only valid sections should be rendered
    if (!VALID_SECTIONS.has(route.section) && route.section !== "dashboard") {
      navigateTo("dashboard");
      return;
    }

    routeListeners.forEach((cb) => cb(route));
    render(route.section, route.params);
  };

  window.addEventListener("hashchange", handle);
  handle(); // Render current route immediately on load
}
