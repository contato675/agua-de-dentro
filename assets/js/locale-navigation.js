/* Explicit locale navigation preserves the reading position, not a stale URL hash.
 * One short-lived, tab-local record; no tracking, cookies, locale detection or fetch.
 * Real static links remain the fallback when storage or JavaScript is unavailable.
 */
(() => {
  const storageKey = 'agua-de-dentro.locale-scroll.v1';
  const maxAge = 30000;
  const equivalentPaths = new Set([...document.querySelectorAll('.site-header [data-locale-link]')]
    .map(link => new URL(link.href, location.href).pathname));
  function clear() {
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
  }
  function snapshot() {
    if (window.scrollY <= 1) return {anchor: null, offset: 0, y: 0};
    let best = null, top = 0, distance = Infinity;
    for (const element of document.querySelectorAll('main[id], main [id], footer[id]')) {
      if (!element.getClientRects().length) continue;
      const rect = element.getBoundingClientRect();
      if (rect.height > 0 && Math.abs(rect.top) < distance) {
        best = element; top = rect.top; distance = Math.abs(top);
      }
    }
    return {anchor: best?.id ?? null, offset: best ? top : 0, y: window.scrollY};
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-locale-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return;
    // Selecting the already active language must not reload or revisit an old anchor.
    if (destination.pathname === location.pathname && destination.search === location.search) {
      event.preventDefault(); clear(); return;
    }
    clear();
    // A viewer link can deliberately lead to a permanent project page. Let it open normally.
    if (!equivalentPaths.has(destination.pathname) || document.querySelector('dialog[data-project][open]')) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({version: 1, at: Date.now(),
        destination: destination.pathname + destination.search, ...snapshot()}));
    } catch { /* A native link still opens the requested language at the top. */ }
  }, {capture: true});
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { clear(); return; }
  clear();
  const age = Date.now() - saved?.at;
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!saved || saved.version !== 1 || saved.destination !== location.pathname + location.search || location.hash ||
      !Number.isFinite(age) || age < 0 || age > maxAge || (navigation && navigation.type !== 'navigate') ||
      !Number.isFinite(saved.y) || saved.y < 0 || saved.y > 10000000 ||
      !Number.isFinite(saved.offset) || Math.abs(saved.offset) > 10000000 ||
      !(saved.anchor === null || (typeof saved.anchor === 'string' && saved.anchor.length <= 200))) return;
  let interrupted = false;
  const stop = () => { interrupted = true; };
  for (const name of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(name, stop, {once: true, passive: true});
  }
  function restore() {
    if (interrupted) return;
    const anchor = saved.anchor ? document.getElementById(saved.anchor) : null;
    const top = anchor ? window.scrollY + anchor.getBoundingClientRect().top - saved.offset : saved.y;
    window.scrollTo({top: Math.max(0, top), left: 0, behavior: 'instant'});
  }
  restore();
  // Font readiness can alter translated text height. Never override a new user gesture.
  document.fonts?.ready.then(() => requestAnimationFrame(restore)).catch(() => {});
})();
