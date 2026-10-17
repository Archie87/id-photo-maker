# ID Photo Maker 开发约定

## 产品与目录

产品名为 **ID Photo Maker**。使用现有项目根目录，不移动或重建为另一个目录。需求源为 2026-10-01「制作证件照工具」对话，收敛文档在 docs/PRD.md。项目是 Next.js/React/TypeScript + pnpm workspace；四个引擎保持独立于 UI。

## 不可破坏的约束

- 默认本地处理；禁止悄悄上传照片、添加分析追踪或在本地失败时自动切服务器。
- 原始照片只读；不要把个人照片、导出照片、模型权重、node_modules、构建输出或密钥提交 Git。
- UI 状态属于 apps/web；图像算法属于 packages。Spec/geometry 不依赖 React 或 DOM。
- 关键点统一使用工作图像素坐标；打印规格由 mm 和 DPI 推导，电子规格以显式 pixelSize 为准；背景切换复用 Alpha，不重复推理。
- 推理运行在 Worker；切换照片或清除时取消旧任务；及时释放 ImageBitmap、蒙版、Worker 与 Blob URL。
- PNG/JPG 的 DPI 元数据必须与宣称一致；PDF 使用真实毫米尺寸，不能从四舍五入后的像素反推打印尺寸。
- 规格必须保留 source、lastVerified 和 status。未经官方核验不得标成 verified；缺失证据的质量检查不得显示“合规通过”。
- ServerProvider 是未启用扩展点；未来接入需要明确用户选择、上传告知和可取消行为。
- 添加第三方模型或代码前核验来源与许可，权重固定 URL/版本并保存 SHA-256。
- 不把构图、磨皮、肤色等审美修改当作证件照规范；AI 换装和生成式修复不属于当前基础版。

## 修改后的检查

运行 `pnpm typecheck`、`pnpm test`、`pnpm build`。改变编辑器、Worker、导出流程时运行相关 Playwright 测试。涉及图像/打印时检查实际文件的像素、DPI、PDF 页面和物理布局；自动测试不代替用户实物打印校准。

命令不可用时先运行 scripts/project.sh；不要因此全局安装不同版本或修改用户 Shell 配置。测试状态、已知限制和未验证设备写入 docs/VERIFICATION.md。不要把计划项描述为已实现。

## 实现偏好

小模块、严格 TypeScript、可解释的错误信息、键盘可操作的中文界面。新增模型应实现 AIProvider 而非侵入组件。依赖新增后更新 pnpm-lock.yaml。针对风险和行为写测试，不为文档或样式改动机械增加测试。
