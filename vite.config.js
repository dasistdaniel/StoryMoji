import { defineConfig } from "vite";

// StoryMoji is a fully static site: `vite build` emits plain HTML/CSS/JS into
// dist/ which can be served by any static host (nginx) without a backend.
export default defineConfig({
  // Relative base so the build also works from a sub-path on the web server.
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
