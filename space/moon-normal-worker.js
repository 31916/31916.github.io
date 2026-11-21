// These derivatives reproduce the lossless normal maps from the height maps.
const roundEven = value => {
  const integer = Math.floor(value);
  return value - integer === .5 ? integer + (integer % 2) : Math.round(value);
};

self.onmessage = async ({ data: { id, blob } }) => {
  try {
    const image = await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const { width, height } = image;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    image.close();
    const terrain = context.getImageData(0, 0, width, height).data;
    const normals = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const row = y * width * 4;
      const above = Math.max(0, y - 1) * width * 4;
      const below = Math.min(height - 1, y + 1) * width * 4;
      const output = (height - 1 - y) * width * 4;
      for (let x = 0; x < width; x++) {
        const left = row + ((x + width - 1) % width) * 4;
        const right = row + ((x + 1) % width) * 4;
        const dx = (terrain[left] - terrain[right]) / 255 * 5;
        const dy = (terrain[above + x * 4] - terrain[below + x * 4]) / 255 * 5;
        const length = Math.sqrt(dx * dx + dy * dy + 1);
        const offset = output + x * 4;
        normals[offset] = roundEven(127.5 + 127.5 * dx / length);
        normals[offset + 1] = roundEven(127.5 + 127.5 * dy / length);
        normals[offset + 2] = roundEven(127.5 + 127.5 / length);
        normals[offset + 3] = 255;
      }
    }
    self.postMessage({ id, width, height, pixels: normals.buffer }, [normals.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
