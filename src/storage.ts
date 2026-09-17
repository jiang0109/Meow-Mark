import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { Note } from './types';

const DIRECTORY_KEY = 'markdown-hub-directory';

/** 拖入 / 选中的 Markdown 文件解析结果（目录 + 规范化后的文件路径） */
export interface OpenedFile {
  directory: string;
  noteId: string;
}

export const getRememberedDirectory = () => localStorage.getItem(DIRECTORY_KEY) ?? '';

export async function chooseDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: '选择 Markdown 笔记目录' });
  if (typeof selected !== 'string') return null;
  localStorage.setItem(DIRECTORY_KEY, selected);
  return selected;
}

/** 选择单个 Markdown 文件（只允许 .md），返回绝对路径 */
export async function chooseMarkdownFile(): Promise<string | null> {
  const selected = await open({
    directory: false,
    multiple: false,
    title: '选择 Markdown 文件',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

/** 让后端校验并解析文件路径（非 .md 或目录会返回错误） */
export const resolveMarkdownFile = (filePath: string) =>
  invoke<OpenedFile>('resolve_markdown_file', { path: filePath });

export const listNotes = (directory: string) => invoke<Note[]>('list_notes', { directory });
export const createNote = (directory: string) => invoke<Note>('create_note', { directory });
export const saveNote = (directory: string, note: Note) => invoke<Note>('save_note', { directory, note });
export const deleteNote = (directory: string, filePath: string) => invoke<void>('delete_note', { directory, filePath });
