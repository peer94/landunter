import { HIST, REF } from "../config";
import { DGM } from "../data";
import { f1 } from "../lib/format";
import { kit, latteSVG, personSVG, wave, type Pt } from "./draw";

/* ===== Fischauktionshalle, Ansicht von der Elbe (10 Einheiten = 1 m) =====
   Maße aus LoD2/bDOM 2022: Grundriss u −52…+51, Traufe Seitenflügel +11,3, Obergaden +13,0…+15,6,
   First +17,2, Laternen +18,8, Mittelbau u −11,5…+10,6 (Traufe +12,7), Giebel u −5,7…+4,9 bis +17,3,
   Kuppel Basis +18,0 (Breite 13 m) bis +25,3, Laterne mit Spitze bis +29,2. */
export const FH = { u0: -90, u1: 90, zt: 42, zb: -30, latte: -6.6, c: -0.4, person: 2.4 };
export const fx = (u: number) => (u - FH.u0) * 10;
export const fy = (z: number) => (FH.zt - z) * 10;
export function hallSVG() {
  const {R,PG,PL,seg,arch}=kit(fx,fy,10), sc=DGM.scene, c=FH.c;
  const B="fill:var(--brick)", B2="fill:var(--brick2)", G="fill:var(--glass)", RF="fill:var(--roof)", FR="fill:var(--frame)", PLI="fill:var(--plinth)";
  const win=(uc:number,w:number,zb:number,zt:number,h:number)=>seg(uc,w+0.3,zb-0.15,zt-0.1,h,FR)+seg(uc,w,zb,zt-0.1,h,G)+R(uc-0.05,zb,uc+0.05,zt+h-0.12,FR)+R(uc-w/2,zb+(zt-zb)*0.62,uc+w/2,zb+(zt-zb)*0.62+0.1,FR)+R(uc-w/2,zb+(zt-zb)*0.3,uc+w/2,zb+(zt-zb)*0.3+0.08,FR)+R(uc-w/2-0.2,zb-0.25,uc+w/2+0.2,zb-0.05,B2);
  let s=R(FH.u0,FH.zb-1,FH.u1,FH.zt+1,"fill:var(--sky)");
  const skv=sc.sky.map(z=>(z==null||isNaN(z))?null:z); let lastv=skv.find(v=>v!=null) ?? 4; const skf=skv.map(v=>v==null?lastv:(lastv=v));
  const sk:Pt[]=[]; for(let u=FH.u0;u<=FH.u1;u++){ const i=Math.max(0,Math.min(skf.length-1,u-sc.sky_u0)); sk.push([u,skf[i]]); }
  s+=PG([[FH.u0,3],...sk,[FH.u1,3]],"fill:var(--hill)");
  // Dachlandschaft: Mittelschiff mit Walmenden, Laternen, Obergaden, Seitendach
  s+=PG([[-52,11.4],[-45.5,16.6],[-45.5,17.2],[45.5,17.2],[45.5,16.6],[51,11.4]],RF);
  for(const [a,b] of [[-33,-22.5],[23,32.5]]){ s+=R(a,17.2,b,18.5,G)+R(a-0.3,18.5,b+0.3,18.85,RF); for(let u=a+0.55;u<b-0.2;u+=1.05) s+=R(u,17.2,u+0.12,18.5,FR); }
  s+=PG([[-48.5,13.0],[-47,15.6],[47,15.6],[48.5,13.0]],B);
  for(let u=-46.5;u<46.6;u+=2.0){ if(u>-12.5&&u<11.5) continue; s+=R(u-0.65,13.35,u+0.65,15.25,FR)+R(u-0.55,13.45,u+0.55,15.15,G); }
  s+=R(-47,15.45,47,15.7,B2);
  s+=PG([[-52,11.3],[-48.5,13.0],[48.5,13.0],[51,11.3]],RF)+R(-50,12.85,49.5,13.0,"fill:var(--ink);opacity:.25");
  // Seitenflügel
  for(const [a,b] of [[-52,-11.5],[10.6,51]]){
    s+=R(a,3.5,b,11.3,B)+R(a,3.5,b,4.3,PLI)+R(a-0.15,10.95,b+0.15,11.45,B2)+R(a,10.55,b,10.7,B2);
    const n=8,bw=(b-a)/n;
    for(let i=0;i<n;i++){ const uc=a+bw*(i+.5); s+=win(uc,2.3,4.6,9.4,0.45); }
    for(let i=0;i<=n;i++){ const p=a+bw*i; s+=R(p-0.35,4.3,p+0.35,10.95,B2); }
  }
  // Mittelbau mit zweigeschossigen Fenstern
  for(const [a,b] of [[-11.5,-5.7],[4.9,10.6]]){
    s+=R(a,3.5,b,12.7,B)+R(a,3.5,b,4.3,PLI)+R(a-0.15,12.4,b+0.15,12.9,B2)+R(a,8.75,b,8.95,B2);
    s+=PG([[a-0.15,12.9],[a+1.2,14.2],[b-1.2,14.2],[b+0.15,12.9]],RF);
    const uc=(a+b)/2; s+=win(uc-1.35,1.6,4.7,8.1,0.3)+win(uc+1.35,1.6,4.7,8.1,0.3);
    s+=arch(uc-1.35,1.5,9.4,11.3,FR)+arch(uc-1.35,1.3,9.5,11.3,G)+arch(uc+1.35,1.5,9.4,11.3,FR)+arch(uc+1.35,1.3,9.5,11.3,G);
    s+=R(a,4.3,a+0.45,12.4,B2)+R(b-0.45,4.3,b,12.4,B2);
  }
  // Kuppel (flach, gerippt) mit Laterne und Spitze
  const dome:Pt[]=[]; for(let i=0;i<=40;i++){ const t=Math.PI*i/40, du=-6.5*Math.cos(t); dome.push([c+du,18.0+7.3*Math.sqrt(Math.max(0,1-(du/6.5)**2))]); }
  s+=R(c-6.8,17.2,c+6.8,18.05,B2)+PG(dome,"fill:var(--dome)");
  for(const fr of [-0.8,-0.6,-0.4,-0.2,0,0.2,0.4,0.6,0.8]){ const du=6.5*fr, zt=18+7.3*Math.sqrt(1-fr*fr);
    s+=`<path d="M${f1(fx(c+du))} ${f1(fy(18))} Q${f1(fx(c+du*0.98))} ${f1(fy(18+(zt-18)*0.75))} ${f1(fx(c+du*0.25))} ${f1(fy(Math.min(25.1,zt+0.05)))}" style="fill:none;stroke:var(--frame);stroke-width:1.1;opacity:.55"/>`; }
  s+=PL(dome.filter(p=>p[1]<20.6&&p[1]>20.2).length?[[c-6.1,20.4],[c+6.1,20.4]]:[],"stroke:var(--frame);stroke-width:1.2;opacity:.55");
  s+=R(c-0.85,25.0,c+0.85,26.7,FR)+R(c-0.6,25.2,c+0.6,26.5,G)+R(c-1.05,26.7,c+1.05,26.95,FR);
  s+=PG([[c-0.9,26.95],[c,28.2],[c+0.9,26.95]],FR)+R(c-0.04,28.1,c+0.04,29.2,FR)+`<circle cx="${f1(fx(c))}" cy="${f1(fy(28.65))}" r="2.2" style="fill:var(--trim)"/>`+R(c-0.7,28.95,c+0.7,29.02,FR);
  // Giebelrisalit mit Fächerfenster
  const a=-5.7,b=4.9;
  s+=R(a,3.5,b,13.0,B)+R(a,3.5,b,4.3,PLI)+PG([[a-0.3,13.0],[c,17.3],[b+0.3,13.0]],B);
  s+=PL([[a-0.45,12.9],[c,17.5],[b+0.45,12.9]],"stroke:var(--roof);stroke-width:5;stroke-linejoin:miter");
  for(const u of [a-0.3,b+0.3]) s+=R(u-0.35,13.0,u+0.35,14.1,B2)+PG([[u-0.4,14.1],[u,14.9],[u+0.4,14.1]],RF);
  s+=R(c-0.08,17.5,c+0.08,18.4,FR);
  s+=R(a-0.1,12.85,b+0.1,13.1,B2)+R(a,4.3,a+0.55,12.85,B2)+R(b-0.55,4.3,b,12.85,B2);
  // Fächerfenster: Halbkreis mit Maßwerk und drei Rosetten
  const fr=3.95, fz=11.0;
  s+=arch(c,2*fr+0.4,fz-0.2,fz-0.2,FR)+arch(c,2*fr,fz,fz,G);
  s+=`<path d="M${f1(fx(c-fr*0.62))} ${f1(fy(fz))} A${f1(fr*6.2)} ${f1(fr*6.2)} 0 0 1 ${f1(fx(c+fr*0.62))} ${f1(fy(fz))}" style="fill:none;stroke:var(--frame);stroke-width:1.6"/>`;
  for(const ang of [0,36,72,108,144,180]){ const r=ang*Math.PI/180; s+=`<line x1="${f1(fx(c))}" y1="${f1(fy(fz))}" x2="${f1(fx(c+fr*Math.cos(r)))}" y2="${f1(fy(fz+fr*Math.sin(r)))}" style="stroke:var(--frame);stroke-width:1.3"/>`; }
  for(const [du,dz,rr] of [[0,2.55,0.95],[-2.05,1.3,0.8],[2.05,1.3,0.8]]) s+=`<circle cx="${f1(fx(c+du))}" cy="${f1(fy(fz+dz))}" r="${f1(rr*10)}" style="fill:var(--glass);stroke:var(--frame);stroke-width:2"/><circle cx="${f1(fx(c+du))}" cy="${f1(fy(fz+dz))}" r="${f1(rr*4)}" style="fill:none;stroke:var(--frame);stroke-width:1.2"/>`;
  s+=R(c-fr-0.2,fz-0.3,c+fr+0.2,fz,FR);
  // Oberlicht und Portal
  s+=seg(c,4.6,8.3,9.6,0.5,FR)+seg(c,4.3,8.45,9.55,0.45,G);
  for(const k of [-1.45,0,1.45]) s+=R(c+k-0.05,8.45,c+k+0.05,10.0,FR);
  s+=R(c-1.85,3.55,c+1.85,7.9,FR)+R(c-1.65,3.6,c+1.65,7.7,"fill:var(--door)")+R(c-0.04,3.6,c+0.04,7.7,FR)+R(c-1.65,6.6,c+1.65,6.7,FR);
  for(const du of [-2.35,2.35]) s+=R(c+du-0.09,6.4,c+du+0.09,7.6,FR)+R(c+du-0.18,7.6,c+du+0.18,8.05,"fill:var(--signal);opacity:.75");
  for(const o of [a+1.65,b-1.65]) s+=win(o,1.1,4.6,7.6,0.25);
  // Kaimauer, Laternen, Brücke zum Ponton mit Dalben
  const q:Pt[]=sc.quay.map((z,i)=>[sc.u0+i,z] as Pt); const qz=(u:number)=>q[Math.max(0,Math.min(q.length-1,Math.round(u-sc.u0)))][1];
  for(const u of [-31,-19,17,29]){ const z=qz(u); s+=R(u-0.08,z,u+0.08,z+3.8,FR)+R(u-0.28,z+3.8,u+0.28,z+4.55,FR)+R(u-0.2,z+3.9,u+0.2,z+4.45,"fill:var(--signal);opacity:.6")+PG([[u-0.35,z+4.55],[u,z+4.9],[u+0.35,z+4.55]],FR); }
  s+=PG([[FH.u0,qz(FH.u0)],...q,[FH.u1,qz(FH.u1)],[FH.u1,FH.zb-1],[FH.u0,FH.zb-1]],"fill:var(--stone)");
  for(let z=-2.4;z<3.4;z+=0.6) s+=R(FH.u0,z,FH.u1,z+0.05,"fill:var(--ink);opacity:.12");
  s+=PL([[FH.u0,qz(FH.u0)],...q,[FH.u1,qz(FH.u1)]],"stroke:var(--plinth);stroke-width:3");
  for(const u of [-41,-25,14,25,40]){ const z=qz(u); s+=R(u-0.22,z,u+0.22,z+0.55,"fill:var(--ink)")+R(u-0.3,z+0.5,u+0.3,z+0.62,"fill:var(--ink)"); }
  s+=R(c-1.6,3.7,c+1.6,3.95,FR)+R(c-1.6,3.95,c-1.5,5.0,FR)+R(c+1.5,3.95,c+1.6,5.0,FR)+R(c-1.6,4.9,c+1.6,5.0,FR);
  for(const u of [c-4.2,c+4.2]) s+=R(u-0.5,FH.zb-1,u+0.5,10.2,"fill:var(--frame)")+R(u-0.6,10.2,u+0.6,10.5,"fill:var(--frame)");
  s+=personSVG(fx(FH.person),fy(REF.fore),10);
  s+=latteSVG(fx(FH.latte),-3,8,fy,10,"hero");
  // Hochwassermarken an der Latte (Pegel St. Pauli)
  const cols: Record<number, [number, number]> = { 1962: [0, -1], 2022: [1, 1], 2013: [0, 1], 1976: [1, 1] };
  for(const h of HIST){ const [col,dir]=cols[h.y]||[0,1], x1=fx(FH.latte-0.25), x0=x1-(col?21:6);
    s+=`<rect x="${f1(x0)}" y="${f1(fy(h.m)-0.4)}" width="${f1(x1-x0)}" height="0.8" style="fill:var(--danger)"/>`;
    s+=`<text class="fs-mk" x="${f1(x0-0.8)}" y="${f1(fy(h.m))}" dy="${dir>0?"-0.25em":"1.05em"}" text-anchor="end" style="fill:var(--danger);font-weight:600;paint-order:stroke;stroke:var(--sky);stroke-width:1.2px">${h.y}</text>`; }
  s+=`<g class="wgrp"><rect class="w-rect" x="0" y="${fy(0)}" width="${fx(FH.u1)}" height="${fy(FH.zb-1)-fy(0)}"/><path class="w-line" d="${wave(0,fx(FH.u1),1.2,16)}"/></g>`;
  // Beschriftungen, die mit dem Wasser wandern
  const LX=fx(FH.latte), PX=fx(FH.person), PY=fy(REF.fore+2.05);
  s+=`<g class="lvl"><g class="lvl-s" data-ox="${f1(LX)}" data-oy="0"><polygon points="${f1(LX+3)},0 ${f1(LX+9)},-3 ${f1(LX+9)},3" style="fill:var(--ink)"/>
     <rect class="lvl-bg" x="${f1(LX+9)}" y="-11" width="44" height="17" rx="2.5" style="fill:var(--surface);opacity:.94"/>
     <text class="lvl-a" x="${f1(LX+13)}" y="-3.2" font-size="7" style="fill:var(--ink);font-weight:600"></text>
     <text class="lvl-b" x="${f1(LX+13)}" y="3.6" font-size="4.4" style="fill:var(--muted)"></text></g></g>`;
  s+=`<g class="who"><line x1="${f1(PX)}" x2="${f1(PX)}" y1="${f1(PY)}" y2="${f1(fy(REF.fore+1.9))}" style="stroke:var(--ink);stroke-width:.5"/>
     <g class="who-s" data-ox="${f1(PX)}" data-oy="${f1(PY)}"><rect class="who-bg" x="0" y="${f1(PY-11)}" width="10" height="9.5" rx="2.5" style="fill:var(--surface);opacity:.94"/>
     <text class="who-t" x="${f1(PX)}" y="${f1(PY-4.4)}" font-size="6" text-anchor="middle" style="fill:var(--ink);font-weight:600"></text></g></g>`;
  return s;
}
