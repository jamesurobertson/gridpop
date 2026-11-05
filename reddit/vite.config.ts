import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { devvit } from "@devvit/start/vite";

// The game itself lives in ../src (shared with the web version); React and the UI libraries
// resolve from the main project's node_modules so there is only ever one copy of each.
export default defineConfig({
  publicDir: path.resolve(__dirname, "../public"),
  resolve: {
    alias: { "@": path.resolve(__dirname, "../src") },
    dedupe: ["react", "react-dom", "framer-motion"],
  },
  css: {
    postcss: { plugins: [tailwindcss({ config: path.resolve(__dirname, "tailwind.config.ts") }), autoprefixer()] },
  },
  plugins: [react(), devvit()],
});
