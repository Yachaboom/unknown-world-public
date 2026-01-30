/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8001, // RULE-011: 프론트엔드는 8001~8010 사용
    strictPort: true, // 포트 충돌 시 fail-fast (대역 밖 이동 방지)
    // 충돌 시: pnpm -C frontend dev --port 8002 (8002~8010 중 선택)
    proxy: {
      // 백엔드 API 프록시 (RULE-011: 백엔드는 8011~8020)
      '/api': {
        target: 'http://localhost:8011',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
