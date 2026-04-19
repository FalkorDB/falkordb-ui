import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'FalkorDBChat',
      formats: ['es', 'cjs'],
      fileName: (format) => `chat.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      output: {},
    },
  },
})
