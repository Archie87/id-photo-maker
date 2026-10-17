# ID Photo Maker

Private · Local · AI-powered

本地优先的证件照制作工具。根据 2026-10-01「制作证件照工具」对话建立；产品名统一为 **ID Photo Maker**，包名前缀 `@id-photo/`。保留当前真实项目目录 `ID Photo Maker/`，不再嵌套第二层项目。

## 开始使用

推荐 Node.js 22.13+ 和 pnpm 11.19.0。当前这台 Mac 也可以使用启动脚本，它在系统缺少 Node/pnpm 时查找 Codex 自带运行环境：

```sh
./scripts/project.sh install
./scripts/project.sh models:download
./scripts/project.sh dev
```

打开 <http://127.0.0.1:3000>。常规环境直接执行 `pnpm install && pnpm models:download && pnpm dev`。

1. 选择一张正面、单人、头肩完整的照片。
2. 点击「本地 AI 处理」做人脸检测、估算构图和背景分割。
3. 搜索并选择 19 项照片规格（Hivision 全部 18 项及独立身份证电子照），或自定义毫米尺寸，调整构图。
4. 自动构图不准确时，点击「校正关键点」确认头顶、图左眼、图右眼与下巴。支持点击、拖动和数字微调，无需重跑 AI。
5. 下载 JPG / PNG，或打开「打印排版预览」查看 6 寸 / A4 排版，选择裁切标记和横纵 50 mm 校准标尺后下载 JPG / PDF。
6. PDF 打印选择 **实际大小 / 100%**，关闭适应页面与无边距放大，用尺子核验成品尺寸及两条标尺。

下载依赖和模型需要网络；用户照片不上传。运行时模型、WASM、Worker 均从本站加载。没有账户、追踪脚本或服务端图片 API。页面重载后不保留用户图片；这不是已实现的离线 PWA。

## 已实现与边界

已合并 Hivision 全部 18 项规格（含考试、社保、驾驶证、签证），另保留身份证电子照，共 19 项；支持名称和尺寸搜索。新增像素条目按上游精确值导出，未提供毫米排版。常用打印尺寸对齐 Hivision 固定版本规格表（300 DPI）：一寸 25×35 mm / 295×413 px，二寸 35×53 mm / 413×626 px，小一寸 22×32 mm / 260×378 px，小二寸 35×45 mm / 413×531 px。二寸和小二寸替换了旧版 35×49、33×48 mm 预设；旧尺寸仍可自定义输入。红、蓝、浅灰底色同步其配置。详见 [规格来源](docs/PHOTO-SPECS.md)。

- React / Next.js 静态导出的中文编辑器，桌面和手机布局。
- JPG / PNG / WebP 导入，浏览器支持时可读取 HEIC；EXIF 方向交给浏览器解码。
- 30 MB 文件限制、6000 万像素上限，工作图最长边缩至 2400 px，原始文件不修改。
- MediaPipe Face Landmarker 检测关键点；默认 Hivision MODNet 精细抠图，通过 ONNX Runtime Web/WASM 在 Worker 本地运行，也可手动选择 Selfie Segmenter 快速模式。官方 MODNet 旧权重已移除。
- 四点几何构图与头顶/下巴/双眼手动校正、旋转/缩放/平移、缓存分割结果、白/蓝/红/灰/自定义/透明背景。
- 默认全图抠图，可选头肩优先分割；额外边缘净化默认关闭，需要时可手动开启。
- 独立「清理耳下散发（实验）」开关，默认关闭；本地识别并清理耳下、脖子两侧露在背景上的头发，保护皮肤和衣服，关闭恢复。不会补画被头发遮挡的人体或衣服，少量边界发丝可能保留。
- 亮度、对比度；JPG 文件大小上限；JPG/PNG 写入 300 DPI 元数据。
- 单张照片、排版 JPG、按毫米定位的 PDF 和辅助输出检查；打印预览、裁切标记开关、横纵 50 mm 标尺。
- 可替换 AIProvider；ServerProvider 明确报未实现，不发送网络请求。

