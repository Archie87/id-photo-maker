import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
test('authorized local portrait compares light-fringe cleanup without altering alpha', async ({
  page,
}) => {
  const path = process.env.IDPM_PRIVATE_FIXTURE;
  test.skip(!path, 'Optional local portrait; never commit private fixtures or artifacts');
  const badRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' || new URL(r.url()).hostname !== '127.0.0.1')
      badRequests.push(r.url());
  });
  await page.goto('/');
  await page.getByText('高级抠图选项', { exact: true }).click();
  await page.getByLabel('选择照片文件').setInputFiles(path!);
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText(
    '本地 AI 处理完成（Hivision 精细抠图）',
    { timeout: 90000 },
  );
  await page.getByLabel('构图辅助线').uncheck();
  const portrait = page.getByRole('img', { name: '证件照预览' }),
    strength = page.getByRole('slider', { name: '去白边强度' });
  await expect(page.getByLabel('净化抠图边缘')).not.toBeChecked();
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  const defaultDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  await (await defaultDownload).saveAs('test-results/private-hivision-default-blue.jpg');
  const hair = page.getByLabel('清理耳下散发（实验）');
  const snap = () => portrait.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const original = await snap();
  await expect(hair).not.toBeChecked();
  await hair.check();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('耳下散发清理已开启', {
    timeout: 90000,
  });
  const trimmed = await snap();
  expect(trimmed).not.toEqual(original);
  writeFileSync(
    'test-results/private-hair-before.png',
    Buffer.from(original.split(',')[1], 'base64'),
  );
  writeFileSync(
    'test-results/private-hair-after.png',
    Buffer.from(trimmed.split(',')[1], 'base64'),
  );
  const safety = await page.evaluate(
    async ({ original, trimmed }) => {
      const read = async (url: string) => {
        const b = await createImageBitmap(await (await fetch(url)).blob());
        const c = document.createElement('canvas');
        c.width = b.width;
        c.height = b.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(b, 0, 0);
        b.close();
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const a = await read(original),
        b = await read(trimmed);
      let interior = 0,
        changed = 0,
        neckDark = 0;
      for (let y = 0; y < 413; y++)
        for (let x = 0; x < 295; x++)
          for (let k = 0; k < 3; k++) {
            const diff = Math.abs(a[(y * 295 + x) * 4 + k] - b[(y * 295 + x) * 4 + k]);
            if (diff > 2) changed++;
            if (
              y < 170 ||
              (x >= 90 && x < 205 && ((y >= 170 && y < 260) || (y >= 320 && y < 390))) ||
              (x >= 239 && x < 248 && y >= 190 && y < 215) ||
              (x >= 44 && x < 52 && y >= 190 && y < 216) ||
              (x >= 128 && x < 174 && y >= 306 && y < 329) ||
              (x >= 87 && x < 91 && y >= 296 && y < 311) ||
              (x >= 93 && x < 98 && y >= 311 && y < 321)
            )
              interior = Math.max(interior, diff);
            if (
              k === 0 &&
              ((x >= 206 && x < 230 && y >= 240 && y < 283) ||
                (x >= 63 && x < 89 && y >= 239 && y < 285))
            ) {
              const i = (y * 295 + x) * 4;
              if (Math.max(b[i], b[i + 1], b[i + 2]) < 110) neckDark++;
            }
          }
      return { interior, changed, neckDark };
    },
    { original, trimmed },
  );
  expect(safety.interior).toBeLessThanOrEqual(1);
  expect(safety.changed).toBeGreaterThan(30);
  // Known fixture regression regions, not a general portrait quality score.
  if (path!.endsWith('/8880.JPG')) expect(safety.neckDark).toBeLessThan(15);
  const hairDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  await (await hairDownload).saveAs('test-results/private-hair-cleanup.jpg');
  await page.getByRole('button', { name: '二寸 35 × 53 mm', exact: true }).click();
  await page.getByRole('button', { name: '白色', exact: true }).click();
  const white = await snap();
  writeFileSync(
    'test-results/private-hair-two-inch-white.png',
    Buffer.from(white.split(',')[1], 'base64'),
  );
  const whiteDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  await (await whiteDownload).saveAs('test-results/private-hair-two-inch-white.jpg');
  await page.getByRole('button', { name: '一寸 25 × 35 mm', exact: true }).click();
  writeFileSync(
    'test-results/private-hair-one-inch-white.png',
    Buffer.from((await snap()).split(',')[1], 'base64'),
  );
  const oneInchDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  await (await oneInchDownload).saveAs('test-results/private-hair-one-inch-white.jpg');
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  await hair.uncheck();
  expect(await snap()).toEqual(original);
  await hair.check();
  expect(await snap()).toEqual(trimmed);
  await hair.uncheck();
  await page.getByLabel('净化抠图边缘').check();
  const pixels = () =>
    portrait.evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data),
    );
  for (const [label, name] of [
    ['蓝色', 'blue'],
    ['红色', 'red'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    for (const [key, tag] of [
      ['Home', 'before'],
      ['End', 'after'],
    ]) {
      await strength.press(key);
      const png = await portrait.evaluate((c: HTMLCanvasElement) => c.toDataURL().split(',')[1]);
      writeFileSync(`test-results/private-halo-${name}-${tag}.png`, Buffer.from(png, 'base64'));
    }
  }
  await page.getByRole('button', { name: '透明', exact: true }).click();
  await strength.press('Home');
  const before = await pixels();
  await strength.press('End');
  const after = await pixels();
  let changed = 0,
    alphaChanged = 0,
    faceChanged = 0;
  for (let i = 0; i < before.length; i += 4) {
    if (after[i + 3] !== before[i + 3]) alphaChanged++;
    if (
      after[i] !== before[i] ||
      after[i + 1] !== before[i + 1] ||
      after[i + 2] !== before[i + 2]
    ) {
      changed++;
      const x = (i / 4) % 295,
        y = Math.floor(i / 4 / 295);
      if (x >= 90 && x < 205 && y >= 145 && y < 260) faceChanged++;
    }
  }
  expect(alphaChanged).toBe(0);
  expect(faceChanged).toBe(0);
  expect(changed).toBeGreaterThan(0);
  console.log('Local portrait: edge RGB changed pixels; alpha identical:', changed);
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 JPG', exact: true }).click();
  const download = await downloading;
  await download.saveAs('test-results/private-halo-blue.jpg');
  const bytes = readFileSync((await download.path())!);
  const dimensions = await page.evaluate(async (base64) => {
    const b = await createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' }),
    );
    const size = [b.width, b.height];
    b.close();
    return size;
  }, bytes.toString('base64'));
  expect(dimensions).toEqual([295, 413]);
  expect(bytes[bytes.indexOf('JFIF') + 7]).toBe(1);
  expect(bytes.readUInt16BE(bytes.indexOf('JFIF') + 8)).toBe(300);
  expect(bytes.readUInt16BE(bytes.indexOf('JFIF') + 10)).toBe(300);
  expect(badRequests).toEqual([]);
});
