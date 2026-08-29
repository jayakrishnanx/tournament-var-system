import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-axios': ['axios'],
          'vendor-icons': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
