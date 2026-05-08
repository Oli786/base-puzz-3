import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Some libraries might expect global to be defined
    global: 'globalThis',
  },
  build: {
    target: 'esnext', // Support BigInt
  },
  server: {
    port: 3000,
    open: true
  }
});
