# 本地模型

`manifest.json` 记录 Google MediaPipe 与 MODNet 模型的固定下载路径、文件大小、SHA-256 和获取日期。运行 `pnpm models:download` 验证或下载权重；任何哈希不匹配都会拒绝安装。运行 `pnpm assets` 复制模型及许可证到前端 public/models，并复制安装包中的 WASM、编译 Worker。

模型权重被 .gitignore 排除。精细模式使用 face_landmarker.task 检测关键点，hivision_modnet.onnx 估计 Alpha，替换官方 photographic portrait 权重。Hivision 权重为 25,888,609 字节，来源为 Zeyi-Lin/HivisionIDPhotos 的 pretrained-model release；参考提交为 5c191e2577f14755a69d9df6db415fab23aca484，上游仓库 Apache-2.0 许可证副本为 Hivision-LICENSE。手动选择快速模式时使用 selfie_segmenter.tflite。ONNX Runtime Web 1.30.0 使用 MIT，副本为 ONNXRuntime-LICENSE。

精细模式通过 ONNX Runtime Web 的单线程 WASM 在 Worker 中运行，不要求 WebGPU 或 crossOriginIsolated。默认全图，可选头肩 ROI；面积加权缩放到固定 512×512，RGB NCHW 归一化到 [-1,1]。默认关闭额外颜色净化，没有移植上游内部空洞填充。浏览器首次加载模型再次检查 SHA-256；失败明确报错，不自动切换模型或服务器。WASM 另约 14 MB，只从本站获取。prepare-assets 清理生成模型目录后仅复制 manifest 内的权重及许可证，防止旧模型留在新构建中。

checksum 是本次实际下载字节的固定校验值，用于重现和防止意外变化，并非上游数字签名。更新时人工核对来源、版本、许可和新哈希，不自动接受变化。

可选耳下散发清理使用 Google SelfieMulticlass float32 v1（256×256、六分类），文件 selfie_multiclass_256x256.tflite 为 16,371,837 字节，SHA-256 c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0。固定官方版本 URL 见 manifest。首次开启选项才由浏览器加载；默认 Hivision 抠图不会加载此模型。[官方模型卡](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf) 明确 Apache-2.0，许可证副本 MediaPipe-LICENSE 随静态资产发布。模型不是逐像素精确发丝蒙版，本项目限制处理区域并保护皮肤和衣服。
