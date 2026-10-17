import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('searches the complete catalogue and exports exact upstream pixel dimensions locally', async ({
  page,
}) => {
  const remote: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' || new URL(r.url()).hostname !== '127.0.0.1') remote.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('.spec-grid button')).toHaveCount(19);
  const search = page.getByLabel('搜索照片规格');
  await search.fill('签证');
  await expect(page.locator('.spec-grid button')).toHaveCount(3);
  await search.fill('不存在的规格');
  await expect(page.getByText('没有匹配的规格，可更换关键词或自定义尺寸。')).toBeVisible();
  await expect(page.locator('.spec-grid button')).toHaveCount(0);
  const input = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#bba080';
    ctx.fillRect(0, 0, 600, 800);
    return c.toDataURL().split(',')[1];
  });
  await page.getByLabel('选择照片文件').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(input, 'base64'),
  });
  for (const [name, w, h] of [
    ['英语四六级考试', 144, 192],
    ['社保卡', 358, 441],
    ['美国签证', 600, 600],
    ['五寸', 1050, 1499],
  ] as const) {
    await search.fill(name);
    const button = page.locator('.spec-grid button');
    await expect(button).toHaveCount(1);
    await button.focus();
    await page.keyboard.press('Enter');
    const preview = page.getByRole('img', { name: '证件照预览', exact: true });
    await expect(preview).toHaveAttribute('width', String(w));
    await expect(preview).toHaveAttribute('height', String(h));
    await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: '蓝色', exact: true })).toBeEnabled();
    await expect(page.getByLabel('自定义背景色')).toBeEnabled();
    await expect(page.getByRole('button', { name: '排版 PDF ↗' })).toBeDisabled();
    await expect(page.getByRole('link', { name: /规格来源/ })).toHaveAttribute(
      'href',
      /HivisionIDPhotos/,
    );
    const waiting = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载 PNG', exact: true }).click();
    const download = await waiting;
    const bytes = readFileSync((await download.path())!);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([w, h]);
    expect(bytes.readUInt32BE(bytes.indexOf('pHYs') + 4)).toBe(11811);
    await download.saveAs(`test-results/catalog-${w}x${h}.png`);
  }
  await search.fill('358x441');
  await expect(page.locator('.spec-grid button')).toHaveCount(2);
  await page.getByRole('button', { name: '居民身份证电子照 358 × 441 px', exact: true }).click();
  await expect(page.getByRole('button', { name: '蓝色', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeDisabled();
  await search.fill('大二寸');
  await page.getByRole('button', { name: '大二寸 35 × 53 mm', exact: true }).click();
  await expect(page.getByRole('region', { name: '实体照片排版预览' })).toContainText('4 张');
  await expect(page.getByRole('button', { name: '排版 PDF ↗' })).toBeEnabled();
  await search.fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await search.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/catalog-mobile.png' });
  expect(remote).toEqual([]);
});
