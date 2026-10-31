import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Pakai import.meta.dirname (bukan __dirname) agar kompatibel dengan
        // configLoader 'native' yang akan menjadi default di Vite berikutnya.
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // File Excel (.xlsx/.xls/.csv) diabaikan watcher — Windows mengunci file
      // yang dibuka di Excel sehingga watcher bisa error EBUSY dan mematikan dev server.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : { ignored: ['**/*.xlsx', '**/*.xls', '**/*.xlsm', '**/*.csv', '**/*.docx'] },
    },
  };
});
