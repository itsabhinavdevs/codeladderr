// src/components/shell/ladder-logo.js
//
// Animated brand mark: a child climbing a ladder (replaces the static rocket
// logo.jpg). Exported as a raw SVG markup string so it can be inlined
// directly into topbar-primary.js and sidebar.js templates — inlining (as
// opposed to <img src="...svg">) is required both for the CSS @keyframes
// animation to play reliably everywhere, and so the fills can reference the
// app's real CSS custom properties (var(--color-hub-accent-1) etc.), since an
// externally-loaded <img> SVG can't see the host document's variables.
//
// Uses the same class names/sizing contract as the old <img> did: whatever
// wraps this (`.topbar-primary__logo-btn svg` / `.sidebar__logo-btn svg`)
// controls the final rendered size — see the accompanying CSS changes.

export const LADDER_LOGO_SVG = `
<svg class="ladder-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DSA Tracker logo">
  <style>
    .ladder-logo__child {
      transform-box: fill-box;
      transform-origin: center;
      animation: ladder-logo-climb 3s ease-in-out infinite alternate;
    }
    @keyframes ladder-logo-climb {
      0%   { transform: translateY(0) rotate(0deg); }
      20%  { transform: translateY(-4px) rotate(-3deg); }
      40%  { transform: translateY(-9px) rotate(2deg); }
      60%  { transform: translateY(-14px) rotate(-2deg); }
      80%  { transform: translateY(-17px) rotate(3deg); }
      100% { transform: translateY(-19px) rotate(0deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .ladder-logo__child {
        animation: none;
      }
    }
  </style>

  <!-- rails -->
  <line x1="10" y1="8" x2="10" y2="32" stroke="#22883b" stroke-width="2.6" stroke-linecap="round" />
  <line x1="30" y1="8" x2="30" y2="32" stroke="#22883b" stroke-width="2.6" stroke-linecap="round" />

  <!-- rungs -->
  <line x1="10" y1="12" x2="30" y2="12" stroke="#22883b" stroke-width="2.2" stroke-linecap="round" />
  <line x1="10" y1="17" x2="30" y2="17" stroke="#22883b" stroke-width="2.2" stroke-linecap="round" />
  <line x1="10" y1="22" x2="30" y2="22" stroke="#22883b" stroke-width="2.2" stroke-linecap="round" />
  <line x1="10" y1="27" x2="30" y2="27" stroke="#22883b" stroke-width="2.2" stroke-linecap="round" />

  <!-- rung bolts -->
  <circle cx="10" cy="12" r="0.7" fill="#14351f" />
  <circle cx="30" cy="12" r="0.7" fill="#14351f" />
  <circle cx="10" cy="17" r="0.7" fill="#14351f" />
  <circle cx="30" cy="17" r="0.7" fill="#14351f" />
  <circle cx="10" cy="22" r="0.7" fill="#14351f" />
  <circle cx="30" cy="22" r="0.7" fill="#14351f" />
  <circle cx="10" cy="27" r="0.7" fill="#14351f" />
  <circle cx="30" cy="27" r="0.7" fill="#14351f" />

  <!-- climbing child (chibi style: yellow shirt, brown shorts, black hair, black shoes) -->
  <g transform="translate(20,29)">
    <g class="ladder-logo__child">
      <!-- back leg -->
      <path d="M -1.4,0.8 L -2.6,5.4" stroke="#f4c9a0" stroke-width="1.5" stroke-linecap="round" fill="none" />
      <ellipse cx="-2.6" cy="5.9" rx="1.3" ry="0.9" fill="#171717" />

      <!-- front leg, bent knee resting on the rung above -->
      <path d="M 1.4,0.8 L 2.6,2.6 L 1.6,4.6" stroke="#f4c9a0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <ellipse cx="1.6" cy="5.1" rx="1.3" ry="0.9" fill="#171717" />

      <!-- shorts -->
      <rect x="-3" y="-2.2" width="6" height="3" rx="1.3" fill="#7a5230" />

      <!-- shirt -->
      <rect x="-3" y="-6.4" width="6" height="4.4" rx="2.2" fill="#f6d654" />

      <!-- back arm, bent near torso gripping the rail -->
      <path d="M -2.6,-6 L -4.2,-8.2" stroke="#f4c9a0" stroke-width="1.4" stroke-linecap="round" />

      <!-- reaching arm, gripping the rung above -->
      <path d="M 2.6,-6 L 4.4,-10.5" stroke="#f4c9a0" stroke-width="1.4" stroke-linecap="round" />

      <!-- head -->
      <circle cx="0.3" cy="-9.6" r="3.4" fill="#171717" />
      <circle cx="-0.2" cy="-8.6" r="2.9" fill="#f4c9a0" />
    </g>
  </g>
</svg>
`;
