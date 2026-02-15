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
  publicDir: 'public'
});
