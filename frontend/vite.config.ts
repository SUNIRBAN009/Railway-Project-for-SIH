import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_WS_BACKEND_URL || 'ws://channels:8001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
