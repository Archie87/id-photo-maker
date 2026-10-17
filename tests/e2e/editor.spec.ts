import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
test('manual workflow exports files and never sends photo data over the network', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' || !new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      requests.push(r.method() + ' ' + r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '让证件照，刚刚好。' })).toBeVisible();
  await expect(page.getByRole('status', { name: '排版预览状态' })).toContainText('选择照片后');
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#66aabb';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#cc3344';
    ctx.fillRect(0, 0, 300, 400);
    ctx.fillStyle = '#ddb89a';
    ctx.fillRect(180, 120, 240, 350);
    return c.toDataURL().split(',')[1];
  });
  await page.getByLabel('选择照片文件').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('照片已导入');
  await expect(page.getByRole('img', { name: '证件照预览' })).toHaveAttribute('width', '295');
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveAttribute('width', '600');
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveAttribute(
    'height',
    '400',
  );
  await page.getByRole('button', { name: '二寸 35 × 53 mm', exact: true }).click();
  await expect(page.getByRole('img', { name: '证件照预览' })).toHaveAttribute('width', '413');
  await expect(page.getByRole('region', { name: '实体照片排版预览' })).toContainText('4 张');
  // Compare asymmetric source pixels against the clockwise placement in every cell.
  // The expected 2×2 layout is 108×72 mm, centered on 152.4×101.6 mm paper.
  const checkSheetPixels = async (jpeg: string | null) => {
    const errors = await page.evaluate(async (base64) => {
      const source = document.querySelector('canvas[aria-label="证件照预览"]') as HTMLCanvasElement;
      let sheet = document.querySelector(
        'canvas[aria-label="打印文件缩略预览"]',
      ) as HTMLCanvasElement;
      if (base64) {
        const bitmap = await createImageBitmap(
          new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' }),
        );
        sheet = document.createElement('canvas');
        sheet.width = bitmap.width;
        sheet.height = bitmap.height;
        sheet.getContext('2d')!.drawImage(bitmap, 0, 0);
        bitmap.close();
      }
      const scale = sheet.width / 152.4;
      const diffs: number[] = [];
      for (const x of [22.2, 77.2])
        for (const y of [14.8, 51.8])
          for (const u of [0.2, 0.4, 0.6, 0.8])
            for (const v of [0.2, 0.4, 0.6, 0.8]) {
              const a = source
                .getContext('2d')!
                .getImageData(
                  Math.floor(u * source.width),
                  Math.floor(v * source.height),
                  1,
                  1,
                ).data;
              const b = sheet
                .getContext('2d')!
                .getImageData(
                  Math.floor((x + 53 * (1 - v)) * scale),
                  Math.floor((y + 35 * u) * scale),
                  1,
                  1,
                ).data;
              for (let channel = 0; channel < 3; channel++)
                diffs.push(Math.abs(a[channel] - b[channel]));
            }
      return { maxError: Math.max(...diffs), size: [sheet.width, sheet.height] };
    }, jpeg);
    expect(errors.maxError).toBeLessThanOrEqual(jpeg ? 12 : 3);
    expect(errors.size).toEqual(jpeg ? [1800, 1200] : [600, 400]);
  };
  await checkSheetPixels(null);
  await page
    .getByRole('region', { name: '实体照片排版预览' })
    .screenshot({ path: 'test-results/two-inch-four-preview.png' });
  for (const label of ['下载 JPG', '下载 PNG', '排版 PDF ↗', '排版 JPG ↗']) {
    const wait = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    const dl = await wait;
    expect(await dl.failure()).toBeNull();
    const file = await dl.path();
    expect(file).toBeTruthy();
    const bytes = readFileSync(file!);
    expect(bytes.byteLength).toBeGreaterThan(100);
    if (label === '下载 PNG') {
      expect(bytes.readUInt32BE(16)).toBe(413);
      expect(bytes.readUInt32BE(20)).toBe(626);
      expect(bytes.readUInt32BE(bytes.indexOf('pHYs') + 4)).toBe(11811);
    }
    if (label === '下载 JPG') {
      const jfif = bytes.indexOf('JFIF');
      expect(jfif).toBeGreaterThan(0);
      expect(bytes[jfif + 7]).toBe(1);
      expect(bytes.readUInt16BE(jfif + 8)).toBe(300);
    }
    if (label === '排版 PDF ↗') {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(432);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo(288);
      await dl.saveAs('test-results/two-inch-four.pdf');
    }
    if (label === '排版 JPG ↗') {
      const jfif = bytes.indexOf('JFIF');
      expect(bytes[jfif + 7]).toBe(1);
      expect(bytes.readUInt16BE(jfif + 8)).toBe(300);
      expect(bytes.readUInt16BE(jfif + 10)).toBe(300);
      await checkSheetPixels(bytes.toString('base64'));
      await dl.saveAs('test-results/two-inch-four.jpg');
    }
  }
  await page.getByLabel('单张大小上限 KB').fill('10');
  const compressed = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  const compressedFile = await (await compressed).path();
  expect(readFileSync(compressedFile!).byteLength).toBeLessThanOrEqual(10 * 1024);
  await page.getByLabel('单张大小上限 KB').fill('');
  await page.getByRole('button', { name: '小二寸 35 × 45 mm', exact: true }).click();
  await expect(page.getByRole('img', { name: '证件照预览', exact: true })).toHaveAttribute(
    'height',
    '531',
  );
  await expect(page.getByRole('link', { name: /规格来源/ })).toHaveAttribute(
    'href',
    /HivisionIDPhotos.*size_list_CN\.csv$/,
  );
  await expect(page.getByRole('button', { name: '蓝色', exact: true })).toHaveCSS(
    'background-color',
    'rgb(98, 139, 206)',
  );
  await expect(page.getByRole('button', { name: '红色', exact: true })).toHaveCSS(
    'background-color',
    'rgb(215, 69, 50)',
  );
  const smallDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PNG', exact: true }).click();
  const smallPhoto = await smallDownload;
  const smallBytes = readFileSync((await smallPhoto.path())!);
  expect(smallBytes.readUInt32BE(16)).toBe(413);
  expect(smallBytes.readUInt32BE(20)).toBe(531);
  expect(smallBytes.readUInt32BE(smallBytes.indexOf('pHYs') + 4)).toBe(11811);
  await smallPhoto.saveAs('test-results/small-two-inch-hivision.png');
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: '清除照片' }).click();
  await expect(page.getByRole('button', { name: '下载 JPG', exact: true })).toBeDisabled();
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('local AI detects and segments the optional public portrait fixture', async ({ page }) => {
  test.skip(
    !existsSync('tests/fixtures/portrait.jpg'),
    'Run pnpm fixture:download for the public MediaPipe test photo.',
  );
  const badRequests: string[] = [];
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage;
    let count = 0;
    Object.defineProperty(window, 'idpmAiRequests', { get: () => count });
    Worker.prototype.postMessage = function (message, transfer) {
      if (message?.image) count++;
      send.call(this, message, transfer);
    };
  });
  page.on('request', (r) => {
    if (r.method() !== 'GET' || new URL(r.url()).hostname !== '127.0.0.1')
      badRequests.push(r.url());
  });
  await page.goto('/');
  await page.getByText('高级抠图选项', { exact: true }).click();
  await page.getByLabel('选择照片文件').setInputFiles('tests/fixtures/portrait.jpg');
  await expect(page.getByLabel('抠图模式')).toHaveValue('hivision');
  await page.getByLabel('头肩优先分割').check();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('照片已导入');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('本地 AI 处理完成', {
    timeout: 90000,
  });
  await expect(page.getByLabel('使用 AI 去背景结果')).toBeEnabled();
  const cleanup = page.getByLabel('净化抠图边缘');
  await expect(cleanup).toBeEnabled();
  await expect(cleanup).not.toBeChecked();
  await cleanup.check();
  const portrait = page.getByRole('img', { name: '证件照预览' });
  const snapshot = () => portrait.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.getByLabel('构图辅助线').uncheck();
  const defringe = page.getByRole('slider', { name: '去白边强度' });
  await expect(defringe).toHaveValue('100');
  const cleaned = await snapshot();
  await defringe.press('Home');
  expect(await snapshot()).not.toEqual(cleaned);
  await defringe.press('End');
  expect(await snapshot()).toEqual(cleaned);
  for (const [color, filename] of [
    ['蓝色', 'blue'],
    ['红色', 'red'],
  ]) {
    await page.getByRole('button', { name: color, exact: true }).click();
    const refined = await snapshot();
    await portrait.screenshot({ path: `test-results/edges-${filename}-after.png` });
    await cleanup.uncheck();
    await expect(defringe).toBeDisabled();
    expect(await snapshot()).not.toEqual(refined);
    await portrait.screenshot({ path: `test-results/edges-${filename}-before.png` });
    await cleanup.check();
    expect(await snapshot()).toEqual(refined);
  }
  expect(await page.evaluate(() => Reflect.get(window, 'idpmAiRequests'))).toBe(1);
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  await page.screenshot({ path: 'test-results/desktop-ai.png', fullPage: true });
  await page.getByRole('button', { name: '透明', exact: true }).click();
  const alpha = await page
    .getByRole('img', { name: '证件照预览' })
    .evaluate((canvas: HTMLCanvasElement) => {
      const c = canvas.getContext('2d')!;
      return [
        c.getImageData(0, 0, 1, 1).data[3],
        c.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3],
      ];
    });
  expect(alpha[0]).toBeLessThan(50);
  expect(alpha[1]).toBeGreaterThan(200);
  const transparent = await snapshot();
  // Annotated background patch just above this public fixture's crown, where
  // Selfie Segmenter previously retained a pale blob. Not a universal quality score.
  const crownResidue = () =>
    portrait.evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas.getContext('2d')!.getImageData(96, 46, 40, 13).data;
      let total = 0;
      for (let i = 3; i < data.length; i += 4) total += data[i];
      return total / (data.length / 4);
    });
  const preciseResidue = await crownResidue();
  await page.getByRole('button', { name: '红色', exact: true }).click();
  await page.getByRole('button', { name: '透明', exact: true }).click();
  expect(await snapshot()).toEqual(transparent);
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PNG', exact: true }).click();
  const pngBytes = readFileSync((await (await pngDownload).path())!);
  expect(pngBytes.readUInt32BE(16)).toBe(295);
  expect(pngBytes.readUInt32BE(20)).toBe(413);
  expect(pngBytes.readUInt32BE(pngBytes.indexOf('pHYs') + 4)).toBe(11811);
  expect(await page.evaluate(() => Reflect.get(window, 'idpmAiRequests'))).toBe(1);
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '透明背景请导出 PNG' })).toContainText(
    '透明背景请导出 PNG',
  );

  await page.getByLabel('头肩优先分割').uncheck();
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('本地 AI 处理完成', {
    timeout: 90000,
  });
  expect(badRequests).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, 'idpmAiRequests'))).toBe(2);
  await page.getByLabel('头肩优先分割').check();
  await page.getByLabel('抠图模式').selectOption('selfie');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText(
    '本地 AI 处理完成（快速分割）',
  );
  const fastResidue = await crownResidue();
  expect(fastResidue).toBeGreaterThan(10);
  expect(preciseResidue).toBeLessThan(fastResidue * 0.3);
  console.log('Crown background patch mean alpha:', { precise: preciseResidue, fast: fastResidue });
  for (const [color, name] of [
    ['蓝色', 'blue'],
    ['红色', 'red'],
  ]) {
    await page.getByRole('button', { name: color, exact: true }).click();
    await portrait.screenshot({ path: `test-results/edges-fast-${name}.png` });
  }
  expect(await page.evaluate(() => Reflect.get(window, 'idpmAiRequests'))).toBe(3);
  expect(badRequests).toEqual([]);
  await page.getByRole('button', { name: '清除照片' }).click();
  await expect(cleanup).toBeDisabled();
});

