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
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3010", changeOrigin: true },
      "/auth": { target: "http://localhost:3010", changeOrigin: true },
    },
  },
});
