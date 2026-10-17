import type { Landmarks } from './types';
import { fitPortrait } from './geometry';
export function initialLandmarks(width: number, height: number): Landmarks {
  return {
    crown: { x: width * 0.5, y: height * 0.15 },
    chin: { x: width * 0.5, y: height * 0.6 },
    leftEye: { x: width * 0.4, y: height * 0.35 },
    rightEye: { x: width * 0.6, y: height * 0.35 },
    estimatedCrown: true,
  };
}
/** Manual points use image-left/image-right, not the subject's anatomical sides. */
export function landmarkError(points: Landmarks, width: number, height: number): string | null {
  const { crown, chin, leftEye, rightEye } = points;
  if (
    ![crown, chin, leftEye, rightEye].every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.y >= 0 &&
        p.x < width &&
        p.y < height,
    )
  )
    return '关键点必须位于照片范围内';
  if (rightEye.x - leftEye.x < Math.max(2, width * 0.01))
    return '图左眼应位于图右眼左侧，且两眼不能重合';
  const eyeY = (leftEye.y + rightEye.y) / 2;
  if (crown.y >= eyeY || chin.y <= eyeY || chin.y - crown.y < 4)
    return '请按头顶、眼睛、下巴的从上到下顺序标注';
  try {
    fitPortrait(points, 100, 100);
  } catch {
    return '关键点无法形成有效构图，请检查眼睛与头部方向';
  }
  return null;
}
