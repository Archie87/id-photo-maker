# 需求来源与参考

需求来自用户指定的 ChatGPT 对话「制作证件照工具」，conversation ID `6abe1f4e-647c-83ea-a823-0b6bf8217815`，2026-10-01 读取完整四轮对话。需求包括命名、产品方向、工程架构、目录、AGENTS 和第一阶段任务；本轮在此基础上增加可运行初版。

对话列出的参考项目（保留参考方向，不沿用未重新核验的 Star 数和功能承诺；没有复制这些仓库代码）：

- [HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos)：独立图像流水线、可选 Python 算法生态。
- [Passport Photo Studio](https://github.com/nazmul87-wq/passport-photo-studio)：几何/规格/验证分离，来源与核验日期。
- [PhotoID](https://github.com/chunguangwei/photoid)：端侧处理、Alpha 缓存、用户检查流程。
- [Photo Maker](https://github.com/Ranu92/Photomaker)：浏览器端图像处理方向。
- [HivisionID-X](https://github.com/chilin11/HivisionID-X)：头肩构图与现代 Web 包装方向。
- [Passport Photo Studio Desktop](https://github.com/ProfMohsinKhan/Passport-size-photo-maker)：UI 与引擎状态分离。

本轮核对的实现文档：

- [MediaPipe Face Landmarker Web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)：模型创建、检测、Worker 建议。
- [MediaPipe Image Segmenter Web](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js)：分割任务及蒙版。
- [MediaPipe segmentation models](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)：Selfie Segmenter 模型与类别语义。
- [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)：静态导出模式。

本轮选择轻量 MediaPipe 作为可运行的基础 Provider；并非已经集成 MODNet、BiRefNet、RMBG 或 ONNX/WebGPU。发丝质量仍需后续样本集验证。
