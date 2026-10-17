export interface Point {
  x: number;
  y: number;
}
export interface Landmarks {
  crown: Point;
  chin: Point;
  leftEye: Point;
  rightEye: Point;
  estimatedCrown: boolean;
}
export interface PhotoSpec {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  /** Exact digital dimensions take precedence; mm remain reference values for these presets. */
  pixelSize?: { width: number; height: number };
  verificationNote?: string;
  head: { minRatio: number; maxRatio: number };
  eyes: { minY: number; maxY: number };
  background: string[];
  /** Only enforce a palette when a separately verified requirement demands it. */
  restrictBackground?: boolean;
  file: { format: string[]; minKb: number | null; maxKb: number | null };
  source: string | null;
  lastVerified: string | null;
  status: 'preset' | 'verified' | 'custom';
}
export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
export interface Check {
  id: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
