/**
 * 同源静态资产地址。Worker 脚本位于 `<basePath>/worker/portrait.js`，模型与 WASM 相对它解析，
 * 因此部署在子路径（如 GitHub Pages 的 /id-photo-maker）时无需额外配置。
 */
export function workerAsset(path: string): string {
  return new URL(`../${path}`, self.location.href).href;
}
/** 主线程按站点 basePath（'' 或以 / 开头）拼接资产地址。 */
export function siteAsset(path: string, basePath = ''): string {
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
