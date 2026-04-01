import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3850,
    host: true,
    proxy: {
      '/api': 'http://localhost:3899',
    },
  },
});
