import { photoSpecs, outputSize } from '@id-photo/spec-engine';
import { useState } from 'react';
import type { PhotoEditor } from '../editor/use-photo-editor';
import { NumberField } from './NumberField';
import { Slider } from './Slider';
const swatches = [
  ['#ffffff', '白色'],
  ['#628bce', '蓝色'],
  ['#d74532', '红色'],
  ['#f2f0f0', '浅灰'],
  ['transparent', '透明'],
] as const;
export function EditorControls({ e }: { e: PhotoEditor }) {
  const [search, setSearch] = useState('');
  const query = search.trim().replace(/\s/g, '').toLowerCase().replace(/x/g, '×');
  const visibleSpecs = photoSpecs.filter((s) => {
    const pixels = outputSize(s);
    return `${s.name}${s.widthMm}×${s.heightMm}${pixels.width}×${pixels.height}`
      .toLowerCase()
      .includes(query);
  });
  const matted = !!e.portrait && e.removeBackground;
  return (
    <aside className="controls panel">
      <section>
        <div className="section-title">
          <span className="step">01</span>
          <h2>照片规格</h2>
          <span className="section-meta">
            {visibleSpecs.length}/{photoSpecs.length}
          </span>
        </div>
        <input
          className="search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索名称或尺寸，如签证、358×441"
          aria-label="搜索照片规格"
        />
        <div className="spec-grid" aria-label="照片规格列表">
          {visibleSpecs.map((s) => (
            <button
              className={e.specId === s.id ? 'spec active' : 'spec'}
              key={s.id}
              onClick={() => e.setSpecId(s.id)}
              aria-pressed={e.specId === s.id}
            >
              <strong>{s.name}</strong>
              <small>
                {s.pixelSize
                  ? `${s.pixelSize.width} × ${s.pixelSize.height} px`
                  : `${s.widthMm} × ${s.heightMm} mm`}
              </small>
            </button>
          ))}
        </div>
        {visibleSpecs.length === 0 && (
          <p className="hint" role="status">
            没有匹配的规格，可更换关键词或自定义尺寸。
          </p>
        )}
        <button
          className={e.specId === 'custom' ? 'custom-toggle active' : 'custom-toggle'}
          aria-pressed={e.specId === 'custom'}
          onClick={() => e.setSpecId('custom')}
        >
          ＋ 自定义尺寸
        </button>
        {e.specId === 'custom' && (
          <div className="dimensions">
            <NumberField
              label="宽度 mm"
              value={e.customW}
              min={10}
              max={100}
              onCommit={e.setCustomW}
            />
            <NumberField
              label="高度 mm"
              value={e.customH}
              min={10}
              max={100}
              onCommit={e.setCustomH}
            />
          </div>
        )}
        <div className="spec-note">
          <strong>当前：{e.spec.name}</strong>
          <p>{e.spec.verificationNote ?? '通用尺寸预设 · 具体要求请以办证机构为准'}</p>
          {e.spec.source && (
            <a className="text-button" href={e.spec.source} target="_blank" rel="noreferrer">
              规格来源 · {e.spec.lastVerified} 核对
            </a>
          )}
        </div>
      </section>
      <section>
        <div className="section-title">
          <span className="step">02</span>
          <h2>背景颜色</h2>
        </div>
        <div className="swatches">
          {swatches.map(([c, n]) => (
            <button
              key={c}
              title={n}
              aria-label={n}
              disabled={!!e.spec.restrictBackground && !e.spec.background.includes(c)}
              aria-pressed={e.background === c}
              onClick={() => e.setBackground(c)}
              className={`swatch ${e.background === c ? 'selected' : ''} ${c === 'transparent' ? 'checker' : ''}`}
              style={{ backgroundColor: c }}
            >
              {e.background === c ? '✓' : ''}
            </button>
          ))}
          <label className="custom-color" title="自定义背景色">
            <input
              type="color"
              aria-label="自定义背景色"
              disabled={!!e.spec.restrictBackground}
              value={e.background === 'transparent' ? '#ffffff' : e.background}
              onChange={(v) => e.setBackground(v.target.value)}
            />
            ＋
          </label>
        </div>
        <p className="hint">
          {e.portrait
            ? '切换背景即时生效，无需重新运行 AI。'
            : '先运行「本地 AI 处理」，才能替换原照片背景。'}
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={e.removeBackground}
            disabled={!e.portrait}
            onChange={(v) => e.setRemoveBackground(v.target.checked)}
          />
          使用 AI 去背景结果
        </label>
        <details className="advanced">
          <summary>高级抠图选项</summary>
          <label className="field">
            抠图模式
            <select
              aria-label="抠图模式"
              value={e.mattingMode}
              disabled={e.busy}
              onChange={(v) => e.setMattingMode(v.target.value as 'hivision' | 'selfie')}
            >
              <option value="hivision">Hivision 精细抠图（推荐）</option>
              <option value="selfie">快速分割</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={e.cropPortrait}
              disabled={e.busy}
              onChange={(v) => e.setCropPortrait(v.target.checked)}
            />
            头肩优先分割
          </label>
          <p className="hint">以上两项需重新运行 AI；宽发型或肩部被截断时，关闭头肩优先后重试。</p>
          <label className="check">
            <input
              type="checkbox"
              checked={e.cleanEdges}
              disabled={!e.cleanPortrait || !e.removeBackground || e.busy}
              onChange={(v) => e.setCleanEdges(v.target.checked)}
            />
            净化抠图边缘
          </label>
          <fieldset disabled={!matted || !e.cleanEdges || e.busy}>
            <Slider
              label="去白边强度"
              value={e.defringe}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={e.setDefringe}
            />
          </fieldset>
          <p className="hint">减轻原背景留下的白边；发丝或浅色衣服边缘变暗时降低强度或关闭。</p>
          <label className="check">
            <input
              type="checkbox"
              checked={e.removeLooseHair}
              disabled={!matted || (e.busy && !e.hairBusy)}
              onChange={(v) => void e.toggleLooseHair(v.target.checked)}
            />
            清理耳下散发（实验）
          </label>
          <p className="hint">
            清理耳下、脖子两侧露在背景上的头发，不补画被遮挡区域；首次开启需本地识别，可随时关闭恢复。
          </p>
        </details>
      </section>
      <section>
        <div className="section-title">
          <span className="step">03</span>
          <h2>构图与调整</h2>
          <button className="text-button" onClick={e.resetAdjustments} disabled={!e.source}>
            重置
          </button>
        </div>
        <fieldset disabled={!e.source || e.busy}>
          <Slider
            label="缩放"
            value={e.zoom}
            min={0.5}
            max={2}
            step={0.01}
            onChange={e.setZoom}
            suffix="×"
          />
          <Slider label="水平位置" value={e.x} min={-0.5} max={0.5} step={0.01} onChange={e.setX} />
          <Slider label="垂直位置" value={e.y} min={-0.5} max={0.5} step={0.01} onChange={e.setY} />
          <Slider
            label="旋转"
            value={e.rotation}
            min={-30}
            max={30}
            onChange={e.setRotation}
            suffix="°"
          />
          <Slider
            label="亮度"
            value={e.brightness}
            min={70}
            max={130}
            onChange={e.setBrightness}
            suffix="%"
          />
          <Slider
            label="对比度"
            value={e.contrast}
            min={70}
            max={130}
            onChange={e.setContrast}
            suffix="%"
          />
        </fieldset>
        {!e.source && <p className="hint">导入照片后可调整构图。</p>}
      </section>
    </aside>
  );
}
