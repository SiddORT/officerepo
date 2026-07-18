import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CSP for the Vite dev server.  HMR requires 'unsafe-inline' and 'unsafe-eval'
// for scripts and ws:/wss: for WebSocket connections; these relaxations are
// intentionally limited to the development server only.
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self' ws: wss: https://api.zippopotam.us",
  "font-src 'self'",
  "object-src 'none'",
  "frame-ancestors *",
].join("; ");

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-axios": ["axios"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    headers: {
      "Content-Security-Policy": DEV_CSP,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    globals: true,
    css: false,
  },
});
