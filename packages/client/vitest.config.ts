import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/**', // Exclude Playwright tests directory
    ],
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    server: {
      deps: {
        inline: ['katex', 'rehype-katex', 'streamdown'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.stories.tsx',
        '**/*.d.ts',
        '**/types/**',
        'src/components/tickets/**',
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'katex/dist/katex.min.css': path.resolve(__dirname, './src/test/styleMock.ts'),
    },
  },
})
