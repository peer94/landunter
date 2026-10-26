import { answerText } from "../lib/answerText";
import { $, S } from "../state";
import { setT, stop } from "./timeline";

/** Die direkte Antwort oben auf der Seite (überschreibt die vom Server vorgerenderte Fassung). */
export function renderAnswer(now = Date.now()) {
  const a = answerText(S.d!, now, S.meas);
  const btn = $("answer");
  btn.dataset.verdict = a.verdict;
  $("a-word").textContent = a.word;
  $("a-detail").textContent = a.detail;
  btn.onclick = () => { if (a.jumpT != null) { stop(); setT(a.jumpT); } };
  btn.setAttribute("aria-label", `${a.word} ${a.detail}${a.jumpT != null ? " Tippen zeigt das Hochwasser im Bild." : ""}`);
  const next = $("a-next");
  next.hidden = !a.notes.length;
  next.textContent = a.notes.join(" ");
  $("a-stamp").textContent = a.stamp;
  document.title = a.title;
}
