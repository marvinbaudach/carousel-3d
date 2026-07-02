import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works under a GitHub Pages project path.
  base: './',
  plugins: [react()],
})
