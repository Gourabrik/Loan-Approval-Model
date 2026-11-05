import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/predict': 'http://127.0.0.1:8000',
      '/explain': 'http://127.0.0.1:8000',
      '/model-info': 'http://127.0.0.1:8000',
      '/workflow': 'http://127.0.0.1:8000',
    },
  },
});
