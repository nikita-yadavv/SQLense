import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All API requests are proxied to the FastAPI backend (:8000)
      '/auth':         { target: 'http://localhost:8000', changeOrigin: true },
      '/api':          { target: 'http://localhost:8000', changeOrigin: true },
      '/chat':         { target: 'http://localhost:8000', changeOrigin: true },
      '/history':      { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':        { target: 'http://localhost:8000', changeOrigin: true },
      '/health':       { target: 'http://localhost:8000', changeOrigin: true },
      '/saved-charts': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
