import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Puerto por defecto para el servidor de desarrollo
    proxy: {
      '/api': {
        // Redirige todas las peticiones /api al backend en Django (puerto 8000)
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
