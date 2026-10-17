# Optional server provider (planned)

此目录记录后续 Python/FastAPI/ONNX 服务边界，目前没有运行中的 API 或后端依赖。普通开发与静态部署不需要 Python/GPU。

未来服务应接收用户明确选择上传的照片，输出与 AIProvider 相同的工作图像素关键点和 Alpha 蒙版。需要版本化契约、请求大小限制、取消/超时、任务清理、无照片持久化默认值、上传告知与服务健康检测。不得静默从 LocalWebProvider 降级到服务器。

Hivision/MODNet/BiRefNet 仅是待评估实现，不在当前交付中声称接入。
