import { onAuthChange, signInWithGoogle, signOutUser, handleRedirectResult } from "./firebase/auth.js";
import { subscribeToUserDoc } from "./firebase/firestore.js";
import { setState } from "./state/store.js";
import { initRouter, navigateTo, getCurrentRoute } from "./router/router.js";
import { startIdleTimeout } from "./utils/idle-timeout.js";
import { applyTheme } from "./components/shell/appearance-toggle.js";

// MUST call this immediately on load to catch Firebase redirect sign-ins
handleRedirectResult().catch((err) => console.error("Redirect sign-in failed", err));

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const loginCard = document.getElementById("login-card");
const loginLoading = document.getElementById("login-loading");
const signInButton = document.getElementById("google-signin-btn");
const appContent = document.getElementById("app-content");

let stopIdleTimer = null;
let unsubscribeUserDoc = null;

// Local dev (plain `npx serve .`) has no rewrite rules, so the real path is
// /public/<page>. On Netlify, netlify.toml redirects "/" and "/login.html"
// to their /public/ equivalents, so a root-relative path works there.
// Deciding by hostname only (never by the current pathname) avoids any
// ambiguity from where the redirect is triggered.
function getRedirectPath(page) {
  return `/public/${page}`;
}

// ==========================================
// 1. LOGIN PAGE LOGIC
// (Dead code if login.html uses its own inline <script type="module"> instead
// of loading this file — harmless either way since loginCard will be null.)
// ==========================================
if (loginCard) {
  onAuthChange((user) => {
    if (user) {
      window.location.href = getRedirectPath("index.html");
      return;
    }
    loginLoading?.setAttribute("hidden", "");
    loginCard.removeAttribute("hidden");
  });

  signInButton?.addEventListener("click", async () => {
    signInButton.disabled = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign-in failed:", err);
      signInButton.disabled = false;
    }
  });
}

// ==========================================
// 2. MAIN APP LOGIC
// ==========================================
if (appContent) {
  // Instant paint: apply cached theme immediately for UX
  const cachedTheme = localStorage.getItem("dsa-tracker-theme");
  if (cachedTheme === "dark" || cachedTheme === "light") {
    applyTheme(cachedTheme);
    setState({ theme: cachedTheme });
  }

  onAuthChange((user) => {
    // --- USER LOGGED OUT ---
    if (!user) {
      stopIdleTimer?.();
      stopIdleTimer = null;

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      window.location.href = getRedirectPath("login.html");
      return;
    }

    // --- USER LOGGED IN ---
    setState({ user });

    // 1. Setup Firestore Subscription
    if (unsubscribeUserDoc) unsubscribeUserDoc();
    unsubscribeUserDoc = subscribeToUserDoc(user.uid, (doc) => {
      if (!doc) return;

      // Reconcile cached theme with Firestore
      if (doc.theme && doc.theme !== cachedTheme) {
        applyTheme(doc.theme);
        localStorage.setItem("dsa-tracker-theme", doc.theme);
      }

      setState({
        theme: doc.theme || "dark",
        streak: doc.streak || 0,
      });
    });

    // 2. Initialize Router (idempotent — safe if onAuthChange refires)
    initRouter();
    if (!getCurrentRoute().section) {
      navigateTo("dashboard");
    }

    // 3. Setup Idle Timeout Security
    if (!stopIdleTimer) {
      stopIdleTimer = startIdleTimeout(IDLE_TIMEOUT_MS, async () => {
        stopIdleTimer = null;
        await signOutUser();
        // onAuthChange will refire with user=null and handle the redirect
      });
    }
  });
}
