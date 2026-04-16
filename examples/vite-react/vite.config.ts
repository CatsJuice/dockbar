import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      dockbar: path.resolve(__dirname, '../../packages/dockbar/src/index.ts'),
    },
  },
})
