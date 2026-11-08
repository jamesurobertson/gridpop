import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { Plugin } from "vite";

const redditClient = path.resolve(__dirname, "reddit/src/client");

// The site plays the Reddit app's daily game; its server and Reddit SDK calls are answered in the browser.
const redditGameInBrowser = (): Plugin => ({
  name: "reddit-game-in-browser",
  enforce: "pre",
  resolveId(source, importer) {
    if (source === "@devvit/web/client") return path.resolve(__dirname, "src/web/devvitClient.ts");
    if (source === "./api" && importer?.startsWith(redditClient)) return path.resolve(__dirname, "src/web/localApi.ts");
  },
});

export default defineConfig({
  // Served from jamesurobertson.github.io/gridpop/.
  base: "/gridpop/",
  plugins: [redditGameInBrowser(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // This allows connections from other devices
    port: 5173  // Default Vite port
  }
});
