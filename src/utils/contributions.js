import {
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "../firebase/init.js";
import { todayId, detectStreakGap } from "./date.js";

export async function recordSolve(uid) {
  const today = todayId();
  const userRef = doc(db, "users", uid);
  const contributionRef = doc(db, "users", uid, "contributions", today);

  await runTransaction(db, async (transaction) => {
    const [userSnap, contributionSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(contributionRef),
    ]);

    const currentCount = contributionSnap.exists()
      ? contributionSnap.data().count || 0
      : 0;
    transaction.set(
      contributionRef,
      { count: currentCount + 1 },
      { merge: true }
    );

    const userData = userSnap.exists() ? userSnap.data() : {};
    const lastActiveDate = userData.lastActiveDate || null;

    if (lastActiveDate !== today) {
      const recomputedStreak = detectStreakGap(
        lastActiveDate,
        userData.streak || 0
      );
      transaction.set(
        userRef,
        { streak: recomputedStreak + 1, lastActiveDate: today },
        { merge: true }
      );
    }
  });
}
