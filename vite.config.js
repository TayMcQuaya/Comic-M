import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: process.env.VITE_PORT || 5173,
  },
  build: {
    emptyOutDir: true,
  },
  define: {
    // Make environment variables available to the client
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
}); 