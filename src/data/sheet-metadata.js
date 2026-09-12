// src/data/sheet-metadata.js
// Non-sensitive metadata only (sheet id/name/logo, static section list for search).
// No problem data lives here — that's fetched from Firestore via getSheetProblems().

export const SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "practice", label: "Practice" },
  { id: "notes", label: "Notes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "concepts", label: "Concepts" },
  { id: "learning", label: "Learning" },
  { id: "revision", label: "Revision" },
];

export const SHEETS = [
  {
    id: "dsa-patterns",
    name: "DSA Patterns",
    logoPath: "/public/assets/logos/dsa-patterns-logo.jpg",
    description: "Master core patterns step by step",
    accent: "var(--color-hub-accent-1)",
  },
  {
    id: "a2z",
    name: "Striver A2Z DSA",
    logoPath: "/public/assets/logos/a2z-logo.jpg",
    description: "Structured DSA journey from basics to advanced",
    accent: "var(--color-hub-accent-2)",
  },
  {
    id: "blind75",
    name: "Blind 75",
    logoPath: "/public/assets/logos/blind75-logo.png",
    description: "Essential interview questions to practise",
    accent: "var(--color-hub-accent-3)",
  },
  {
    id: "master-dsa",
    name: "Master DSA Sheet",
    logoPath: "/public/assets/logos/master-dsa-logo.jpg",
    description: "Hand-picked problems for mastery",
    accent: "var(--color-hub-accent-4)",
  },
  {
    id: "risingbrain",
    name: "RisingBrain Patterns",
    logoPath: "/public/assets/logos/risingbrain-logo.jpg",
    description: "Pattern-first approach to DSA prep",
    accent: "var(--color-hub-accent-1)",
  },
  {
    id: "risingbrain-last100",
    name: "Last Minute 100",
    logoPath: "/public/assets/logos/risingbrain-logo.jpg",
    description: "A focused final sprint before interviews",
    accent: "var(--color-hub-accent-2)",
  },
  {
    id: "algomaster",
    name: "AlgoMaster Sheet",
    logoPath: "/public/assets/logos/algomaster-logo.png",
    description: "Curated problems from a trusted mentor",
    accent: "var(--color-hub-accent-3)",
  },
];

export function getSheetMeta(sheetId) {
  return SHEETS.find((s) => s.id === sheetId) || null;
}
