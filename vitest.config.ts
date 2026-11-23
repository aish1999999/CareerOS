import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Matches tsconfig.json and vite.config.ts. Without it, any test that
      // reaches tailor.ts fails on an unresolved '@contract/types' import.
      '@contract': fileURLToPath(new URL('../../packages/contract', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // .tsx as well as .ts: a component test written as .tsx was silently never collected, so the
    // suite passed while the component it covered was broken (Stage 8 review).
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
  },
})
