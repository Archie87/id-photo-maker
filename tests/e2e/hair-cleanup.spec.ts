import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
test('optional hair cleanup loads on demand, fails reversibly, cancels and reuses cached masks', async ({
  page,
}) => {
  test.skip(!existsSync('tests/fixtures/portrait.jpg'), 'Public fixture is required');
  const model = '**/selfie_multiclass_256x256.tflite';
  let requests = 0;
  const remote: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('selfie_multiclass')) requests++;
    if (r.method() !== 'GET' || new URL(r.url()).hostname !== '127.0.0.1') remote.push(r.url());
  });
  await page.goto('/');
  await page.getByText('高级抠图选项', { exact: true }).click();
  const toggle = page.getByLabel('清理耳下散发（实验）');
  await expect(toggle).toBeDisabled();
  await expect(toggle).not.toBeChecked();
  await page.getByLabel('选择照片文件').setInputFiles('tests/fixtures/portrait.jpg');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('本地 AI 处理完成', {
    timeout: 90000,
  });
  expect(requests).toBe(0);
  const portrait = page.getByRole('img', { name: '证件照预览', exact: true });
  const snapshot = () => portrait.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const original = await snapshot();
  await page.route(model, (r) => r.fulfill({ status: 404, body: 'missing' }));
  await toggle.check();
  await expect(page.locator('.error[role="alert"]')).toContainText('头发识别模型未安装');
  await expect(toggle).not.toBeChecked();
  expect(await snapshot()).toBe(original);
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeEnabled();
  await page.unroute(model);
  await page.route(model, (r) => r.fulfill({ status: 200, body: 'corrupt' }));
  await toggle.check();
  await expect(page.locator('.error[role="alert"]')).toContainText('头发识别模型校验失败');
  expect(await snapshot()).toBe(original);
  await page.unroute(model);
  let release!: () => void;
  const blocked = new Promise<void>((r) => (release = r));
  await page.route(model, async (r) => {
    await blocked;
    await r.abort().catch(() => {});
  });
  const loading = page.waitForRequest(model);
  await toggle.check();
  await loading;
  await toggle.uncheck();
  release();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('耳下散发清理已关闭');
  await expect(page.locator('.error[role="alert"]')).toHaveCount(0);
  expect(await snapshot()).toBe(original);
  await page.unroute(model);
  await toggle.check();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('耳下散发清理已开启', {
    timeout: 90000,
  });
  const count = requests,
    trimmed = await snapshot();
  await toggle.uncheck();
  expect(await snapshot()).toBe(original);
  await toggle.check();
  expect(await snapshot()).toBe(trimmed);
  expect(requests).toBe(count);
  await page.getByRole('button', { name: '红色', exact: true }).click();
  expect(requests).toBe(count);
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/hair-cleanup-mobile.png' });
  await page.getByLabel('使用 AI 去背景结果').uncheck();
  await expect(toggle).toBeDisabled();
  await page.getByRole('button', { name: '清除照片' }).click();
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeDisabled();
  // Clearing while the optional model is loading must reject the old result.
  await page.getByLabel('选择照片文件').setInputFiles('tests/fixtures/portrait.jpg');
  await page.getByRole('button', { name: '本地 AI 处理', exact: false }).click();
  await expect(page.getByRole('status', { name: '处理状态' })).toContainText('本地 AI 处理完成', {
    timeout: 90000,
  });
  let unblock!: () => void;
  const pending = new Promise<void>((r) => (unblock = r));
  await page.route(model, async (r) => {
    await pending;
    await r.abort().catch(() => {});
  });
  const clearing = page.waitForRequest(model);
  await toggle.check();
  await clearing;
  await page.getByRole('button', { name: '清除照片' }).click();
  unblock();
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeDisabled();
  await expect(page.locator('.error[role="alert"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下载 PNG', exact: true })).toBeDisabled();
  expect(remote).toEqual([]);
});
