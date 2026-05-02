import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pokebattle/',
  server: {
    strictPort: false,
    port: 5174,
  },
  build: {
    target: 'esnext',
  },
})