import type { Landmarks, ImageRegion } from '@id-photo/spec-engine';
/** Generous head/shoulder box in working-image pixels; face detection remains full-frame. */
export function headShoulderRegion(points: Landmarks, width: number, height: number): ImageRegion {
  const head = Math.hypot(points.chin.x - points.crown.x, points.chin.y - points.crown.y);
  if (!Number.isFinite(head) || head < 4 || width < 1 || height < 1)
    throw new Error('无法确定头肩区域');
  const cx = (points.leftEye.x + points.rightEye.x) / 2;
  const x = Math.max(0, Math.floor(cx - head * 1.45));
  const y = Math.max(0, Math.floor(points.crown.y - head * 0.45));
  const right = Math.min(width, Math.ceil(cx + head * 1.45));
  const bottom = Math.min(height, Math.ceil(points.chin.y + head * 1.6));
  if (right <= x || bottom <= y) throw new Error('头肩区域超出图片范围');
  return { x, y, width: right - x, height: bottom - y };
}
export function cropRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: ImageRegion,
): Uint8ClampedArray<ArrayBuffer> {
  const { x, y, width: w, height: h } = region;
  if (
    data.length !== width * height * 4 ||
    ![x, y, w, h].every(Number.isInteger) ||
    x < 0 ||
    y < 0 ||
    w < 1 ||
    h < 1 ||
    x + w > width ||
    y + h > height
  )
    throw new Error('裁切区域无效');
  const cropped = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++)
    cropped.set(
      data.subarray(((y + row) * width + x) * 4, ((y + row) * width + x + w) * 4),
      row * w * 4,
    );
  return cropped;
}
