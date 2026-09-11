import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./init.js";

const provider = new GoogleAuthProvider();

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Creates users/{uid} with the default shape if it doesn't already exist.
 * Called on every successful sign-in; a no-op for returning users.
 */
async function bootstrapUserDoc(user) {
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

/**
 * Signs the user in with Google. Tries a popup first; falls back to a full-page
 * redirect on mobile browsers where popups are commonly blocked.
 */
export async function signInWithGoogle() {
  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    const result = await signInWithPopup(auth, provider);
    await bootstrapUserDoc(result.user);
  } catch (err) {
    // Popup blocked or failed for a reason other than user-cancellation — fall
    // back to redirect so the sign-in can still succeed.
    if (err && err.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/**
 * Subscribes to auth state changes. Also bootstraps the user's Firestore
 * document on the redirect-based sign-in path (the popup path bootstraps
 * inline in signInWithGoogle above).
 */
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
