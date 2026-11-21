const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(new URL('../space/simple-view.js', `file://${__filename}`), 'utf8');
const manifest = '/space/preload.json?v=20261121-idle';
const resources = ['/space/example-a.js?v=1', '/space/example-b.gz?v=1'];
const settle = () => new Promise(resolve => setImmediate(resolve));

function browser({ saveData = false, slow = false, idle = true, hold = null, invalid = false, failure = null } = {}) {
  let now = 0, id = 0, active = 0;
  const timers = new Map(), calls = [], releases = new Map();
  const document = new EventTarget(), window = new EventTarget(), connection = new EventTarget();
  Object.assign(connection, { saveData, effectiveType: slow ? '2g' : '4g' });
  Object.assign(document, {
    readyState: 'loading', hidden: false, fonts: { ready: new Promise(() => {}) },
    documentElement: { lang: 'ja' },
    querySelector: () => ({ querySelector: () => ({ textContent: '' }) }),
  });
  function timeout(callback, delay = 0) {
    timers.set(++id, { at: now + delay, callback });
    return id;
  }
  const context = {
    document, URLSearchParams, AbortController,
    navigator: { connection, onLine: true },
    location: { search: '' },
    addEventListener: window.addEventListener.bind(window),
    Date: class extends Date { static now() { return now; } },
    setTimeout: timeout, clearTimeout: key => timers.delete(key),
    DecompressionStream: class {},
    async fetch(url, options) {
      calls.push({ url, at: now, options });
      active++;
      assert.equal(active, 1, 'Only one background request may run at a time');
      let consume = async () => {};
      if (url === hold) {
        consume = () => new Promise((resolve, reject) => {
          releases.set(url, resolve);
          options.signal.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'AbortError' })), { once: true });
        });
      }
      return {
        ok: url !== failure,
        async json() { active--; return invalid ? ['https://example.com/unwanted'] : resources.slice(); },
        async arrayBuffer() { try { await consume(); } finally { active--; } return new ArrayBuffer(0); },
      };
    },
  };
  if (failure) {
    const fetch = context.fetch;
    context.fetch = async (...args) => {
      const response = await fetch(...args);
      if (!response.ok) active--;
      return response;
    };
  }
  if (idle) {
    context.requestIdleCallback = callback => timeout(callback, 1);
    context.cancelIdleCallback = key => timers.delete(key);
  }
  vm.runInNewContext(source, context);
  return {
    document, window, connection, calls, releases,
    async loaded() {
      document.readyState = 'complete';
      window.dispatchEvent(new Event('load'));
      await settle();
    },
    async tick(ms) {
      await settle();
      const end = now + ms;
      for (;;) {
        const next = [...timers].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
        await settle();
      }
      now = end;
    },
  };
}

test('waits for the simple page and quiet time, then fetches at low priority', async () => {
  const b = browser();
  b.document.dispatchEvent(new Event('pointerdown'));
  await b.tick(5000);
  assert.equal(b.calls.length, 0);
  await b.loaded();
  await b.tick(1500);
  assert.equal(b.calls.length, 0);
  await b.tick(1000);
  assert.deepEqual(b.calls.map(call => call.url), [manifest, ...resources]);
  assert.ok(b.calls.every(call => call.options.priority === 'low'));
});

test('interaction delays the next file without restarting a completed download', async () => {
  const b = browser({ hold: resources[0] });
  await b.loaded();
  await b.tick(1700);
  b.document.dispatchEvent(new Event('scroll'));
  b.releases.get(resources[0])();
  await b.tick(1499);
  assert.deepEqual(b.calls.map(call => call.url), [manifest, resources[0]]);
  await b.tick(2);
  assert.equal(b.calls.at(-1).url, resources[1]);
});

test('hidden tabs stop scheduling and resume after becoming visible', async () => {
  const b = browser();
  await b.loaded();
  await b.tick(1501);
  b.document.hidden = true;
  b.document.dispatchEvent(new Event('visibilitychange'));
  await b.tick(5000);
  assert.equal(b.calls.length, 1);
  b.document.hidden = false;
  b.document.dispatchEvent(new Event('visibilitychange'));
  await b.tick(2000);
  assert.equal(b.calls.length, 3);
});

test('navigation aborts pending work and back navigation can resume it', async () => {
  const b = browser({ hold: resources[0] });
  await b.loaded();
  await b.tick(1700);
  b.window.dispatchEvent(new Event('pagehide'));
  await b.tick(5000);
  assert.equal(b.calls.length, 2);
  assert.ok(b.calls[1].options.signal.aborted);
  b.window.dispatchEvent(new Event('pageshow'));
  await b.tick(1600);
  assert.equal(b.calls.at(-1).url, resources[0]);
  assert.equal(b.calls.at(-1).options.signal.aborted, false);
  b.releases.get(resources[0])();
  await b.tick(200);
  assert.equal(b.calls.at(-1).url, resources[1]);
});

test('reported data saving and 2G avoid background traffic', async () => {
  for (const options of [{ saveData: true }, { slow: true }]) {
    const b = browser(options);
    await b.loaded();
    await b.tick(10000);
    assert.equal(b.calls.length, 0);
  }
});

test('works without requestIdleCallback and ignores optional preload failures', async () => {
  const b = browser({ idle: false, failure: resources[0] });
  await b.loaded();
  await b.tick(2500);
  assert.deepEqual(b.calls.map(call => call.url), [manifest, ...resources]);
});

test('invalid manifests never trigger requests outside this site', async () => {
  const b = browser({ invalid: true });
  await b.loaded();
  await b.tick(10000);
  assert.deepEqual(b.calls.map(call => call.url), [manifest]);
});
