import { REF } from "../config";
import { DGM } from "../data";
import { f1 } from "../lib/format";
import { kit, latteSVG, personSVG, wave, type Pt } from "./draw";

/* ===== Querschnitt durch einen Seitenflügel (Elbe links), 10 Einheiten = 1 m ===== */
export const FP = { s0: 32, s1: -20, zt: 20, zb: -3, latte: 20.9 };
export const px = (s: number) => (FP.s0 - s) * 10;
export const py = (z: number) => (FP.zt - z) * 10;
export function profSVG() {
  const {R,PG,PL,TX}=kit(px,py,10);
  const pr:Pt[]=DGM.fishprof.map(([s,z])=>[s, z<=2.01?FP.zb-1:z] as Pt);
  const prof:Pt[]=[[FP.s0,FP.zb-1],...pr.filter(p=>p[0]<=FP.s0&&p[0]>=FP.s1),[FP.s1,pr[pr.length-1][1]]];
  const B="fill:var(--brick)", RF="fill:var(--roof)", G="fill:var(--glass)", FR="fill:var(--frame)";
  const floor=3.92;
  let s=R(FP.s0,FP.zb-1,FP.s1,FP.zt+1,"fill:var(--sky)");
  // Halle im Schnitt
  s+=PG([[11.5,floor],[11.5,11.3],[5,13.0],[5,15.6],[0,17.2],[-5,15.6],[-5,13.0],[-12.5,11.3],[-12.5,floor]],"fill:var(--hall)");
  s+=PG([[11.9,11.2],[5,13.05],[5,13.35],[12.1,11.5]],RF)+PG([[-12.9,11.2],[-5,13.05],[-5,13.35],[-13.1,11.5]],RF);
  s+=PG([[5.3,15.5],[0,17.2],[-5.3,15.5],[-5.3,15.8],[0,17.5],[5.3,15.8]],RF);
  s+=R(4.85,13.0,5.15,15.6,FR)+R(-5.15,13.0,-4.85,15.6,FR)+R(4.9,13.3,5.1,15.4,G)+R(-5.1,13.3,-4.9,15.4,G);
  for(const x of [5,-5]) s+=R(x-0.12,floor,x+0.12,13.0,FR);
  for(const [x0,x1] of [[11.0,11.6],[-12.6,-12.0]]){ s+=R(x0,floor,x1,11.3,B)+R(x0,4.6,x1,9.4,G)+R(x0,floor,x1,4.4,"fill:var(--plinth)"); }
  s+=TX(-0.2,8,"Halle",9,"fill:var(--muted)","middle");
  // Gelände, Kaimauer
  s+=PG([...prof,[FP.s1,FP.zb-1],[FP.s0,FP.zb-1]],"fill:var(--stone)");
  s+=PL(prof.filter(p=>p[1]>2.5),"stroke:var(--pave);stroke-width:3");
  for(let z=-2.4;z<3.6;z+=0.6) s+=R(20.9,z,20.3,z+0.05,"fill:var(--ink);opacity:.15");
  s+=R(19.6,3.74,19.25,4.3,"fill:var(--ink)")+R(19.75,4.25,19.1,4.38,"fill:var(--ink)");
  s+=personSVG(px(15.5),py(3.64),10);
  s+=TX(27,-1.8,"Elbe",9,"fill:var(--surface);opacity:.9","middle");
  s+=TX(15.5,3.0,"Vorplatz +3,66",7.5,"fill:var(--surface)","middle");
  s+=TX(-0.2,3.0,"Hallenboden ca. +3,9",7.5,"fill:var(--surface)","middle");
  s+=TX(-16.5,3.1,"Gr. Elbstraße",7.5,"fill:var(--surface)","middle");
  s+=`<line x1="${px(FP.latte)}" x2="${px(-12.5)}" y1="${f1(py(REF.foreWet))}" y2="${f1(py(REF.foreWet))}" style="stroke:var(--danger);stroke-width:1" stroke-dasharray="4 3"/>`;
  s+=latteSVG(px(FP.latte)-3,FP.zb,9,py,10,"prof");
  // Wasser oberhalb des Geländes
  const clip=[[FP.s0,FP.zt+2],[FP.s1,FP.zt+2],...[...prof].reverse()];
  s+=`<clipPath id="fpclip"><polygon points="${clip.map(([a,b])=>f1(px(a))+","+f1(py(b))).join(" ")}"/></clipPath>`;
  s+=`<g class="wgrp"><rect class="w-rect" clip-path="url(#fpclip)" x="0" y="${py(0)}" width="${px(FP.s1)}" height="${py(FP.zb-1)-py(0)}"/><path class="w-line" clip-path="url(#fpclip)" d="${wave(0,px(FP.s1),1.2,16)}"/></g>`;
  s+=`<g class="lvl"><polygon points="${f1(px(FP.latte)+3)},0 ${f1(px(FP.latte)+10)},-4 ${f1(px(FP.latte)+10)},4" style="fill:var(--ink)"/></g>`;
  s+=`<text class="lvl-t" x="8" y="16" font-size="9" style="fill:var(--ink);font-weight:600"></text><text x="8" y="27" font-size="7.5" style="fill:var(--muted)">Querschnitt, Elbe links · maßstäblich</text>`;
  return s;
}