test('matting failure stays local and clearing cancels a pending model load', async ({ page }) => {
  test.skip(!existsSync('tests/fixtures/portrait.jpg'), 'Public portrait fixture is required');
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.route('**/hivision_modnet.onnx', (route) =>
    route.fulfill({ status: 404, body: 'missing' }),
  );
  await page.goto('/');
  await page.getByLabel('选择照片文件').setInputFiles('tests/fixtures/portrait.jpg');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('alert').filter({ hasText: '精细抠图失败' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByLabel('净化抠图边缘')).toBeDisabled();
  expect(
    requests.some((url) => url.includes('selfie_segmenter') || url.includes('modnet_photographic')),
  ).toBe(false);
  expect(requests.every((url) => new URL(url).hostname === '127.0.0.1')).toBe(true);
  await page.unroute('**/hivision_modnet.onnx');
  await page.route('**/hivision_modnet.onnx', (route) =>
    route.fulfill({ status: 200, body: 'corrupted model' }),
  );
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('alert').filter({ hasText: '模型校验失败' })).toBeVisible();
  await page.unroute('**/hivision_modnet.onnx');
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/hivision_modnet.onnx', async (route) => {
    await blocked;
    await route.abort().catch(() => {});
  });
  const loading = page.waitForRequest('**/hivision_modnet.onnx');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await loading;
  await page.getByRole('button', { name: '清除照片' }).click();
  release();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText(
    '照片已从当前工作区清除',
  );
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeDisabled();
  await expect(page.getByLabel('净化抠图边缘')).toBeDisabled();
  await expect(page.locator('.error[role="alert"]')).toHaveCount(0);
});

