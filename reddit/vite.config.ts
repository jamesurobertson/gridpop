import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { devvit } from "@devvit/start/vite";

const here = import.meta.dirname;

// The game itself lives in ../src (shared with the web version); React and the UI libraries
// resolve from the main project's node_modules so there is only ever one copy of each.
export default defineConfig({
  publicDir: path.resolve(here, "../public"),
  resolve: {
    alias: { "@": path.resolve(here, "../src") },
    dedupe: ["react", "react-dom", "framer-motion"],
  },
  css: {
    postcss: { plugins: [tailwindcss({ config: path.resolve(here, "tailwind.config.ts") }), autoprefixer()] },
  },
  plugins: [
    react(),
    devvit({
      client: {
        build: {
          rollupOptions: {
            // framer-motion and Radix mark their files "use client" for React Server Components; meaningless here.
            onwarn(warning, warn) {
              if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
            },
          },
        },
      },
    }),
  ],
});
