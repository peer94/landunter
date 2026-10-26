/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";

/**
 * Die Seite heißt shell.html, damit auf Vercel "/" nicht als statische Datei ausgeliefert wird,
 * sondern beim Dienst ssr landet (der die Antwort einsetzt). Lokal mit `npm run dev` zeigt "/" die Vorlage.
 */
const shellAsRoot = (): Plugin => ({
  name: "shell-as-root",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/" || req.url?.startsWith("/?")) req.url = "/shell.html" + req.url.slice(1);
      next();
    });
  },
});

export default defineConfig({
  plugins: [shellAsRoot()],
  build: { target: "es2020", sourcemap: true, rollupOptions: { input: "shell.html" } },
  test: { environment: "node" },
});