test('resident ID electronic preset exports exact 358×441 JPEG at 350 DPI', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#776655';
    ctx.fillRect(180, 180, 220, 350);
    return c.toDataURL().split(',')[1];
  });
  await page.getByLabel('选择照片文件').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('照片已导入');
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  await page.getByRole('button', { name: '居民身份证电子照', exact: false }).click();
  const preview = page.getByRole('img', { name: '证件照预览' });
  await expect(preview).toHaveAttribute('width', '358');
  await expect(preview).toHaveAttribute('height', '441');
  await expect(page.getByRole('button', { name: '白色', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '蓝色', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '排版 PDF ↗' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '排版 JPG ↗' })).toBeDisabled();
  await expect(page.getByRole('status', { name: '排版预览状态' })).toContainText('固定像素规格');
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /规格来源/ })).toHaveAttribute(
    'href',
    /^https:\/\/ncga.nc.gov.cn\//,
  );
  await page.getByLabel('单张大小上限 KB').fill('20');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toContain('358x441px.jpg');
  const bytes = readFileSync((await download.path())!);
  expect(bytes.byteLength).toBeLessThanOrEqual(20 * 1024);
  const jfif = bytes.indexOf('JFIF');
  expect(jfif).toBeGreaterThan(0);
  expect(bytes[jfif + 7]).toBe(1);
  expect(bytes.readUInt16BE(jfif + 8)).toBe(350);
  expect(bytes.readUInt16BE(jfif + 10)).toBe(350);
  const dimensions = await page.evaluate(async (base64) => {
    const raw = atob(base64),
      arr = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([arr], { type: 'image/jpeg' }));
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }, bytes.toString('base64'));
  expect(dimensions).toEqual({ width: 358, height: 441 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/electronic-mobile.png', fullPage: true });
  await page
    .getByRole('button', { name: '一寸', exact: false })
    .filter({ hasText: '25 × 35' })
    .click();
  await expect(preview).toHaveAttribute('width', '295');
  await expect(preview).toHaveAttribute('height', '413');
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '排版 PDF ↗' })).toBeEnabled();
});

