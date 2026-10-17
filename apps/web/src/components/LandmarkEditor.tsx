'use client';
import { useState, useRef, type PointerEvent } from 'react';
import { initialLandmarks, landmarkError, type Landmarks, type Point } from '@id-photo/spec-engine';
import { CanvasPreview } from './CanvasPreview';
import { Modal } from './Modal';
type Key = 'crown' | 'chin' | 'leftEye' | 'rightEye';
const keys: Key[] = ['crown', 'leftEye', 'rightEye', 'chin'];
const names: Record<Key, string> = {
  crown: '头顶',
  chin: '下巴',
  leftEye: '图左眼',
  rightEye: '图右眼',
};
export function LandmarkEditor({
  source,
  points,
  onApply,
  onClose,
}: {
  source: HTMLCanvasElement;
  points?: Landmarks;
  onApply: (p: Landmarks) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Landmarks>(() =>
      structuredClone(points ?? initialLandmarks(source.width, source.height)),
    ),
    [selected, setSelected] = useState<Key>('crown');
  const dragging = useRef<Key | null>(null);
  const error = landmarkError(draft, source.width, source.height);
  function setPoint(key: Key, p: Point) {
    setDraft((d) => ({
      ...d,
      [key]: {
        x: Math.max(0, Math.min(source.width - 1, p.x)),
        y: Math.max(0, Math.min(source.height - 1, p.y)),
      },
    }));
  }
  function position(e: PointerEvent<HTMLDivElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * source.width,
      y: ((e.clientY - rect.top) / rect.height) * source.height,
    };
  }
  return (
    <Modal title="校正关键点" onClose={onClose}>
      <p className="dialog-help">
        选择一个关键点，再点击或拖动照片标注；也可用下面的数字输入微调。图左 /
        图右按你看到的照片方向区分。{!points && ' 初始标记只是参考位置，请逐一确认。'}
      </p>
      <div className="point-tabs">
        {keys.map((key) => (
          <button
            key={key}
            className={selected === key ? 'primary' : 'secondary'}
            aria-pressed={selected === key}
            onClick={() => setSelected(key)}
          >
            {names[key]}
          </button>
        ))}
      </div>
      <div className="landmark-stage">
        <div
          className="landmark-surface"
          style={{
            aspectRatio: `${source.width}/${source.height}`,
            width: `min(100%, ${(50 * source.width) / source.height}vh)`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            const p = position(e),
              rect = e.currentTarget.getBoundingClientRect();
            const near = keys.find(
              (k) =>
                Math.hypot(
                  ((draft[k].x - p.x) * rect.width) / source.width,
                  ((draft[k].y - p.y) * rect.height) / source.height,
                ) < 20,
            );
            const key = near ?? selected;
            dragging.current = key;
            setSelected(key);
            setPoint(key, p);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragging.current) setPoint(dragging.current, position(e));
          }}
          onPointerUp={() => (dragging.current = null)}
          onPointerCancel={() => (dragging.current = null)}
        >
          <CanvasPreview canvas={source} label="关键点标注原图" />
          <svg viewBox={`0 0 ${source.width} ${source.height}`} aria-hidden="true">
            {keys.map((key) => (
              <g key={key}>
                <circle
                  cx={draft[key].x}
                  cy={draft[key].y}
                  r={source.width * 0.015}
                  fill={selected === key ? '#ffe56b' : '#6754e5'}
                  stroke="white"
                  strokeWidth={source.width * 0.004}
                />
                <text
                  x={draft[key].x + source.width * 0.024}
                  y={draft[key].y}
                  fontSize={source.width * 0.034}
                  fill="white"
                  stroke="#222"
                  strokeWidth={source.width * 0.004}
                  paintOrder="stroke"
                >
                  {names[key]}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="point-coordinates">
        <strong>{names[selected]}</strong>
        {(['x', 'y'] as const).map((axis) => (
          <label key={axis}>
            {axis.toUpperCase()} 像素
            <input
              type="number"
              aria-label={`${names[selected]} ${axis.toUpperCase()}`}
              min="0"
              max={(axis === 'x' ? source.width : source.height) - 1}
              value={Math.round(draft[selected][axis])}
              onChange={(e) =>
                setPoint(selected, { ...draft[selected], [axis]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="dialog-help">
        保存只更新构图，不重新运行 AI 或改变已缓存的去背景结果。重新运行 AI 会用新检测结果替换标注。
      </p>
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          取消修改
        </button>
        <button
          className="primary"
          disabled={!!error}
          onClick={() => {
            onApply({ ...draft, estimatedCrown: false });
            onClose();
          }}
        >
          应用标注
        </button>
      </div>
    </Modal>
  );
}
