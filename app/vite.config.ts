import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  resolve: { alias: { '@hav/core': path.resolve(__dirname, '../core/src/index.ts') } },
  server: { port: 5173, fs: { allow: [path.resolve(__dirname, '..')] } },
  worker: { format: 'es' },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
