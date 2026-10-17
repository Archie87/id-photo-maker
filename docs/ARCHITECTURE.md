# 技术架构

## 模块边界

```text
Next.js static web / React editor state
  ├─ normalize(file) → sRGB working canvas
  ├─ AIProvider.analyze(ImageData)
  │    ├─ LocalMattingProvider → classic Worker → Face Landmarker + Hivision MODNet ONNX/WASM
  │    └─ LocalWebProvider → classic Worker → Face Landmarker + Selfie Segmenter
  │         └─ landmarks + approximate crown + alpha + optional refined RGBA
  ├─ spec-engine → target pixels + affine transform + advisory checks
  ├─ photo-engine → alpha cache + render + adjustments + encode + DPI
  └─ print-engine → mm cells → raster sheet / PDF

Future ServerProvider → explicit opt-in → Python/FastAPI/ONNX
```

`packages/spec-engine` 为纯数据/数学层。Photo 和 Print 的 Canvas 函数需要浏览器，PDF 与布局可在 Node 测试。AI Provider 不依赖 React。`use-photo-editor.ts` 仅管理当前会话、缓存、操作和通知。

## 坐标和几何

导入时按 EXIF 方向解码、最长边缩放到 2400 px；所有关键点均基于这张工作图的像素坐标。打印预设的目标像素 `round(mm × dpi / 25.4)`；电子预设的 `pixelSize` 优先，统一由 `outputSize(spec)` 返回。检测出的左右眼先按 x 排序，眼线角度取负以校正旋转；再以旋转后的头部高度求缩放，眼睛中点落在目标 `(0.5W, 0.44H)`，默认头高目标 0.59H。这些是通用构图偏好，不是国家标准。

自动头顶由额头沿远离下巴方向外推 25%，`estimatedCrown = true`。现支持用户在工作图上校正四点；应用后设为 false，表示人工确认而非算法认证。保存会重算构图，重置位置/缩放/旋转，保留亮度、对比度和 RGBA 缓存。

用户调整在基础仿射变换后按输出中心叠加缩放、旋转和归一化平移。输出检查始终针对最终变换后的点。PDF 直接用规格的 mm → pt，不使用四舍五入后的像素计算打印尺寸。

## 推理与资产

MediaPipe Tasks Vision 固定版本；模型下载在开发/部署准备阶段，前端只访问本站 `/models`、`/wasm` 和 `/worker/portrait.js`。Worker 使用 esbuild 构建为经典脚本。Face Landmarker 在全图检测，最多两个人脸；零人/多人均返回错误。默认全图分割，可选按头高选取带留白的头肩 ROI。返回低分辨率 Alpha 与 maskRegion，photo-engine 将蒙版回映射原工作图，区域外透明，再缓存 RGBA。关键点始终位于完整工作图像素坐标，背景和手动标注变化不重复推理。

LocalMattingProvider 使用 hivision_modnet ONNX，通过固定的 ONNX Runtime Web 1.30.0 单线程 WASM 推理。模型/运行时同源，加载时核对 manifest SHA-256。独立 TypeScript 实现面积加权缩放到 512×512，先舍入 RGB uint8，再转 NCHW / [-1,1]；按原始 ROI 映射 Alpha，关键点不变。预处理包含独立 OpenCV INTER_AREA 参考取样测试。Worker 缓存 session，run 后释放 Tensor，终止 Worker 释放整个 session；没有自动云端或快速模式降级。LocalWebProvider 继续提供用户手动选择的轻量分割。官方 MODNet 旧权重、预处理分支与导出入口已移除，生成资产仅包含 manifest 列出的模型。

