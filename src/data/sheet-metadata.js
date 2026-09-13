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
    logoPath: "/assets/logos/dsa-patterns-logo.jpg",
    description: "Master core patterns step by step",
    accent: "var(--color-hub-accent-1)",
  },
  {
    id: "a2z",
    name: "Striver A2Z DSA",
    logoPath: "/assets/logos/a2z-logo.jpg",
    description: "Structured DSA journey from basics to advanced",
    accent: "var(--color-hub-accent-2)",
  },
  {
    id: "blind75",
    name: "Blind 75",
    logoPath: "/assets/logos/blind75-logo.png",
    description: "Essential interview questions to practise",
    accent: "var(--color-hub-accent-3)",
  },
  {
    id: "master-dsa",
    name: "Master DSA Sheet",
    logoPath: "/assets/logos/master-dsa-logo.jpg",
    description: "Your complete problem-solving collection",
    accent: "var(--color-hub-accent-4)",
  },
  {
    id: "risingbrain",
    name: "RisingBrain Pattern-Wise",
    logoPath: "/assets/logos/risingbrain-logo.jpg",
    description: "Master DSA topic by topic with RisingBrain",
    accent: "var(--color-hub-accent-1)",
  },
  {
    id: "risingbrain-last100",
    name: "RisingBrain Last Minute 100",
    logoPath: "/assets/logos/risingbrain-logo.jpg",
    description: "Top 100 essential interview revision questions",
    accent: "var(--color-hub-accent-2)",
  },
  {
    id: "algomaster",
    name: "AlgoMaster 600",
    logoPath: "/assets/logos/algomaster-logo.png",
    description: "600 curated DSA problems grouped by 59 patterns",
    accent: "var(--color-hub-accent-3)",
  },
];

export function getSheetMeta(sheetId) {
  return SHEETS.find((s) => s.id === sheetId) || null;
}
