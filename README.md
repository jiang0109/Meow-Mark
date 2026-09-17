# Markdown Hub

[![CI](https://github.com/jiang0109/Meow-Mark/actions/workflows/ci.yml/badge.svg)](https://github.com/jiang0109/Meow-Mark/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jiang0109/Meow-Mark?label=release&sort=semver)](https://github.com/jiang0109/Meow-Mark/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/jiang0109/Meow-Mark/total)](https://github.com/jiang0109/Meow-Mark/releases)
[![License](https://img.shields.io/github/license/jiang0109/Meow-Mark)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6)

本地优先的 Markdown 笔记应用：**笔记就是普通的 `.md` 文件**，存放在你自己选择的目录里。没有私有数据库、不需要账号、不锁定格式——用任何编辑器都能直接打开它们。

使用 Tauri 2 + React + TypeScript + Vite 构建，安装包约 2 MB。

## 下载

前往 [Releases](https://github.com/jiang0109/Meow-Mark/releases/latest) 下载最新版本：

| 文件 | 说明 |
| --- | --- |
| `Markdown.Hub_<版本>_x64-setup.exe` | **推荐**。NSIS 安装包，装完后有开始菜单项和卸载入口 |
| `Markdown.Hub_<版本>_x64_en-US.msi` | MSI 安装包，适合批量部署 / 企业环境 |
| `Meow-Mark-<版本>-portable-x64.zip` | 绿色版（如有提供）：解压后直接运行，无需安装 |

**系统要求**：Windows 10 / 11（64 位），需要 WebView2 运行时（Win11 自带，Win10 通常已安装）。

> 当前版本未做代码签名，首次运行时 Windows SmartScreen 可能提示「未知发布者」，点「更多信息 → 仍要运行」即可。

## 特性

- **纯文件存储**——笔记即 `.md` 文件，保存在你选择的目录中；后端只读写该目录下的 Markdown 文件（做了路径与扩展名校验）
- **实时预览**——左侧编辑、右侧即时渲染，支持 GFM（表格、任务列表、删除线、自动链接等）
- **代码高亮**——内置 JavaScript / Python / Java 语法高亮，暗色主题、带行号
- **自动保存**——停止输入 650ms 后写入磁盘；已保存/正在保存/保存失败有状态指示
- **标题即文件名**——修改标题会自动重命名磁盘上的文件，并自动避免重名
- **笔记管理**——新建、按标题搜索、删除（带二次确认）
- **轻量**——不打包浏览器内核，复用系统 WebView2，安装包约 2 MB

## 截图

> 截图待补充（欢迎提 PR）。

## 从源码构建

前置条件：

- Node.js 22 LTS 或更高（Vite 8 要求 ≥ 20.19 / 22.12）
- Rust（建议用 rustup 安装 MSVC 工具链）
- Visual Studio Build Tools，勾选「使用 C++ 的桌面开发」
- WebView2 运行时（Windows 10/11 通常已自带）

```powershell
npm.cmd install
npm.cmd run tauri dev      # 开发模式（前端热更新）
npm.cmd run tauri build    # 产出 Windows 安装包（NSIS + MSI）
```

> **注意参数分隔符**：给 tauri 传参数时必须加 `--`，例如
> `npm.cmd run tauri -- build --bundles nsis`。
> 否则以 `--` 开头的参数会被 npm 自己消费掉（`--no-bundle` 尤其容易被吞）。

只跑前端类型检查与构建：

```powershell
npm.cmd run build
```

## 项目结构

```
├─ src/                    前端（React + TypeScript）
│  ├─ App.tsx              主界面：侧栏 / 编辑器 / 预览
│  ├─ storage.ts           与 Rust 后端通信（invoke 封装）
│  └─ types.ts             共享类型
├─ src-tauri/              Tauri 桌面端（Rust）
│  ├─ src/lib.rs           list/create/save/delete 四个命令
│  ├─ capabilities/        权限声明（最小权限）
│  └─ tauri.conf.json      应用配置（devUrl、图标、打包目标等）
├─ scripts/bump-version.mjs  版本号统一修改工具
└─ app-icon.svg            图标源文件
```

## 常见问题

**`failed to run 'cargo metadata' ... program not found`**

Rust 装好后需要让终端重新加载 PATH：**完全退出并重开终端（如果是 VS Code / PyCharm 的集成终端，要退出整个 IDE）**，只新开一个标签页没用。

**`EBUSY: resource busy or locked, watch '...\src-tauri\target\...'`**

cargo 编译时会锁定 `target` 下的文件，而 Vite 默认会监听整个项目导致崩溃。本项目已在 `vite.config.ts` 中通过 `server.watch.ignored: ['**/src-tauri/**']` 排除。

**`` `icons/icon.ico` not found; required for generating a Windows Resource file ``**

缺少图标资源。修改 `app-icon.svg` 后重新生成整套图标：

```powershell
npm.cmd run tauri -- icon app-icon.svg
```

**构建时报下载 WiX / NSIS 超时（`timeout: global`）**

打包工具是从 GitHub 按需下载的（`%LOCALAPPDATA%\tauri`）。网络受限时可以先只出独立 exe：

```powershell
npm.cmd run tauri -- build --no-bundle
```

或者只出 NSIS 安装包（跳过 WiX）：`npm.cmd run tauri -- build --bundles nsis`。
另外也可以交给 CI：推送 `v*` tag 后由 GitHub Actions 构建。

## 版本与发布

- 版本号以 `src-tauri/tauri.conf.json` 为准；用 `npm.cmd run version:bump -- patch`（也支持 `minor` / `major` / 指定版本）一处修改、四处同步
- 发布流程：`npm.cmd run version:bump -- patch --git` → `git push --tags` → GitHub Actions 自动构建安装包并创建 draft Release → 在 Releases 页面审核后 Publish
- 变更记录见 [CHANGELOG.md](CHANGELOG.md)

## 许可证

[MIT](LICENSE)
