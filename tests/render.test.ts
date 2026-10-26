import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/st-pauli-2026-10-26.json";
import { normalize, type RawGauge } from "../src/lib/bsh";
import { answerText } from "../src/lib/answerText";
import { renderPage } from "../server/render";

const g = normalize((fixture as unknown as { features: { properties: RawGauge }[] }).features[0].properties);
const shell = readFileSync(new URL("../shell.html", import.meta.url), "utf8");

describe("renderPage", () => {
  const a = answerText(g, Date.parse("2026-10-26T12:30:00+01:00"));
  const html = renderPage(shell, a, { canonical: "https://landunter.vercel.app/", modified: "2026-10-26T11:30:00.000Z", indexable: true });

  it("setzt die Antwort in Titel, Beschreibung und sichtbaren Text", () => {
    expect(a.verdict).toBe("vielleicht");
    expect(html).toContain("<title>Fischmarkt heute (Mo., 26.10.): Vielleicht · Landunter</title>");
    expect(html).toMatch(/<meta name="description" content="Vielleicht: Hochwasser 16:22/);
    expect(html).toContain('<span class="a-word" id="a-word">Vielleicht.</span>');
    expect(html).toContain('data-verdict="vielleicht"');
    expect(html).toContain("Stand: Mo., 26.10., 12:30 Uhr");
  });
  it("schreibt Canonical und strukturierte Daten, ohne das Skript-Tag zu brechen", () => {
    expect(html).toContain('<link rel="canonical" href="https://landunter.vercel.app/">');
    const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1];
    expect(JSON.parse(ld).dateModified).toBe("2026-10-26T11:30:00.000Z");
    expect(html).not.toContain("<!--ssr:head-->");
  });
  it("sperrt Vorschau-Deployments für Suchmaschinen", () => {
    const prev = renderPage(shell, a, { canonical: "https://x/", modified: "", indexable: false });
    expect(prev).toContain('<meta name="robots" content="noindex">');
  });
});