test('manual landmarks support pointer/numeric correction and shared print preview exports', async ({
  page,
}) => {
  await page.goto('/');
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#cc9977';
    ctx.fillRect(180, 120, 240, 350);
    return c.toDataURL().split(',')[1];
  });
  await page.getByLabel('选择照片文件').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('照片已导入');
  await page.getByRole('button', { name: '校正关键点', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '校正关键点' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '应用标注' })).toBeInViewport();
  const bounds = await dialog.locator('.landmark-surface').boundingBox();
  await page.mouse.click(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.1);
  await expect(dialog.getByLabel('头顶 X')).toHaveValue('300');
  await expect(dialog.getByLabel('头顶 Y')).toHaveValue('80');
  await page.mouse.move(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.12);
  await page.mouse.up();
  await expect(dialog.getByLabel('头顶 Y')).toHaveValue('96');
  await page.screenshot({ path: 'test-results/landmarks.png', fullPage: true });
  await dialog.getByLabel('头顶 Y').fill('700');
  await expect(dialog.getByRole('button', { name: '应用标注' })).toBeDisabled();
  await dialog.getByLabel('头顶 Y').fill('80');
  await dialog.getByRole('button', { name: '应用标注' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('关键点已手动确认');
  await expect(page.getByText('头顶为估算位置，请对照发顶人工确认')).toHaveCount(0);
  await page.getByRole('button', { name: '校正关键点', exact: true }).click();
  await expect(dialog.getByLabel('头顶 Y')).toHaveValue('80');
  await dialog.getByLabel('头顶 Y').fill('60');
  await dialog.getByRole('button', { name: '取消修改' }).click();
  await page.getByRole('button', { name: '校正关键点', exact: true }).click();
  await expect(dialog.getByLabel('头顶 Y')).toHaveValue('80');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '打印排版预览', exact: true }).click();
  const print = page.getByRole('dialog', { name: '打印排版预览' });
  await expect(print.getByRole('button', { name: '下载排版 PDF', exact: true })).toBeInViewport();
  await print.getByLabel('50 mm 校准标尺').check();
  await print.getByLabel('裁切标记', { exact: true }).uncheck();
  await expect(print.getByRole('img', { name: '打印纸张预览' })).toHaveAttribute('width', '600');
  await expect(print.getByRole('img', { name: '打印纸张预览' })).toHaveAttribute('height', '400');
  await page.screenshot({ path: 'test-results/print-preview.png', fullPage: true });
  for (const [label, extension] of [
    ['下载排版 PDF', 'pdf'],
    ['下载排版 JPG', 'jpg'],
  ]) {
    const waiting = page.waitForEvent('download');
    await print.getByRole('button', { name: label, exact: true }).click();
    const download = await waiting;
    const bytes = readFileSync((await download.path())!);
    expect(download.suggestedFilename()).toContain(`six.${extension}`);
    if (extension === 'pdf') {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(432);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo(288);
    } else {
      const dimensions = await page.evaluate(async (b) => {
        const image = await createImageBitmap(
          new Blob([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], { type: 'image/jpeg' }),
        );
        const size = [image.width, image.height];
        image.close();
        return size;
      }, bytes.toString('base64'));
      expect(dimensions).toEqual([1800, 1200]);
      expect(bytes.readUInt16BE(bytes.indexOf('JFIF') + 8)).toBe(300);
    }
  }
  await print.getByRole('button', { name: '关闭对话框' }).click();
  await page.getByLabel('打印纸张').selectOption('a4');
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveAttribute('width', '827');
  await expect(page.getByRole('img', { name: '打印文件缩略预览' })).toHaveAttribute(
    'height',
    '1169',
  );
  await page.screenshot({ path: 'test-results/inline-print-preview.png', fullPage: true });
  await page.getByRole('button', { name: '打印排版预览', exact: true }).click();
  await expect(print.getByLabel('50 mm 校准标尺')).toBeChecked();
  await expect(print.getByRole('img', { name: '打印纸张预览' })).toHaveAttribute('width', '827');
  await expect(print.getByRole('img', { name: '打印纸张预览' })).toHaveAttribute('height', '1169');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/print-mobile.png', fullPage: true });
  expect(await print.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '清除照片' }).click();
  await expect(page.getByRole('button', { name: '校正关键点', exact: true })).toBeDisabled();
});
