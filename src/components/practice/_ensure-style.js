// src/components/practice/_ensure-style.js
// No bundler in this project, so components link their own CSS on first mount
// instead of `import "./x.css"` (which plain browser ES modules can't do).
// Idempotent: calling it again for the same href is a no-op.

const injected = new Set();

export function ensureStyle(href) {
  if (injected.has(href)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.componentStyle = href;
  document.head.appendChild(link);
  injected.add(href);
}
