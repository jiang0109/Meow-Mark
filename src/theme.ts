/** 主题（亮色 / 暗色）选择与持久化。默认跟随系统，用户手动切换后记住选择。 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: '跟随系统',
  light: '亮色',
  dark: '暗色',
};

export const THEME_ICON: Record<ThemeChoice, string> = {
  system: '🖥',
  light: '☀',
  dark: '☾',
};

/** 与 index.html 里的首屏内联脚本必须保持一致 */
const STORAGE_KEY = 'markdown-hub-theme';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function getThemeChoice(): ThemeChoice {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** 应用主题，返回最终是否为暗色 */
export function applyTheme(choice: ThemeChoice): boolean {
  const dark = choice === 'dark' || (choice === 'system' && prefersDark());
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  return dark;
}

export function setThemeChoice(choice: ThemeChoice): boolean {
  localStorage.setItem(STORAGE_KEY, choice);
  return applyTheme(choice);
}

/** 订阅系统主题变化（仅在“跟随系统”时需要），返回取消订阅函数 */
export function watchSystemTheme(handler: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
