import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
    proxy: {
      "/auth": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/admin": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
