import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8001, // RULE-011: 프론트엔드는 8001~8010 사용
    strictPort: false, // 충돌 시 8002~8010 자동 할당 허용
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
