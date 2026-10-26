import { REF } from "../config";
import type { Gauge } from "../types";
import { answerFor, todayIsOver, wetNow, type DayAnswer, type TideCall, type Verdict } from "./answer";
import { boots, levelAt } from "./levels";
import type { Measurement } from "./pegelonline";
import { fDay, fmtCm, fmtM, fTime } from "./format";

export const QUESTION = "Steht der Fischmarkt heute unter Wasser?";

export interface AnswerText {
  verdict: Verdict;
  word: string; // "Ja.", "Nein.", "Vielleicht.", "Ja – gerade jetzt."
  detail: string;
  notes: string[];
  jumpT: number | null; // Zeitpunkt, zu dem das Bild springen soll
  stamp: string; // "Stand: Mo., 26.10., 12:30 Uhr"
  title: string; // Seitentitel mit Datum und Antwort
  description: string; // Meta-Beschreibung, ein Satz mit Antwort und Stand
}

const WORD = { ja: "Ja.", nein: "Nein.", vielleicht: "Vielleicht." } as const;
const range = (c: TideCall) => `${fmtM(c.lo)} bis ${fmtM(c.hi)}`;
const span = (c: TideCall) => (c.from != null && c.to != null ? `${fTime.format(c.from)}–${fTime.format(c.to)}` : `um ${fTime.format(c.event.t)}`);
const depth = (lv: number) => Math.max(0, (lv - REF.fore) * 100);

function detail(a: DayAnswer): string {
  const c = a.key;
  if (!c) return a.day === "heute" ? "Heute kein Hochwasser mehr in der Vorhersage." : "Für morgen liegt noch keine Vorhersage vor.";
  const hw = `Hochwasser ${fTime.format(c.event.t)}`;
  if (c.measured) {
    return c.verdict === "ja"
      ? `Gemessen ${fmtM(c.mid)} um ${fTime.format(c.event.t)}: am Vorplatz bis ${fmtCm(depth(c.mid))} Wasser (${span(c)}).`
      : `Höchster Stand heute ${fmtM(c.mid)} um ${fTime.format(c.event.t)}, ${fmtCm((REF.foreWet - c.mid) * 100)} unter der Kante.`;
  }
  if (c.verdict === "ja") return `${hw}, erwartet ${fmtM(c.mid)}: nass ${span(c)}, bis ${fmtCm(depth(c.mid))} – ${boots(depth(c.mid)).t}.`;
  if (c.verdict === "vielleicht") return `${hw}, erwartet ${range(c)}. Ab ${fmtM(REF.foreWet)} läuft der Vorplatz voll.`;
  return `${hw}, erwartet ${fmtM(c.mid)}: ${fmtCm((REF.foreWet - c.hi) * 100)} oder mehr unter der Kante.`;
}

function short(a: DayAnswer) {
  const c = a.key;
  if (!c) return "keine Vorhersage";
  return `${WORD[a.verdict].replace(".", "")}, Hochwasser ${fTime.format(c.event.t)}, ${c.verdict === "vielleicht" ? range(c) : fmtM(c.mid)}`;
}

/** Die direkte Antwort als Text – im Browser und auf dem Server gleich. */
export function answerText(g: Gauge, now = Date.now(), measured: Measurement[] = []): AnswerText {
  const today = answerFor(g, "heute", now, REF.foreWet, measured), tomorrow = answerFor(g, "morgen", now);
  let verdict = today.verdict;
  let word: string = WORD[verdict];
  let text = detail(today);
  const isWet = wetNow(g, now);
  if (isWet) {
    const lv = levelAt(g.curve, now)?.v ?? REF.foreWet;
    verdict = "ja"; word = "Ja – gerade jetzt.";
    text = `Wasserstand ${fmtM(lv)}, am Vorplatz ${fmtCm(depth(lv))} Wasser – ${boots(depth(lv)).t}.`;
  }
  const notes: string[] = [];
  const p = today.past;
  if (p && p.verdict === "ja" && today.key !== p && !isWet) notes.push(`Heute schon nass gewesen: gemessen ${fmtM(p.mid)} um ${fTime.format(p.event.t)}.`);
  if (todayIsOver(today)) notes.push(`Morgen: ${short(tomorrow)}.`);
  const jump = today.key ?? tomorrow.key;
  const stamp = `Stand: ${fDay.format(now)}, ${fTime.format(now)} Uhr, BSH-Vorhersage ${fTime.format(g.fcTime)} Uhr`;
  const plain = word.replace(/\.$/, "");
  return {
    verdict, word, detail: text, notes,
    jumpT: jump ? jump.from ?? jump.event.t : null,
    stamp,
    title: `Fischmarkt heute (${fDay.format(now)}): ${plain} · Landunter`,
    description: `${plain}: ${text} ${notes.join(" ")} ${stamp}.`.replace(/\s+/g, " ").trim(),
  };
}
