import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { Note } from './types';

const DIRECTORY_KEY = 'markdown-hub-directory';
export const getRememberedDirectory = () => localStorage.getItem(DIRECTORY_KEY) ?? '';
export async function chooseDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: '选择 Markdown 笔记目录' });
  if (typeof selected !== 'string') return null;
  localStorage.setItem(DIRECTORY_KEY, selected);
  return selected;
}
export const listNotes = (directory: string) => invoke<Note[]>('list_notes', { directory });
export const createNote = (directory: string) => invoke<Note>('create_note', { directory });
export const saveNote = (directory: string, note: Note) => invoke<Note>('save_note', { directory, note });
export const deleteNote = (directory: string, filePath: string) => invoke<void>('delete_note', { directory, filePath });
