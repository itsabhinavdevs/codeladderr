import { onAuthChange, signInWithGoogle, signOutUser } from "./firebase/auth.js";
import { setState } from "./state/store.js";
import { initRouter, navigateTo } from "./router/router.js";
import { startIdleTimeout } from "./utils/idle-timeout.js";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const loginCard = document.getElementById("login-card");
const loginLoading = document.getElementById("login-loading");
const signInButton = document.getElementById("google-signin-btn");
const appContent = document.getElementById("app-content");


//correct redirct link for local and production
// Add this helper function
function getRedirectPath(page) {
  const isLocalDev = window.location.pathname.includes('/public');
  return isLocalDev ? `/public/${page}` : `/${page}`;
}

if (loginCard) {
  // --- public/login.html ---
  // Hide the card until we know whether the user is already signed in, so we
  // never flash the login button at someone who's about to be redirected.
  onAuthChange((user) => {
    if (user) {
      // Relative, not "/index.html" — keeps this working whether login.html
      // is served at the site root (production) or nested under a folder
      // (e.g. local dev serving the repo root instead of just public/).
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

if (appContent) {
  // --- public/index.html ---
  let stopIdleTimer = null;

  onAuthChange((user) => {
    if (!user) {
      stopIdleTimer?.();
      stopIdleTimer = null;
      window.location.href = getRedirectPath("login.html"); // relative — see note above
      return;
    }
    setState({ user });
    initRouter(appContent);

    // Auto-logout after an hour of no mouse/keyboard/scroll/touch activity.
    // Guarded so re-firing onAuthChange (e.g. a token refresh) doesn't stack
    // up duplicate timers.
    if (!stopIdleTimer) {
      stopIdleTimer = startIdleTimeout(IDLE_TIMEOUT_MS, async () => {
        stopIdleTimer = null;
        await signOutUser();
        // onAuthChange fires again with user=null and handles the redirect above.
      });
    }
  });
}
