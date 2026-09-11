import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./init.js";

// Known top-level subcollections under users/{uid}, used by deleteUserData to
// walk and remove the whole tree (the client SDK has no recursive delete).
const USER_SUBCOLLECTIONS = [
  "dailyGoals",
  "longTermGoals",
  "progress",
  "questionData",
  "contributions",
  "concepts",
];

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function setUserField(uid, dotPathFieldName, value) {
  await updateDoc(doc(db, "users", uid), { [dotPathFieldName]: value });
}

export async function getSubDoc(uid, subcollection, docId) {
  const snap = await getDoc(doc(db, "users", uid, subcollection, docId));
  return snap.exists() ? snap.data() : null;
}

export async function setSubDoc(uid, subcollection, docId, data, merge = true) {
  await setDoc(doc(db, "users", uid, subcollection, docId), data, { merge });
}

export async function getAllSubDocs(uid, subcollection) {
  const snap = await getDocs(collection(db, "users", uid, subcollection));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeToSubDocs(uid, subcollection, callback) {
  const ref = collection(db, "users", uid, subcollection);
  return onSnapshot(ref, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToUserDoc(uid, callback) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/**
 * Deletes the entire users/{uid} document tree: every doc in every known
 * subcollection, then the user doc itself. Used by the Delete Account flow.
 */
export async function deleteUserData(uid) {
  for (const subcollection of USER_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, "users", uid, subcollection));
    if (snap.empty) continue;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "users", uid));
}

/**
 * Reads every problem across every pattern for a given sheet:
 * sheets/{sheetId}/patterns/{patternId}/problems/{problemId}
 */
export async function getSheetProblems(sheetId) {
  const patternsSnap = await getDocs(collection(db, "sheets", sheetId, "patterns"));
  const results = [];
  for (const patternDoc of patternsSnap.docs) {
    const problemsSnap = await getDocs(
      collection(db, "sheets", sheetId, "patterns", patternDoc.id, "problems")
    );
    problemsSnap.docs.forEach((d) => {
      results.push({ id: d.id, patternId: patternDoc.id, ...d.data() });
    });
  }
  return results;
}
