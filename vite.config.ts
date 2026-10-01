import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Served from jamesurobertson.github.io/gridpop/.
  base: "/gridpop/",
  plugins: [react()],
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
