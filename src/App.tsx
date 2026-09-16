import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  chooseDirectory,
  createNote,
  deleteNote,
  getRememberedDirectory,
  listNotes,
  saveNote,
} from "./storage";
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
  const dirtyId = useRef<string | null>(null);
  const revision = useRef(0);
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
    if (directory) void loadDirectory(directory);
  }, [directory]);
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

  async function loadDirectory(path: string) {
    setLoading(true);
    setMessage("");
    try {
      const loaded = await listNotes(path);
      setNotes(loaded);
      setActiveId((current) =>
        loaded.some((note) => note.id === current)
          ? current
          : (loaded[0]?.id ?? null),
      );
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
      if (selected) setDirectory(selected);
    } catch (error) {
      setMessage(`选择目录失败：${errorText(error)}`);
    }
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
        `确定删除“${note.title || "无标题笔记"}”吗？文件将被永久删除。`,
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
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Markdown Hub
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="max-w-[360px] truncate text-xs text-slate-400"
            title={directory}
          >
            {directory || "请选择笔记保存位置"}
          </div>
          <button
            type="button"
            onClick={selectDirectory}
            className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-accent hover:bg-violet-50"
          >
            选择目录
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span
              className={`h-2 w-2 rounded-full ${saveState === "error" ? "bg-rose-500" : saveState === "saving" ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            <span>{status}</span>
          </div>
        </div>
      </header>
      {message && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {message}
        </div>
      )}
      {!directory ? (
        <Welcome onSelect={selectDirectory} />
      ) : (
        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)] xl:gap-5">
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
          <article className="flex min-h-[48vh] flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-panel xl:min-h-0">
            <PanelHeader icon="✎" title="编辑器" label="MARKDOWN">
              {activeNote && (
                <span className="text-[11px] text-slate-400">
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
                  className="border-b border-slate-100 px-5 py-4 text-lg font-bold outline-none placeholder:text-slate-300 sm:px-6"
                />
                <textarea
                  value={activeNote.content}
                  onChange={(e) =>
                    updateActiveNote({ content: e.target.value })
                  }
                  spellCheck={false}
                  aria-label="Markdown 编辑器"
                  placeholder="在这里输入 Markdown…"
                  className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-300 sm:p-6"
                />
                <div className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">
                  停止输入 650ms 后自动保存为 .md 文件
                </div>
              </>
            ) : (
              <EmptyState onAdd={addNote} />
            )}
          </article>
          <article className="flex min-h-[48vh] flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-panel xl:min-h-0">
            <PanelHeader icon="◉" title="预览" label="OUTPUT">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                LIVE
              </span>
            </PanelHeader>
            <div className="preview min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              {activeNote?.content ? (
                <MarkdownPreview>{activeNote.content}</MarkdownPreview>
              ) : (
                <p className="text-sm text-slate-300">预览内容将在这里显示。</p>
              )}
            </div>
          </article>
        </section>
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
    <aside className="flex max-h-[38vh] min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-panel xl:max-h-none xl:min-h-0">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">我的笔记</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">共 {total} 篇</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label="创建新笔记"
            className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-xl text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
          >
            +
          </button>
        </div>
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-300">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="搜索笔记"
            placeholder="搜索标题…"
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-violet-100"
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
              className={`group mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left ${note.id === activeId ? "bg-violet-50 text-accent" : "text-slate-600 hover:bg-slate-50"}`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note);
                }}
                className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white hover:text-rose-500"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-xs leading-5 text-slate-400">
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
    <section className="grid flex-1 place-items-center rounded-3xl border border-dashed border-violet-200 bg-white/70 p-10 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-violet-50 text-3xl">
          📁
        </div>
        <h2 className="text-xl font-bold">选择你的 Markdown 笔记目录</h2>
        <p className="mt-2 text-sm text-slate-400">
          应用会读取其中的 .md 文件，并将编辑内容直接保存到磁盘。
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
        <p className="text-sm font-semibold text-slate-600">
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
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-accent">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="text-[11px] text-slate-400">{label}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