算法选择参考 [MODNet 官方实现与模型说明](https://github.com/ZHKKKe/MODNet/tree/28165a451e4610c9d77cfdf925a94610bb2810fb/onnx) 及 [PyMatting 的 Alpha/前景颜色分离思路](https://pymatting.github.io/foreground.html)。本次采用真正的人像 matting 模型替换粗分割作为默认来源，不移植 PyMatting 代码，也不将其完整算法实现作为已完成能力。

## 抠图边缘净化

photo-engine 的 refinePortraitEdges 是不依赖 DOM 的像素函数，在推理 Worker 完成分割后执行一次。双线性恢复 ROI 蒙版，在有界邻域内寻找背景与人像内部的可靠颜色；只有两者能解释当前边缘像素时才重估透明度并减轻旧背景混色。相近颜色、颜色拟合失败、缺失局部证据和已有透明像素保留原蒙版处理，不使用全图去白或统一收缩轮廓。

上述透明度重估仅用于快速分割。Hivision 分支设置 preserveAlpha，只净化 RGB 颜色，不用启发式 Alpha 覆盖模型的发丝透明度；未移植上游内部空洞填充，白边改善来自权重本身。

Hivision 蒙版恢复原尺寸使用面积覆盖插值，与上游 INTER_AREA 的映射方式对齐；通过 PortraitResult.alphaInterpolation 传递至普通合成和可选颜色净化，两条路径共享 resizeAlphaArea。原 Canvas 双线性放大会把过渡扩散到边界邻近实心像素。面积插值保留分数像素覆盖及细发丝透明度，不做统一硬阈值或扩张；快速分割保持既有线性映射。输入工作图缩放、整数化和浏览器合成仍与 Python 实验存在细微差异，不能承诺逐像素相同。

Worker 传回独立的净化 RGBA，原图只读；UI 缓存原始蒙版合成与净化结果。「净化抠图边缘」默认关闭，开启可选颜色净化，换背景不重复推理。clear/换照片清空两份人像引用，终止旧 Worker，并以 generation 拒绝过期结果。此后处理不能补回模型漏分的发丝或保证消除复杂背景残留。

最终合成增加独立纯像素函数 defringeRgba：在输出分辨率下计算距不透明核心的有界邻域，仅在边缘颜色可解释为核心颜色叠加白色时降低浅色污染。默认强度 100%，可调到 0%；边带半径按尺寸缩放且限制 1–4 px，取色距离至多四倍半径。跳过近白核心、颜色拟合不符及无可靠核心的区域；保持每个像素 Alpha 和深处 RGB。renderPhoto 先渲染透明人像并处理边缘，再以 destination-over 填充背景；预览、单张及排版共用结果。此方法不重跑推理，也不生成发丝，但可能压暗真实边缘高光，需用强度调节。算法为项目实现，未新增第三方代码、模型或依赖。

## 可选耳下散发清理

LocalHairCleanupProvider 使用独立 Worker，在用户首次开启时读取全工作图，检测人脸并运行 MediaPipe SelfieMulticlass 六分类（背景、头发、身体皮肤、脸部皮肤、衣服、配饰）。模型同源加载并校验 SHA-256。photo-engine 的纯像素 looseHairKeepMask 根据眼线和下巴限定耳下侧方区域，以语义置信度及相邻皮肤/衣服/配饰保护生成保留蒙版；不生成任何遮挡区域内容。

UI 缓存保留蒙版，renderPhoto 将其与人像应用相同的工作图坐标变换，再使用 destination-in 合成。因此手动构图、预览、PNG/JPG 与排版使用相同结果，不重复 Hivision 推理。首次分类完成即释放独立 Worker；取消、换照片、清除与组件卸载终止 Worker，并以照片及任务 generation 拒绝过期结果。关闭选项恢复原缓存。模型低分辨率及保护阈值可能保留贴近皮肤或衣领的发丝，不能当作精确逐根发丝编辑。

语义保护带可能把紧贴皮肤的深色头发一起保留，形成耳下黑线。新增原图颜色引导：在长边不超过 768 px 的参考图上，为侧方边界寻找高置信度皮肤/衣服/配饰与头发/背景的局部颜色样本，以颜色及空间距离细化保留透明度。缺失可靠样本、双方颜色相近时保留语义结果；只对已细化且低保护置信度的边界做 3×3 中值去孤点，不统一收缩人像。Worker 返回参考图分辨率的蒙版及对应尺寸。此启发式不是生成式修复，复杂阴影或相近颜色仍可能留下残余或误分。

灰色残片进一步由现有 Face Landmarker 的 FACE_LANDMARKS_FACE_OVAL 连接限定下颌外缘。坐标按眼线旋转到脸部局部坐标，保留下巴以下的中央颈部区域。只有贴近已去除背景、有头发分类证据、位于下颌外侧的窄带参与细化；高置信度皮肤、身体、衣服和配饰继续保护。用两遍距离传播限制外缘范围，防止低置信度衣领内侧阴影被裁出白缝；最后在受影响的非核心区域去除孤点。该轮廓约束用于可选外观清理，不是人脸形状规范，也不能保证所有发型精确无残留。

## 打印预览与标尺

createPrintPlan 统一生成毫米照片格、裁切线、标尺线。预览 Canvas（100 DPI）、JPG（300 DPI）、PDF 共用计划。照片外边距 6 mm、间隔 2 mm，裁切线外延最多 0.8 mm；标尺开启后额外预留左侧 8 mm、底部 12 mm，不缩放单张照片。横纵各 50 mm，处于至少 5 mm 的打印安全边界内。

calculateLayout 比较原方向与旋转 90° 的整齐网格，选择照片数量更多的一种；数量相同时保留原方向。不混排，不缩小照片。单元格 width/height 是纸上占用尺寸，rotated 标记源照片顺时针旋转；Canvas 与 PDF 分别按各自坐标系变换，裁切线使用旋转后的边界。二寸 35×53 mm 在 6 寸相纸上按 2×2 排列，共 4 张，保留 6 mm 外边距与 2 mm 间隔。

关闭裁切线只影响标记，照片布局不变；开启标尺可能减少数量。PDF 使用 mm→pt，Canvas 使用 mm→px。屏幕预览不是实际尺寸；必须打印后测量。电子规格仍禁用排版。

输入照片变化时增加 generation，取消旧 Worker，拒绝陈旧结果。Worker 按顺序处理推理；客户端 90 秒超时。模型失败后保留手动流程。模型和 WASM 同源可缓存，但本版未做 Service Worker，因此不保证页面离线启动。

## 格式与导出

Canvas 重新编码不复制原始 EXIF/GPS 元数据；写入新的 300 DPI JFIF 或 PNG pHYs。JPEG 通过有界二分搜索降低质量以达到 KB 上限，无法达到时明确报错，不悄悄改变像素尺寸。PNG 不做有损压缩；超过上限直接提示。透明背景仅允许 PNG，避免 JPEG 黑底歧义。

## 扩展

MODNet/ONNX WASM Provider 已接入；WebGPU、BiRefNet、Python FastAPI 仍为扩展项。上层继续使用统一关键点与 Alpha 契约。正式官方规格需提供 source、lastVerified、status，并追加每项约束的证据和版本历史。通用预设 source/lastVerified 为 null。身份证电子预设保存官方来源与核对日期，但 status 保持 preset，verificationNote 说明只核对基础输出参数，未覆盖全部制证要求。
