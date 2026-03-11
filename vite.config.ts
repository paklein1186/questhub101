import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Run `ANALYZE=true bun run build` to generate bundle analysis
    mode === "production" && process.env.ANALYZE && import("rollup-plugin-visualizer").then(m => m.visualizer({ open: true, filename: "dist/bundle-stats.html" })).catch(() => null),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      // These are optional runtime dependencies loaded via dynamic import().
      // Mark them external so Rollup doesn't fail when they're not installed.
      external: ["@sentry/react", "web-vitals"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
