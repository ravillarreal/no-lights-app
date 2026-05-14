import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: true,
    allowedHosts: 'all',
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // El browser llama /api/... → Vite lo reenvía al contenedor backend
      // Esto evita mixed-content (HTTPS → HTTP) y que el teléfono necesite
      // saber la IP del backend
      '/api': {
        target: 'http://backend:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
})
