# 测试素材

默认端到端测试用浏览器 Canvas 生成几何色块，不依赖个人照片。

`pnpm fixture:download` 可选下载 Google MediaPipe 的公开 portrait.jpg，用于验证真实本地人脸检测与背景分割。该文件已排除 Git。来源为 https://storage.googleapis.com/mediapipe-assets/portrait.jpg，不打包到产品中。

个人照片只能保存在此目录的 private/ 子目录（已忽略），并确保用户明确授权测试；不得上传到 CI 或远程服务。
