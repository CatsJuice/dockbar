import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: '../../dist',
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'iife', 'umd'],
      name: 'Dockbar',
    },
    copyPublicDir: false,
    emptyOutDir: false,
  },
})
