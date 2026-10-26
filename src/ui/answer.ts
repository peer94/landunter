import { REF } from "../config";
import { answerFor, todayIsOver, wetNow, type DayAnswer, type TideCall } from "../lib/answer";
import { boots, levelAt } from "../lib/levels";
import { fmtCm, fmtM, fTime } from "../lib/format";
import { $, S } from "../state";
import { setT, stop } from "./timeline";

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

/** Die direkte Antwort oben auf der Seite. */
export function renderAnswer(now = Date.now()) {
  const g = S.d!;
  const today = answerFor(g, "heute", now), tomorrow = answerFor(g, "morgen", now);
  const btn = $("answer");
  let verdict = today.verdict, word: string = WORD[verdict], text = detail(today);
  if (wetNow(g, now)) {
    const lv = levelAt(g.curve, now)?.v ?? REF.foreWet;
    verdict = "ja"; word = "Ja – gerade jetzt.";
    text = `Wasserstand ${fmtM(lv)}, am Vorplatz ${fmtCm(depth(lv))} Wasser – ${boots(depth(lv)).t}.`;
  }
  btn.dataset.verdict = verdict;
  $("a-word").textContent = word;
  $("a-detail").textContent = text;
  const jump = today.key ?? tomorrow.key;
  btn.onclick = () => { if (jump) { stop(); setT(jump.from ?? jump.event.t); } };
  btn.setAttribute("aria-label", `${word} ${text}${jump ? " Tippen zeigt das Hochwasser im Bild." : ""}`);
  const next = $("a-next"), notes: string[] = [];
  const p = today.past;
  if (p && p.verdict === "ja" && today.key !== p && !wetNow(g, now))
    notes.push(`Heute schon nass gewesen: gemessen ${fmtM(p.mid)} um ${fTime.format(p.event.t)}.`);
  if (todayIsOver(today)) notes.push(`Morgen: ${short(tomorrow)}.`);
  next.hidden = !notes.length;
  next.textContent = notes.join(" ");
  document.title = `Fischmarkt heute: ${word.replace(".", "")} · Landunter`;
}
