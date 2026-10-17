import type { Landmarks, Point, Transform } from './types';
export function mmToPx(mm: number, dpi = 300): number {
  if (!Number.isFinite(mm) || mm <= 0 || !Number.isFinite(dpi) || dpi <= 0)
    throw new Error('尺寸和 DPI 必须是正数');
  return Math.round((mm * dpi) / 25.4);
}
export function transformPoint(p: Point, t: Transform): Point {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f };
}
export function fitPortrait(
  points: Landmarks,
  width: number,
  height: number,
  headRatio = 0.59,
  eyesY = 0.44,
): Transform {
  const { leftEye: l, rightEye: r, crown, chin } = points;
  if (
    ![
      width,
      height,
      headRatio,
      eyesY,
      ...Object.values(l),
      ...Object.values(r),
      ...Object.values(crown),
      ...Object.values(chin),
    ].every(Number.isFinite)
  )
    throw new Error('关键点无效');
  if (
    width <= 0 ||
    height <= 0 ||
    headRatio <= 0 ||
    headRatio >= 1 ||
    eyesY <= 0 ||
    eyesY >= 1 ||
    Math.hypot(r.x - l.x, r.y - l.y) < 1
  )
    throw new Error('构图参数无效');
  const angle = -Math.atan2(r.y - l.y, r.x - l.x);
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const headHeight = (chin.x - crown.x) * sin + (chin.y - crown.y) * cos;
  if (headHeight < 1) throw new Error('头顶和下巴的位置无效');
  const scale = (height * headRatio) / headHeight;
  const a = cos * scale,
    b = sin * scale,
    c = -sin * scale,
    d = cos * scale;
  const eye = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  return {
    a,
    b,
    c,
    d,
    e: width / 2 - a * eye.x - c * eye.y,
    f: height * eyesY - b * eye.x - d * eye.y,
  };
}
export function coverTransform(sw: number, sh: number, w: number, h: number): Transform {
  const s = Math.max(w / sw, h / sh);
  return { a: s, b: 0, c: 0, d: s, e: (w - sw * s) / 2, f: (h - sh * s) / 2 };
}
export function adjustTransform(
  t: Transform,
  w: number,
  h: number,
  zoom: number,
  x: number,
  y: number,
  rotation: number,
): Transform {
  const rad = (rotation * Math.PI) / 180,
    co = Math.cos(rad) * zoom,
    si = Math.sin(rad) * zoom;
  return {
    a: co * t.a - si * t.b,
    b: si * t.a + co * t.b,
    c: co * t.c - si * t.d,
    d: si * t.c + co * t.d,
    e: co * (t.e - w / 2) - si * (t.f - h / 2) + w / 2 + x * w,
    f: si * (t.e - w / 2) + co * (t.f - h / 2) + h / 2 + y * h,
  };
}
