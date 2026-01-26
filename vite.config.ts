import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { imagetools } from "vite-imagetools";

export default defineConfig({
  plugins: [
    react(),
    imagetools({
      defaultDirectives: () =>
        new URLSearchParams({ format: "webp", quality: "80" }),
    }),
    visualizer({
      filename: "./dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
    },
    rollupOptions: {
      output: {
        // ✅ 순환/로딩꼬임 줄이기: charts 분리 제거
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("@splinetool")) return "spline";
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("react-icons")) return "icons";
            if (id.includes("axios")) return "axios";
            return "vendor";
          }
          if (id.includes("/src/pages/")) {
            const m = id.match(/\/pages\/([^/]+)\//);
            if (m) return `page-${m[1]}`;
          }
          if (id.includes("/src/api/")) return "api";
          if (id.includes("/src/player/")) return "player";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    exclude: ["@splinetool/react-spline"],
  },
});
