import { f1 } from "../lib/format";

/* Zeichenhelfer für ein Koordinatensystem mit X(m), Y(m), k Einheiten pro Meter */
type Fn = (v: number) => number;
export type Pt = [number, number];

export function kit(X: Fn, Y: Fn, k: number) {
  const R=(a:number,b:number,c:number,d:number,st:string,cls?:string)=>{const x0=Math.min(X(a),X(c)),x1=Math.max(X(a),X(c));
    return `<rect${cls?` class="${cls}"`:""} x="${f1(x0)}" y="${f1(Y(Math.max(b,d)))}" width="${f1(x1-x0)}" height="${f1(Math.abs(d-b)*k)}" style="${st}"/>`;};
  const PG=(pts:Pt[]|number[][],st:string)=>`<polygon points="${pts.map(([u,z]:number[])=>f1(X(u))+","+f1(Y(z))).join(" ")}" style="${st}"/>`;
  const PL=(pts:Pt[]|number[][],st:string)=>`<polyline points="${pts.map(([u,z]:number[])=>f1(X(u))+","+f1(Y(z))).join(" ")}" style="fill:none;${st}"/>`;
  const TX=(u:number,z:number,txt:string|number,size:number,st:string,anchor?:string,cls?:string)=>`<text${cls?` class="${cls}"`:""} x="${f1(X(u))}" y="${f1(Y(z))}" font-size="${size}" text-anchor="${anchor||"start"}" style="${st}">${txt}</text>`;
  /* Fenster mit Segmentbogen (h = Stich in m) */
  const seg=(uc:number,w:number,zb:number,zs:number,h:number,st:string)=>{const r=(w*w/4+h*h)/(2*h);
    return `<path d="M${f1(X(uc-w/2))} ${f1(Y(zb))} V${f1(Y(zs))} A${f1(r*k)} ${f1(r*k)} 0 0 1 ${f1(X(uc+w/2))} ${f1(Y(zs))} V${f1(Y(zb))} Z" style="${st}"/>`;};
  const arch=(uc:number,w:number,zb:number,zs:number,st:string)=>`<path d="M${f1(X(uc-w/2))} ${f1(Y(zb))} V${f1(Y(zs))} A${f1(w/2*k)} ${f1(w/2*k)} 0 0 1 ${f1(X(uc+w/2))} ${f1(Y(zs))} V${f1(Y(zb))} Z" style="${st}"/>`;
  return {R,PG,PL,TX,seg,arch};
}
export function personSVG(x: number, yFeet: number, k: number) { // Bildschirmkoordinaten, k Einheiten pro Meter
  const r=(a:number,b:number,w:number,h:number,st:string)=>`<rect x="${f1(x+a*k)}" y="${f1(yFeet-(b+h)*k)}" width="${f1(w*k)}" height="${f1(h*k)}" rx="${f1(0.04*k)}" style="${st}"/>`;
  return `<g aria-hidden="true">${r(-0.17,0,0.14,0.35,"fill:var(--signal)")}${r(0.03,0,0.14,0.35,"fill:var(--signal)")}${r(-0.17,0.35,0.34,0.6,"fill:var(--ink)")}${r(-0.22,0.92,0.44,0.58,"fill:var(--ink)")}${r(-0.29,0.95,0.09,0.5,"fill:var(--ink)")}${r(0.2,0.95,0.09,0.5,"fill:var(--ink)")}<circle cx="${f1(x)}" cy="${f1(yFeet-1.66*k)}" r="${f1(0.12*k)}" style="fill:var(--ink)"/></g>`;
}
/* Pegellatte mit E-Teilung, xc = Bildschirm-x der Lattenmitte */
export function latteSVG(xc: number, zb: number, ztop: number, Y: Fn, k: number, mode: "pano" | "hero" | "prof") {
  const w=0.5*k, x0=xc-w/2;
  let s=`<rect x="${f1(xc-0.06*k)}" y="${f1(Y(ztop+0.3))}" width="${f1(0.12*k)}" height="${f1((ztop+0.3-zb)*k)}" style="fill:var(--plinth)"/>`;
  s+=`<rect x="${f1(x0)}" y="${f1(Y(ztop))}" width="${f1(w)}" height="${f1((ztop-zb)*k)}" style="fill:var(--board);stroke:var(--mark);stroke-width:${f1(0.015*k)}"/>`;
  for(let m=Math.ceil(zb*2)/2;m<ztop-0.01;m+=0.5){
    const left=Math.round(m*2)%2===0, col=Math.round(m)%2===0?"var(--mark)":"var(--danger)";
    const bx=left?x0:xc+0.17*k, px=left?x0:xc;
    s+=`<rect x="${f1(bx)}" y="${f1(Y(m+0.5))}" width="${f1(0.08*k)}" height="${f1(0.5*k)}" style="fill:${col}"/>`;
    for(const q of [0,0.2,0.4]) s+=`<rect x="${f1(px)}" y="${f1(Y(m+q+0.1))}" width="${f1(0.25*k)}" height="${f1(0.1*k)}" style="fill:${col}"/>`;
  }
  for(let m=Math.ceil(zb);m<=Math.floor(ztop);m++){
    const lab=`${m>0?"+":m<0?"−":""}${Math.abs(m)}`;
    if(mode==="pano"){ if(m%2===0) s+=`<text x="${f1(xc+0.5*k)}" y="${f1(Y(m)+5)}" font-size="13" style="fill:var(--muted)">${lab}</text>`; }
    else if(mode==="hero"){ if(m>=0) s+=`<text class="fs-lat" x="${f1(xc+0.33*k)}" y="${f1(Y(m))}" dy="0.33em" style="fill:var(--ink);font-weight:600;paint-order:stroke;stroke:var(--sky);stroke-width:1.2px">${lab}</text>`; }
    else if(m>=0) s+=`<text x="${f1(xc-0.4*k)}" y="${f1(Y(m)+3)}" font-size="8" text-anchor="end" style="fill:var(--ink);font-weight:600">${lab}</text>`;
  }
  return s;
}
export function wave(x0: number, x1: number, amp: number, per: number) {let d=`M${x0} 0`;for(let x=x0;x<x1;x+=per) d+=` q${per/4} ${-amp} ${per/2} 0 t${per/2} 0`;return d;}
