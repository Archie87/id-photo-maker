import type { Transform } from '@id-photo/spec-engine';
import { defringeRgba } from './defringe';
export interface RenderOptions {
  width: number;
  height: number;
  transform: Transform;
  background: string | null;
  brightness: number;
  contrast: number;
  defringe?: number;
  keepMask?: { image: CanvasImageSource; width: number; height: number };
}
export function renderPhoto(source: CanvasImageSource, o: RenderOptions): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = o.width;
  out.height = o.height;
  const ctx = out.getContext('2d', { colorSpace: 'srgb' })!;
  const drawBackground = () => {
    if (!o.background) return;
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, o.width, o.height);
  };
  if (!o.defringe && !o.keepMask) drawBackground();
  const t = o.transform;
  ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
  ctx.filter = `brightness(${o.brightness}%) contrast(${o.contrast}%)`;
  ctx.drawImage(source, 0, 0);
  if (o.keepMask) {
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(o.keepMask.image, 0, 0, o.keepMask.width, o.keepMask.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.defringe) {
    const rgba = ctx.getImageData(0, 0, o.width, o.height);
    rgba.data.set(defringeRgba(rgba, o.defringe));
    ctx.putImageData(rgba, 0, 0);
  }
  if (o.defringe || o.keepMask) {
    ctx.resetTransform();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-over';
    drawBackground();
  }
  return out;
}
