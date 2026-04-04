import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api/v0/sdk': {
        target: 'https://app.dynamicauth.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v0\/sdk/, '/api/v0/sdk'),
      },
    },
  },
})
