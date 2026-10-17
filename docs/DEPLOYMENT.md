# 部署

## 静态站点

`pnpm install --frozen-lockfile && pnpm models:download && pnpm build` 后，把 apps/web/out 整体放到静态 HTTP 服务，必须包含 models、wasm、worker。模型不通过公共 CDN 运行时下载。生产环境使用 HTTPS；本地开发使用 localhost/127.0.0.1。

此版本仅支持站点根路径 `/`；子路径部署需要同时调整 Next basePath 与模型/Worker 资产 URL。

需要保留 `/wasm/ort/` 的 `.mjs` 与 `.wasm`，并将 `.mjs` 以 JavaScript MIME（如 text/javascript）提供；不能被 SPA fallback 替换为 HTML。默认精细抠图包含约 26 MB Hivision MODNet 与约 14 MB ONNX WASM。官方 MODNet 旧权重已移除，构建清理旧生成模型目录。许可证随资产发布。ONNX 单线程 WASM 不要求跨源隔离响应头，所有资产仍同源；不得改为运行时第三方 CDN。

构建还包含可选耳下散发模型 selfie_multiclass_256x256.tflite（约 16.4 MB），浏览器首次开启该功能时才加载，需保留文件及 MediaPipe-LICENSE。没有新增远程推理服务。

## Docker / PVE / NAS

```sh
docker compose up --build -d
```

访问 http://127.0.0.1:8080 。默认只绑定本机；若明确需要局域网访问，可改 compose 的主机绑定并配置网络和 HTTPS。构建需要访问包仓库及 Google 模型下载地址。运行容器只提供静态文件，不运行照片推理、Python 或 GPU 服务。

Dockerfile 与配置已提供；本机没有 Docker 时不宣称镜像已实测。2–4 核和 2–4 GB 内存是静态托管的起步规划值，实际容量仍需按流量与构建方式评估。浏览器端处理能力决定用户的推理速度。

## 更新

保持 lockfile 和模型 manifest 同步；模型哈希不一致时不要跳过校验，先核查上游版本。更新后运行 typecheck/test/build 和浏览器流程测试。公开发布前确定项目许可证与模型权重的再分发条款。
