import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    server: {
      deps: {
        // next-intl's ESM-only bundling and Next.js deoptimization (see
        // https://github.com/vercel/next.js/issues/77200) means Vitest can't
        // process its exports without this — required per next-intl's own
        // testing guide, since createNavigation is used across test files.
        inline: ['next-intl'],
      },
    },
  },
});
