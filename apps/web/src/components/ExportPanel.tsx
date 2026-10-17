import type { PhotoEditor } from '../editor/use-photo-editor';
import type { PrintSheetPreview } from '../editor/use-print-sheet';
import { InlinePrintPreview } from './InlinePrintPreview';
const icons = { pass: '✓', warning: '!', fail: '✕' } as const;
export function ExportPanel({
  e,
  sheetPreview,
  onExpandPrint,
}: {
  e: PhotoEditor;
  sheetPreview: PrintSheetPreview;
  onExpandPrint: () => void;
}) {
  const formats = e.spec.file.format.join(' / ').toUpperCase();
  return (
    <aside className="export-column">
      <section className="panel checks">
        <div className="panel-heading">
          <h2>输出检查</h2>
          <span className="tag">辅助检查</span>
        </div>
        <ul>
          {e.checks.map((c) => (
            <li key={c.id} className={c.status}>
              <span aria-hidden="true">{icons[c.status]}</span>
              {c.message}
            </li>
          ))}
        </ul>
        <p className="hint">不替代官方审核；请人工确认清晰度、发丝、姿态和睁眼状态。</p>
      </section>
      <section className="panel export">
        <div className="panel-heading">
          <h2>下载照片</h2>
          <span className="tag">{formats}</span>
        </div>
        <label className="kb">
          单张大小上限
          <input
            type="number"
            aria-label="单张大小上限 KB"
            min="1"
            placeholder="不限"
            value={e.maxKb}
            onChange={(v) => e.setMaxKb(v.target.value)}
          />
          KB
        </label>
        <div className="export-buttons">
          <button
            disabled={!e.output || e.busy}
            className="primary"
            onClick={() => void e.exportFile('jpg')}
          >
            下载 JPG
          </button>
          <button
            disabled={!e.output || e.busy || !e.spec.file.format.includes('png')}
            className="secondary"
            onClick={() => void e.exportFile('png')}
          >
            下载 PNG
          </button>
        </div>
        {e.spec.pixelSize && (
          <p className="hint">
            此预设按固定像素导出 {formats}；底色与 KB 请核对用途要求。需要排版请另选毫米规格。
          </p>
        )}
      </section>
      <section className="panel print">
        <div className="panel-heading">
          <h2>打印排版</h2>
          <select
            aria-label="打印纸张"
            disabled={!!e.spec.pixelSize}
            value={e.sheet}
            onChange={(v) => e.setSheet(v.target.value)}
          >
            <option value="six">6 寸相纸</option>
            <option value="a4">A4 纸</option>
          </select>
        </div>
        <InlinePrintPreview e={e} preview={sheetPreview} onExpand={onExpandPrint} />
        <div className="export-buttons">
          <button
            className="secondary"
            disabled={!sheetPreview.canvas || e.busy}
            onClick={() => void e.exportFile('pdf')}
          >
            排版 PDF ↗
          </button>
          <button
            className="secondary"
            disabled={!sheetPreview.canvas || e.busy}
            onClick={() => void e.exportFile('sheet')}
          >
            排版 JPG ↗
          </button>
        </div>
        {!e.spec.pixelSize && <p className="hint">打印时选择「实际大小 / 100%」，关闭适应页面。</p>}
      </section>
    </aside>
  );
}
