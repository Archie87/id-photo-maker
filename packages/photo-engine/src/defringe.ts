/** Remove a light colour fringe using nearby opaque interior colours.
 * Operates on a narrow border at final export resolution. Alpha is never eroded.
 * Unlike colour unmixing, this does not need a reliable old-background sample.
 */
export function defringeRgba(
  image: { data: Uint8ClampedArray; width: number; height: number },
  strength = 100,
): Uint8ClampedArray {
  const { data, width, height } = image;
  if (
    ![width, height].every((n) => Number.isInteger(n) && n > 0) ||
    data.length !== width * height * 4 ||
    !Number.isFinite(strength)
  )
    throw new Error('去白边像素或强度无效');
  const out = new Uint8ClampedArray(data),
    amount = Math.max(0, Math.min(100, strength)) / 100;
  if (!amount) return out;
  const radius = Math.max(1, Math.min(4, Math.round((Math.min(width, height) / 295) * 1.5)));
  const n = width * height,
    distance = new Uint8Array(n).fill(255);
  // Distance to uncertain/transparent pixels; canvas limits are not background.
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 250) distance[i] = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1);
      if (y) distance[i] = Math.min(distance[i], distance[i - width] + 1);
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + 1] + 1);
      if (y + 1 < height) distance[i] = Math.min(distance[i], distance[i + width] + 1);
    }
  const nearest = new Int32Array(n).fill(-1),
    steps = new Uint8Array(n).fill(255);
  for (let i = 0; i < n; i++)
    if (distance[i] > radius && data[i * 4 + 3] >= 250) {
      nearest[i] = i;
      steps[i] = 0;
    }
  const adopt = (i: number, other: number) => {
    if (steps[other] + 1 < steps[i] && steps[other] < radius * 4) {
      steps[i] = steps[other] + 1;
      nearest[i] = nearest[other];
    }
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) adopt(i, i - 1);
      if (y) adopt(i, i - width);
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) adopt(i, i + 1);
      if (y + 1 < height) adopt(i, i + width);
    }
  for (let i = 0; i < n; i++) {
    const k = i * 4,
      anchor = nearest[i];
    if (!data[k + 3] || distance[i] > radius || anchor < 0) continue;
    const f = [data[anchor * 4], data[anchor * 4 + 1], data[anchor * 4 + 2]];
    // White clothing/hair cannot be reliably distinguished from a white fringe.
    if (Math.min(...f) > 190) continue;
    const lift = (data[k] + data[k + 1] + data[k + 2] - f[0] - f[1] - f[2]) / 3;
    if (lift <= 12) continue;
    let numerator = 0,
      denominator = 0;
    for (let c = 0; c < 3; c++) {
      numerator += (data[k + c] - f[c]) * (255 - f[c]);
      denominator += (255 - f[c]) ** 2;
    }
    const veil = Math.max(0, Math.min(1, numerator / denominator));
    let residual = 0;
    for (let c = 0; c < 3; c++) residual += (data[k + c] - (f[c] + veil * (255 - f[c]))) ** 2 / 3;
    // Only a coherent light veil is corrected; coloured texture is left alone.
    const weight = amount * Math.max(0, 1 - residual / (20 * 20)) * Math.min(1, (lift - 12) / 12);
    for (let c = 0; c < 3; c++) out[k + c] = data[k + c] + (f[c] - data[k + c]) * weight;
  }
  return out;
}
