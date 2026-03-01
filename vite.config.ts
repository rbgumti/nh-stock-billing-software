import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    // IMPORTANT: Use the auto-managed backend client so preview/live always target
    // the active Lovable Cloud project.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

