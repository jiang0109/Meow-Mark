# Markdown Hub（Meow-Mark）项目复盘

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/jiang0109/Meow-Mark （public，MIT） |
| 应用名 | Markdown Hub（`productName`），包名 `markdown-hub`，`identifier` = `com.markdownhub.app` |
| 复盘范围 | 2026-09-16 ~ 2026-10-30，共 **25 个提交**、**5 个 tag**（v1.0.0 / v1.1.0 / v1.1.1 / v1.1.2 / v1.2.0） |
| 交付形态 | Windows 10/11 x64 安装包（NSIS `-setup.exe` + MSI），通过 GitHub Releases 分发 |
| 文档目的 | 面向本人的学习复盘：讲清"为什么"和"怎么发现的"，而不是只列结论 |

> 说明：带 `[待补充：…]` 的地方是我无法从代码/历史中推断的信息（多为当时的决策动机），请你自行补全；文中不放推测当事实。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术选型复盘](#2-技术选型复盘)
3. [架构与实现梳理](#3-架构与实现梳理)
4. [踩坑记录（23 条）](#4-踩坑记录)
5. [工程化与发布流程](#5-工程化与发布流程)
6. [收获与改进](#6-收获与改进)
7. [附录](#7-附录)
8. [TL;DR](#tldr300-字以内)

---

## 1. 项目概览

### 1.1 一句话

一个**本地优先的 Windows Markdown 笔记桌面应用**：笔记就是你自己目录里的普通 `.md` 文件——没有私有数据库、不需要账号、不锁定格式，任何编辑器都能直接打开它们。

### 1.2 功能清单

**v1.0.0（首个公开版）**

- 选择笔记目录（记住上次选择，存 `localStorage`）
- 笔记列表：读取所选目录下的 `.md`，按修改时间倒序
- 按标题搜索（大小写不敏感，`zh-CN` locale）
- 新建笔记（自动处理重名：`无标题笔记`、`无标题笔记 (2)`…）
- 编辑器 + 实时预览（左编辑 / 右渲染）
- GFM 支持（表格、任务列表、删除线、自动链接等）
- 代码块语法高亮（内置 JavaScript / Python / Java，暗色主题 + 行号）
- 自动保存：停止输入 650ms 后写盘，带"正在保存 / 已保存 / 保存失败"状态
- **标题即文件名**：改标题会重命名磁盘文件并避免覆盖
- 删除笔记（二次确认）
- 后端安全边界：只允许读写所选目录内的 `.md` 文件

**v1.1.0（三个新功能）**

- **暗色模式**：默认跟随系统，手动切换（跟随系统 → 亮色 → 暗色）后记住；首屏不闪白
- **拖放 / 选择文件打开**：拖 `.md` 进窗口即可打开，也可点「打开文件」；打开后自动切到该文件所在目录并选中；非 `.md` 或文件夹有明确提示
- **删除改为移入系统回收站**（此前是永久删除）
- 顺带修复：切换笔记目录前会先保存未落盘改动

**v1.1.1（补丁）**

- 修复 Windows release 构建启动时**额外弹出命令行窗口**的问题
- 依赖升级（react/react-dom 19.3.0、vite 8.3.0 等）+ GitHub Actions 版本升级

**v1.1.2（阅读模式）**

- **阅读模式**：预览面板右上角新增「⤢ 全屏阅读」按钮 —— 点击后隐藏编辑器、预览区放大并居中（限宽 860px），便于长文阅读
- 阅读模式下页面左上角（标题旁）出现「✎ 编辑笔记」按钮，一键切回「编辑 + 预览」双栏实时渲染
- 再次点击该按钮或按 `Esc` 也可退出；阅读时预览面板标题从「预览 / OUTPUT」变为「阅读 / READING」，左侧笔记列表保留以便连续阅读

**v1.2.0（导出 PDF）**

- **导出 PDF**：预览面板右上角「⭳ 导出 PDF」按钮 —— 走系统打印对话框，打印机选 *Microsoft Print to PDF* 即可保存（默认文件名取笔记标题）
- 打印时隐藏侧栏 / 编辑器 / 面板标题 / 全部按钮，只输出预览正文；A4 纸张，上下 18mm / 左右 16mm 页边距
- 标题不落页尾，代码块 / 表格 / 引用 / 图片不跨页截断；暗色模式下同样按浅色排版，代码块打印为浅底深字

### 1.3 交付形态与体积

| 产物 | 体积 | 说明 |
|---|---|---|
| `markdown-hub.exe`（release） | 8.8 MB | 前端已内嵌，可独立运行 |
| NSIS `-setup.exe` | ~2.0 MB | 推荐给用户的安装包 |
| MSI | ~3.0 MB | 适合批量部署 |
| 源码仓库 | 约 0.6 MB | 未跟踪的 `node_modules`（124 MB）与 `target`（**5.5 GB**）不进库 |

### 1.4 代码规模

| 文件 | 大小 | 角色 |
|---|---|---|
| `src/App.tsx` | 25 KB（688 行） | 全部 UI（侧栏 / 编辑器 / 预览 / 阅读模式 / 拖放浮层 / 导出按钮） |
| `src/storage.ts` | 1.7 KB | 后端命令封装（invoke） |
| `src/theme.ts` | 1.7 KB | 主题选择 + 持久化 |
| `src/styles.css` | 6.8 KB（207 行） | 语义色令牌 + `.dark` 覆盖 + 预览区样式 + **打印/导出 PDF 规则** |
| `src-tauri/src/lib.rs` | 6.3 KB | 5 个 Tauri 命令 + 路径安全校验 |
| `src-tauri/src/main.rs` | 269 B | 入口（含 Windows 子系统声明） |
| `scripts/bump-version.mjs` | 11.8 KB（289 行） | 版本号五处同步 + 工作区守卫（只检查被跟踪改动与源码目录下的未跟踪文件） |
| `.github/workflows/{ci,release}.yml` | 1.6 / 2.3 KB | CI 与自动发布 |

---

## 2. 技术选型复盘

### 2.1 技术栈清单

| 层 | 选型 | 版本 | 作用 |
|---|---|---|---|
| 桌面框架 | **Tauri** | 2.11.5 | 用系统 WebView2 承载前端，Rust 提供原生能力；产出 2~3 MB 安装包 |
| 后端语言 | **Rust** | 1.98.1 (MSVC) | 文件读写、路径校验、回收站、IPC 命令 |
| 前端框架 | **React** | 19.x | UI 组件与状态 |
| 前端语言 | **TypeScript** | latest | 类型检查（`tsc` 进 CI） |
| 构建工具 | **Vite** | 8.x | dev server + 生产打包 |
| 样式 | **Tailwind CSS v4** + `@theme` CSS 变量 | 4.x | 原子类 + 语义化主题令牌（明暗一套代码） |
| Markdown 渲染 | `react-markdown` + `remark-gfm` | latest | GFM 渲染 |
| 代码高亮 | `react-syntax-highlighter` (PrismLight) | ^16 | 按语言按需注册，控制体积 |
| 原生对话框 | `tauri-plugin-dialog` | 2.7.3 | 选目录 / 选文件（`.md` 过滤器） |
| 回收站 | **`trash` crate** | 5.2.9 | 调用系统回收站（不是简单删除） |
| CI/CD | **GitHub Actions** | — | 检查 + 自动构建 + 创建 Release |
| 安装包工具 | **NSIS 3.11 / WiX 3.14.1** | — | Tauri bundler 按需下载的工具链 |
| 依赖维护 | **Dependabot** | — | 每周自动提依赖升级 PR |
| 版本管理 | 自写 `bump-version.mjs` | — | 一处改、五处同步 + CI 校验 |

### 2.2 关键选型逐个分析

#### ① Tauri vs Electron（最关键的选型）

| 维度 | Tauri（选中） | Electron |
|---|---|---|
| 安装包体积 | **2~3 MB**（本项目实测） | 80~150 MB（带 Chromium + Node） |
| 运行时 | 复用系统 **WebView2** | 自带 Chromium |
| 内存占用 | 较低 | 较高 |
| 后端能力 | Rust（性能好、可做重活） | Node.js |
| 开发门槛 | **需要 Rust + VS C++ Build Tools**（本项目踩坑最多的来源） | 只要 Node |
| 跨平台构建 | **每个平台各构建一次**（不能交叉编译 macOS 包） | 相对容易 |
| 生态成熟度 | 较新、API 偶有变动 | 非常成熟 |

**事后评价：对"本地小工具"这个场景，选 Tauri 是对的**——2 MB 安装包、启动快、系统 WebView 天然跟随系统更新。代价是环境门槛：整个项目 21 个坑里，有 4 个（PATH、图标、`custom-protocol`、控制台窗口）都源自"Rust/Tauri 的构建约定"，而 Electron 项目压根不会遇到这些。

#### ② React vs Vue / Svelte

React 的直接收益是 **`react-markdown` 生态**（Markdown 渲染 + GFM 插件 + 语法高亮都能直接组合），这对"笔记应用"是核心能力。代价是 bundle 稍大（本项目 JS 约 424 KB / gzip 128 KB）。

[待补充：当时为什么选 React 而不是 Vue/Svelte——是熟悉度、生态、还是模板推荐？]

#### ③ 样式：Tailwind v4 + CSS 变量做主题

**这是本项目里最漂亮的一次技术选择。** 实现暗色模式的常见做法是给每个类加 `dark:` 变体（本项目 `App.tsx` 里有 47 处硬编码颜色类，两套就是 94 处），而这里改用 Tailwind v4 的 `@theme`：

```css
@theme {                       /* 亮色：定义语义令牌 */
  --color-surface: #ffffff;
  --color-line: #e8ecf4;
  --color-muted: #64748b;
  ...
}
.dark {                        /* 暗色：只覆盖变量 */
  --color-surface: #161d2c;
  --color-line: #27314a;
  --color-muted: #9aa6bd;
  ...
}
```

组件里只写 `bg-surface` / `border-line` / `text-muted`，切换主题时**组件代码完全不用感知**——因为 Tailwind 生成的 `background-color: var(--color-surface)` 引用的就是这些变量。代价是需要一次性把 47 处硬编码颜色替换成语义令牌（机械活），收益是以后加主题只需改 CSS。

#### ④ 拖放：Tauri 原生事件 vs HTML5 拖放

**HTML5 的 `ondrop` 拿不到文件系统路径**（浏览器安全限制，只能拿到 `File` 对象）。Tauri 的 `getCurrentWebview().onDragDropEvent()` 事件里直接带 `paths: string[]`：

```ts
getCurrentWebview().onDragDropEvent((event) => {
  if (payload.type === 'enter' || payload.type === 'over') setDragging(true);
  else if (payload.type === 'drop') dropHandler.current(payload.paths);
});
```

而且它走的是**通用事件系统**（`core:event:allow-listen`，已包含在 `core:default` 里），所以**不需要新增任何权限**——保住了"最小权限"。

#### ⑤ 删除：`trash` crate vs 自己调 Windows API vs 移到 .trash 目录

| 方案 | 优点 | 缺点 |
|---|---|---|
| **`trash` crate（选中）** | 一行 `trash::delete(&path)`，跨平台，行为就是系统回收站 | 新增一个依赖（会带 windows crate） |
| 自己调 `SHFileOperationW` | 不加依赖 | 需要写 unsafe FFI，易错 |
| 移到目录内 `.trash/` | 简单 | 不是系统回收站，污染用户目录，用户找不到 |

**踩坑价值**：这个功能的正确性我做了**独立探针验证**（见 §4-P15 与附录 B），而不是"编译通过就算完"。

#### ⑥ GitHub Actions vs 本地打包 / 其它 CI

因为**只有 Windows 版**，CI 只跑一个 `windows-latest`，不需要 Linux 的 webkit 依赖矩阵，也不需要 macOS runner——这让工作流非常简单。更关键的是：**CI 在海外，下载 NSIS/WiX 是秒级**，彻底绕开了本地网络超时（§4-P5）。

#### ⑦ 没有引入的东西（也是选型）

| 没引入 | 现状替代 | 评价 |
|---|---|---|
| 状态管理库（Redux/Zustand） | `useState` + 单组件 | 项目小能撑，但 `App.tsx` 已 24 KB / 657 行，**该拆了** |
| 测试框架 | 无，靠手动冒烟 | **最大的技术债**（详见 §6.2） |
| ESLint / Prettier | 无（只有 `tsc`） | 前端没有 lint 门禁 |
| 自动更新（updater） | 无，用户手动下载新安装包 | 需要签名密钥，属后期功能 |
| 代码签名 | 无 | 用户会看到 SmartScreen「未知发布者」 |
| release-please | 自写 `bump-version.mjs` | 手动但可控；上了 Conventional Commits 后可无缝换 |

### 2.3 事后评价

**被验证是对的：**

1. **Tauri**（体积/性能优势在小工具上非常明显）
2. **CSS 变量做主题**（一次改造，明暗两套长期受益）
3. **CI 双工作流分离**（CI 查质量、Release 出包，各司其职）
4. **tag 触发发布**（`v*` → 自动构建，比手动上传可靠得多）
5. **自写版本号脚本**（一处改五处同步，且能进 CI 当门禁）
6. **最小权限**（全程 `core:default` + `dialog:allow-open`，加功能也没破例）
7. **语义令牌的复用价值**：同一套 CSS 变量既能切明暗，也能在 `@media print` 里整体切到打印配色——"导出 PDF"几乎没有改动任何组件代码（这是当初选"CSS 变量做主题"时没想到的额外收益）

**值得商榷的：**

1. **依赖版本大量写 `"latest"`**（react、vite、typescript…）→ 直接后果：Dependabot **无法为这些依赖开 PR**（它需要可比较的版本范围），而且本地/CI 装到的版本会随上游漂移。应改成 `^19.3.0` 这类明确范围。
2. **`crate-type = ["staticlib", "cdylib", "rlib"]`** 是 Tauri 模板为**移动端**准备的，桌面端只需 `rlib`。实测这导致 `target/` 里多出 **693 MB** 的 `markdown_hub_lib.lib`（静态库）。**尚未修复**（见 §6.2）。
3. **没有测试**（哪怕 Rust 侧几个纯函数：`clean_title`、`unique_path` 都极易测）。
4. **单文件组件**（`App.tsx` 承载全部 UI + 拖放 + 主题 + 保存逻辑）。

---

## 3. 架构与实现梳理

### 3.1 整体架构

```
┌──────────────────────────── 你的电脑 ────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  markdown-hub.exe （Tauri 应用，Windows GUI 子系统）        │  │
│  │                                                            │  │
│  │  ┌──────────────────────┐        ┌──────────────────────┐  │  │
│  │  │  WebView2 进程        │        │  Rust 主进程          │  │  │
│  │  │  ────────────────    │        │  ──────────────────   │  │  │
│  │  │  React 19 (App.tsx)  │  IPC   │  lib.rs:              │  │  │
│  │  │  · 侧栏 / 编辑器 / 预览│◄──────►│   list_notes          │  │  │
│  │  │  · 主题三态切换       │ invoke │   create_note         │  │  │
│  │  │  · 拖放浮层          │        │   save_note           │  │  │
│  │  │                      │        │   delete_note → trash │  │  │
│  │  │  styles.css 语义令牌  │        │   resolve_markdown_file│ │  │
│  │  │  theme.ts 主题持久化  │        │                       │  │  │
│  │  └──────────────────────┘        └───────────┬──────────┘  │  │
│  │   ▲ 前端资源已内嵌（custom-protocol）          │              │  │
│  └───┼─────────────────────────────────────────┼──────────────┘  │
│      │                                          │                 │
│      │ localStorage                             │ fs::read/write  │
│      │ · markdown-hub-directory  ← 记住上次目录   │ trash::delete  │
│      │ · markdown-hub-theme      ← 记住主题选择   ▼                │
│  ┌───┴──────────────┐                  ┌──────────────────────┐  │
│  │ %LOCALAPPDATA%\  │                  │  你选择的笔记目录      │  │
│  │ com.markdownhub  │                  │  ├─ 笔记一.md         │  │
│  │ .app\EBWebView\  │                  │  ├─ 笔记二.md         │  │
│  └──────────────────┘                  └──────────────────────┘  │
│                                         （应用只读写这里的 .md）  │
└──────────────────────────────────────────────────────────────────┘

旁路（只在 GitHub 上跑，不参与运行时）：
  源码仓库 ──push main──► CI 工作流（tsc / fmt / clippy / 版本号）
           ──push v* tag─► Release 工作流 → 安装包 → GitHub Releases
```

### 3.2 四条主要数据流

**① 打开应用 / 选择目录**

```
user 点「选择目录」
  → storage.chooseDirectory()  → tauri-plugin-dialog（系统对话框）
  → localStorage['markdown-hub-directory'] = 路径
  → setDirectory(路径) → useEffect → loadDirectory()
      → invoke('list_notes', { directory })
          Rust: root() 校验是目录 → canonicalize → read_dir
                过滤 .md → note_from_path() 读内容
                按 updated_at 倒序返回
  → setNotes([...]) → 侧栏渲染
```

**② 编辑 + 自动保存（含竞态处理）**

```
user 输入 → updateActiveNote() → revision.current++ ; dirtyId.current = id
  → useEffect（依赖 [activeNote, directory]）启动 650ms 防抖计时器
      → saveNote() → invoke('save_note')
          Rust: checked_file() 校验（必须在所选目录内 + 必须是 .md）
                title 变了 → fs::rename（unique_path 防重名）
                fs::write 内容 → 返回新的 Note
      → 用 revision 比对判断"保存期间用户是否又改了"
        · 没再改 → 清除 dirty 标记，用返回值覆盖状态
        · 又改了 → 保留用户当前输入，标记仍然 dirty
```

这段是前端最"讲究"的地方：**防抖 + revision 版本号**，避免"慢速写盘把用户后来的输入覆盖掉"。

**③ 拖放 / 选择文件打开（方案 A：切目录）**

```
user 拖入文件（或点「打开文件」）
  → getCurrentWebview().onDragDropEvent()（原生事件，能拿到真实路径）
  → invoke('resolve_markdown_file', { path })
      Rust: 存在性 → is_file()（挡文件夹）→ 扩展名必须是 .md
            → canonicalize 文件与父目录
            → 返回 { directory, noteId }
  → 若 directory 与当前一致：flushActiveNote() 后重新加载并选中
    否则：flushActiveNote() → preferSelect.current = noteId
          → setDirectory(新目录) → loadDirectory() 选中该笔记
```

**关键设计**：没有为了"打开任意路径的文件"去放宽 Rust 的目录校验，而是把"打开文件"翻译成**"切换到它所在目录 + 选中它"**——等价于用户手动"选目录 + 点那条笔记"。安全性一点没让步。

**④ 删除到回收站**

```
user 点 × → confirm("文件会被移动到系统回收站…")
  → invoke('delete_note')
      Rust: checked_file() 校验 → trash::delete(&file)
      → 文件进系统回收站，可从回收站还原
      → 前端从列表移除并选中相邻笔记
```

### 3.3 后端安全模型（3 层校验）

```rust
fn root(directory: &str) -> Result<PathBuf, String> {           // ① 目录必须是真目录
    let path = PathBuf::from(directory);
    if !path.is_dir() { return Err("所选路径不是有效目录".into()); }
    path.canonicalize().map_err(|e| e.to_string())              //    解析软链接/相对路径
}

fn checked_file(directory: &str, file_path: &str) -> Result<PathBuf, String> {  // ② 文件必须在该目录内
    let root = root(directory)?;
    let parent = file.parent().ok_or("文件路径无效")?.canonicalize()?;
    if parent != root || !is_md(&file) { return Err("只能操作所选目录内的 Markdown 文件".into()); }
    Ok(file)
}
// ③ 新建/改名时 unique_path() 逐一试探，避免覆盖同名文件
```

**注意 `canonicalize()` 是安全模型的关键**——它把 `..`、软链接、大小写差异等都归一化后再比较，否则 `C:\notes\..\windows\x.md` 这类路径可能绕过前缀检查。

### 3.4 前端三个"看不见但重要"的实现

**① 主题的三层设计（防闪白）**

| 层 | 文件 | 作用 |
|---|---|---|
| 首屏内联脚本 | `index.html` `<head>` | 在 React 渲染**之前**读 `localStorage` 并给 `<html>` 加 `.dark`，避免暗色用户看到一闪而过的白屏 |
| 运行时逻辑 | `src/theme.ts` | `system/light/dark` 三态、`matchMedia` 订阅系统主题变化、写 localStorage |
| 样式变量 | `src/styles.css` | `@theme`（亮）与 `.dark`（暗）两套令牌 |

三者的 localStorage key 必须一致（`markdown-hub-theme`），所以两处都有注释互相提醒。

**② 尾随保存状态机的 UI 反馈**

`saveState` 有 `idle / saving / saved / error` 四态，驱动右上角的彩色圆点（绿/黄/红）。这是"让用户相信数据安全"的廉价的信任设计。

**③ 拖放浮层**

`dragging` 状态由 `enter/over/leave/drop` 四个事件维护，浮层用 `pointer-events-none` 保证不挡住 drop 事件本身。

**④ 阅读模式：一个布尔值驱动的布局切换（v1.1.2）**

实现极简——**没有用任何"全屏 API"**，只是一个状态控制布局：

```tsx
const [readingMode, setReadingMode] = useState(false);

// ① 网格列数随模式变化（编辑器被移出 DOM，预览自然占满它让出的空间）
className={`grid … ${readingMode
  ? "xl:grid-cols-[260px_minmax(0,1fr)]"
  : "xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]"}`}

// ② 条件渲染，而不是用 CSS 隐藏
{!readingMode && <article>…编辑器…</article>}

// ③ 阅读时给内容限宽并居中
<div className={`preview … ${readingMode ? "mx-auto w-full max-w-[860px]" : ""}`}>
```

四个设计决定，每个都有理由：

1. **条件渲染而不是 `hidden`**：编辑器被真正移出 DOM，隐藏时不再参与布局与滚动计算
2. **读宽限 860px 并居中**：不限制的话长文一行会横跨 1800px 的窗口，眼睛很难跟行（排版常识：正文理想行长约 60~80 字符）
3. **保留左侧笔记列表**：阅读时最高频的动作是"接着读下一篇"，留着列表比"纯净全屏"更实用
4. **给了三条退出路径**（面板按钮 / 左上角「编辑笔记」/ `Esc`）：因为这个模式进和出的频率一样高，退出路径不能只有一条

**已知取舍**：该状态**不持久化**（重启回到双栏）——判断它是"临时视图状态"而非"偏好设置"。若要持久化，照 `theme.ts` 的模式加一个 localStorage key 即可（那是本项目的标准做法）。

**⑤ 导出 PDF：复用打印引擎，而不是自己画 PDF（v1.2.0）**

两条路摆在那里：**自己生成 PDF**（jsPDF / Rust 的 printpdf）还是**借用系统打印**。这个项目选了后者，理由：

```
预览面板已经是真实 DOM（react-markdown 的渲染结果）
        │
        ▼
@page A4 + @media print 规则  ──►  系统打印对话框  ──►  Microsoft Print to PDF
（排版/中文字体/分页全由浏览器引擎负责）              （矢量文字，可选中、可搜索）
```

只需一段 CSS + 一个按钮（约 130 行 CSS、20 行 TS）：

```css
@media print {
  @page { size: A4; margin: 18mm 16mm; }          /* 纸张与页边距 */
  :root, .dark { --color-paper: #ffffff; … }      /* ① 强制浅色：暗色模式导出也不出黑底 */
  .app-chrome, .app-sidebar, .app-editor { display: none !important; }  /* ② 只留正文 */
  .preview { overflow: visible !important; }      /* ③ 关键：滚动容器不改只打一屏 */
  .preview h1 { break-after: avoid-page; }        /* ④ 标题不落页尾 */
  .preview pre, table, blockquote, img { break-inside: avoid; }         /* 不跨页切断 */
}
```

三个值得记住的决定：

1. **为什么不给每个元素加 Tailwind 的 `print:hidden`**：`grid-cols-*` / `flex` 这些工具类和打印规则会互相抢 `display`，而 Tailwind 变体的生成顺序不适合承载"布局重置"。改用普通语义类名（`app-shell` / `app-chrome` / `app-grid` / `app-preview`）+ `!important`，行为确定、也更好读。
2. **用 CSS 变量切打印配色**：沿用主题那套令牌，在 `@media print` 里把 `:root` 和 `.dark` 同时覆盖成浅色——**零组件改动**就实现了"暗色模式导出白底"。
3. **语法高亮被主动压平**：`react-syntax-highlighter` 的颜色是**内联样式**，`oneDark` 的浅色 token 在白底上不可读，所以打印时统一压成深灰（`!important` 能盖过内联样式）。想保留彩色就得在打印前换 `oneLight` 主题重渲染一次（约 20 行），属于可选的后续优化。

**代价**：依赖系统打印对话框（用户要点两下、手动选打印机）。做到"一键直出到指定路径"要走 WebView2 的 `printToPDF`（CDP / `ICoreWebView2_16`），约再加 1~3 天，但打印 CSS 可以 100% 复用。

### 3.5 开发时间线（5 个阶段）

| 阶段 | 时间 | 做了什么 | 关键技术点 |
|---|---|---|---|
| **0. 手写脚手架**（会话前） | 未知 | `App.tsx` 479 行 + `lib.rs` 77 行的可运行原型；手写 `tauri.conf.json`、`Cargo.toml`、`vite.config.ts` | 无图标、无 `[features]` 表、Rust 紧凑单行风格 → 埋下 4 个坑（P3/P10/P12/P15）<br>[待补充：当时的参考资料与决策过程] |
| **1. 跑通 dev** | 09-16 17:21~17:34 | 修 PATH → 修 Vite 监听 → 生成图标 → `cargo build` 通过（exe 13.2 MB，版本资源正确） | PATH 环境快照、Windows 文件锁、tauri-build 资源注入 |
| **2. 开源准备** | 09-16 21:12~21:34 | `.gitignore`、`LICENSE(MIT)`、`CHANGELOG`、`bump-version.mjs`、`.vscode/settings.json`、`git init` + 首次提交 + push | 应用类项目要提交锁文件；`.gitattributes` 统一 LF；仓库名叫 **Meow-Mark**（与应用名不一致） |
| **3. CI/CD 与元数据** | 09-16 22:42 | `ci.yml` + `release.yml` + `dependabot.yml`；补 `repository` 字段；按 rustfmt 重排 + 修 clippy | 预演 CI 才发现"一上来就会红"（P12） |
| **4. v1.0.0 → v1.1.0** | 09-16 晚 ~ 09-17 | v1.0.0：tag → CI 构建（5m28s）→ 手动 Publish；随后 README 徽章 + CHANGELOG；再做三个新功能 → v1.1.0 | 暗色/拖放/回收站；**tag 打早事故**（P13）；**删 draft 丢资产**（P14） |
| **5. v1.1.1 与工程收尾** | 09-18 | 控制台窗口修复（P15）；bump 脚本补 Cargo.lock + 工作区守卫（P16/P13 的根治）；3 次提交 + bump + tag；合并 4 个依赖 PR | PE 头验证子系统；把"流程教训"变成脚本里的硬约束 |
| **6. v1.1.2 阅读模式** | 09-19 | 预览面板加「全屏阅读」、左上角加「编辑笔记」、`Esc` 退出；一次走完 feat → docs → bump → tag → 校验 tag 内容 | 第一次**完整走通**发布闭环：功能 → CHANGELOG → 版本号 → tag → `git show <tag>:<文件>` 确认内容；同时暴露"未跟踪文件会让 bump 守卫中止"（P22） |
| **7. v1.2.0 导出 PDF** | 10-30 | 预览面板加「导出 PDF」，走系统打印对话框；`styles.css` 增加整段 `@media print` | 复用打印引擎而非自研 PDF：CSS 变量切打印配色、语义类名做布局重置、`overflow: visible` 解决"只打一屏"（P23）；发版时发现**系统时间已是 10-30**（v1.1.2 是 09-19），CHANGELOG 日期写错后修正并移 tag |

---

## 4. 踩坑记录

> 分类：**A 环境与工具链 / B 构建与打包 / C Git 与 GitHub / D CI 与发布 / E Windows 细节 / F 认知误区**
> 每条都是真实发生过的，报错文本为原文摘录。

### A. 环境与工具链

#### P1. `cargo program not found`——装完 Rust 却找不到 cargo

- **问题描述**：装好 VS C++ 与 Rust 后执行 `npm.cmd run tauri dev`：
  ```
  failed to run 'cargo metadata' command to get workspace directory:
  failed to run command cargo metadata --no-deps --format-version 1: program not found
  ```
- **原因分析**：Rust 装在 `D:\Rust\.cargo\bin`，安装器把该路径写进了**注册表**的用户 PATH（`HKCU\Environment`），但 Windows 不会给**已经在运行的进程**推送环境变量变更。当时那个 PowerShell / IDE 是安装前启动的，继承的是旧 PATH。证据：注册表里 `D:\Rust\.cargo\bin` 是第一项，而新开的进程能正常找到 cargo。
- **解决方案**：完全退出终端（如果命令跑在 VS Code / PyCharm 的集成终端里，要**退出整个 IDE**）再重开；临时救急可在当前会话：
  ```powershell
  $env:Path = "D:\Rust\.cargo\bin;" + $env:Path
  $env:CARGO_HOME = "D:\Rust\.cargo"; $env:RUSTUP_HOME = "D:\Rust\.rustup"
  ```
  （补 `CARGO_HOME`/`RUSTUP_HOME` 是必要的：`.cargo\bin\cargo.exe` 是 rustup 代理，缺这两个变量它会去找默认的 `%USERPROFILE%\.rustup` 而报"无默认工具链"。）
- **经验教训**：**"环境变量是进程启动时的快照"** 这条适用于所有工具链安装（Node、Python、Java、Rust…）。装完任何"要加进 PATH"的东西，第一反应就是"重启终端/IDE"，而不是怀疑安装失败。

#### P2. PowerShell 5.1 不支持 `&&`

- **问题描述**：`git push && git push --tags` 报：
  ```
  The token '&&' is not a valid statement separator in this version.
  ```
- **原因分析**：`&&` 是 **PowerShell 7+** 的语法；本机是 Windows PowerShell **5.1.19041.5848**。而且这是**解析错误**——整行命令都不会执行，所以现象看起来像"命令没反应/不管用"，而不是"push 失败"。
- **解决方案**：分行写，或用分号 + `$?`：
  ```powershell
  git push
  git push --tags
  # 或
  git push; if ($?) { git push --tags }
  # 或用 pwsh 7
  pwsh -Command "git push && git push --tags"
  ```
- **经验教训**：看到"命令没反应"先看**有没有解析错误**（红色 `ParserError`），它和运行时报错是两类问题。

#### P3. `npm run tauri build --no-bundle` 里的参数被 npm 吃掉

- **问题描述**：想跳过打包、只出 exe，于是跑 `npm.cmd run tauri build --no-bundle`，结果它**仍然去打包**，并卡在下载 WiX：
  ```
  Info Patching ...\markdown-hub.exe with bundle type information: msi
  Info Verifying wix package
  Downloading https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip
  failed to bundle project: `timeout: global`
  ```
- **原因分析**：`npm run <script> <args>` 里，**以 `--` 开头的参数会被 npm 当成自己的配置**，不会转发给脚本。`--no-bundle` 更特殊：npm 的 `--no-xxx` 语法表示"把配置 xxx 设为 false"，于是它被静默吞掉，tauri CLI 只收到了 `build`（= 完整打包）。实验证据：
  ```
  $ npm.cmd run tauri --version      → 11.13.0            ← 这是 npm 自己的版本，参数被吃了
  $ npm.cmd run tauri -- --version   → tauri-cli 2.11.4   ← 加了 -- 才传进去
  ```
- **解决方案**：**给 tauri 传参数一律加 `--` 分隔符**：
  ```powershell
  npm.cmd run tauri -- build --no-bundle
  npm.cmd run tauri -- build --bundles nsis
  npm.cmd run tauri -- icon app-icon.svg
  ```
- **经验教训**：npm / yarn / pnpm 转发参数的规则都类似；凡是"脚本没按我给的参数执行"，第一件事是确认参数到底有没有传进去（用一个无害的参数做实验，比如 `--version`）。

### B. 构建与打包

#### P4. Vite 报 `EBUSY: resource busy or locked`

- **问题描述**：`tauri dev` 编译到一半，Vite 进程崩溃：
  ```
  Error: EBUSY: resource busy or locked, watch
  'D:\AgentWork\markdown app\src-tauri\target\debug\build\serde_core-.../build_script_build-....exe'
  Error The "beforeDevCommand" terminated with a non-zero status code.
  ```
- **原因分析**：Vite 默认监听**项目根目录下所有文件**，而 `src-tauri/target/` 就在根目录里。cargo 编译时会不断创建/独占锁定 `.exe`、`.dll`；Windows 对"已被独占锁定的文件"调用 `fs.watch` 会返回 `EBUSY`，chokidar 把它作为 `'error'` 事件抛出，Node 无 handler → Vite 进程退出 → `beforeDevCommand` 非零退出 → `tauri dev` 中止。
- **解决方案**：在 `vite.config.ts` 里排除该目录（官方 Tauri + Vite 模板默认就有这条，手写配置时漏了）：
  ```ts
  server: {
    port: 5173,          // 与 tauri.conf.json 的 devUrl 对齐
    strictPort: true,    // 端口被占直接报错，避免 devUrl 失配
    watch: { ignored: ['**/src-tauri/**'] },
  }
  ```
  验证方式：用 Vite 内置的 picomatch 语义测过——出错的 `.exe` 路径确实命中 `**/src-tauri/**`，而 `src/`、`dist/` 仍被监听。
- **经验教训**：**"源文件目录"和"构建产物目录"必须物理分离或显式排除**，否则任何文件监听器（Vite、webpack、IDE、同步盘）都会和编译器抢文件锁。Windows 上尤其明显。

#### P5. 下载 WiX 超时 `failed to bundle project: 'timeout: global'`

- **问题描述**：本地 `tauri build` 编译成功（`Finished release profile in 1m 17s`），但打包阶段卡死：
  ```
  Downloading https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip
  failed to bundle project: `timeout: global`
  ```
- **原因分析**：Tauri 自己**不带**安装包生成器，它按需从 GitHub 下载 **NSIS 3.11**（出 `-setup.exe`）和 **WiX 3.14.1**（出 `.msi`），带 SHA 校验，缓存到 `%LOCALAPPDATA%\tauri`。本地网络访问 GitHub 很慢（同一时期 `git push` 都要 24~30 秒并出现过 HTTP 408），十几 MB 的 WiX 包直接超时。注意默认 `bundle.targets: "all"` 会**先做 MSI**，所以第一个卡住的就是 WiX。
- **解决方案**（按推荐度）：
  1. **交给 CI**：GitHub Actions 的 runner 在海外，下载是秒级，且能自动创建 Release（本项目最终走的路）
  2. **只出 NSIS**（跳过 WiX）：`npm.cmd run tauri -- build --bundles nsis`
  3. **镜像**：`$env:TAURI_BUNDLER_TOOLS_GITHUB_MIRROR_TEMPLATE = 'https://镜像/<owner>/<repo>/releases/download/<version>/<asset>'`
  4. 只出独立 exe：`npm.cmd run tauri -- build --no-bundle`
- **经验教训**：**"构建依赖要从外网下载"是 CI 存在的核心理由之一**。另外要区分"编译失败"和"打包失败"——这次编译其实已经成功，产物 `target\release\markdown-hub.exe` 是好的，失败只发生在打包阶段。

#### P6. `` `icons/icon.ico` not found ``

- **问题描述**：`cargo build` 时 build script 失败：
  ```
  `icons/icon.ico` not found; required for generating a Windows Resource file during tauri-build
  ```
- **原因分析**：`tauri-build` 在 Windows 上要往 exe 里嵌**资源**（图标 + 版本信息），默认读 `icons/icon.ico`。项目是手写搭起来的，`src-tauri/icons/` 目录**根本不存在**（`create-tauri-app` 生成的模板会自带一整套图标）。
- **解决方案**：做一张源图 → 用 Tauri CLI 生成全平台图标：
  ```powershell
  npm.cmd run tauri -- icon app-icon.svg
  ```
  源图用的是**纯路径、不含 `<text>`** 的 SVG（`resvg` 渲染文字依赖系统字体，缺字体容易渲染空白）。生成后 `bundle.icon` 也显式列了 5 个文件。
- **经验教训**：**用脚手架创建项目能省掉一整类"模板默认文件缺失"的坑**。手写配置虽然更"干净"，但会漏掉模板里那些看不出用途、实际上是必需的默认项（本项目漏了 4 个：icons、`[features]`、`windows_subsystem`、`.gitignore`）。

#### P7. 缺少 `[features] custom-protocol`——release 构建会直接失败

- **问题描述**：审查配置时发现 `Cargo.toml` 里没有 `[features]` 段，而 Tauri 的标准模板里有：
  ```toml
  [features]
  # DO NOT REMOVE!!
  custom-protocol = ["tauri/custom-protocol"]
  ```
  判断：`tauri build` 会传 `--features custom-protocol`，而 cargo 对未定义的 feature 会报错。核实方式：在 CLI 的原生模块 `cli.win32-x64-msvc.node` 里搜到了 `custom-protocol` 字符串。
- **原因分析**：这个 feature 的作用是让 `tauri` crate **把 `dist/` 前端资源编译进二进制**（生产模式）而不是去连 dev server。模板注释写着 `DO NOT REMOVE`，因为缺了它 release 构建在生产资源解析上会走错分支。
- **解决方案**：补上定义并验证：
  ```toml
  [features]
  custom-protocol = ["tauri/custom-protocol"]
  ```
  ```
  $ cargo tree --features custom-protocol -f "{p} :: {f}" --depth 1
  markdown-hub v1.0.0 :: custom-protocol
  └── tauri v2.11.5 :: …,custom-protocol,…
  ```
- **经验教训**：**"编译能过"不代表"打包能过"**。生产构建特有的 feature、资源、开关，要在发布前**真的跑一次 release 构建**才能发现。

### C. Git 与 GitHub

#### P8. 首次 push 被拒：其实一次提交都没有

- **问题描述**：VSCode 里点发布，报：
  ```
  error: failed to push some refs to 'https://github.com/jiang0109/Meow-Mark.git'
  ```
  同时 VSCode 的 Git 日志里反复出现 `[warning] [Git][getBranch] No such branch: main`。
- **原因分析**：VSCode 完成了 `git init` 并把 75 个文件**暂存**了，但**没有提交**。没有提交 → 没有 ref 可推 → git 报 "failed to push some refs"；而 `No such branch: main` 是因为 unborn branch 在 `for-each-ref` 里查不到。诊断证据：
  ```
  git rev-list --all --count   → 0
  git status -sb               → ## No commits yet on main
  git diff --cached --name-only → 75      ← 已经暂存好了
  ```
- **解决方案**：`git commit -m "..."` 一次，然后 push。
- **经验教训**：Git 的四层概念要分清——**工作区 → 暂存区 → 本地提交 → 远端**。报错信息指向的往往不是真正的瓶颈层；`git status` / `git rev-list --count` 是最快的定位工具。

#### P9. 推送慢 + HTTP 408

- **问题描述**：同一个提交推送失败一次、第二次成功，每次都耗 24~30 秒：
  ```
  git push -u origin main [23961ms]
  error: RPC failed; HTTP 408 curl 22 The requested URL returned error: 408
  send-pack: unexpected disconnect while reading sideband packet
  fatal: the remote end hung up unexpectedly
  ```
- **原因分析**：408 是**服务器端超时**（GitHub 等数据等不到就掐连接）。本地操作完全正常（`git status` 只要 50 ms），时间全花在网络上。首次推送要传 75 个文件（含图标，约 500 KB），按 24 秒算实际吞吐只有 ~20 KB/s。
- **解决方案**：重试（第二次就成功了）；长期可选：`git config --global http.version HTTP/1.1`、`http.postBuffer`、改用 SSH（必要时走 443 端口）、配代理；另外**小步提交、勤推送**能显著降低撞上超时的概率。
- **经验教训**：**"慢"要区分是本地慢还是网络慢**——用日志里的耗时数据判断，而不是猜。VSCode 的 Git 日志（`%APPDATA%\Code\logs\...\vscode.git\Git.log`）会记录每条 git 命令的毫秒数，是排查这类问题的利器。

#### P10. 提交被拒：提交信息为空

- **问题描述**：点"提交和推送"后卡了 30 秒，然后：
  ```
  git -c user.useConfigOnly=true commit --quiet [30226ms]
  Aborting commit due to empty commit message.
  ```
- **原因分析**：git **硬性要求**非空提交信息（纯空格也算空）。实测：
  ```
  git commit -m " "   → Aborting commit due to empty commit message（exit 1）
  git commit -F 空文件 → 同样被拒
  git commit --allow-empty-message -F 空文件 → 成功（但没必要）
  ```
- **解决方案**：在消息框里写字再提交；顺带养成 **Conventional Commits** 习惯（`feat:` / `fix:` / `docs:` / `chore:` / `ci:`），这也是以后接 release-please 自动生成 CHANGELOG 的前提。
- **经验教训**：**"操作失败"要看返回的原文**——`Aborting commit due to empty commit message` 明确说了原因，比"提交没成功"这种描述有用得多。

#### P11. 缺 `repository` 字段（cargo 警告）

- **问题描述**：`cargo package --list` 报警告：
  ```
  warning: manifest has no license, license-file, documentation, homepage or repository
  ```
- **原因分析**：`LICENSE` 文件只是**给人看、给 GitHub 识别**的法律文本；工具链读的是元数据里的 **SPDX 标识**（`license = "MIT"`）。两者受众不同，不重复。同理 `repository` 用于依赖扫描器、Dependabot、crates.io 链接。
- **解决方案**：`Cargo.toml` / `package.json` 补 `license = "MIT"` 与 `repository`。
- **经验教训**：**"文件"和"元数据"是两套体系**——LICENSE 文件管法律效力，`license` 字段管机器可读。写 SPDX 标识要精确（`"MIT"` 而不是 `"MIT License"`）。

### D. CI 与发布

#### P12. 预演 CI 才发现"一上来就会红"

- **问题描述**：写完 `ci.yml` 后，本地把 CI 要跑的命令逐条跑了一遍，发现两个问题：
  ```
  $ cargo fmt --check
  Diff in ...\build.rs:1:
  -fn main() { tauri_build::build() }        ← 紧凑单行风格不符合 rustfmt
  ...
  $ cargo clippy --all-targets -- -D warnings
  error: consider using `sort_by_key`
    --> src\lib.rs:49:5
    --> notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
  ```
- **原因分析**：① 手写代码用了紧凑单行风格，rustfmt 默认风格要求展开；② `clippy` 的 `unnecessary_sort_by` lint 在 `-D warnings` 下升级为错误。
- **解决方案**：`cargo fmt` 重排（纯空白改动）+ 改成语义等价的写法：
  ```rust
  notes.sort_by_key(|a| std::cmp::Reverse(a.updated_at));
  ```
  并在 CI 里保留 `-D warnings`（把警告当错误，长期收益大于一次性的修复成本）。
- **经验教训**：**引入 CI 之前，先在本地把 CI 要跑的命令跑一遍**。CI 第一次就红会让人对 CI 失去信任，也浪费时间在"来回推提交"上。这份"本地预演"后来成了固定动作。

#### P13. ⭐ tag 打早：发布了内容不对的 v1.1.0

- **问题描述**：v1.1.0 的 Release 构建成功了，但产物里**没有新功能**（暗色模式、拖放、回收站全都没有），版本号却写着 1.1.0。
- **原因分析**：`bump-version.mjs --git` 的设计是**只 `git add` 那 4 个版本文件**再提交（避免把无关改动卷进"版本提交"）。当时三个新功能的代码**还没提交**，于是：
  ```
  c0733b7  chore(release): v1.1.0    ← 只改了 4 个版本文件；tag v1.1.0 打在这里
  13ca79d  1.1.0                     ← 新功能代码在 tag 之后才提交（470 行）
  ```
  实测确认：`git show v1.1.0:src-tauri/src/main.rs` 里没有任何新功能代码，`src/theme.ts` 在 tag 里根本不存在。而 CI 的"tag 与版本号一致性"校验**只比版本号**，两边都是 1.1.0，所以校验通过——它防不住这种错误。
- **解决方案**：
  1. 取消/等待那次错误的构建，删掉它生成的 draft Release
  2. 把 tag 移到正确提交：
     ```powershell
     git tag -fa v1.1.0 -m "Markdown Hub v1.1.0"
     git push origin v1.1.0 --force
     ```
     （force 推 tag 的前提：那个 release 还没发布过，没人下载过）
  3. **根治**：给脚本加"工作区必须干净"守卫，并在发布检查清单里加一条"从 tag 里读文件确认内容"
- **经验教训**：
  - **`tag` 是"某个提交的快照指针"，它不关心你的工作区**。发布前必须确认"tag 指向的提交真的包含你要发的代码"——最直接的验证就是 `git show <tag>:<关键文件>`。
  - **版本号一致 ≠ 内容正确**。所有自动化校验都有覆盖不到的盲区，关键路径上仍需一次人工确认。
  - 任何"只提交部分文件"的自动化脚本，都要配一个"工作区干净"的前置检查。

#### P14. 删了 draft Release 导致安装包资产丢失

- **问题描述**：v1.1.0 的 Release 页面已经发布，但 **Assets 是空的**，`releases/latest` 里没有 exe 可下载。
- **原因分析**：GitHub 上 **Actions 的构建产物只上传到 Release**，不在别处留副本。操作顺序是：CI 把资产传到 draft → 用户把它删了（**资产随 release 一起被删**）→ 又手动新建了一个 release（空壳）。API 显示这个 release 的 `author` 是 `jiang0109`（手动创建），而正常的应是 `github-actions[bot]`；`assets: []`。
- **解决方案**：在 Actions 里**重跑那次正确提交的 Release run**（不是重跑错误那次的），tauri-action 按 tag 找到已存在的 release 并把资产补传上去。
- **经验教训**：
  - **不要手动删除 Release 来"重来"**——资产会一起没。要重来就重新触发构建。
  - 有 tag 就有 CI 生成的 draft，正常流程是"**编辑草稿 → 写文案 → Publish**"，不需要手动 New release（一个 tag 只能对应一个 release，手动建会和 CI 冲突）。
  - `author` 字段是判断"这个 release 是 CI 建的还是手动建的"的可靠线索。

#### P15. Windows release 版多弹一个命令行窗口

- **问题描述**：安装 1.1.0 后启动，除了应用窗口还多一个黑色命令行窗口；关掉它会连带把应用一起结束。
- **原因分析**：Windows 上的 Rust 二进制默认编译成**控制台子系统程序**。Tauri 官方模板 `main.rs` 里有一行（注释 `DO NOT REMOVE!!`）专门关掉它，而我们的 `main.rs` 只有 3 行、没有这行。实测 PE 头里的 Subsystem 字段：
  ```
  target\debug\markdown-hub.exe    Subsystem=3 → Console
  target\release\markdown-hub.exe  Subsystem=3 → Console   ← 就是安装的那个版本
  ```
- **解决方案**：
  ```rust
  // 阻止 Windows 在 release 构建中额外弹出命令行窗口。
  // dev 构建（`tauri dev`）仍然是控制台程序，方便在终端里看日志。
  #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

  fn main() { markdown_hub_lib::run(); }
  ```
  重新构建后：release exe `Subsystem=2 → Windows GUI` ✓，debug exe 仍是 Console（刻意保留，方便 dev 看日志）。
- **经验教训**：
  - **`#![...]` 这种 crate 级属性必须放在文件最顶部**，在 `fn main` 之前。
  - 判断"是不是控制台程序"有个不看源码的硬核方法：**直接读 PE 头的 Subsystem 字段**（见附录 B）——Subsystem 2 = GUI，3 = Console。
  - 又是"模板默认项缺失"这一类（同 P3 图标、P7 features）。

#### P16. `Cargo.lock` 里的根包版本没被同步

- **问题描述**：bump 到 1.1.1 之后，`git status` 总是多出一个 `src-tauri/Cargo.lock` 修改：
  ```diff
   name = "markdown-hub"
  -version = "1.0.0"
  +version = "1.1.0"
  ```
- **原因分析**：`Cargo.lock` 里除了依赖，也会记录**根包自己**的版本；脚本原先只同步 `tauri.conf.json` / `package.json` / `package-lock.json` / `Cargo.toml` 四处，cargo 下次运行时才把它刷新，于是工作区总是脏的——而这正是 P13 那类事故的温床。
- **解决方案**：脚本增加第 5 处同步（按 `[[package]]` + `name` 精确定位根包块，只改那一行），`version:check` 也改成校验五处；同时加了 `--git` 前的工作区干净守卫：
  ```
  ✖ 工作区还有未提交的改动，请先提交（或 git stash）再改版本号，
  否则 tag 会打在缺少这些改动的提交上：
    CHANGELOG.md
    scripts/bump-version.mjs
    src-tauri/src/main.rs
  ```
- **经验教训**：**"生成物里也有需要同步的真相"**。改一处配置后，要扫一遍所有"记录了同一事实"的文件（版本号这种事经常散落在 4~6 个文件里）。用脚本集中管理，并让 CI 校验，比靠记忆可靠。

#### P17. 依赖 PR 大版本升级需要人工判断（tauri-action 0→1）

- **问题描述**：Dependabot 提了 `tauri-apps/tauri-action` 0→1、`actions/checkout` 4→7、`setup-node` 4→7 三个大版本 PR，每个都显示 CI 绿。
- **原因分析**：**绿色勾只覆盖"这个 PR 触发的 CI 工作流"**。`ci.yml` 并不使用 `tauri-action`（只在 `release.yml` 里用），所以那个 PR 的 CI **完全没验证**它。查上游 `action.yml` 才知道 v1 保留了 `releaseDraft`/`releaseName`/`releaseBody` 等输入（我们用的都在），但带来了两个行为变化：
  - `draft: true` 但对应 release 已不是 draft 时 **action 直接失败**
  - action 现在会**覆盖已有 release 的标题和正文**
- **解决方案**：合并前列出"这个 PR 的改动是否被 CI 实际覆盖"，对没覆盖的（tauri-action）去读上游 changelog/action.yml 做人工判断；把"CI 绿 ≠ 已验证"写进判断标准。
- **经验教训**：**CI 的绿灯只证明"跑了的那些检查通过了"，不证明"这个改动被验证了"**。评审自动化 PR 时要问一句："它的改动落在哪个工作流里？那个工作流跑了吗？"

### E. Windows / VSCode 环境细节

#### P18. VSCode 集成终端继承的是"启动那一刻"的环境

- **问题描述**：IDE 里跑 `npm run tauri dev` 报找不到 cargo（同 P1）。
- **解决方案**：改 PATH 后**完整退出 IDE 再启动**（新开终端标签页无效）。
- **经验教训**：IDE、终端、服务都是"环境快照"的继承者；排查工具链问题先确认"这个进程是什么时候启动的"。

#### P19. 执行策略导致 `npm` 不能直接用

- **问题描述**：PowerShell 里 `npm` 会因脚本执行策略被拦住，只能用 `npm.cmd`。
- **原因分析**：`Get-ExecutionPolicy -List` 显示各作用域全是 `Undefined`（即默认 `Restricted`），`npm.ps1` 无法运行。
- **解决方案**：统一用 `npm.cmd`；或 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 一次性放开。
- **经验教训**：Windows 上"命令找不到/不能执行"有两个高频原因：**PATH** 和 **执行策略**（`.ps1` 被拦）。前者用 `Get-Command` 排查，后者用 `Get-ExecutionPolicy -List`。

#### P20. 编码/换行符的显示陷阱

- **问题描述**：用 PowerShell `Get-Content` 读自己写的 UTF-8 文件，中文显示成乱码（`璁稿彲璇` 之类），一度以为文件写坏了。
- **原因分析**：PowerShell 5.1 的 `Get-Content` 默认按**ANSI（中文系统上是 GBK）**解码 UTF-8 文件 → 显示乱码，但文件本身没问题（用正确的方式读出来完全正常）。另外 `git` 也提示过 `LF will be replaced by CRLF`。
- **解决方案**：读文件用能指定 UTF-8 的工具；仓库层面加 `.gitattributes` 统一换行符：
  ```
  * text=auto eol=lf
  *.cmd text eol=crlf
  *.bat text eol=crlf
  *.png binary
  ```
- **经验教训**：**"乱码"和"文件损坏"是两件事**——先确认是"读的程序解码错了"还是"写的内容真的错了"。跨平台项目应在仓库层用 `.gitattributes` 固定换行符，而不是靠每个人的 IDE 设置。

### F. 认知误区（不是 bug，但代价很大）

#### P21. 关于"哪个 exe 才是最新代码"的三个误区

- **误区 1：改完源码 exe 会自动更新。** 不会。`tauri dev` 只产出 `target/debug/`，release exe 只有显式 `tauri build` 才生成。实测两个文件：
  ```
  target\debug\markdown-hub.exe     09-16 17:34   12.7 MB   ← 旧
  target\release\markdown-hub.exe   09-18 13:44    8.8 MB   ← 新
  ```
- **误区 2：用 `localhost:5173` 判断"前端有没有内嵌"。** 这个判据是**错的**——该字符串来自被 `generate_context!` 内嵌的**配置**（`devUrl` 字段），生产构建里同样存在。A/B 实测：
  | 搜索关键字 | debug exe | release exe |
  |---|---|---|
  | `index-*.js`（dist 产物名） | 未找到 | **找到** ✓ |
  | `localhost:5173` | 找到 | **也找到**（不能作为判据） |
  正确判据是"**dist 的资源名是否出现在 exe 里**"。
- **误区 3：dev 模式能验证"脱离 Vite 独立运行"。** 不能。dev 模式的前端来自 dev server，只有 release 构建才内嵌。验证独立运行必须双击 release exe。
- **解决方案**：建立"源码修改时间 vs exe 生成时间"的自查习惯：
  ```powershell
  $exe = Get-Item .\src-tauri\target\release\markdown-hub.exe
  $newest = Get-ChildItem .\src, .\src-tauri\src, .\index.html -Recurse -File |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($exe.LastWriteTime -gt $newest.LastWriteTime) { 'exe 是最新的' } else { '需要重新 build' }
  ```
- **经验教训**：**测试对象必须是"最终产物"，而不是"看起来差不多的东西"**。不确定某个验证手段有没有效时，做一次 A/B 对照（拿一个已知正确/已知错误的样本各测一次），这是本项目里反复用到的方法。

### G. 工具与流程的摩擦

#### P22. 未跟踪的文件会让 `bump-version.mjs --git` 的工作区守卫中止

- **问题描述**：v1.1.2 发布时执行 `npm.cmd run version:bump -- patch --git`，被守卫拦下：
  ```
  ✖ 工作区还有未提交的改动，请先提交（或 git stash）再改版本号，
  否则 tag 会打在缺少这些改动的提交上：
    PROJECT_RETROSPECTIVE.md
  ```
  而那个文件是一份刚生成、还没决定要不要入库的复盘文档。
- **原因分析**：守卫用的是 `git status --porcelain`，它把**未跟踪文件（`??`）也算作"不干净"**。守卫的本意是防 P13（tag 打在缺功能的提交上），但在"仓库里存在刻意不跟踪的文件"时会误伤。这是**我们自己引入的摩擦**，不是外部工具的坑。
- **解决方案**：三选一——① 提交它（`docs:`）；② 加进 `.gitignore`（明确不进库）；③ 改用 `version:bump -- patch`（不带 `--git`）+ **显式 `git add` 那 5 个版本文件** + 手动 `git tag -a`。这次选了 ③，并用 `git show v1.1.2:src/App.tsx` 复核 tag 内容，确保没有回到 P13 的老路。
- **经验教训**：
  - **守卫报错时先判断"它拦得对不对"，再决定绕过还是服从**。这次它拦的是一个刻意不跟踪的文件，属于误伤，所以绕过是安全的——但**必须用等价手段补上它原本提供的保障**（显式暂存 + 校验 tag 内容），否则就是把安全网拆了裸奔。
  - 反过来看，这条守卫的判据太宽：更精确的做法是"只检查**被跟踪文件**的改动 + 出现在源码目录下的未跟踪文件"。**这一点已在本轮收尾中修掉**：现在只有两类情况会阻塞发版——被跟踪文件有任何改动，或 `src/`、`src-tauri/`、`scripts/`、`.github/` 下出现未跟踪文件；根目录的文档/草稿不再阻塞。

### H. 打印 / 导出

#### P23. 打印时只输出一屏内容（滚动容器被截断）

- **问题描述**：v1.2.0 做导出 PDF 时发现，如果直接对现有预览面板 `window.print()`，PDF 里**只有当前可见的那一屏**，后面的内容全部丢失。
- **原因分析**：预览区是 `overflow-y: auto` 的**滚动容器**（`.preview` 带 `min-h-0 flex-1 overflow-y-auto`）。分页排版时，滚动容器只把"可见的那一段"交给排版引擎，其余内容不在文档流里。这是打印 CSS 最常见的坑，表现和"内容被裁掉"一模一样，很容易误判成字体/尺寸问题。
- **解决方案**：打印媒体里把它还原成普通文档流，并把祖先的裁剪与布局一起重置：
  ```css
  @media print {
    .preview {
      overflow: visible !important;   /* 关键 */
      height: auto !important;
      max-height: none !important;
      max-width: none !important;     /* 阅读模式的 max-w-[860px] 也要放掉 */
      padding: 0 !important;
    }
    .app-preview { overflow: visible !important; }  /* 面板的 overflow-hidden 圆角裁切 */
    .app-grid { display: block !important; }        /* grid/flex 也一起重置 */
  }
  ```
- **经验教训**：
  - **做打印/导出的第一步永远是"检查有没有滚动容器"**：任何 `overflow: auto|scroll`、`height: 100vh`、`max-height` 都可能让输出只剩一屏。
  - 换输出介质（屏幕 → 纸张/PDF）时要先重新想**容器语义**："屏幕上是视口内的滚动区，纸面上应该是无限长的文档流"。
  - 验证要朴素：拿一篇**明显超过一页**的笔记导出，看第二页有没有内容——别用短笔记测"能不能导出"。

---

## 5. 工程化与发布流程

### 5.1 端到端流程图

```
【开发】
 npm.cmd run tauri dev ──► Vite(5173) + target/debug/markdown-hub.exe
                          改 .tsx → HMR 秒级生效
                          改 .rs  → 自动重编译并重启应用
        │
        │ 手动冒烟：暗色三态 / 拖 .md / 拖 .txt 报错 / 打开文件 / 删除去回收站确认
        ▼
【提交】
 git add -A && git commit -m "feat: …"        ← Conventional Commits
 git push                                     ← 触发 CI（检查）
        │
        │  ★ 必须先把功能代码提交，再改版本号（P13 的教训）
        ▼
【版本】
 npm.cmd run version:bump -- patch --git
   ├─ 守卫：工作区不干净 → 直接中止
   ├─ 同步五处：tauri.conf.json / package.json / package-lock.json / Cargo.toml / Cargo.lock
   └─ commit "chore(release): vX.Y.Z" + 打附注 tag
        ▼
【推送 tag】
 git push; git push --tags                    ← 注意 5.1 里不能用 &&
        │
        ├───────────────► CI 工作流（main 分支）
        │                  版本号一致性 → npm ci → tsc+vite build
        │                  → rustfmt → clippy -D warnings
        │
        └───────────────► Release 工作流（v* tag）
                           tag ↔ 版本号一致性校验
                           → tauri-action 构建（含下载 NSIS/WiX）
                           → 上传 msi + nsis → **创建 draft Release**
        ▼
【发布】
 Releases 页面 → 打开 draft → 编辑文案 → 勾 Set as the latest release → Publish
        ▼
【用户】
 下载 setup.exe → 安装 → 首次运行（SmartScreen 提示「仍要运行」）→ 选择笔记目录
```

### 5.2 两个工作流详解

**`ci.yml`（质量门禁，推送 main / PR 时跑）**

| 步骤 | 作用 |
|---|---|
| `npm run version:check` | **放在 `npm ci` 之前**：纯 node 脚本不依赖 `node_modules`，1 秒内就能拦下"忘记同步版本号"的提交 |
| `npm ci` + `npm run build` | 前端类型检查 + 生产构建 |
| `cargo fmt --check` | 格式门禁 |
| `cargo clippy --all-targets -- -D warnings` | 静态检查，警告即错误 |
| `concurrency: cancel-in-progress` | 同一分支连续推送时取消旧任务，省额度 |
| `Swatinem/rust-cache` | 缓存 Rust 构建产物，把冷启动的十几分钟压到 30 秒级 |

跑在 `windows-latest` 上（Linux runner 需要额外装 `libwebkit2gtk` 等依赖，而本项目只发 Windows）。

**`release.yml`（自动发布，推送 `v*` tag 时跑）**

| 步骤 | 关键点 |
|---|---|
| `permissions: contents: write` | tauri-action 需要它才能创建 Release、上传资产 |
| **tag ↔ 版本号一致性校验** | 用 pwsh 读 `tauri.conf.json` 的 version，与 `GITHUB_REF_NAME` 比对，不一致直接 `throw` |
| `tauri-action@v1` | 自己执行 `beforeBuildCommand`（`npm run build`）→ release 编译（含 `custom-protocol`，把 dist 内嵌）→ 打包 → 创建 release |
| `releaseDraft: true` | 先出草稿，人工审核后再发布（避免自动把有问题的包放出去） |

**为什么这个组合可靠**：把"容易出错的人工步骤"（编译、打包、上传、创建 release）全部自动化，只留下"需要人判断"的一步（审核草稿并写文案）。

### 5.3 版本号单一来源机制

**权威来源：`src-tauri/tauri.conf.json` 的 `version`**——因为 `tauri-build` 用它写 exe 的 `FileVersion`/`ProductVersion` 资源，Tauri CLI 用它命名安装包（`Markdown Hub_<version>_x64-setup.exe`）。核实方式：读 `tauri-build` 源码，确认版本资源只来自 `config.version`（没有回退到 `CARGO_PKG_VERSION`）。

由此同步五处，并提供 `--check` 给 CI：

```
tauri.conf.json  ← 权威
  ├─ package.json
  ├─ package-lock.json（根包两处）
  ├─ src-tauri/Cargo.toml（仅 [package] 段）
  └─ src-tauri/Cargo.lock（仅根包那个 [[package]] 块）
```

脚本的两个"防呆"设计值得记住：
1. **严格单处匹配**：正则匹配数不等于 1 就中止，绝不乱改（防止误伤 `tauri = { version = "2" }` 这类依赖版本）
2. **`--git` 前置工作区检查**（P13 的根治）

### 5.4 依赖管理与维护实践

```yaml
# .github/dependabot.yml 要点
- package-ecosystem: npm        directory: /            weekly, 分组 minor+patch
- package-ecosystem: cargo      directory: /src-tauri   weekly, 分组 minor+patch
- package-ecosystem: github-actions  directory: /       monthly
```

- **分组（groups）**：minor + patch 合并成一个 PR，避免每周被几十个 PR 淹没
- **实践中的判断**：小版本（react 19.3、vite 8.3）CI 覆盖到就直接合；**大版本 action（checkout 4→7、tauri-action 0→1）要看"它的改动落在哪个工作流、那个工作流跑没跑"**（P17）
- **已知局限**：`package.json` 里大量依赖写的是 `"latest"`，Dependabot **无法为这类依赖生成升级 PR**（需要可比较的版本范围）——应改为 `^x.y.z`

### 5.5 发布检查清单（建议固化成习惯）

```
发布前
  □ 工作区干净（git status 无输出；若存在刻意不跟踪的文件，按 P22 的方式改为显式暂存 + 手动 tag）
  □ 用 `Get-Date` 校准发版日期再写进 CHANGELOG（v1.2.0 时曾按旧日期写错，白白 amend 了一次）
  □ 若本次动了预览区样式：用一篇**超过一页**的笔记试导出 PDF，确认能跨页（P23）
  □ npm.cmd run version:check 通过
  □ 本地冒烟：dev 模式走一遍主路径
  □ 功能代码已提交（不是"改了但没提交"）        ← P13
  □ version:bump -- patch|minor|major --git     ← 有工作区守卫兜底
  □ 从 tag 里读关键文件确认内容对得上：
       git show vX.Y.Z:src-tauri/src/main.rs
       git show vX.Y.Z:src/theme.ts
发布中
  □ git push; git push --tags（PowerShell 5.1 不能写 &&）
  □ CI 的 CI 工作流绿 + Release 工作流绿
  □ Release run 的 head_sha == tag 指向的提交
  □ draft 的 Assets 有 setup.exe + msi，时间戳是这次新生成的
发布后
  □ 编辑草稿文案 → 勾 Set as the latest release → Publish
  □ 下载 setup.exe 实装一次，验证版本号与本次修复/新功能
  □ CHANGELOG.md 的 [未发布] 内容归档到 [X.Y.Z]
  □ 不要手动删 Release 重来（资产会一起删，P14）
```

---

## 6. 收获与改进

### 6.1 这个项目学到了什么（按技术点）

**1. 桌面应用的构建模型（Tauri / Rust）**

- debug 与 release 是**两套独立产物**（`target/debug` vs `target/release`），前端是否内嵌由 `custom-protocol` feature 决定
- 二进制**子系统**（Console / GUI）是编译期确定的，不是运行时行为
- `tauri-build` 在编译期往 exe 注入图标与版本资源——所以"缺图标"是**编译失败**而不是运行时问题
- 首次 debug 编译 400+ crate 会产出**数 GB** 的 `target/`；`crate-type`、debuginfo、incremental 是体积的三个主要来源

**2. Windows 平台特性**

- **环境变量是进程启动快照**（PATH 类问题必须先重启终端/IDE）
- **文件独占锁**会让文件监听器崩溃（`EBUSY`）
- **回收站**是系统 API（`trash` crate 封装），不是"删到某个目录"
- **PE 头里的 Subsystem 字段**可以直接判断程序类型
- Windows Defender 实时扫描会显著拖慢大目录下的编译与 git 操作

**3. 工具链的"参数传递"规则**

- npm 的 `--` 分隔符：`npm run <script> -- <args>`；`--no-xxx` 会被 npm 当成配置吞掉
- PowerShell 5.1 与 7 的语法差异（`&&`）
- 执行策略（`ExecutionPolicy`）会拦住 `.ps1` 形式的命令

**4. Git 与发布工程**

- **tag 只是提交的指针**，与工作区状态无关；发布前必须验证"tag 里有什么"
- GitHub Release 与 tag 是一对一关系；资产只存在 release 上，删 release = 删资产
- 区分"CI 绿"与"这个改动被验证了"
- 依赖锁文件（`Cargo.lock` / `package-lock.json`）在**应用**项目里要提交，且里面也记录了根包版本

**5. CI/CD 设计**

- 触发条件就是"谁在什么时候跑什么"：`branches: [main]` 查质量，`tags: ['v*']` 出包
- 把"版本号一致性"这类业务规则写进 CI（用自写脚本 + `-check` 模式）
- 缓存（rust-cache / npm cache）是把 CI 从"十几分钟"压到"半分钟级"的关键
- `releaseDraft: true` 是"自动化 + 人工审核"的平衡点

**6. 前端工程**

- Tailwind v4 的 `@theme` + CSS 变量实现主题切换：**改数据而不是改代码**
- Tauri 原生拖放事件能拿到**文件系统路径**，HTML5 DnD 拿不到
- 防抖保存 + revision 号解决"异步写盘与用户输入竞争"
- 首屏主题闪白的解法是"在 React 之前用内联脚本套用主题"
- **"全屏阅读"不一定需要全屏 API**：隐藏一个面板 + 改网格列数 + 给正文限宽居中，就得到了比真全屏更好用的阅读视图（真全屏反而会把笔记列表也一起挡掉）
- **导出 PDF 不必自己画 PDF**：复用系统打印引擎（`@media print` + `@page`）就能得到矢量文字、正确中文、自动分页；真正要写的是**排版规则**，不是 PDF 生成器
- **CSS 变量的主题系统可以复用给打印**：同一个令牌集在 `@media print` 里覆盖一次，就得到"暗色模式下导出也是白底"——这是当初选"CSS 变量做主题"时没想到的额外收益

**7. 方法论层面（我认为最有价值的三条）**

- **A/B 对照验证**：不确定验证手段有效时，用一个已知正确的样本 + 一个已知错误的样本各测一次（本项目用它纠正了 `localhost:5173` 的错误判据）
- **本地预演 CI**：引入 CI 前先在本地把 CI 的命令跑一遍（P12）
- **把教训变成代码**：P13 的教训最终变成了脚本里的"工作区干净守卫"，而不是文档里的一句提醒

### 6.2 遗留技术债

| # | 债务 | 影响 | 建议 |
|---|---|---|---|
| 1 | **完全没有测试** | 每次改动靠手动冒烟；重构没有安全网 | Rust 侧先给 `clean_title` / `unique_path` / `checked_file` 写 `#[cfg(test)]`；前端上 Vitest 测 `theme.ts` 与保存状态机；CI 加 `cargo test` |
| 2 | **`crate-type` 含移动端产物** | `target/` 里多出 **693 MB** 的 `markdown_hub_lib.lib`，纯浪费 | 桌面端改成 `crate-type = ["rlib"]`（将来做移动端再加回）；顺带可给 dev profile 的依赖关掉 debuginfo |
| 3 | **`App.tsx` 单文件 24 KB / 657 行** | 主题/拖放/保存/列表/阅读模式全在一起，改动容易互相影响 | 拆 `useTheme` / `useDropZone` / `NoteList` / `Editor` / `Preview` / `useReadingMode` |
| 4 | **依赖写 `"latest"`** | Dependabot 无法升级这些依赖；本地与 CI 版本会漂移 | 改成 `^19.3.0` 这类明确范围 |
| 5 | **无前端 lint** | 只有 `tsc`，没有 ESLint/Prettier 门禁 | 加 ESLint + Prettier 与 `npm run lint`，进 CI |
| 6 | **无代码签名** | 用户看到 SmartScreen「未知发布者」 | 需要买 OV/EV 证书，配 `TAURI_WINDOWS_SIGNTOOL_PATH` 等 |
| 7 | **无自动更新** | 用户需手动下载新版 | `tauri-plugin-updater` + 签名密钥（放 GitHub Secrets） |
| 8 | **搜索只按标题** | 内容搜不到 | 内容搜索（可先在 Rust 侧加） |
| 9 | **非 UTF-8 文件被静默跳过** | `list_notes` 用 `filter_map(ok)` 吞掉了读取失败的文件，只在"打开文件"路径上有提示 | 列表里给出"该文件无法以 UTF-8 读取"的显式提示 |
| 10 | **README 无截图、无绿色版 zip** | 转化率与便利性 | 补一张截图；发一个 portable zip |
| 11 | **`release.yml` 的 `releaseBody` 是通用模板** | tauri-action v1 会覆盖已有 release 的正文，可能冲掉手写文案 | 把正式文案写进 `releaseBody`，或接受"每次重新编辑" |
| 12 | **仓库名与应用名不一致**（Meow-Mark vs Markdown Hub） | 略有认知成本 | 接受即可，或改仓库名（改 `identifier` 要慎重，见下） |
| 13 | **导出 PDF 依赖系统打印对话框** | 用户要点两下、手动选打印机，不能"一键直出到路径" | 若要一键直出：WebView2 `printToPDF`（CDP / `ICoreWebView2_16`），约 +1~3 天；打印 CSS 可 100% 复用（方案 B） |
| 14 | **打印时语法高亮被压平** | 代码块彩色 token 丢失 | 打印前切换 `oneLight` 主题重渲染（约 20 行），或接受纯文本 |

### 6.3 如果重做一遍，我会不一样的地方

1. **第一步用 `create-tauri-app` 生成骨架，再改成自己的**。这样能天然带上 4 个"模板默认项"：图标资源、`[features] custom-protocol`、`main.rs` 的 `windows_subsystem`、`.gitignore`——本项目 21 个坑里有 4 个直接来自这四处缺失。
2. **先建仓库和 CI，再写第一个功能**。顺序应该是：`git init` → `.gitignore` → CI 骨架 → 写代码。这样"CI 第一次就红"（P12）这类问题在项目只有 100 行时就暴露了。
3. **发布流程先跑一次"空发布"**（发个 v0.1.0），把 tag → CI → draft → Publish 的链路验证通畅，再投入做功能。P13/P14 两次事故都是"第一次真发布时才走流程"导致的。
4. **版本号从第一天就由脚本管理并进 CI**（本项目是后补的）。
5. **任何"生成物都含真相"的地方都写成脚本**（版本号五处、tag 一致性、exe 时间戳比对），不靠人记。
6. **从第一个 commit 就写测试**——哪怕只有 3 个测试。没有测试时，每次改动都要靠人工冒烟，而这个项目的改动越来越依赖"运行时行为"（拖放、主题、回收站），人工验证的成本越来越高。
7. **依赖版本一开始就 pin 明确的 semver 范围**，让自动化依赖工具真正起作用。
8. **`identifier` 从第一天就定成自己可控的域名**（本项目是 `com.markdownhub.app`；如果并不拥有 `markdownhub.app`，建议 `io.github.jiang0109.meow-mark`）。它决定 `%LOCALAPPDATA%\<identifier>` 数据目录，发布后再改会让用户"记住的笔记目录"丢失。

---

## 7. 附录

### A. 常用命令速查

```powershell
# 开发
npm.cmd run tauri dev                       # 热更新；F12 有 devtools；改 .rs 会自动重启
npm.cmd run build                           # 只做前端类型检查 + 构建

# 构建产物（注意 -- 分隔符！）
npm.cmd run tauri -- build --no-bundle      # 只出独立 exe（不下载 NSIS/WiX）
npm.cmd run tauri -- build --bundles nsis   # 只出 NSIS 安装包
npm.cmd run tauri -- build                  # msi + nsis（首次会下载打包工具）
npm.cmd run tauri -- icon app-icon.svg      # 重新生成图标

# 版本号
npm.cmd run version:check                   # 五处一致性（CI 用）
npm.cmd run version:bump -- patch --dry-run # 预览
npm.cmd run version:bump -- patch --git     # 改版本 + commit + 打 tag（有工作区守卫）

# 发布
git push; git push --tags                   # PowerShell 5.1 不能写 &&
```

### B. 验证手法速查（本项目反复用到的"硬核检查"）

```powershell
# ① 判断 exe 是 GUI 还是控制台程序（Subsystem 2=GUI, 3=Console）
$b = [System.IO.File]::ReadAllBytes("src-tauri\target\release\markdown-hub.exe")
$pe = [BitConverter]::ToInt32($b, 0x3C)
[BitConverter]::ToUInt16($b, $pe + 4 + 20 + 68)

# ② 判断 release exe 里有没有内嵌前端（用 dist 的资源名，不要用 localhost:5173！）
(Get-ChildItem dist\assets -Filter *.js).Name          # 先拿到文件名
Select-String -Path src-tauri\target\release\markdown-hub.exe -Pattern 'index-XXXX.js' -SimpleMatch -Encoding ascii

# ③ 判断 exe 是不是最新的（源码修改时间 vs exe 生成时间）
$exe = Get-Item src-tauri\target\release\markdown-hub.exe
$newest = Get-ChildItem src, src-tauri\src, index.html -Recurse -File | Sort-Object LastWriteTime -Desc | Select-Object -First 1
"$($exe.LastWriteTime)  vs  $($newest.Name) $($newest.LastWriteTime)"

# ④ 判断 tag 里到底有什么（发布前必做）
git show v1.1.1:src-tauri/src/main.rs
git show v1.1.0 --stat

# ⑤ 判断 tag 与版本号是否一致（CI 里也有这道校验）
npm.cmd run version:check; git tag

# ⑥ 只改指定文件的精确替换（避免正则误伤）——脚本里用的模式
#   正则匹配数 != 1 就中止
```

### C. `[待补充]` 清单（需要你补的信息）

1. **阶段 0（会话前的脚手架）**：这个项目最初为什么选 Tauri / React / Tailwind？参考了哪些教程或模板？手写 `tauri.conf.json` 而不是用 `create-tauri-app` 是有意为之还是当时不知道？
2. **产品思路**：为什么做 Markdown 笔记应用？"笔记即文件"这个核心主张是你自己的取舍还是参考了别的产品（Obsidian / Typora / Notable…）？
3. **仓库名 `Meow-Mark`** 的由来，以及为什么与应用名 Markdown Hub 不一致。
4. **`identifier = com.markdownhub.app`** 是否对应你实际拥有的域名？如果只是随手写的，是否要在首次发布前改成 `io.github.jiang0109.…`（现在改代价最小）。
5. **发布决策**：v1.0.0 之前是否已经装到别的机器上试过？v1.1.0 的事故你是怎么第一时间发现的（是自己下载安装发现的，还是看 Release 页面发现的）？
6. **后续规划**：有没有明确的下一个功能/版本目标（例如自动更新、内容搜索、多平台）？

### D. 参考资料

- Tauri v2 环境变量（`TAURI_BUNDLER_TOOLS_GITHUB_MIRROR` 等）：https://v2.tauri.app/reference/environment-variables/
- tauri-action（Release 自动化）：https://github.com/tauri-apps/tauri-action
- Tauri GitHub 发布指南：https://v2.tauri.app/distribute/pipelines/github/
- Windows 安装包（NSIS / WiX 的下载与缓存）：https://v2.tauri.app/distribute/windows-installer/
- `trash` crate（系统回收站）：https://crates.io/crates/trash
- Keep a Changelog：https://keepachangelog.com/zh-CN/1.1.0/
- 语义化版本：https://semver.org/lang/zh-CN/

---

## TL;DR（300 字以内）

**做了什么**：用 Tauri 2 + React 做的本地 Markdown 笔记应用 → 开源并发布 v1.0.0–v1.2.0：补图标与版本脚本、搭 CI（tsc/fmt/clippy/版本校验）、配 tag 自动出包（NSIS/MSI→Release），新增暗色模式、拖放打开、删除到回收站、阅读模式、导出 PDF。

**大坑（23 条）**：Rust 装完找不到 cargo（需重启终端）；Vite 被 cargo 锁文件搞崩；`--no-bundle` 被 npm 吞掉（要加 `--`）；打包工具下载超时（改由 CI 打包）；tag 打在功能提交前 → 发错包；删 Release 丢资产。

**三条经验**：改环境变量后必重启终端；发布前确认 tag 里的内容；把教训写成脚本硬约束。
