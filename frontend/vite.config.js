import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The JSX runtime for plain .jsx files. The React plugin sets this up for the
  // dev server and the build, but not for the transform vitest runs through, so
  // a .jsx component rendered from a test hit `React is not defined`. Setting it
  // here covers every path the same way.
  esbuild: { jsx: 'automatic' },
  // The two add-on minigames under src/pages/mafia|marble ship vitest suites.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    passWithNoTests: true,
  },
})
