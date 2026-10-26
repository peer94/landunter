import { QUESTION, type AnswerText } from "../src/lib/answerText";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PageMeta {
  canonical: string; // absolute URL der Startseite
  modified: string; // ISO-Zeitpunkt der Antwort
  indexable: boolean; // nur Produktion darf in den Index
}

/**
 * Schreibt die Antwort in die von Vite gebaute index.html: Titel, Beschreibung, Vorschau-Tags
 * und den sichtbaren Antwortblock. Der Browser rechnet danach live weiter.
 */
export function renderPage(shell: string, a: AnswerText, m: PageMeta): string {
  let h = shell;
  const swap = (re: RegExp, val: string) => {
    if (!re.test(h)) throw new Error(`Vorlage passt nicht zu ${re}`);
    h = h.replace(re, () => val);
  };
  const ogTitle = `${QUESTION} ${a.word}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: QUESTION,
    headline: ogTitle,
    description: a.description,
    url: m.canonical,
    inLanguage: "de-DE",
    dateModified: m.modified,
  };
  const head = [
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<meta property="og:url" content="${esc(m.canonical)}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n");

  swap(/<meta name="robots" content="noindex" data-shell>/, m.indexable ? "" : `<meta name="robots" content="noindex">`);
  swap(/<title>[^<]*<\/title>/, `<title>${esc(a.title)}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(a.description)}">`);
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(ogTitle)}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(`${a.detail} ${a.stamp}`)}">`);
  swap(/<!--ssr:head-->/, head);
  swap(/data-verdict=""/, `data-verdict="${a.verdict}"`);
  swap(/<span class="a-word" id="a-word">[^<]*<\/span>/, `<span class="a-word" id="a-word">${esc(a.word)}</span>`);
  swap(/<span class="a-detail" id="a-detail">[^<]*<\/span>/, `<span class="a-detail" id="a-detail">${esc(a.detail)}</span>`);
  if (a.notes.length) swap(/<p class="a-next" id="a-next" hidden><\/p>/, `<p class="a-next" id="a-next">${esc(a.notes.join(" "))}</p>`);
  swap(/<p class="a-stamp" id="a-stamp"><\/p>/, `<p class="a-stamp" id="a-stamp">${esc(a.stamp)}</p>`);
  return h;
}

export function sitemap(canonical: string, modified: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(canonical)}</loc><lastmod>${modified}</lastmod><changefreq>hourly</changefreq></url>
</urlset>
`;
}

/** Vorlage ohne Antwort ausliefern (BSH nicht erreichbar): Sperre für Suchmaschinen trotzdem lösen. */
export function plainPage(shell: string, indexable: boolean) {
  return indexable ? shell.replace(/<meta name="robots" content="noindex" data-shell>\n?/, "") : shell;
}
