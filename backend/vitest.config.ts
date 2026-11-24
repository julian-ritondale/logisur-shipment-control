import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Decorated classes (class-validator DTOs) need it even in specs that don't boot Nest, as main.ts gets it from Nest.
    setupFiles: ['reflect-metadata'],
  },
});
