import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['core/test/**/*.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
