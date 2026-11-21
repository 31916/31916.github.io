const packURL = '/space/scene-assets.gz?v=20261121-startup';

export const sceneAssetsReady = typeof DecompressionStream === 'function'
  ? loadAssets().catch(error => {
    console.warn('Scene asset bundle unavailable; loading the original files.', error);
    return null;
  })
  : Promise.resolve(null);

async function loadAssets() {
  const response = await fetch(packURL);
  if (!response.ok) throw new Error(`Could not load scene assets: ${response.status}`);
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  let bytes = await new Response(stream).arrayBuffer();
  const headerLength = new DataView(bytes).getUint32(0, true);
  const dataStart = 4 + headerLength;
  if (dataStart > bytes.byteLength) throw new Error('Invalid scene asset header');
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 4, headerLength)));
  for (const range of Object.values(manifest)) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isSafeInteger) ||
        range[0] < 0 || range[1] <= 0 || dataStart + range[0] + range[1] > bytes.byteLength) {
      throw new Error('Invalid scene asset range');
    }
  }

  function entry(name) {
    if (!bytes) return null;
    const range = manifest[name];
    return range ? new Uint8Array(bytes, dataStart + range[0], range[1]) : null;
  }
  return {
    blob(name) {
      const content = entry(name);
      return content ? new Blob([content], { type: name.endsWith('.png') ? 'image/png' : 'image/webp' }) : null;
    },
    buffer(name) {
      return entry(name)?.slice().buffer;
    },
    release() { bytes = null; },
  };
}
