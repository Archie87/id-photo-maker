import { resizeAlphaArea } from './resize-alpha';
/** Local colour matting for the uncertain border of a segmentation mask.
 * Pure pixel code: run once in the inference Worker and reuse the resulting RGBA.
 */
export function refinePortraitEdges(
  image: { data: Uint8ClampedArray; width: number; height: number },
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
  options: { preserveAlpha?: boolean; interpolation?: 'linear' | 'area' } = {},
): Uint8ClampedArray {
  const { data, width, height } = image;
  if (
    ![width, height, maskWidth, maskHeight].every((v) => Number.isInteger(v) && v > 0) ||
    data.length !== width * height * 4 ||
    mask.length !== maskWidth * maskHeight ||
    !mask.every(Number.isFinite)
  )
    throw new Error('边缘优化图像或蒙版尺寸无效');
  const alpha =
    options.interpolation === 'area'
      ? resizeAlphaArea(mask, maskWidth, maskHeight, width, height)
      : new Float32Array(width * height);
  for (let y = 0; options.interpolation !== 'area' && y < height; y++) {
    const my = Math.max(0, Math.min(maskHeight - 1, ((y + 0.5) * maskHeight) / height - 0.5));
    const y0 = Math.floor(my),
      y1 = Math.min(y0 + 1, maskHeight - 1),
      fy = my - y0;
    for (let x = 0; x < width; x++) {
      const mx = Math.max(0, Math.min(maskWidth - 1, ((x + 0.5) * maskWidth) / width - 0.5));
      const x0 = Math.floor(mx),
        x1 = Math.min(x0 + 1, maskWidth - 1),
        fx = mx - x0;
      const top = mask[y0 * maskWidth + x0] * (1 - fx) + mask[y0 * maskWidth + x1] * fx;
      const bottom = mask[y1 * maskWidth + x0] * (1 - fx) + mask[y1 * maskWidth + x1] * fx;
      alpha[y * width + x] = Math.max(0, Math.min(1, top * (1 - fy) + bottom * fy));
    }
  }
  const maskScale = Math.max(width / maskWidth, height / maskHeight);
  const radius = Math.max(8, Math.min(48, Math.ceil(maskScale * 4)));
  // Use colours from inside the silhouette: even high-confidence border pixels
  // can contain the old background when the model's boundary is slightly loose.
  const inset = Math.max(2, Math.ceil(maskScale * 2));
  const distanceSquared = (i: number, j: number) =>
    ((i % width) - (j % width)) ** 2 + (Math.floor(i / width) - Math.floor(j / width)) ** 2;
  const background = nearbySeeds(
    width,
    height,
    radius,
    (i) => alpha[i] <= 0.02 && data[i * 4 + 3] === 255,
  );
  const foreground = nearbySeeds(
    width,
    height,
    radius,
    (i) =>
      alpha[i] >= 0.98 &&
      data[i * 4 + 3] === 255 &&
      (background[i] < 0 || distanceSquared(i, background[i]) > inset * inset),
  );
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i],
      offset = i * 4;
    out[offset + 3] = Math.round(data[offset + 3] * a);
    const f = foreground[i],
      b = background[i];
    // Leave the confident interior and areas without local colour evidence alone.
    if (a === 0 || f < 0 || b < 0 || f === i || data[offset + 3] !== 255) continue;
    let denominator = 0,
      numerator = 0;
    for (let c = 0; c < 3; c++) {
      const direction = data[f * 4 + c] - data[b * 4 + c];
      denominator += direction * direction;
      numerator += (data[offset + c] - data[b * 4 + c]) * direction;
    }
    // Similar foreground/background colours (e.g. white clothing) are ambiguous.
    if (denominator < 30 * 30) continue;
    const projected = Math.max(0, Math.min(1, numerator / denominator));
    let residual = 0;
    for (let c = 0; c < 3; c++) {
      const prediction = data[f * 4 + c] * projected + data[b * 4 + c] * (1 - projected);
      residual += (data[offset + c] - prediction) ** 2 / 3;
    }
    // Reject colour pairs that cannot explain this pixel, rather than eroding it.
    const confidence = Math.max(0, 1 - residual / (18 * 18));
    if (confidence === 0) continue;
    const refined = options.preserveAlpha ? a : a + (projected - a) * confidence;
    out[offset + 3] = Math.round(refined * 255);
    for (let c = 0; c < 3; c++) {
      // Undo old-background contamination, with a foreground prior for faint hairs.
      const unmixed =
        (data[offset + c] - (1 - refined) * data[b * 4 + c]) / Math.max(refined, 0.02);
      const stable = Math.max(data[f * 4 + c] - 32, Math.min(data[f * 4 + c] + 32, unmixed));
      out[offset + c] = data[offset + c] + (stable - data[offset + c]) * confidence;
    }
  }
  return out;
}

/** Two bounded propagation passes give nearby colour anchors without quadratic searches. */
function nearbySeeds(width: number, height: number, radius: number, seed: (i: number) => boolean) {
  const nearest = new Int32Array(width * height).fill(-1);
  for (let i = 0; i < nearest.length; i++) if (seed(i)) nearest[i] = i;
  for (const direction of [1, -1]) {
    for (let y = direction === 1 ? 0 : height - 1; y >= 0 && y < height; y += direction) {
      for (let x = direction === 1 ? 0 : width - 1; x >= 0 && x < width; x += direction) {
        const i = y * width + x;
        if (nearest[i] === i) continue;
        let best =
          nearest[i] < 0
            ? radius * radius + 1
            : ((nearest[i] % width) - x) ** 2 + (Math.floor(nearest[i] / width) - y) ** 2;
        const visit = (nx: number, ny: number) => {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
          const candidate = nearest[ny * width + nx];
          if (candidate < 0) return;
          const distance =
            ((candidate % width) - x) ** 2 + (Math.floor(candidate / width) - y) ** 2;
          if (distance < best) {
            best = distance;
            nearest[i] = candidate;
          }
        };
        visit(x - direction, y);
        visit(x, y - direction);
        visit(x - 1, y - direction);
        visit(x + 1, y - direction);
      }
    }
  }
  return nearest;
}
