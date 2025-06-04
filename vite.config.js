import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: process.env.VITE_PORT || 5173,
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        worker: './src/js/workers/imageProcessor.worker.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'worker') {
            return 'workers/[name]-[hash].js';
          }
          return '[name]-[hash].js';
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  define: {
    // Make environment variables available to the client
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
}); 