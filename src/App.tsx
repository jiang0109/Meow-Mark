import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  chooseDirectory,
  chooseMarkdownFile,
  createNote,
  deleteNote,
  getRememberedDirectory,
  listNotes,
  resolveMarkdownFile,
  saveNote,
} from "./storage";
import {
  applyTheme,
  getThemeChoice,
  setThemeChoice as saveThemeChoice,
  THEME_ICON,
  THEME_LABEL,
  THEME_ORDER,
  watchSystemTheme,
  type ThemeChoice,
} from "./theme";
import type { Note, SaveState } from "./types";

SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("java", java);
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function App() {
  const [directory, setDirectory] = useState(getRememberedDirectory);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(getThemeChoice);
  const [dragging, setDragging] = useState(false);
  /** 阅读模式：隐藏编辑器、预览放大居中（仅当前会话有效，不做持久化） */
  const [readingMode, setReadingMode] = useState(false);
  const dirtyId = useRef<string | null>(null);
  const revision = useRef(0);
  /** 切换目录后希望自动选中的笔记（拖入/选择文件时用） */
  const preferSelect = useRef<string | null>(null);
  /** 拖放监听只注册一次，用 ref 始终指向最新一次渲染的处理函数 */
  const dropHandler = useRef<(paths: string[]) => void>(() => {});
  const activeNote = notes.find((note) => note.id === activeId) ?? null;
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("zh-CN");
    return query
      ? notes.filter((note) =>
          note.title.toLocaleLowerCase("zh-CN").includes(query),
        )
      : notes;
  }, [notes, search]);

  useEffect(() => {
    if (directory) void loadDirectory(directory, preferSelect.current ?? undefined);
    preferSelect.current = null;
  }, [directory]);
  // 主题：应用当前选择；选择“跟随系统”时订阅系统主题变化
  useEffect(() => {
    applyTheme(themeChoice);
    if (themeChoice !== "system") return;
    return watchSystemTheme(() => applyTheme("system"));
  }, [themeChoice]);
  // 拖放：用 Tauri 的原生事件才能拿到真实文件路径（浏览器 HTML5 拖放拿不到）
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "enter" || payload.type === "over") {
          setDragging(true);
        } else if (payload.type === "leave") {
          setDragging(false);
        } else if (payload.type === "drop") {
          setDragging(false);
          dropHandler.current(payload.paths);
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch((error) => setMessage(`无法监听文件拖放：${errorText(error)}`));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  // 阅读模式：按 Esc 退出（阅读时最自然的返回方式）
  useEffect(() => {
    if (!readingMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReadingMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readingMode]);
  useEffect(() => {
    if (!activeNote || dirtyId.current !== activeNote.id) return;
    const snapshot = activeNote;
    const snapshotRevision = revision.current;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const saved = await saveNote(directory, snapshot);
        if (revision.current === snapshotRevision) dirtyId.current = null;
        setNotes((current) =>
          current.map((note) =>
            note.id === snapshot.id
              ? revision.current === snapshotRevision
                ? saved
                : { ...saved, title: note.title, content: note.content }
              : note,
          ),
        );
        if (revision.current !== snapshotRevision) dirtyId.current = saved.id;
        if (saved.id !== snapshot.id) setActiveId(saved.id);
        setSaveState("saved");
        setMessage("");
      } catch (error) {
        setSaveState("error");
        setMessage(`保存失败：${errorText(error)}`);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [activeNote, directory]);

  async function loadDirectory(path: string, preferId?: string) {
    setLoading(true);
    setMessage("");
    try {
      const loaded = await listNotes(path);
      setNotes(loaded);
      setActiveId((current) => {
        if (preferId && loaded.some((note) => note.id === preferId)) {
          return preferId;
        }
        if (loaded.some((note) => note.id === current)) return current;
        return loaded[0]?.id ?? null;
      });
      // 想打开的文件没出现在列表里：通常不是 UTF-8 文本，读不出来
      if (preferId && !loaded.some((note) => note.id === preferId)) {
        setMessage(
          "已切换到该文件所在目录，但它不是 UTF-8 文本，无法在列表中显示。",
        );
      }
      setSaveState("idle");
    } catch (error) {
      setMessage(`无法打开目录：${errorText(error)}`);
    } finally {
      setLoading(false);
    }
  }
  async function selectDirectory() {
    try {
      const selected = await chooseDirectory();
      if (selected) {
        await flushActiveNote();
        setDirectory(selected);
      }
    } catch (error) {
      setMessage(`选择目录失败：${errorText(error)}`);
    }
  }
  /** 打开一个 .md 文件：切到它所在目录并选中它（等价于“选目录 + 点那条笔记”） */
  async function openMarkdownFile(filePath: string) {
    try {
      const opened = await resolveMarkdownFile(filePath);
      if (opened.directory === directory) {
        await flushActiveNote();
        await loadDirectory(opened.directory, opened.noteId);
        return;
      }
      await flushActiveNote();
      preferSelect.current = opened.noteId;
      setSearch("");
      setDirectory(opened.directory);
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  async function selectFile() {
    try {
      const selected = await chooseMarkdownFile();
      if (selected) await openMarkdownFile(selected);
    } catch (error) {
      setMessage(`选择文件失败：${errorText(error)}`);
    }
  }
  function cycleTheme() {
    const index = THEME_ORDER.indexOf(themeChoice);
    const next = THEME_ORDER[(index + 1) % THEME_ORDER.length];
    saveThemeChoice(next);
    setThemeChoice(next);
  }
  async function flushActiveNote() {
    if (!activeNote || dirtyId.current !== activeNote.id) return;
    const saved = await saveNote(directory, activeNote);
    dirtyId.current = null;
    setNotes((current) =>
      current.map((note) => (note.id === activeNote.id ? saved : note)),
    );
    if (saved.id !== activeNote.id) setActiveId(saved.id);
  }
  async function selectNote(id: string) {
    try {
      await flushActiveNote();
      setActiveId(id);
    } catch (error) {
      setSaveState("error");
      setMessage(`切换前保存失败：${errorText(error)}`);
    }
  }
  async function addNote() {
    if (!directory) return void selectDirectory();
    try {
      await flushActiveNote();
      const note = await createNote(directory);
      setNotes((current) => [note, ...current]);
      setActiveId(note.id);
      setSearch("");
    } catch (error) {
      setMessage(`创建失败：${errorText(error)}`);
    }
  }
  function updateActiveNote(patch: Partial<Pick<Note, "title" | "content">>) {
    if (!activeId) return;
    revision.current += 1;
    dirtyId.current = activeId;
    setSaveState("idle");
    setNotes((current) =>
      current.map((note) =>
        note.id === activeId ? { ...note, ...patch } : note,
      ),
    );
  }
  async function removeNote(note: Note) {
    if (
      !window.confirm(
        `确定删除“${note.title || "无标题笔记"}”吗？文件会被移动到系统回收站，可以从回收站恢复。`,
      )
    )
      return;
    try {
      await deleteNote(directory, note.filePath);
      const index = notes.findIndex((item) => item.id === note.id);
      const next = notes.filter((item) => item.id !== note.id);
      setNotes(next);
      if (note.id === activeId)
        setActiveId(next[Math.min(index, next.length - 1)]?.id ?? null);
    } catch (error) {
      setMessage(`删除失败：${errorText(error)}`);
    }
  }
  dropHandler.current = (paths: string[]) => {
    const first = paths[0];
    if (!first) return;
    if (paths.length > 1) setMessage("一次只能打开一个文件，已打开第一个。");
    void openMarkdownFile(first);
  };
  const status = loading
    ? "正在读取…"
    : saveState === "saving"
      ? "正在保存…"
      : saveState === "error"
        ? "保存失败"
        : saveState === "saved"
          ? "已保存到磁盘"
          : directory
            ? "磁盘自动保存"
            : "尚未选择目录";
  return (
    <main className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.22em] text-accent">
            Write · Shape · Share
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Markdown Hub
            </h1>
            {readingMode && (
              <button
                type="button"
                onClick={() => setReadingMode(false)}
                title="退出阅读模式，恢复「编辑 + 预览」双栏"
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-bold text-accent hover:bg-accent-soft"
              >
                ✎ 编辑笔记
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="max-w-[320px] truncate text-xs text-faint"
            title={directory}
          >
            {directory || "请选择笔记保存位置"}
          </div>
          <button
            type="button"
            onClick={selectDirectory}
            className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-bold text-accent hover:bg-accent-soft"
          >
            选择目录
          </button>
          <button
            type="button"
            onClick={selectFile}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-muted hover:bg-surface-muted hover:text-accent"
          >
            打开文件
          </button>
          <button
            type="button"
            onClick={cycleTheme}
            title={`主题：${THEME_LABEL[themeChoice]}（点击切换）`}
            aria-label={`主题：${THEME_LABEL[themeChoice]}，点击切换`}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-muted hover:bg-surface-muted hover:text-accent"
          >
            {THEME_ICON[themeChoice]} {THEME_LABEL[themeChoice]}
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <span
              className={`h-2 w-2 rounded-full ${saveState === "error" ? "bg-danger" : saveState === "saving" ? "bg-amber-400" : "bg-success"}`}
            />
            <span>{status}</span>
          </div>
        </div>
      </header>
      {message && (
        <div className="mb-4 rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
          {message}
        </div>
      )}
      {!directory ? (
        <Welcome onSelect={selectDirectory} />
      ) : (
        <section
          className={`grid min-h-0 flex-1 grid-cols-1 gap-4 xl:gap-5 ${
            readingMode
              ? "xl:grid-cols-[260px_minmax(0,1fr)]"
              : "xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]"
          }`}
        >
          <NoteSidebar
            notes={filteredNotes}
            total={notes.length}
            activeId={activeId}
            search={search}
            onSearch={setSearch}
            onSelect={(id) => void selectNote(id)}
            onAdd={addNote}
            onDelete={removeNote}
          />
          {!readingMode && (
            <article className="flex min-h-[48vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel xl:min-h-0">
              <PanelHeader icon="✎" title="编辑器" label="MARKDOWN">
                {activeNote && (
                  <span className="text-[11px] text-faint">
                    {activeNote.content.length} 字符
                  </span>
                )}
              </PanelHeader>
              {activeNote ? (
                <>
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                    aria-label="笔记标题"
                    placeholder="笔记标题"
                    className="border-b border-line px-5 py-4 text-lg font-bold outline-none placeholder:text-soft sm:px-6"
                  />
                  <textarea
                    value={activeNote.content}
                    onChange={(e) =>
                      updateActiveNote({ content: e.target.value })
                    }
                    spellCheck={false}
                    aria-label="Markdown 编辑器"
                    placeholder="在这里输入 Markdown…"
                    className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-7 text-body outline-none placeholder:text-soft sm:p-6"
                  />
                  <div className="border-t border-line px-5 py-2.5 text-[11px] text-faint">
                    停止输入 650ms 后自动保存为 .md 文件
                  </div>
                </>
              ) : (
                <EmptyState onAdd={addNote} />
              )}
            </article>
          )}
          <article className="flex min-h-[48vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel xl:min-h-0">
            <PanelHeader
              icon="◉"
              title={readingMode ? "阅读" : "预览"}
              label={readingMode ? "READING" : "OUTPUT"}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success">
                  LIVE
                </span>
                <button
                  type="button"
                  onClick={() => setReadingMode((value) => !value)}
                  aria-pressed={readingMode}
                  title={
                    readingMode
                      ? "退出阅读模式，恢复「编辑 + 预览」双栏"
                      : "全屏阅读：隐藏编辑器，预览放大居中"
                  }
                  className="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-bold text-muted hover:bg-surface-muted hover:text-accent"
                >
                  {readingMode ? "⤡ 退出阅读" : "⤢ 全屏阅读"}
                </button>
              </div>
            </PanelHeader>
            <div
              className={`preview min-h-0 flex-1 overflow-y-auto p-5 sm:p-7 ${
                readingMode ? "mx-auto w-full max-w-[860px]" : ""
              }`}
            >
              {activeNote?.content ? (
                <MarkdownPreview>{activeNote.content}</MarkdownPreview>
              ) : (
                <p className="text-sm text-soft">预览内容将在这里显示。</p>
              )}
            </div>
          </article>
        </section>
      )}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-paper/80 p-6 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-line-strong bg-surface px-10 py-8 text-center shadow-panel">
            <p className="text-3xl">📄</p>
            <p className="mt-3 text-sm font-bold">松开即可打开这个 Markdown 文件</p>
            <p className="mt-1 text-xs text-faint">
              只支持 .md 文件；打开后会切换到它所在的目录
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

type SidebarProps = {
  notes: Note[];
  total: number;
  activeId: string | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (note: Note) => void;
};
function NoteSidebar({
  notes,
  total,
  activeId,
  search,
  onSearch,
  onSelect,
  onAdd,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="flex max-h-[38vh] min-h-[300px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel xl:max-h-none xl:min-h-0">
      <div className="border-b border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">我的笔记</h2>
            <p className="mt-0.5 text-[11px] text-faint">共 {total} 篇</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label="创建新笔记"
            className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-xl text-white shadow-lg hover:bg-accent/90"
          >
            +
          </button>
        </div>
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-soft">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="搜索笔记"
            placeholder="搜索标题…"
            className="w-full rounded-xl border border-line bg-surface-muted py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-line-strong"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {notes.length ? (
          notes.map((note) => (
            <div
              role="button"
              tabIndex={0}
              key={note.id}
              onClick={() => onSelect(note.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(note.id);
              }}
              className={`group mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left ${note.id === activeId ? "bg-accent-soft text-accent" : "text-body hover:bg-surface-muted"}`}
            >
              <span
                className={`h-7 w-1 shrink-0 rounded-full ${note.id === activeId ? "bg-accent" : "bg-transparent"}`}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {note.title.trim() || "无标题笔记"}
              </span>
              <button
                type="button"
                aria-label={`删除 ${note.title}`}
                title="移到回收站"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note);
                }}
                className="rounded-lg px-2 py-1 text-xs text-soft hover:bg-surface hover:text-danger"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-xs leading-5 text-faint">
            {total ? "没有匹配的笔记" : "还没有笔记，点击 + 创建"}
          </p>
        )}
      </div>
    </aside>
  );
}
function MarkdownPreview({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => (
          <a {...props} target="_blank" rel="noreferrer" />
        ),
        pre: ({ children }) => <>{children}</>,
        code: ({
          node: _node,
          className,
          children: codeChildren,
          ...props
        }) => {
          const match = /language-([\w-]+)/.exec(className ?? "");
          const code = String(codeChildren).replace(/\n$/, "");
          return match || String(codeChildren).includes("\n") ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match?.[1] ?? "text"}
              PreTag="div"
              showLineNumbers
              wrapLongLines
            >
              {code}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {codeChildren}
            </code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
function Welcome({ onSelect }: { onSelect: () => void }) {
  return (
    <section className="grid flex-1 place-items-center rounded-3xl border border-dashed border-line-strong bg-surface/70 p-10 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-3xl">
          📁
        </div>
        <h2 className="text-xl font-bold">选择你的 Markdown 笔记目录</h2>
        <p className="mt-2 text-sm text-faint">
          应用会读取其中的 .md 文件，并将编辑内容直接保存到磁盘。
          <br />
          也可以直接把某个 .md 文件拖进窗口打开。
        </p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-6 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white"
        >
          选择目录
        </button>
      </div>
    </section>
  );
}
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <div>
        <p className="text-sm font-semibold text-body">
          选择一篇笔记开始编辑
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white"
        >
          创建新笔记
        </button>
      </div>
    </div>
  );
}
function PanelHeader({
  icon,
  title,
  label,
  children,
}: {
  icon: string;
  title: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="text-[11px] text-faint">{label}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
