// TODO(Phase 4 — scripts/build.mjs): this file is git-ignored (see .gitignore) and
// is NOT committed with real values. In production, scripts/build.mjs reads the
// FIREBASE_* environment variables injected by Netlify/Vercel at build time and
// writes this exact file with real values before bundling src/ → dist/.
//
// For local development, copy the keys from .env.example into the object below
// (or have your own local script generate this file) — never commit real values.

export const firebaseConfig = {
  apiKey: "AIzaSyAQr9TwheG0g-qrAcKJQ-zaqY_VXfypbhI",
  authDomain: "codeladderr.firebaseapp.com",
  projectId: "codeladderr",
  storageBucket: "codeladderr.firebasestorage.app",
  messagingSenderId: "502219874281",
  appId: "1:502219874281:web:9d48580efa8efdcbe4b578",
};
