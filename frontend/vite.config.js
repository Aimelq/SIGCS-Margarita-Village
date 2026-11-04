import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    hmr: false, // Deshabilita HMR para evitar recargas cuando el websocket se suspende al abrir el selector de archivos en móviles
    watch: {
      // Usa polling para detectar cambios en Windows/Docker/OneDrive
      // donde los eventos del filesystem no funcionan correctamente
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      // En desarrollo local, redirige /api al backend de Docker
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Carpeta de salida del build de producción
    outDir: 'dist',
    // Muestra advertencias si un chunk supera 1MB
    chunkSizeWarningLimit: 1000,
  }
})

