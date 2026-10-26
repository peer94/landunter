/** Lokaler Start des Dienstes ssr für `vercel dev` (Port kommt von Vercel als PORT). */
import { serve } from "@hono/node-server";
import app from "./index";

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => console.log(`ssr läuft auf http://localhost:${port}`));
