'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LocalWebProvider,
  LocalMattingProvider,
  LocalHairCleanupProvider,
  type AIProvider,
} from '@id-photo/ai-engine';
import {
  photoSpecs,
  customSpec,
  outputSize,
  coverTransform,
  fitPortrait,
  adjustTransform,
  validatePhoto,
  landmarkError,
  type Landmarks,
} from '@id-photo/spec-engine';
import {
  normalizeImage,
  applyAlpha,
  renderPhoto,
  encodePhoto,
  downloadBlob,
} from '@id-photo/photo-engine';
import { createPrintPdf, renderSheet, sheets } from '@id-photo/print-engine';
const providerOptions = { basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '' };
export function usePhotoEditor() {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null),
    [portrait, setPortrait] = useState<HTMLCanvasElement | null>(null),
    [cleanPortrait, setCleanPortrait] = useState<HTMLCanvasElement | null>(null),
    [points, setPoints] = useState<Landmarks>();
  const [filename, setFilename] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('选择一张正面头肩照，开始制作。'),
    [error, setError] = useState('');
  const [specId, updateSpecId] = useState(photoSpecs[0].id),
    [customW, setCustomW] = useState(25),
    [customH, setCustomH] = useState(35);
  const [background, setBackground] = useState('#ffffff'),
    [removeBackground, setRemoveBackground] = useState(true),
    [cleanEdges, setCleanEdges] = useState(false),
    [defringe, setDefringe] = useState(100),
    [zoom, setZoom] = useState(1),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [rotation, setRotation] = useState(0),
    [brightness, setBrightness] = useState(100),
    [contrast, setContrast] = useState(100);
  const [maxKb, setMaxKb] = useState(''),
    [sheet, setSheet] = useState('six');
  const [cropMarks, setCropMarks] = useState(true),
    [calibration, setCalibration] = useState(false),
    [cropPortrait, setCropPortrait] = useState(false);
  const [mattingMode, setMattingMode] = useState<'hivision' | 'selfie'>('hivision');
  const [hairMask, setHairMask] = useState<HTMLCanvasElement | null>(null),
    [removeLooseHair, setRemoveLooseHair] = useState(false),
    [hairBusy, setHairBusy] = useState(false);
  const [analyzedWith, setAnalyzedWith] = useState<{
      mode: 'hivision' | 'selfie';
      crop: boolean;
    } | null>(null),
    [lastExport, setLastExport] = useState('');
  const hairProvider = useRef<AIProvider | null>(null),
    hairGeneration = useRef(0);
  const provider = useRef<AIProvider | null>(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      provider.current?.dispose();
      hairGeneration.current++;
      hairProvider.current?.dispose();
    },
    [],
  );
  const spec = useMemo(
    () =>
      specId === 'custom' ? customSpec(customW, customH) : photoSpecs.find((s) => s.id === specId)!,
    [specId, customW, customH],
  );
  const { width, height } = outputSize(spec);
  function setSpecId(id: string) {
    const selected = photoSpecs.find((s) => s.id === id);
    updateSpecId(id);
    setError('');
    if (selected?.restrictBackground) {
      setBackground(selected.background[0]);
      setBrightness(100);
      setContrast(100);
    }
  }
  function resetAdjustments() {
    setZoom(1);
    setX(0);
    setY(0);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  }
  function resetHairCleanup() {
    hairGeneration.current++;
    hairProvider.current?.dispose();
    setHairMask(null);
    setRemoveLooseHair(false);
    setHairBusy(false);
  }
  async function toggleLooseHair(enabled: boolean) {
    if (!enabled) {
      hairGeneration.current++;
      hairProvider.current?.dispose();
      setRemoveLooseHair(false);
      setHairBusy(false);
      setMessage('耳下散发清理已关闭，恢复原抠图结果。');
      return;
    }
    if (!source || !portrait || busy) return;
    setRemoveLooseHair(true);
    if (hairMask) {
      setMessage('耳下散发清理已开启。');
      return;
    }
    const token = ++hairGeneration.current,
      photoToken = generation.current;
    setHairBusy(true);
    setError('');
    setMessage('本地 AI 正在识别耳下散发…首次会加载头发识别模型。');
    try {
      hairProvider.current = new LocalHairCleanupProvider(providerOptions);
      const result = await hairProvider.current.analyze(
        source.getContext('2d')!.getImageData(0, 0, source.width, source.height),
      );
      if (token !== hairGeneration.current || photoToken !== generation.current) return;
      const mask = document.createElement('canvas');
      mask.width = result.maskWidth;
      mask.height = result.maskHeight;
      const ctx = mask.getContext('2d')!,
        pixels = ctx.createImageData(mask.width, mask.height);
      for (let i = 0; i < result.alpha.length; i++)
        pixels.data[i * 4 + 3] = Math.round(result.alpha[i] * 255);
      ctx.putImageData(pixels, 0, 0);
      setHairMask(mask);
      setMessage('耳下散发清理已开启，请检查耳朵、脖子和衣领；可关闭恢复。');
    } catch (e) {
      if (token === hairGeneration.current && photoToken === generation.current) {
        setRemoveLooseHair(false);
        setError(`耳下散发清理失败：${(e as Error).message}`);
        setMessage('已保留原抠图结果，可重试耳下散发清理。');
      }
    } finally {
      if (token === hairGeneration.current) {
        hairProvider.current?.dispose();
        hairProvider.current = null;
        setHairBusy(false);
      }
    }
  }
  async function importFile(file: File) {
    const token = ++generation.current;
    provider.current?.dispose();
    resetHairCleanup();
    setBusy(true);
    setError('');
    setMessage('正在本地读取图片…');
    try {
      const image = await normalizeImage(file);
      if (token !== generation.current) return;
      setSource(image);
      setPortrait(null);
      setCleanPortrait(null);
      setPoints(undefined);
      setAnalyzedWith(null);
      setLastExport('');
      setFilename(file.name);
      resetAdjustments();
      setMessage('照片已导入。点击「本地 AI 处理」自动构图和去背景，也可直接手动调整。');
    } catch (e) {
      if (token === generation.current) setError((e as Error).message);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  async function analyze() {
    if (!source || busy) return;
    const token = ++generation.current;
    setBusy(true);
    setError('');
    setMessage(
      mattingMode === 'hivision'
        ? '本地 AI 正在精细抠图，首次加载模型会稍慢…'
        : '本地 AI 正在快速分割…',
    );
    try {
      const desiredId = mattingMode === 'hivision' ? 'local-matting' : 'local-web';
      if (provider.current?.id !== desiredId) {
        provider.current?.dispose();
        provider.current =
          mattingMode === 'hivision'
            ? new LocalMattingProvider(providerOptions)
            : new LocalWebProvider('selfie', providerOptions);
      }
      const result = await provider.current.analyze(
        source.getContext('2d')!.getImageData(0, 0, source.width, source.height),
        { cropToHeadShoulders: cropPortrait },
      );
      if (token !== generation.current) return;
      setPortrait(
        applyAlpha(
          source,
          result.alpha,
          result.maskWidth,
          result.maskHeight,
          result.maskRegion,
          undefined,
          result.alphaInterpolation,
        ),
      );
      setCleanPortrait(
        result.foreground
          ? applyAlpha(
              source,
              result.alpha,
              result.maskWidth,
              result.maskHeight,
              result.maskRegion,
              result.foreground,
            )
          : null,
      );
      setPoints(result.points);
      setAnalyzedWith({ mode: mattingMode, crop: cropPortrait });
      resetAdjustments();
      setRemoveBackground(true);
      setMessage(
        `本地 AI 处理完成（${mattingMode === 'hivision' ? 'Hivision 精细抠图' : '快速分割'}）。请检查发丝、肩部和估算的头顶位置，必要时调整构图。`,
      );
    } catch (e) {
      if (token === generation.current) {
        setError((e as Error).message);
        setMessage('可继续使用手动裁切；去背景需要本地模型正常运行。');
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function applyLandmarks(next: Landmarks) {
    if (!source || busy) return;
    const problem = landmarkError(next, source.width, source.height);
    if (problem) {
      setError(problem);
      return;
    }
    setPoints(next);
    setZoom(1);
    setX(0);
    setY(0);
    setRotation(0);
    setError('');
    setMessage('关键点已手动确认，构图已更新；去背景结果保持不变。');
  }
  const transform = useMemo(() => {
    if (!source) return null;
    const base = points
      ? fitPortrait(points, width, height)
      : coverTransform(source.width, source.height, width, height);
    return adjustTransform(base, width, height, zoom, x, y, rotation);
  }, [source, points, width, height, zoom, x, y, rotation]);
  const output = useMemo(
    () =>
      source && transform
        ? renderPhoto(
            removeBackground && portrait
              ? cleanEdges && cleanPortrait
                ? cleanPortrait
                : portrait
              : source,
            {
              width,
              height,
              transform,
              background: background === 'transparent' ? null : background,
              brightness,
              contrast,
              defringe: removeBackground && portrait && cleanEdges ? defringe : 0,
              keepMask:
                removeBackground && portrait && removeLooseHair && hairMask
                  ? { image: hairMask, width: source.width, height: source.height }
                  : undefined,
            },
          )
        : null,
    [
      source,
      portrait,
      cleanPortrait,
      cleanEdges,
      defringe,
      transform,
      width,
      height,
      background,
      brightness,
      contrast,
      removeBackground,
      removeLooseHair,
      hairMask,
    ],
  );
  const checks = useMemo(
    () => validatePhoto(spec, width, height, points, transform ?? undefined),
    [spec, width, height, points, transform],
  );
  async function exportFile(kind: 'jpg' | 'png' | 'pdf' | 'sheet') {
    if (!output || busy) return;
    const token = generation.current;
    setBusy(true);
    setError('');
    try {
      if (background === 'transparent' && kind !== 'png')
        throw new Error('透明背景请导出 PNG，或先选择实色背景');
      if (background === 'transparent' && (!portrait || !removeBackground))
        throw new Error('透明人像需要先完成本地 AI 去背景');
      const limitKb = maxKb.trim() ? Number(maxKb) : undefined;
      if (limitKb !== undefined && !(limitKb > 0))
        throw new Error('单张大小上限需为大于 0 的数字，留空表示不限');
      if (spec.pixelSize && !spec.file.format.includes(kind))
        throw new Error('此固定像素预设不支持该导出格式；打印请切换到毫米规格。');
      const dimensions = spec.pixelSize
        ? `${width}x${height}px`
        : `${spec.widthMm}x${spec.heightMm}mm`;
      const stem = `id-photo-${spec.id}-${dimensions}`;
      if (kind === 'pdf') {
        const png = await encodePhoto(output, 'png');
        const pdf = await createPrintPdf(
          new Uint8Array(await png.arrayBuffer()),
          spec.widthMm,
          spec.heightMm,
          sheets[sheet],
          { cropMarks, calibration },
        );
        if (token !== generation.current) return;
        downloadBlob(
          new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }),
          `${stem}-${sheet}.pdf`,
        );
        setLastExport('pdf');
        setMessage(`已导出排版 PDF · ${sheets[sheet].name} · 打印时选择「实际大小 / 100%」`);
      } else if (kind === 'sheet') {
        const page = renderSheet(output, spec.widthMm, spec.heightMm, sheets[sheet], 300, {
          cropMarks,
          calibration,
        });
        const blob = await encodePhoto(page, 'jpg');
        if (token !== generation.current) return;
        downloadBlob(blob, `${stem}-${sheet}.jpg`);
        setLastExport('sheet');
        setMessage(`已导出排版 JPG · ${sheets[sheet].name} · 300 DPI`);
      } else {
        const blob = await encodePhoto(output, kind, spec.dpi, limitKb);
        if (token !== generation.current) return;
        downloadBlob(blob, `${stem}.${kind}`);
        setLastExport(kind);
        setMessage(
          `已导出 ${kind.toUpperCase()} · ${(blob.size / 1024).toFixed(1)} KB · ${width} × ${height} px`,
        );
      }
    } catch (e) {
      if (token === generation.current) setError((e as Error).message);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function clear() {
    generation.current++;
    provider.current?.dispose();
    resetHairCleanup();
    setSource(null);
    setPortrait(null);
    setCleanPortrait(null);
    setPoints(undefined);
    setAnalyzedWith(null);
    setLastExport('');
    setFilename('');
    setError('');
    setBusy(false);
    setMessage('照片已从当前工作区清除。');
    resetAdjustments();
  }
  const aiStale =
    !!portrait &&
    !!analyzedWith &&
    (analyzedWith.mode !== mattingMode || analyzedWith.crop !== cropPortrait);
  return {
    source,
    aiStale,
    lastExport,
    mattingMode,
    setMattingMode,
    removeLooseHair,
    toggleLooseHair,
    hairBusy,
    portrait,
    cleanPortrait,
    cleanEdges,
    setCleanEdges,
    defringe,
    setDefringe,
    points,
    applyLandmarks,
    cropPortrait,
    setCropPortrait,
    cropMarks,
    setCropMarks,
    calibration,
    setCalibration,
    filename,
    busy: busy || hairBusy,
    message,
    error,
    spec,
    specId,
    setSpecId,
    customW,
    setCustomW,
    customH,
    setCustomH,
    background,
    setBackground,
    removeBackground,
    setRemoveBackground,
    zoom,
    setZoom,
    x,
    setX,
    y,
    setY,
    rotation,
    setRotation,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    maxKb,
    setMaxKb,
    sheet,
    setSheet,
    width,
    height,
    output,
    checks,
    importFile,
    analyze,
    exportFile,
    resetAdjustments,
    clear,
  };
}
export type PhotoEditor = ReturnType<typeof usePhotoEditor>;
