import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Same-origin access to the backend, like nginx in Docker: /api/foo -> localhost:3000/foo
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
    },
  },
})
