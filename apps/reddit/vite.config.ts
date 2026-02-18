import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    devvit({
      // root: resolve(__dirname, '..'), // Point to apps/reddit where devvit.json is
      client: {
        build: {
          chunkSizeWarningLimit: 2000,
        },
      },
    }),
  ],
  publicDir: resolve(__dirname, '../../public'), // Use shared public folder
  resolve: {
    alias: {
      '@repo/game-core': resolve(__dirname, '../../packages/game-core/src'),
      '@repo/platform-reddit': resolve(__dirname, '../../packages/platform-reddit/src'),
      '@repo/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
