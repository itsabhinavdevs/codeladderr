#!/usr/bin/env node
// scripts/migrate-sheets-to-firestore.mjs
//
// One-time (re-runnable) import of the 7 sheets' problem data into Firestore:
//   sheets/{sheetId}/patterns/{patternId}/problems/{problemId}
//     { title, difficulty, problemUrl, videoUrl }
//
// sheetId is one of: dsa-patterns, a2z, blind75, master-dsa, risingbrain,
// risingbrain-last100, algomaster — per the Shared Contract's data model.
//
// Source data is the archived, never-publicly-shipped copies of the original flat
// pattern-group arrays (see scripts/_archived_*.js next to this file):
//   _archived_app-js-inline-patterns.js  -> patternGroups ("dsa-patterns"), blind75PatternGroups ("blind75")
//   _archived_a2z-data.js                -> a2zPatternGroups
//   _archived_master-data.js             -> masterPatternGroups
//   _archived_rb-data.js                 -> rbPatternGroups
//   _archived_rb-last100-data.js         -> rbLast100PatternGroups
//   _archived_algomaster-data.js         -> algoMasterPatternGroups
//
// USAGE:
//   1. Firebase console -> Project settings -> Service accounts -> Generate new private
//      key. Save it as scripts/service-account.json (already git-ignored — never commit it).
//   2. node scripts/migrate-sheets-to-firestore.mjs
//
// Uses the Admin SDK (bypasses security rules) — this is the one place writes to
// sheets/* originate from; the client app itself never writes there (firestore.rules
// keeps sheets/** read-only for signed-in users, write: false).

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "service-account.json");

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    "Missing scripts/service-account.json.\n" +
      "Firebase console -> Project settings -> Service accounts -> Generate new private key,\n" +
      "save the downloaded file as scripts/service-account.json, then re-run this script."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ---- Extraction helper --------------------------------------------------------------
// These archive files are plain `const x = [ ... ];` scripts, not ES modules (no
// export), so they can't be `import`-ed directly. Running them in a fresh vm context
// and pulling the named const out is the same approach the project's existing
// scripts/migrate-data.mjs uses. Top-level const/let in a vm context don't become
// sandbox properties on their own — the capturing assignment has to run in the same
// runInContext call, sharing the const's lexical scope.
function extractFromFile(fileName, varName) {
  const filePath = path.join(__dirname, fileName);
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${code}\nglobalThis.__extracted = ${varName};`, sandbox, { filename: fileName });
  const value = sandbox.__extracted;
  if (!Array.isArray(value)) {
    throw new Error(`Expected "${varName}" to be an array in ${fileName}, got: ${typeof value}`);
  }
  return value;
}

const patternGroups = extractFromFile("_archived_app-js-inline-patterns.js", "patternGroups");
const blind75PatternGroups = extractFromFile("_archived_app-js-inline-patterns.js", "blind75PatternGroups");
const a2zPatternGroups = extractFromFile("_archived_a2z-data.js", "a2zPatternGroups");
const masterPatternGroups = extractFromFile("_archived_master-data.js", "masterPatternGroups");
const rbPatternGroups = extractFromFile("_archived_rb-data.js", "rbPatternGroups");
const rbLast100PatternGroups = extractFromFile("_archived_rb-last100-data.js", "rbLast100PatternGroups");
const algoMasterPatternGroups = extractFromFile("_archived_algomaster-data.js", "algoMasterPatternGroups");

// ---- Mapping: pattern-group -> this project's sheetId (must check "Last Minute 100"
// before the generic "\u203a" check, since Last Minute 100 pattern names ALSO contain "\u203a") ----
function sheetIdForGroup(patternName, fallbackSheetId) {
  if (patternName.startsWith("A2Z:")) return "a2z";
  if (patternName.startsWith("Blind 75:")) return "blind75";
  if (patternName.startsWith("Master DSA:")) return "master-dsa";
  if (patternName.startsWith("Last Minute 100")) return "risingbrain-last100";
  if (patternName.startsWith("AlgoMaster:")) return "algomaster";
  if (patternName.includes("\u203a")) return "risingbrain"; // "›" used by RisingBrain pattern names
  return fallbackSheetId;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Problems are [title, difficulty, ...links]. A trailing youtube.com/youtu.be link (if
// present) is the videoUrl; the first remaining link is the problemUrl. Any additional
// alternate-judge links beyond that aren't part of this project's data model and are dropped.
function pickUrls(links) {
  const clean = links.filter(Boolean);
  const videoUrl = clean.find((l) => /youtu\.?be/i.test(l)) || "";
  const problemUrl = clean.find((l) => l !== videoUrl) || "";
  return { problemUrl, videoUrl };
}

const SOURCES = [
  { groups: patternGroups, fallbackSheetId: "dsa-patterns" },
  { groups: blind75PatternGroups, fallbackSheetId: "blind75" },
  { groups: a2zPatternGroups, fallbackSheetId: "a2z" },
  { groups: masterPatternGroups, fallbackSheetId: "master-dsa" },
  { groups: rbPatternGroups, fallbackSheetId: "risingbrain" },
  { groups: rbLast100PatternGroups, fallbackSheetId: "risingbrain-last100" },
  { groups: algoMasterPatternGroups, fallbackSheetId: "algomaster" },
];

// ---- Build { sheetId -> { patternId -> [problem docs] } } ----------------------------
const sheets = {};

for (const { groups, fallbackSheetId } of SOURCES) {
  for (const group of groups) {
    const sheetId = sheetIdForGroup(group.pattern, fallbackSheetId);
    const patternId = slugify(group.pattern);
    sheets[sheetId] ??= {};
    sheets[sheetId][patternId] ??= { name: group.pattern, problems: [] };

    group.problems.forEach(([title, difficulty, ...links], index) => {
      const { problemUrl, videoUrl } = pickUrls(links);
      sheets[sheetId][patternId].problems.push({
        problemId: `${patternId}-${index}`, // stable id scheme, matches the old app's client-side ids
        title,
        difficulty,
        problemUrl,
        videoUrl,
      });
    });
  }
}

// ---- Write to Firestore in batches (max 500 writes/batch) ---------------------------
async function run() {
  let totalProblems = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  async function commitIfFull() {
    if (opsInBatch >= 450) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  for (const [sheetId, patterns] of Object.entries(sheets)) {
    for (const [patternId, { name, problems }] of Object.entries(patterns)) {
      const patternRef = db.doc(`sheets/${sheetId}/patterns/${patternId}`);
      batch.set(patternRef, { name }, { merge: true });
      opsInBatch++;
      await commitIfFull();

      for (const problem of problems) {
        const problemRef = patternRef.collection("problems").doc(problem.problemId);
        batch.set(
          problemRef,
          {
            title: problem.title,
            difficulty: problem.difficulty,
            problemUrl: problem.problemUrl,
            videoUrl: problem.videoUrl,
          },
          { merge: true }
        );
        opsInBatch++;
        totalProblems++;
        await commitIfFull();
      }
    }
  }

  if (opsInBatch > 0) await batch.commit();

  console.log(`Migrated ${totalProblems} problems across ${Object.keys(sheets).length} sheets:`);
  for (const [sheetId, patterns] of Object.entries(sheets)) {
    const count = Object.values(patterns).reduce((sum, p) => sum + p.problems.length, 0);
    console.log(`  - ${sheetId}: ${count} problems in ${Object.keys(patterns).length} patterns`);
  }
}

run()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
