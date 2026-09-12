let container = null;

export function mount(el) {
  container = el;
  container.innerHTML = `
    <footer class="app-footer">
      <span class="app-footer__brand">DSA Tracker</span>
      <span class="app-footer__tagline">Track every pattern, one problem at a time.</span>
      <a
        class="app-footer__link"
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    </footer>
  `;
}

export function unmount() {
  if (container) container.innerHTML = "";
  container = null;
}
