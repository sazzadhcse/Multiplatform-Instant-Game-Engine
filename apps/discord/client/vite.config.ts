import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../../",
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
