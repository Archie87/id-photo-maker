import type { Landmarks, ImageRegion } from '@id-photo/spec-engine';
export interface PortraitResult {
  points: Landmarks;
  alpha: Float32Array;
  maskWidth: number;
  maskHeight: number;
  faceCount: number;
  maskRegion?: ImageRegion;
  alphaInterpolation?: 'linear' | 'area';
  /** Locally refined, unpremultiplied RGBA for maskRegion, separate from the original. */
  foreground?: Uint8ClampedArray;
}
export interface AIProvider {
  readonly id: string;
  analyze(image: ImageData, options?: AnalyzeOptions): Promise<PortraitResult>;
  dispose(): void;
}
export interface AnalyzeOptions {
  cropToHeadShoulders?: boolean;
  matting?: 'hivision' | 'selfie' | 'hair-cleanup';
}
export type WorkerRequest = { id: number; image: ImageData; options?: AnalyzeOptions };
export type WorkerResponse = { id: number; result?: PortraitResult; error?: string };
