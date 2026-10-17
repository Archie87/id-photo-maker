'use client';
import { useMemo } from 'react';
import { createPrintPlan, renderSheet, sheets } from '@id-photo/print-engine';
import type { PhotoEditor } from './use-photo-editor';
export function usePrintSheet(e: PhotoEditor) {
  return useMemo(() => {
    if (!e.output || e.spec.pixelSize) return { canvas: null, count: 0, error: '' };
    try {
      if (e.background === 'transparent') throw new Error('打印需要实色背景，请先选择背景颜色');
      const options = { cropMarks: e.cropMarks, calibration: e.calibration };
      return {
        canvas: renderSheet(
          e.output,
          e.spec.widthMm,
          e.spec.heightMm,
          sheets[e.sheet],
          100,
          options,
        ),
        count: createPrintPlan(sheets[e.sheet], e.spec.widthMm, e.spec.heightMm, options).cells
          .length,
        error: '',
      };
    } catch (error) {
      return { canvas: null, count: 0, error: (error as Error).message };
    }
  }, [e.output, e.spec, e.sheet, e.cropMarks, e.calibration, e.background]);
}
export type PrintSheetPreview = ReturnType<typeof usePrintSheet>;
