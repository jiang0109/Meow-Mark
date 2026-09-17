# 更新日志

本项目的所有重要变更都记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

- 暗色模式：默认跟随系统主题，手动切换（跟随系统 → 亮色 → 暗色）后记住选择；首屏渲染前即套用主题，不会闪白
- 拖放打开文件：把 `.md` 文件拖进窗口即可打开，拖入时显示提示浮层；拖入非 `.md` 文件或文件夹会给出明确提示
- 侧栏新增「打开文件」按钮：从系统文件选择器中挑选单个 `.md` 文件打开
- 打开文件后自动切换到该文件所在目录，并在笔记列表中选中它

### 变更

- **删除笔记改为移入系统回收站**（此前是永久删除，绕过回收站），误删可从回收站恢复；确认提示文案同步更新
- 界面配色改为语义化 CSS 变量（`bg-surface` / `text-muted` / `border-line` 等），亮色与暗色共用同一套组件代码
- 切换笔记目录前会先保存当前笔记的未落盘改动

### 依赖

- 新增 `trash`（把文件移入系统回收站）

## [1.0.0] - 2026-09-17

首个公开版本。

### 新增

- 选择笔记目录：首次启动时选择，之后自动记住上次的目录
- 笔记列表：读取所选目录下的 `.md` 文件，按修改时间倒序排列
- 按标题搜索笔记（大小写不敏感）
- 新建笔记：自动生成文件名并处理重名（`无标题笔记`、`无标题笔记 (2)` …）
- 编辑器 + 实时预览：左侧 Markdown 编辑，右侧即时渲染
- 支持 GFM（表格、任务列表、删除线、自动链接等）
- 代码块语法高亮：内置 JavaScript / Python / Java，暗色主题且带行号
- 自动保存：停止输入 650ms 后写入磁盘，并显示「正在保存 / 已保存到磁盘 / 保存失败」状态
- 标题即文件名：修改标题会自动重命名磁盘文件，并避免覆盖已有文件
- 删除笔记（带二次确认）
- 后端安全边界：只允许读写所选目录内的 Markdown 文件（路径与扩展名校验）

### 工程与发布

- 使用 Tauri 2 + React + TypeScript + Vite 构建，Windows x64 安装包约 2 MB
- GitHub Actions CI：push / PR 时执行版本号一致性检查、`tsc` 类型检查与前端构建、`cargo fmt --check`、`cargo clippy -- -D warnings`
- GitHub Actions Release：推送 `v*` tag 时自动构建 Windows 安装包（NSIS + MSI）并创建 draft Release
- Dependabot：每周自动检查 npm 与 Cargo 依赖更新
- 新增 `scripts/bump-version.mjs`：一处修改版本号、同步 `tauri.conf.json` / `package.json` / `package-lock.json` / `Cargo.toml` 四处，并提供 `--check` 供 CI 校验
- 新增图标资源与源文件 `app-icon.svg`（`npm.cmd run tauri -- icon app-icon.svg` 可重新生成）
- 补充 MIT 许可证、`.gitattributes`（统一 LF）与 `.vscode/settings.json`

[未发布]: https://github.com/jiang0109/Meow-Mark/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jiang0109/Meow-Mark/releases/tag/v1.0.0
