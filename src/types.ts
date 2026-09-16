export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export interface Note { id: string; title: string; content: string; filePath: string; updatedAt: number; }
