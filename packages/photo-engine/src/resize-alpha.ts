/** Area coverage resampling for Hivision masks. Enlarging does not spread a
 * boundary into neighbouring opaque pixels; fractional coverage stays soft. */
export function resizeAlphaArea(
  mask: Float32Array,
  mw: number,
  mh: number,
  width: number,
  height: number,
) {
  if (
    ![mw, mh, width, height].every((v) => Number.isInteger(v) && v > 0) ||
    mask.length !== mw * mh ||
    !mask.every(Number.isFinite)
  )
    throw new Error('蒙版缩放尺寸或数据无效');
  const out = new Float32Array(width * height),
    sx = mw / width,
    sy = mh / height;
  for (let y = 0; y < height; y++) {
    const top = y * sy,
      bottom = (y + 1) * sy;
    for (let x = 0; x < width; x++) {
      const left = x * sx,
        right = (x + 1) * sx;
      let sum = 0;
      for (let yy = Math.floor(top); yy < Math.min(mh, Math.ceil(bottom)); yy++) {
        const wy = Math.min(bottom, yy + 1) - Math.max(top, yy);
        for (let xx = Math.floor(left); xx < Math.min(mw, Math.ceil(right)); xx++)
          sum +=
            Math.max(0, Math.min(1, mask[yy * mw + xx])) *
            wy *
            (Math.min(right, xx + 1) - Math.max(left, xx));
      }
      out[y * width + x] = sum / (sx * sy);
    }
  }
  return out;
}
