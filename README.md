# Markdown Hub

一个使用 React、TypeScript、Vite 和 Tauri 2 构建的本地 Markdown 笔记应用。笔记正文直接保存为用户所选目录中的 `.md` 文件；LocalStorage 只保存上次选择的目录。

## 开发环境

Windows 上运行 Tauri 前需要安装：

- Rust（推荐通过 rustup 安装 MSVC 工具链）
- Visual Studio Build Tools，并勾选“使用 C++ 的桌面开发”
- WebView2 Runtime（Windows 10/11 通常已经安装）

安装依赖并启动桌面应用：

```powershell
npm.cmd install
npm.cmd run tauri dev
```

构建安装包：

```powershell
npm.cmd run tauri build
```

仅检查前端生产构建：

```powershell
npm.cmd run build
```
