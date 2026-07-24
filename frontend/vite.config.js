import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({ include: /\.(js|jsx|ts|tsx)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(js|jsx|ts|tsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
