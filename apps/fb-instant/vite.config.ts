import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Plugin to copy fbapp-config.json to dist
function copyFBConfig() {
  return {
    name: 'copy-fbapp-config',
    writeBundle() {
      copyFileSync(
        resolve(__dirname, 'fbapp-config.json'),
        resolve(__dirname, 'dist/fbapp-config.json')
      );
    }
  };
}

export default defineConfig({
  plugins: [basicSsl(), copyFBConfig()],
  publicDir: resolve(__dirname, '../../public'), // Use shared public folder
  resolve: {
    alias: {
      '@repo/game-core': resolve(__dirname, '../../packages/game-core/src'),
      '@repo/platform-fb': resolve(__dirname, '../../packages/platform-fb/src'),
      '@repo/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'es2020'
  },
});
