import { transformPoint } from './geometry';
import { outputSize } from './specs';
import type { Check, Landmarks, PhotoSpec, Transform } from './types';
export function validatePhoto(
  spec: PhotoSpec,
  w: number,
  h: number,
  points?: Landmarks,
  t?: Transform,
): Check[] {
  const expected = outputSize(spec);
  const checks: Check[] = [
    {
      id: 'size',
      status: w === expected.width && h === expected.height ? 'pass' : 'fail',
      message: `输出 ${w} × ${h} px · ${spec.dpi} DPI`,
    },
    {
      id: 'source',
      status: spec.status === 'verified' ? 'pass' : 'warning',
      message:
        spec.verificationNote ??
        (spec.status === 'verified' ? '已核验规格来源' : '通用尺寸预设，未核验具体办证机构要求'),
    },
  ];
  if (!points || !t)
    return [
      ...checks,
      { id: 'face', status: 'warning', message: '未检测人脸，请人工检查头顶、眼睛和下巴位置' },
    ];
  const crown = transformPoint(points.crown, t),
    chin = transformPoint(points.chin, t),
    l = transformPoint(points.leftEye, t),
    r = transformPoint(points.rightEye, t);
  const head = (chin.y - crown.y) / h,
    eyes = (l.y + r.y) / 2 / h,
    center = (l.x + r.x) / 2 / w;
  checks.push(
    {
      id: 'head',
      status: head >= spec.head.minRatio && head <= spec.head.maxRatio ? 'pass' : 'warning',
      message: `头部占高约 ${Math.round(head * 100)}%（构图参考）`,
    },
    {
      id: 'eyes',
      status: eyes >= spec.eyes.minY && eyes <= spec.eyes.maxY ? 'pass' : 'warning',
      message: `眼睛距顶部约 ${Math.round(eyes * 100)}%（构图参考）`,
    },
    {
      id: 'center',
      status: Math.abs(center - 0.5) < 0.06 ? 'pass' : 'warning',
      message: '人脸水平居中检查',
    },
    {
      id: 'bounds',
      status: crown.y >= 0 && chin.y <= h ? 'pass' : 'warning',
      message: '头顶与下巴边界检查',
    },
  );
  if (points.estimatedCrown)
    checks.push({ id: 'crown', status: 'warning', message: '头顶为估算位置，请对照发顶人工确认' });
  return checks;
}
