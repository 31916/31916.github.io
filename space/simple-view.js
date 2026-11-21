const labels = { ja: '天王星版', en: 'Uranus version', de: 'Uranus-Version' };
const query = new URLSearchParams(location.search);

if (query.get('view') === 'space') {
  const destination = new URL('/space/', location.origin);
  const language = query.get('lang');
  if (Object.hasOwn(labels, language)) destination.searchParams.set('lang', language);
  destination.hash = location.hash;
  location.replace(destination.href);
} else {
  const link = document.querySelector('.space-view-link');
  function updateLink() {
    const language = document.documentElement.lang;
    link.querySelector('span').textContent = labels[language] ?? labels.ja;
    link.href = '/space/' + (language === 'ja' ? '' : `?lang=${language}`);
  }
  document.addEventListener('portfolio:languagechange', updateLink);
  updateLink();
  preloadSpaceWhenIdle();
}

function preloadSpaceWhenIdle() {
  // Warm the HTTP cache without executing the scene or creating a WebGL context.
  if (typeof DecompressionStream !== 'function' || navigator.connection?.saveData) return;
  const listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  let controller = new AbortController();
  let queue = null, timer, idle, fetching = false, suspended = false, readyToPreload = false;
  let notBefore = Date.now() + 1500;

  function cancelScheduled() {
    clearTimeout(timer);
    if (idle !== undefined) cancelIdleCallback(idle);
    timer = idle = undefined;
  }
  function blocked() {
    return suspended || document.hidden || navigator.onLine === false ||
      navigator.connection?.saveData || ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
  }
  function schedule() {
    cancelScheduled();
    if (!readyToPreload || listeners.signal.aborted || fetching || blocked()) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (typeof requestIdleCallback === 'function') {
        idle = requestIdleCallback(() => { idle = undefined; void next(); });
      } else void next();
    }, Math.max(0, notBefore - Date.now()));
  }
  function activity() {
    notBefore = Date.now() + 1500;
    schedule();
  }
  function finish() {
    cancelScheduled();
    listeners.abort();
  }
  async function next() {
    if (blocked() || Date.now() < notBefore) { schedule(); return; }
    fetching = true;
    try {
      const response = await fetch(queue?.[0] ?? '/space/preload.json?v=20261121-idle', {
        priority: 'low', signal: controller.signal,
      });
      if (!response.ok) throw new Error('Optional scene preload unavailable');
      if (queue === null) {
        const urls = await response.json();
        if (!Array.isArray(urls) || urls.some(url => typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//'))) {
          throw new Error('Invalid scene preload list');
        }
        queue = urls;
      } else {
        await response.arrayBuffer();
        queue.shift();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (queue === null) finish();
        else queue.shift();
      }
    } finally {
      fetching = false;
      if (queue?.length === 0) finish();
      else {
        notBefore = Math.max(notBefore, Date.now() + 100);
        schedule();
      }
    }
  }

  for (const name of ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchmove', 'change', 'portfolio:languagechange']) {
    document.addEventListener(name, activity, options);
  }
  document.addEventListener('visibilitychange', activity, options);
  navigator.connection?.addEventListener('change', activity, options);
  addEventListener('online', activity, options);
  addEventListener('pagehide', () => {
    suspended = true;
    cancelScheduled();
    controller.abort();
  }, options);
  addEventListener('pageshow', () => {
    suspended = false;
    controller = new AbortController();
    activity();
  }, options);
  function ready() {
    readyToPreload = true;
    activity();
  }
  if (document.readyState === 'complete') ready();
  else addEventListener('load', ready, { ...options, once: true });
}
