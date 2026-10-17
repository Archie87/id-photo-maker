'use client';
import { useState } from 'react';
import { usePhotoEditor } from '../editor/use-photo-editor';
import { usePrintSheet } from '../editor/use-print-sheet';
import { EditorControls } from './EditorControls';
import { ExportPanel } from './ExportPanel';
import { LandmarkEditor } from './LandmarkEditor';
import { PrintPreview } from './PrintPreview';
import { Stepper } from './Stepper';
import { Studio } from './Studio';
export function Workspace() {
  const e = usePhotoEditor(),
    [editingPoints, setEditingPoints] = useState(false),
    [printPreview, setPrintPreview] = useState(false);
  const sheetPreview = usePrintSheet(e);
  return (
    <>
      <header className="header">
        <span className="brand">
          <span className="brand-icon" aria-hidden="true">
            ▣
          </span>
          ID Photo Maker
          <span className="beta">LOCAL STUDIO</span>
        </span>
        <span className="privacy">
          <i />
          照片仅在你的设备处理
        </span>
      </header>
      <main>
        <div className="intro">
          <div>
            <h1>让证件照，刚刚好。</h1>
            <p>选择照片，调整构图，下载标准尺寸的证件照与打印排版。</p>
          </div>
          <Stepper e={e} />
        </div>
        <div className="workspace">
          <Studio e={e} onEditPoints={() => setEditingPoints(true)} />
          <EditorControls e={e} />
          <ExportPanel
            e={e}
            sheetPreview={sheetPreview}
            onExpandPrint={() => setPrintPreview(true)}
          />
        </div>
        {editingPoints && e.source && (
          <LandmarkEditor
            source={e.source}
            points={e.points}
            onApply={e.applyLandmarks}
            onClose={() => setEditingPoints(false)}
          />
        )}
        {printPreview && e.output && !e.spec.pixelSize && (
          <PrintPreview e={e} preview={sheetPreview} onClose={() => setPrintPreview(false)} />
        )}
        <footer>
          <span>照片不会上传 · 无账户 · 无追踪</span>
          <span>* HEIC 支持取决于浏览器，无法读取时请先转换为 JPG。</span>
        </footer>
      </main>
    </>
  );
}
