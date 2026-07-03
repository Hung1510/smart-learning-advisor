import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The React app builds into ../client-dist, which Express serves as static files.
// In dev, `npm run dev` runs Vite on :5173 and proxies /api, /auth to the Express
// server on :3010 so cookies + API work exactly like production.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../client-dist",
    emptyOutDir: true,
    // Stable output names (no content hash). This guarantees index.html always
    // references /assets/index.js + /assets/index.css, so the committed HTML and
    // the committed bundle can never point at different hashes. Vercel serves the
    // committed client-dist as-is (no rebuild), so hashing bought us nothing but
    // cache-busting we don't need for this deploy model.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3010", changeOrigin: true },
      "/auth": { target: "http://localhost:3010", changeOrigin: true },
    },
  },
});