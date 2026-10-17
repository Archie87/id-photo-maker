import type { Landmarks, Point } from '@id-photo/spec-engine';
/** Keep-mask for exposed lower hair. Semantic skin/clothes/accessories and the
 * central neck corridor are protected; no missing body pixels are generated. */
export function looseHairKeepMask(
  channels: readonly Float32Array[],
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  points: Landmarks,
  guide?: { data: Uint8ClampedArray; width: number; height: number },
  faceOutline?: readonly { start: Point; end: Point }[],
) {
  const n = width * height;
  if (
    ![width, height, imageWidth, imageHeight].every((v) => Number.isInteger(v) && v > 0) ||
    channels.length !== 6 ||
    channels.some((c) => c.length !== n || !c.every(Number.isFinite))
  )
    throw new Error('头发识别蒙版无效');
  const dx = points.rightEye.x - points.leftEye.x,
    dy = points.rightEye.y - points.leftEye.y;
  const eyeDistance = Math.hypot(dx, dy),
    cx = (points.leftEye.x + points.rightEye.x) / 2,
    cy = (points.leftEye.y + points.rightEye.y) / 2;
  const ux = dx / eyeDistance,
    uy = dy / eyeDistance;
  const chinDepth = -(points.chin.x - cx) * uy + (points.chin.y - cy) * ux;
  if (!Number.isFinite(chinDepth) || eyeDistance < 1 || chinDepth < 1)
    throw new Error('头发清理需要有效正面人脸');
  const out = new Float32Array(n).fill(1),
    top = chinDepth * 0.4,
    bottom = chinDepth * 1.3,
    feather = chinDepth * 0.05;
  const protectedAt = (i: number) =>
    Math.max(channels[2][i], channels[3][i], channels[4][i], channels[5][i]);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const px = ((x + 0.5) * imageWidth) / width - cx,
        py = ((y + 0.5) * imageHeight) / height - cy;
      const lateral = Math.abs(px * ux + py * uy),
        depth = -px * uy + py * ux;
      if (
        depth < top ||
        depth > bottom ||
        lateral < eyeDistance * 0.48 ||
        lateral > eyeDistance * 1.45
      )
        continue;
      const i = y * width + x;
      let protection = protectedAt(i);
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++)
          protection = Math.max(protection, protectedAt(yy * width + xx));
      if (protection >= 0.22) continue;
      const hairOrBackground = channels[0][i] + channels[1][i];
      if (hairOrBackground < 0.7) continue;
      const edge = Math.min(1, (depth - top) / feather, (bottom - depth) / feather);
      out[i] = 1 - Math.max(0, edge) * Math.min(1, (hairOrBackground - 0.7) / 0.15);
    }
  if (!guide) return out;
  if (guide.data.length !== guide.width * guide.height * 4 || guide.width < 1 || guide.height < 1)
    throw new Error('头发清理参考图无效');
  // Use the original colours to refine the coarse semantic boundary. The old
  // expanded protection band can otherwise retain a dark strip of real hair.
  const gw = guide.width,
    gh = guide.height,
    rgba = guide.data;
  const sample = (values: Float32Array, x: number, y: number) => {
    const mx = Math.max(0, Math.min(width - 1, ((x + 0.5) * width) / gw - 0.5));
    const my = Math.max(0, Math.min(height - 1, ((y + 0.5) * height) / gh - 0.5));
    const x0 = Math.floor(mx),
      y0 = Math.floor(my),
      x1 = Math.min(width - 1, x0 + 1),
      y1 = Math.min(height - 1, y0 + 1);
    const fx = mx - x0,
      fy = my - y0;
    return (
      (values[y0 * width + x0] * (1 - fx) + values[y0 * width + x1] * fx) * (1 - fy) +
      (values[y1 * width + x0] * (1 - fx) + values[y1 * width + x1] * fx) * fy
    );
  };
  const protectedMask = Float32Array.from(out, (_, i) => protectedAt(i));
  const protect = new Float32Array(gw * gh),
    remove = new Float32Array(gw * gh),
    refined = new Float32Array(gw * gh),
    changed = new Uint8Array(gw * gh);
  const removable = Float32Array.from(out, (_, i) => channels[0][i] + channels[1][i]);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      refined[i] = sample(out, x, y);
      protect[i] = sample(protectedMask, x, y);
      remove[i] = sample(removable, x, y);
    }
  const radius = Math.min(24, Math.max(6, Math.ceil((Math.max(gw, gh) / 256) * 6)));
  const distance = (a: number, b: number) => {
    let d = 0;
    for (let k = 0; k < 3; k++) d += (rgba[a * 4 + k] - rgba[b * 4 + k]) ** 2;
    return d;
  };
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const px = ((x + 0.5) * imageWidth) / gw - cx,
        py = ((y + 0.5) * imageHeight) / gh - cy;
      const lateral = Math.abs(px * ux + py * uy),
        depth = -px * uy + py * ux;
      if (
        depth < top ||
        depth > bottom ||
        lateral < eyeDistance * 0.48 ||
        lateral > eyeDistance * 1.45 ||
        protect[i] > 0.995 ||
        remove[i] > 0.995
      )
        continue;
      let pd = Infinity,
        rd = Infinity,
        pi = -1,
        ri = -1;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(gh - 1, y + radius); yy += 2)
        for (let xx = Math.max(0, x - radius); xx <= Math.min(gw - 1, x + radius); xx += 2) {
          const j = yy * gw + xx;
          const d = distance(i, j) + ((xx - x) ** 2 + (yy - y) ** 2) * 0.25;
          if (protect[j] > 0.9 && d < pd) {
            pd = d;
            pi = j;
          }
          if (remove[j] > 0.9 && d < rd) {
            rd = d;
            ri = j;
          }
        }
      // Ambiguous colours or missing reliable samples preserve the semantic mask.
      if (pi < 0 || ri < 0 || distance(pi, ri) < 35 ** 2) continue;
      const ratio = rd / (pd + rd + 1e-6);
      const t = Math.max(0, Math.min(1, (ratio - 0.45) / 0.3));
      const keep = t * t * (3 - 2 * t);
      const edge = Math.max(0, Math.min(1, (depth - top) / feather, (bottom - depth) / feather));
      refined[i] = 1 - edge * (1 - keep);
      changed[i] = 1;
    }
  // Remove isolated boundary specks without filtering confident skin/clothes
  // or the untouched head. A median retains a straight contour's position.
  const cleaned = new Float32Array(refined);
  for (let y = 1; y < gh - 1; y++)
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      if (!changed[i] || protect[i] >= 0.9) continue;
      const neighbors: number[] = [];
      for (let yy = y - 1; yy <= y + 1; yy++)
        for (let xx = x - 1; xx <= x + 1; xx++) neighbors.push(refined[yy * gw + xx]);
      neighbors.sort((a, b) => a - b);
      cleaned[i] = neighbors[4];
    }
  if (faceOutline?.length) {
    // Only touch the exterior strip beside already removed background. Low
    // confidence inside a collar fold must never become a hole through clothing.
    const reach = Math.max(2, Math.round((Math.max(gw, gh) / 256) * 4));
    const exteriorDistance = Float32Array.from(cleaned, (a) => (a < 0.05 ? 0 : gw + gh));
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (x) exteriorDistance[i] = Math.min(exteriorDistance[i], exteriorDistance[i - 1] + 1);
        if (y) exteriorDistance[i] = Math.min(exteriorDistance[i], exteriorDistance[i - gw] + 1);
      }
    for (let y = gh - 1; y >= 0; y--)
      for (let x = gw - 1; x >= 0; x--) {
        const i = y * gw + x;
        if (x + 1 < gw)
          exteriorDistance[i] = Math.min(exteriorDistance[i], exteriorDistance[i + 1] + 1);
        if (y + 1 < gh)
          exteriorDistance[i] = Math.min(exteriorDistance[i], exteriorDistance[i + gw] + 1);
      }
    const project = (p: Point) => ({
      x: (p.x - cx) * ux + (p.y - cy) * uy,
      y: -(p.x - cx) * uy + (p.y - cy) * ux,
    });
    const edges = faceOutline.map(({ start, end }) => ({
      start: project(start),
      end: project(end),
    }));
    if (edges.some(({ start, end }) => ![start.x, start.y, end.x, end.y].every(Number.isFinite)))
      throw new Error('下颌轮廓无效');
    const pixel = Math.max(imageWidth / gw, imageHeight / gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (exteriorDistance[i] >= reach || sample(channels[1], x, y) < 0.08) continue;
        const p = project({ x: ((x + 0.5) * imageWidth) / gw, y: ((y + 0.5) * imageHeight) / gh });
        if (p.y < chinDepth * 0.7 || p.y > bottom || Math.abs(p.x) > eyeDistance * 1.45) continue;
        // Face landmarks constrain only the lower jaw. Preserve the neck corridor
        // below the chin and confidently classified body/clothes/accessories.
        let left = -eyeDistance * 0.48,
          right = eyeDistance * 0.48;
        for (const { start, end } of edges) {
          if ((start.y <= p.y && end.y > p.y) || (end.y <= p.y && start.y > p.y)) {
            const edgeX = start.x + ((p.y - start.y) * (end.x - start.x)) / (end.y - start.y);
            left = Math.min(left, edgeX);
            right = Math.max(right, edgeX);
          }
        }
        const outside = Math.max(left - p.x, p.x - right);
        if (outside <= pixel * 0.5) continue;
        const body = sample(channels[2], x, y),
          clothes = sample(channels[4], x, y),
          accessory = sample(channels[5], x, y);
        if (accessory > 0.75) continue;
        const faceSkin = sample(channels[3], x, y);
        const preserve = Math.max(
          0,
          Math.min(
            1,
            Math.max((body - 0.6) / 0.25, (clothes - 0.65) / 0.2, (faceSkin - 0.7) / 0.2),
          ),
        );
        const strength = Math.min(
          1,
          (outside - pixel * 0.5) / pixel,
          (p.y - chinDepth * 0.7) / feather,
          (bottom - p.y) / feather,
          (reach - exteriorDistance[i]) / (reach / 2),
        );
        cleaned[i] = Math.min(cleaned[i], 1 - strength * (1 - preserve));
        changed[i] = 1;
      }
    // Clipping can detach small grey specks; suppress those at the same guarded
    // boundary, without smoothing the entire portrait or changing core pixels.
    const final = new Float32Array(cleaned);
    for (let y = 1; y < gh - 1; y++)
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        if (!changed[i] || protect[i] >= 0.9) continue;
        const neighbors: number[] = [];
        for (let yy = y - 1; yy <= y + 1; yy++)
          for (let xx = x - 1; xx <= x + 1; xx++) neighbors.push(cleaned[yy * gw + xx]);
        neighbors.sort((a, b) => a - b);
        final[i] = neighbors[4];
      }
    return final;
  }
  return cleaned;
}
