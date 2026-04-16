import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag.startsWith('dock-'),
      },
    },
  })],
  resolve: {
    alias: {
      dockbar: path.resolve(__dirname, '../../packages/dockbar/src/index.ts'),
    },
  },
})
