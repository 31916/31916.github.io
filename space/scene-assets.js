export const sceneAssetsReady = typeof DecompressionStream === 'function'
  ? loadAssets().catch(error => {
    console.warn('Scene asset bundles unavailable; loading the original files.', error);
    return null;
  })
  : Promise.resolve(null);

async function loadPack(index, signal) {
  const response = await fetch(`/space/scene-assets-${index}.gz?v=20261121-startup2`, { signal });
  if (!response.ok) throw new Error(`Could not load scene assets: ${response.status}`);
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const bytes = await new Response(stream).arrayBuffer();
  const headerLength = new DataView(bytes).getUint32(0, true);
  const dataStart = 4 + headerLength;
  if (dataStart > bytes.byteLength) throw new Error('Invalid scene asset header');
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 4, headerLength)));
  const entries = {};
  for (const [name, range] of Object.entries(manifest)) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isSafeInteger) ||
        range[0] < 0 || range[1] <= 0 || dataStart + range[0] + range[1] > bytes.byteLength) {
      throw new Error('Invalid scene asset range');
    }
    entries[name] = new Uint8Array(bytes, dataStart + range[0], range[1]);
  }
  return entries;
}

async function loadAssets() {
  const controller = new AbortController();
  let packs;
  try { packs = await Promise.all(Array.from({ length: 6 }, (_, index) => loadPack(index, controller.signal))); }
  catch (error) { controller.abort(); throw error; }
  const entries = Object.assign({}, ...packs);
  packs.length = 0;
  return {
    blob(name) {
      const content = entries[name];
      return content ? new Blob([content], { type: name.endsWith('.png') ? 'image/png' : 'image/webp' }) : null;
    },
    buffer(name) { return entries[name]?.slice().buffer; },
    release() { for (const name of Object.keys(entries)) delete entries[name]; },
  };
}
