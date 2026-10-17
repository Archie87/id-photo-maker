import data from '../../../data/photo-specs.json';
import type { PhotoSpec } from './types';
import { mmToPx } from './geometry';
export const photoSpecs = data as PhotoSpec[];
export function customSpec(widthMm: number, heightMm: number): PhotoSpec {
  if (![widthMm, heightMm].every((v) => Number.isFinite(v) && v >= 10 && v <= 100))
    throw new Error('自定义尺寸范围为 10–100 mm');
  return {
    ...photoSpecs[0],
    id: 'custom',
    name: '自定义',
    widthMm,
    heightMm,
    status: 'custom',
    source: null,
    lastVerified: null,
    restrictBackground: false,
    verificationNote: '自定义打印尺寸；请按受理机构要求填写，头高/眼高仅为构图参考。',
  };
}

/** Keep submission pixels independent from rounded millimetre conversions. */
export function outputSize(spec: PhotoSpec): { width: number; height: number } {
  if (spec.pixelSize) {
    const { width, height } = spec.pixelSize;
    if (![width, height].every((v) => Number.isSafeInteger(v) && v > 0)) {
      throw new Error('电子照片像素尺寸必须为正整数');
    }
    return { width, height };
  }
  return { width: mmToPx(spec.widthMm, spec.dpi), height: mmToPx(spec.heightMm, spec.dpi) };
}
