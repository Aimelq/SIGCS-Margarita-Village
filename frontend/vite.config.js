import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Usa polling para detectar cambios en Windows/Docker/OneDrive
      // donde los eventos del filesystem no funcionan correctamente
      usePolling: true,
      interval: 1000,
    },
  },
})
