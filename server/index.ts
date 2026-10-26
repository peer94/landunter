/**
 * Dienst "ssr": liefert die Startseite mit fertig eingesetzter Antwort aus, damit Suchmaschinen
 * und Linkvorschauen "Ja / Nein / Vielleicht" sehen. Die Vorlage (shell.html) holt er über das
 * Binding APP_URL vom statischen Dienst "app"; die CDN hält das Ergebnis 10 Minuten.
 */
import { Hono } from "hono";
import { fetchGauge } from "../src/lib/bsh";
import { fetchMeasurements } from "../src/lib/pegelonline";
import { answerText } from "../src/lib/answerText";
import { plainPage, renderPage, sitemap } from "./render";

const CACHE_OK = "public, max-age=0, s-maxage=600, stale-while-revalidate=3600";
const CACHE_FALLBACK = "public, max-age=0, s-maxage=60";

let shellCache: { html: string; at: number } | null = null;

async function shell(): Promise<string> {
  if (shellCache && Date.now() - shellCache.at < 5 * 60e3) return shellCache.html;
  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL fehlt: Binding auf den Dienst app prüfen");
  const r = await fetch(new URL("shell.html", base.endsWith("/") ? base : base + "/"));
  if (!r.ok) throw new Error(`Vorlage nicht abrufbar: ${r.status}`);
  shellCache = { html: await r.text(), at: Date.now() };
  return shellCache.html;
}

function canonicalOf(req: Request) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}/` : new URL("/", req.url).toString();
}

const indexable = () => process.env.VERCEL_ENV === "production";

const html = (body: string, cache: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache } });

const app = new Hono();

app.get("/robots.txt", (c) => {
  const canonical = canonicalOf(c.req.raw);
  const body = indexable() ? `User-agent: *\nAllow: /\nSitemap: ${canonical}sitemap.xml\n` : "User-agent: *\nDisallow: /\n";
  return c.body(body, 200, { "content-type": "text/plain; charset=utf-8", "cache-control": CACHE_OK });
});

app.get("/sitemap.xml", (c) =>
  c.body(sitemap(canonicalOf(c.req.raw), new Date().toISOString()), 200, { "content-type": "application/xml; charset=utf-8", "cache-control": CACHE_OK }));

app.get("/", async (c) => {
  const canonical = canonicalOf(c.req.raw);
  const page = await shell();
  try {
    const [g, meas] = await Promise.all([fetchGauge(8000), fetchMeasurements(6000)]);
    const now = Date.now();
    return html(renderPage(page, answerText(g, now, meas), { canonical, modified: new Date(now).toISOString(), indexable: indexable() }), CACHE_OK);
  } catch (err) {
    console.error("Antwort konnte nicht vorgerendert werden", err);
    return html(plainPage(page, indexable()), CACHE_FALLBACK);
  }
});

export default app;
