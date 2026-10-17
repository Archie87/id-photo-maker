import { sheets } from '@id-photo/print-engine';
import type { PhotoEditor } from '../editor/use-photo-editor';
import type { PrintSheetPreview } from '../editor/use-print-sheet';
import { CanvasPreview } from './CanvasPreview';
export function InlinePrintPreview({
  e,
  preview,
  onExpand,
}: {
  e: PhotoEditor;
  preview: PrintSheetPreview;
  onExpand: () => void;
}) {
  return (
    <section className="inline-print-preview" aria-label="实体照片排版预览">
      {preview.canvas ? (
        <>
          <button
            className="print-thumbnail"
            aria-label="放大排版图"
            onClick={onExpand}
            disabled={e.busy}
          >
            <CanvasPreview canvas={preview.canvas} label="打印文件缩略预览" />
          </button>
          <div className="inline-print-heading">
            <p className="inline-print-summary">
              {sheets[e.sheet].name} · {preview.count} 张 · 单张 {e.spec.widthMm} ×{' '}
              {e.spec.heightMm} mm
            </p>
            <button
              className="text-button"
              aria-label="打印排版预览"
              disabled={e.busy}
              onClick={onExpand}
            >
              放大 / 标尺 ↗
            </button>
          </div>
        </>
      ) : (
        <p className="print-placeholder" role="status" aria-label="排版预览状态">
          {e.spec.pixelSize
            ? '当前为固定像素规格，未指定独立打印尺寸；选择毫米规格后可预览打印排版。'
            : preview.error || '选择照片后，这里会显示整张相纸的排版效果。'}
        </p>
      )}
    </section>
  );
}
