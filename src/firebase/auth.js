import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./init.js";

const provider = new GoogleAuthProvider();

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function toPublicUser(user) {
  if (!user) return null;
  const { uid, displayName, email, photoURL } = user;
  return { uid, displayName, email, photoURL };
}

/**
 * Creates users/{uid} with default schema if it doesn't already exist.
 * Called on sign-in and redirect completion; safe no-op for returning users.
 */
async function bootstrapUserDoc(user) {
  if (!user?.uid) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      joinedAt: serverTimestamp(),
      streak: 0,
      lastActiveDate: null,
      theme: "dark",
    });
  }
}

export async function signInWithGoogle() {
  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    const result = await signInWithPopup(auth, provider);
    await bootstrapUserDoc(result.user);
  } catch (err) {
    if (
      err &&
      (err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request")
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    // Only throw unexpected errors (like network failures) to the UI
    throw err;
  }
}

/**
 * Resolves the redirect operation if signInWithGoogle used the redirect flow.
 * Call this function once during your application initialization/page load.
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await bootstrapUserDoc(result.user);
    }
  } catch (err) {
    // Log silently for monitoring, but do not crash the app startup
    console.error("Redirect sign-in failed or was cancelled:", err);
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await bootstrapUserDoc(user);
    }
    callback(toPublicUser(user));
  });
}

export function getCurrentUser() {
  return toPublicUser(auth.currentUser);
}

export async function deleteAuthUser() {
  if (!auth.currentUser) return;
  await deleteUser(auth.currentUser);
}
