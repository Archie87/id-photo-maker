'use client';
import { sheets } from '@id-photo/print-engine';
import type { PrintSheetPreview } from '../editor/use-print-sheet';
import type { PhotoEditor } from '../editor/use-photo-editor';
import { CanvasPreview } from './CanvasPreview';
import { Modal } from './Modal';
export function PrintPreview({
  e,
  preview,
  onClose,
}: {
  e: PhotoEditor;
  preview: PrintSheetPreview;
  onClose: () => void;
}) {
  return (
    <Modal title="打印排版预览" onClose={onClose}>
      <p className="dialog-help">
        {sheets[e.sheet].name} · {sheets[e.sheet].widthMm} × {sheets[e.sheet].heightMm} mm ·{' '}
        {preview.count} 张 · 单张 {e.spec.widthMm} × {e.spec.heightMm} mm
      </p>
      <div className="print-toggles">
        <label>
          <input
            type="checkbox"
            checked={e.cropMarks}
            onChange={(v) => e.setCropMarks(v.target.checked)}
          />
          裁切标记
        </label>
        <label>
          <input
            type="checkbox"
            checked={e.calibration}
            onChange={(v) => e.setCalibration(v.target.checked)}
          />
          50 mm 校准标尺
        </label>
      </div>
      {preview.error ? (
        <p role="alert" className="error">
          {preview.error}
        </p>
      ) : (
        <div className="sheet-preview">
          <CanvasPreview canvas={preview.canvas} label="打印纸张预览" />
        </div>
      )}
      <p className="dialog-help">
        预览、JPG 和 PDF 共用同一排版。开启标尺会预留空间，可能减少照片数量。打印选「实际大小 /
        100%」，关闭适应页面与无边距放大；用尺子测量横、纵标尺，两条均应为 50
        mm。屏幕显示不代表实际大小。
      </p>
      <div className="dialog-actions">
        <button
          className="secondary"
          disabled={!!preview.error || e.busy}
          onClick={() => void e.exportFile('sheet')}
        >
          下载排版 JPG
        </button>
        <button
          className="primary"
          disabled={!!preview.error || e.busy}
          onClick={() => void e.exportFile('pdf')}
        >
          下载排版 PDF
        </button>
      </div>
    </Modal>
  );
}
