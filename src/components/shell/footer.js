let container = null;

// TODO: replace with your actual GitHub repository URL
const REPO_URL = "https://github.com/itsabhinavdevs/codeladderr";

function openRepo() {
  window.open(REPO_URL, "_blank", "noopener,noreferrer");
}

function wireCardLinks(root) {
  const cards = root.querySelectorAll(".app-footer__card");
  cards.forEach((card) => {
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Open GitHub repository");
    card.addEventListener("click", openRepo);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openRepo();
      }
    });
  });
}

export function mount(el) {
  container = el;
  container.innerHTML = `
    <footer class="app-footer">
      <h2 class="app-footer__heading">Coder's <span>Motivation Hub</span></h2>

      <div class="app-footer__grid">

        <div class="app-footer__card app-footer__card--hello">
          <span class="app-footer__badge">STATUS</span>
          <p class="app-footer__terminal">Hello World<span class="app-footer__cursor">_</span></p>
          <p class="app-footer__muted app-footer__muted--icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            Error ↺
          </p>
        </div>

        <div class="app-footer__card app-footer__card--github">
          <span class="app-footer__octicon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="32" height="32" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
            </svg>
          </span>
          <span class="app-footer__code-icon">&lt;/&gt;</span>
          <span class="app-footer__loading">Loading future...</span>
        </div>

        <div class="app-footer__card app-footer__card--better">
          <span class="app-footer__now">N : O W</span>
          <p class="app-footer__better">1% BETTER<br><span>EVERY DAY</span></p>
          <span class="app-footer__muted app-footer__muted--upper">Compete every day</span>
        </div>

        <div class="app-footer__card app-footer__card--routine">
          <div class="app-footer__pill-row">
            <span class="app-footer__pill">🍴 eat();</span>
            <span class="app-footer__pill">🛌 sleep();</span>
          </div>
          <span class="app-footer__pill">&lt;/&gt; code();</span>
          <span class="app-footer__pill"><span class="app-footer__pill-accent">🔄</span> repeat();</span>
        </div>

        <div class="app-footer__card app-footer__card--code">
          <pre class="app-footer__snippet"><code><span class="tok-kw">def</span> <span class="tok-fn">success</span>(dedication, persistence):
    dedication += 1
    persistence += 1
    <span class="tok-kw">if</span> passion == <span class="tok-bool">True</span>:
        magic = dedication + persistence
        <span class="tok-kw">return</span> magic
    <span class="tok-kw">return</span> 0
<span class="tok-cm"># love it, make mistakes, learn</span></code></pre>
          <div class="app-footer__faux-scrollbar" aria-hidden="true">
            <span>◀</span><span class="app-footer__faux-thumb"></span><span>▶</span>
          </div>
        </div>

        <div class="app-footer__card app-footer__card--seek">
          <p class="app-footer__seek-text">Hide and seek champion...</p>
          <p class="app-footer__semicolon">;</p>
          <span class="app-footer__muted">since 1958</span>
        </div>

        <div class="app-footer__card app-footer__card--while">
          <p class="app-footer__while-code">while ( ! ( succeed = try() ) );</p>
          <span class="app-footer__engineers">E • N • G • I • N • E • E • R • S</span>
        </div>

      </div>

      <div class="app-footer__signoff">
        <span class="app-footer__spark" aria-hidden="true">✦</span>
        <span class="app-footer__brand">Crafted by Abhinav Singh</span>
        <span class="app-footer__copyright">© ${new Date().getFullYear()} codeladderr</span>
      </div>
    </footer>
  `;

  wireCardLinks(container);
}

export function unmount() {
  if (container) container.innerHTML = "";
  container = null;
}
