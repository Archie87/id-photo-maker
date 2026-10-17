import type { ImageRegion } from '@id-photo/spec-engine';
import { resizeAlphaArea } from './resize-alpha';
export function applyAlpha(
  source: HTMLCanvasElement,
  alpha: Float32Array,
  mw: number,
  mh: number,
  region: ImageRegion = { x: 0, y: 0, width: source.width, height: source.height },
  foreground?: Uint8ClampedArray,
  interpolation: 'linear' | 'area' = 'linear',
): HTMLCanvasElement {
  if (alpha.length !== mw * mh) throw new Error('抠图蒙版尺寸错误');
  if (
    ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
    region.x < 0 ||
    region.y < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.x + region.width > source.width ||
    region.y + region.height > source.height
  )
    throw new Error('蒙版映射范围无效');
  if (foreground) {
    if (
      foreground.length !== region.width * region.height * 4 ||
      ![region.x, region.y, region.width, region.height].every(Number.isInteger)
    )
      throw new Error('净化人像尺寸与蒙版范围不一致');
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    out
      .getContext('2d')!
      .putImageData(
        new ImageData(new Uint8ClampedArray(foreground), region.width, region.height),
        region.x,
        region.y,
      );
    return out;
  }
  const mask = document.createElement('canvas');
  mask.width = interpolation === 'area' ? region.width : mw;
  mask.height = interpolation === 'area' ? region.height : mh;
  const mapped =
    interpolation === 'area' ? resizeAlphaArea(alpha, mw, mh, region.width, region.height) : alpha;
  const ctx = mask.getContext('2d')!,
    data = ctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mapped.length; i++) {
    data.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, mapped[i])) * 255);
  }
  ctx.putImageData(data, 0, 0);
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const c = out.getContext('2d')!;
  c.drawImage(source, 0, 0);
  // Full-size transparent mask clears pixels outside the ROI as well.
  const fullMask = document.createElement('canvas');
  fullMask.width = source.width;
  fullMask.height = source.height;
  fullMask.getContext('2d')!.drawImage(mask, region.x, region.y, region.width, region.height);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(fullMask, 0, 0);
  mask.width = mask.height = fullMask.width = fullMask.height = 0;
  return out;
}
