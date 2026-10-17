# Third-party components and references

本项目尚未指定对外发布许可证。所有依赖、模型、测试图分别遵循上游条款。本文件不替代上游许可证。

| 组件                                       | 用途               | 上游                                                                          |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------------- |
| Next.js / React                            | 页面与编辑器       | https://github.com/vercel/next.js / https://github.com/facebook/react         |
| MediaPipe Tasks Vision                     | WASM 本地检测/分割 | https://github.com/google-ai-edge/mediapipe                                   |
| MediaPipe Face Landmarker                  | 关键点模型         | https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker |
| MediaPipe Selfie Segmenter                 | 人像分割模型       | https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter |
| Hivision MODNet ONNX                       | 默认精细人像抠图   | https://github.com/Zeyi-Lin/HivisionIDPhotos                                  |
| ONNX Runtime Web 1.30.0                    | 本地 WASM 推理     | https://github.com/microsoft/onnxruntime                                      |
| pdf-lib                                    | PDF 文件生成       | https://github.com/Hopding/pdf-lib                                            |
| Tailwind CSS                               | 前端样式构建       | https://github.com/tailwindlabs/tailwindcss                                   |
| Playwright / Vitest / esbuild / TypeScript | 开发与测试         | 各依赖 package.json 和 LICENSE                                                |

模型固定下载 URL、哈希和实际字节大小记录在 models/manifest.json。MediaPipe 下载自 Google 官方托管资源；不能把文档页面的 CC BY 许可当成权重许可。2026-10-17 核对官方页面链接的模型卡 PDF：Selfie Segmentation、BlazeFace (Short Range)、Face Mesh V2 与 Blendshape V2（后三者组成 face_landmarker.task）的许可部分均链接 Apache License 2.0（通过 PDF 中的许可链接核对，未逐字渲染全文）。Apache-2.0 允许附带许可证再分发，models/MediaPipe-LICENSE 随静态资产发布。

新增 Google MediaPipe SelfieMulticlass 256×256 float32 v1，用于用户主动开启的耳下散发分类。2026-10-02 核对[官方模型卡](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf) 中明确的 Apache License 2.0；许可证 models/MediaPipe-LICENSE 来自 google-ai-edge/mediapipe v0.10.32 并随资产提供。固定 URL、大小和 SHA-256 已记录 manifest，权重未修改且不提交 Git。该许可核对仅针对新增多分类模型，不代替其他模型的发布前核验。

Hivision MODNet 权重来自 Zeyi-Lin/HivisionIDPhotos 的 pretrained-model release，参考代码固定于 commit `5c191e2577f14755a69d9df6db415fab23aca484`。2026-10-02 核对仓库 Apache-2.0 许可证及官方权重下载入口；URL、字节数、SHA-256 固定于 models/manifest.json。未修改权重或提交 Git，许可证 models/Hivision-LICENSE 随静态资产提供。预处理为独立 TypeScript 面积加权缩放实现，参考上游 512×512 RGB NCHW 约定；未复制 Python 源码或内部空洞填充。官方 MODNet photographic portrait 权重已从产品移除，仅历史对比记录仍提及。

ONNX Runtime Web 使用 MIT 许可，Microsoft Corporation；版本固定 1.30.0，许可证来自官方 v1.30.0 的 LICENSE，保存在 models/ONNXRuntime-LICENSE 并随资产发布。依赖下载只执行已允许的构建脚本；protobufjs 的安装后版本提示脚本已显式禁用，不影响 WASM 推理。

全部 18 项照片预设和红/蓝/浅灰底色参考同一 Hivision 固定提交的 demo/assets/size_list_CN.csv 与 color_list_CN.csv，六项适配为明确毫米打印规格，其余保留精确像素；data/hivision-size-list.csv 保留该提交的原始规格表作为完整性测试依据；来源与修改说明见 docs/PHOTO-SPECS.md，沿用上述 Hivision Apache-2.0 许可证记录。所有考试、签证、社保条目仍为未完整核验机构要求的 preset，不宣称合规通过。

研究参考还包括 PyMatting 的前景颜色估计文档 https://pymatting.github.io/foreground.html；未复制其源码、未引入其 Python 依赖，不声称实现了它的完整多层算法。

公共测试图来自 https://storage.googleapis.com/mediapipe-assets/portrait.jpg；仅在本地测试下载，排除 Git 和发布包，不作为产品图片或品牌素材。
