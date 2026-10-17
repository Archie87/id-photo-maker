/** Area-weighted resizing matches Hivision's 512-square RGB input convention.
 * Original implementation: integrate source pixel coverage, then NCHW [-1,1].
 * Alpha is flattened on white only for inference, never written to the source.
 */
export function hivisionInput(image: { data: Uint8ClampedArray; width: number; height: number }) {
  const { width, height, data } = image;
  if (
    ![width, height].every((v) => Number.isInteger(v) && v > 0) ||
    data.length !== width * height * 4
  )
    throw new Error('Hivision 抠图像素数据无效');
  const size = 512,
    plane = size * size,
    out = new Float32Array(plane * 3);
  const sx = width / size,
    sy = height / size;
  for (let y = 0; y < size; y++) {
    const top = y * sy,
      bottom = (y + 1) * sy;
    for (let x = 0; x < size; x++) {
      const left = x * sx,
        right = (x + 1) * sx;
      let r = 0,
        g = 0,
        b = 0;
      for (let yy = Math.floor(top); yy < Math.min(height, Math.ceil(bottom)); yy++) {
        const wy = Math.min(bottom, yy + 1) - Math.max(top, yy);
        for (let xx = Math.floor(left); xx < Math.min(width, Math.ceil(right)); xx++) {
          const weight = wy * (Math.min(right, xx + 1) - Math.max(left, xx));
          const i = (yy * width + xx) * 4,
            alpha = data[i + 3] / 255;
          r += (data[i] * alpha + 255 * (1 - alpha)) * weight;
          g += (data[i + 1] * alpha + 255 * (1 - alpha)) * weight;
          b += (data[i + 2] * alpha + 255 * (1 - alpha)) * weight;
        }
      }
      const i = y * size + x,
        area = sx * sy;
      // Upstream resizes uint8 input before normalization.
      out[i] = Math.round(r / area) / 127.5 - 1;
      out[plane + i] = Math.round(g / area) / 127.5 - 1;
      out[plane * 2 + i] = Math.round(b / area) / 127.5 - 1;
    }
  }
  return { width: size, height: size, data: out };
}
