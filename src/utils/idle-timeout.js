// Generic inactivity watcher. Not Firebase-specific — main.js decides what
// happens on timeout (here: sign the user out).

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

/**
 * Calls onTimeout after `timeoutMs` of no user activity (mouse, keyboard,
 * scroll, touch). The timer resets on every qualifying event, and also
 * resets when the tab regains visibility (so time spent on another tab/app
 * still counts toward the timeout, but coming back active resets it).
 *
 * Returns a stop() function that removes all listeners and clears the timer.
 */
export function startIdleTimeout(timeoutMs, onTimeout) {
  let timer = null;

  function reset() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onTimeout, timeoutMs);
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") reset();
  }

  ACTIVITY_EVENTS.forEach((evt) =>
    window.addEventListener(evt, reset, { passive: true })
  );
  document.addEventListener("visibilitychange", handleVisibility);

  reset();

  return function stop() {
    if (timer) clearTimeout(timer);
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
