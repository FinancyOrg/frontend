import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET lets the containerized dev server (compose.live-frontend.yaml)
  // proxy to the backend service; host dev keeps the localhost default.
  // loadEnv (not process.env) keeps tsc happy without @types/node.
  const env = loadEnv(mode, ".", "");
  const apiProxyTarget = env.API_PROXY_TARGET ?? "http://localhost:8081";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": apiProxyTarget,
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
