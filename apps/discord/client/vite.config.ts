import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  envDir: "../../",
  resolve: {
    alias: {
      '@repo/game-core': resolve(__dirname, '../../../packages/game-core/src'),
      '@repo/platform-discord': resolve(__dirname, '../../../packages/platform-discord/src'),
      '@repo/shared': resolve(__dirname, '../../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/.proxy/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/\.proxy/, ""),
      },
    },
    hmr: {
      clientPort: 5173,
    },
    allowedHosts: true,
  },
  build: {
    outDir: "../../dist/discord/client",
  },
});
