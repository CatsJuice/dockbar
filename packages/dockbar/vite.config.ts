import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isMinimizeBuild = mode === 'minimize'

  return {
    build: {
      target: 'es2020',
      outDir: '../../dist',
      lib: {
        entry: isMinimizeBuild ? './src/minimize.ts' : './src/index.ts',
        fileName: (format) => {
          const suffix = isMinimizeBuild ? '.minimize' : ''
          if (format === 'iife')
            return `dockbar${suffix}.iife.js`
          if (format === 'umd')
            return `dockbar${suffix}.umd.cjs`
          return `dockbar${suffix}.js`
        },
        formats: ['es', 'iife', 'umd'],
        name: isMinimizeBuild ? 'DockbarMinimize' : 'Dockbar',
      },
      copyPublicDir: false,
      emptyOutDir: false,
    },
  }
})
