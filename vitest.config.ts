import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone from vite.config.ts on purpose: the app config runs a git
// `commitId()` probe and the stale-vintage plugin on every start — neither
// belongs in a test run. We only need the React (JSX) transform plus the
// `__COMMIT_ID__` define, so a module that reads it doesn't hit `undefined`.
export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_ID__: JSON.stringify('test'),
  },
  test: {
    // jsdom gives us localStorage, navigator, window and document — the whole
    // suite touches at least one of them (i18n, favorites, cache, hooks).
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Polyfills a working localStorage and clears it between tests.
    setupFiles: ['src/test/setup.ts'],
    // Undo vi.spyOn / mocked globals after every test so files stay isolated.
    restoreMocks: true,
  },
});
