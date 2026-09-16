import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    // 必须与 src-tauri/tauri.conf.json 里的 devUrl 一致，避免端口漂移
    port: 5173,
    strictPort: true,
    watch: {
      // cargo 编译时会在 src-tauri/target 下创建并独占锁定 .exe/.dll，
      // Windows 上对这类文件调用 fs.watch 会抛 EBUSY 并直接把 Vite 进程打挂，
      // 于是 beforeDevCommand 非零退出、tauri dev 中止。这里整目录排除。
      ignored: ['**/src-tauri/**'],
    },
  },
});
