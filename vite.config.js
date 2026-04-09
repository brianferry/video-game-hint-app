import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  base: process.env.VITE_BASE ?? '/',
  server: {
    watch: {
      ignored: ['**/sources/**', '**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
