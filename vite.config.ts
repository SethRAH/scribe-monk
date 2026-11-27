/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// GitHub Pages serves from /<repo>/; override with BASE_PATH for other hosts
// (Netlify / Cloudflare Pages serve from root, so set BASE_PATH=/ there).
const base = process.env.BASE_PATH ?? '/scribe-monk/';

export default defineConfig({
  base,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