**还未实现：** 独立 HEIC 解码器、机构官方规格库、睁眼/姿态/背景均匀度自动审核、磨皮/肤色调整、AI 换装、WebGPU Provider、Python 服务、PWA 缓存。精细抠图已接入，但多发型/肤色/眼镜样本集与手机性能验收尚未完成，不保证每张照片完全无残边。自动头顶来自关键点外推，可手动校正；通用头高/眼高规则只是构图参考。真实打印尺寸仍待用户测量。详见 [路线图](docs/ROADMAP.md)。

## 项目结构

```text
ID Photo Maker/
├── apps/web/                 Next.js App Router、界面、编辑器状态、AI Worker
│   ├── src/app/              页面与样式
│   ├── src/components/       工作台、参数面板、Canvas 预览
│   ├── src/editor/           会话状态与用户操作
│   ├── src/workers/          本地推理入口
│   └── public/               构建准备时复制模型与运行资产
├── packages/
│   ├── photo-engine/src/    解码、蒙版、渲染、DPI、压缩、导出
│   ├── ai-engine/src/       Provider 契约、本地 Worker 客户端、禁用的服务器扩展点
│   ├── spec-engine/src/     规格、几何、辅助验证
│   └── print-engine/src/    毫米排版、相纸渲染、PDF
├── data/photo-specs.json     有来源/核验日期字段的通用预设
├── models/                  模型清单、校验值、本地权重（权重不入 Git）
├── services/api/            后续 Python Provider 设计边界
├── infra/nginx/             静态站点 Docker 部署
├── scripts/                 运行环境、模型下载、资产构建
├── tests/unit/              几何、DPI、PDF 与排版测试
├── tests/e2e/               浏览器流程和网络请求检查
├── tests/fixtures/          公共测试图说明，个人照片不得提交
├── docs/                    需求、架构、隐私、测试、路线图、参考来源
├── .github/workflows/       CI 检查
└── AGENTS.md                后续开发约束
```

## 开发与验证

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm fixture:download         # 可选：公开 MediaPipe 人像，仅用于本地 AI 测试
pnpm test:e2e
```

Mac 上可复用已安装的 Chrome：

```sh
IDPM_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./scripts/project.sh test:e2e
```

`pnpm build` 输出 `apps/web/out/`，可以由任意静态 HTTP 服务托管。不要通过 `file://` 直接打开。Docker 方式见 [部署说明](docs/DEPLOYMENT.md)。没有创建 GitHub 仓库或对外发布。

## 文档

[产品需求](docs/PRD.md) · [技术架构](docs/ARCHITECTURE.md) · [页面设计](docs/UI.md) · [开发任务](docs/ROADMAP.md) · [测试计划](docs/TESTING.md) · [隐私](docs/PRIVACY.md) · [参考项目](docs/REFERENCES.md) · [验证记录](docs/VERIFICATION.md)

本项目代码尚未指定对外开源许可证。参考设计不等于复制上游代码；第三方依赖和模型各自适用其上游条款，见 [第三方说明](THIRD_PARTY_NOTICES.md)。

## 居民身份证电子照

新增独立电子预设：**358 × 441 px、350 DPI、白底、JPG**。电子输出使用显式像素，不通过毫米值间接换算；26×32 mm 仅作为参考值，不用于该预设的打印排版。选择后白底自动恢复，PNG/排版导出禁用，普通一寸和自定义打印规格继续保留原有功能。

该预设仅落实基础输出参数，不等于通过身份证制证审核。KB 上限由用户根据受理机构填写；没有统一套用某地区的 14–20 KB 限制，也不承诺满足最小 KB。原背景未去除时仍需人工检查白底。来源和核对日期见 data/photo-specs.json，具体范围见 [电子规格说明](docs/ELECTRONIC-SPECS.md)。
