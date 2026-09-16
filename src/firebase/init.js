// Only this file (and the other modules under src/firebase/) may import the
// Firebase SDK directly. Everything else in the app goes through auth.js /
// firestore.js — components never call getAuth()/getFirestore() themselves.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((err) =>
  console.error("Failed to set auth persistence", err)
);
export const db = getFirestore(app);
