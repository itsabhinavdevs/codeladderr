import { DIFFICULTY_COLORS } from '../../utils/difficulty-colors.js';

function injectStyles() {
  const href = new URL('./progress-ring.css', import.meta.url).href;
  if (document.querySelector('link[data-style="progress-ring"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.style = 'progress-ring';
  document.head.appendChild(link);
}

const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function createProgressRing({
  solved = 0,
  total = 0,
  easyCount = 0,
  mediumCount = 0,
  hardCount = 0,
} = {}) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'progress-ring';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('width', SIZE);
  svg.setAttribute('height', SIZE);
  svg.classList.add('progress-ring__svg');

  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('cx', SIZE / 2);
  track.setAttribute('cy', SIZE / 2);
  track.setAttribute('r', RADIUS);
  track.setAttribute('stroke-width', STROKE);
  track.classList.add('progress-ring__track');
  svg.appendChild(track);

  const denom = total || 1;
  const segments = [
    { count: easyCount, color: DIFFICULTY_COLORS.Easy },
    { count: mediumCount, color: DIFFICULTY_COLORS.Medium },
    { count: hardCount, color: DIFFICULTY_COLORS.Hard },
  ];

  let cursor = 0;
  segments.forEach(({ count, color }) => {
    const fraction = count / denom;
    if (fraction <= 0) return;
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    arc.setAttribute('cx', SIZE / 2);
    arc.setAttribute('cy', SIZE / 2);
    arc.setAttribute('r', RADIUS);
    arc.setAttribute('stroke-width', STROKE);
    arc.setAttribute('stroke', color);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute(
      'stroke-dasharray',
      `${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE - fraction * CIRCUMFERENCE}`
    );
    arc.setAttribute('stroke-dashoffset', `${-cursor * CIRCUMFERENCE}`);
    arc.classList.add('progress-ring__segment');
    svg.appendChild(arc);
    cursor += fraction;
  });

  const label = document.createElement('div');
  label.className = 'progress-ring__label';
  label.textContent = `${solved}/${total}`;

  wrapper.append(svg, label);
  return wrapper;
}
