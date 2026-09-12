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
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./init.js";

// Defined globally to avoid memory reallocation on every function call
const USER_SUBCOLLECTIONS = [
  "dailyGoals",
  "longTermGoals",
  "progress",
  "questionData",
  "contributions",
  "concepts",
];

export async function getUserDoc(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[DB Error] Failed to get user doc for ${uid}:`, err);
    throw err;
  }
}

export async function setUserField(uid, dotPathFieldName, value) {
  if (!uid || !dotPathFieldName) return;
  try {
    await updateDoc(doc(db, "users", uid), { [dotPathFieldName]: value });
  } catch (err) {
    console.error(`[DB Error] Failed to update field ${dotPathFieldName}:`, err);
    throw err;
  }
}

export async function getSubDoc(uid, subcollection, docId) {
  if (!uid || !subcollection || !docId) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid, subcollection, docId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[DB Error] Failed to get sub-document ${docId}:`, err);
    throw err;
  }
}

export async function setSubDoc(uid, subcollection, docId, data, merge = true) {
  if (!uid || !subcollection || !docId) return;
  try {
    await setDoc(doc(db, "users", uid, subcollection, docId), data, { merge });
  } catch (err) {
    console.error(`[DB Error] Failed to set sub-document ${docId}:`, err);
    throw err;
  }
}

export async function getAllSubDocs(uid, subcollection) {
  if (!uid || !subcollection) return [];
  try {
    const snap = await getDocs(collection(db, "users", uid, subcollection));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`[DB Error] Failed to get subcollection ${subcollection}:`, err);
    throw err;
  }
}

export function subscribeToSubDocs(uid, subcollection, callback) {
  if (!uid || !subcollection) return () => {}; // Return empty unsubscribe function
  const ref = collection(db, "users", uid, subcollection);
  return onSnapshot(
    ref,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error(`[DB Error] Snapshot failed on ${subcollection}:`, err)
  );
}

export function subscribeToUserDoc(uid, callback) {
  if (!uid) return () => {};
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => callback(snap.exists() ? snap.data() : null),
    (err) => console.error(`[DB Error] Snapshot failed on user ${uid}:`, err)
  );
}

/**
 * Deletes the entire users/{uid} document tree safely.
 * Includes pagination logic to bypass Firestore's hard 500-write batch limit.
 */
export async function deleteUserData(uid) {
  if (!uid) throw new Error("deleteUserData requires a valid UID.");

  try {
    for (const subcollection of USER_SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, "users", uid, subcollection));

      // Early exit prevents unnecessary batch instantiation
      if (snap.empty) continue;

      // Process in chunks to avoid Firestore's 500-write batch limit limit
      const chunks = [];
      for (let i = 0; i < snap.docs.length; i += 500) {
        chunks.push(snap.docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Finally, delete the root user document
    await deleteDoc(doc(db, "users", uid));
  } catch (err) {
    console.error(`[DB Error] Failed to delete user data for ${uid}:`, err);
    throw err; // UI needs to know if account deletion failed
  }
}

/**
 * Reads every problem across every pattern for a given sheet.
 */
export async function getSheetProblems(sheetId) {
  if (!sheetId) return [];

  try {
    const problems = [];
    const patternsSnap = await getDocs(
      collection(db, "sheets", sheetId, "patterns")
    );

    // Run sequentially to guarantee order and avoid flooding memory
    for (const patternDoc of patternsSnap.docs) {
      const problemsSnap = await getDocs(
        collection(db, "sheets", sheetId, "patterns", patternDoc.id, "problems")
      );
      problemsSnap.docs.forEach((p) => {
        problems.push({ id: p.id, patternId: patternDoc.id, ...p.data() });
      });
    }

    return problems;
  } catch (err) {
    console.error(`[DB Error] Failed to load problems for sheet ${sheetId}:`, err);
    throw err;
  }
}
