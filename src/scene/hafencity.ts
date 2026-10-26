import { OFFICIAL } from "../config";
import { DGM } from "../data";
import { f1, fmtShort } from "../lib/format";
import { kit, latteSVG, personSVG, wave, type Pt } from "./draw";

/* ===== HafenCity: Querschnitt Dalmannkai aus dem DGM1 ===== */
export const HC = { s0: -30, s1: 28, zt: 16, zb: -3, latte: -10.6 };
export const hx = (s: number) => (s - HC.s0) * 10;
export const hy = (z: number) => (HC.zt - z) * 10;
export function hcSVG(mhw: number) {
  const {R,PG,PL,TX}=kit(hx,hy,10);
  const pr:Pt[]=DGM.dalmann.map(([s,z])=>[s,z<=2.01?HC.zb-1:z] as Pt);
  const prof:Pt[]=[[HC.s0,HC.zb-1],...pr,[HC.s1,pr[pr.length-1][1]]];
  let s=R(HC.s0,HC.zb-1,HC.s1,HC.zt+1,"fill:var(--sky)");
  s+=R(13,7.95,HC.s1+1,HC.zt+1,"fill:var(--facade)");
  for(let z=8.6;z<HC.zt;z+=3.2) for(let x=14.2;x<HC.s1;x+=2.7) s+=R(x,z,x+1.6,z+2.0,"fill:var(--glass)");
  s+=R(13,7.95,HC.s1+1,8.35,"fill:var(--plinth)");
  s+=PG([...prof,[HC.s1,HC.zb-1],[HC.s0,HC.zb-1]],"fill:var(--stone)");
  s+=PL(prof.filter(p=>p[1]>2.5),"stroke:var(--pave);stroke-width:3");
  for(let z=-2.4;z<4.3;z+=0.6) s+=R(-11,z,-9.6,z+0.05,"fill:var(--ink);opacity:.12");
  s+=R(11.2,7.98,11.3,9.0,"fill:var(--ink)")+R(11.2,8.95,13,9.05,"fill:var(--ink)");
  s+=TX(-1,3.4,"Promenade +4,35",8,"fill:var(--surface)","middle")+TX(19,6.9,"Warft +7,90",8,"fill:var(--surface)","middle");
  s+=personSVG(hx(0.5),hy(4.32),10);
  s+=latteSVG(hx(HC.latte),HC.zb,9,hy,10,"pano");
  const hl=(m:number,txt:string,col:string)=>`<line x1="${hx(HC.s0)}" x2="${hx(HC.s1)}" y1="${f1(hy(m))}" y2="${f1(hy(m))}" style="stroke:${col};stroke-width:1" stroke-dasharray="4 3"/><text x="${hx(HC.s0)+5}" y="${f1(hy(m)-2)}" font-size="7" style="fill:${col};paint-order:stroke;stroke:var(--sky);stroke-width:3px">${txt}</text>`;
  OFFICIAL.forEach(o=>s+=hl(o.m,o.t+" · "+fmtShort(o.m),"var(--signal)"));
  s+=hl(mhw,"MHW "+fmtShort(mhw),"var(--muted)");
  s+=`<clipPath id="hcclip"><polygon points="${[[HC.s0,HC.zt+2],[HC.s1,HC.zt+2],...[...prof].reverse()].map(([a,b])=>f1(hx(a))+","+f1(hy(b))).join(" ")}"/></clipPath>`;
  s+=`<g class="wgrp"><rect class="w-rect" clip-path="url(#hcclip)" x="0" y="${hy(0)}" width="${hx(HC.s1)}" height="${hy(HC.zb-1)-hy(0)}"/><path class="w-line" clip-path="url(#hcclip)" d="${wave(0,hx(HC.s1),1.2,16)}"/></g>`;
  s+=`<polygon class="mk" points="${f1(hx(HC.latte+0.3))},0 ${f1(hx(HC.latte+1.0))},-5 ${f1(hx(HC.latte+1.0))},5" style="fill:var(--ink)"/>`;
  return s;
}
