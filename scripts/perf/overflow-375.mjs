/**
 * Desbordamiento horizontal y cabecera a 375 px (change 09, tarea 5.10). `BASE=http://localhost:3150 node scripts/perf/overflow-375.mjs`
 * Recorre home, caso, /heap, /motion y la 404 en es/en y modos full/reduced y exige scrollWidth <= innerWidth y
 * cabecera de 2 filas como máximo. Sale con 1 si algo falla.
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base=process.env.BASE||"http://localhost:3150";
const b = await chromium.launch({ channel: "chrome" });
let bad=0;
for (const mode of ["full","reduced"]) for (const loc of ["es","en"]) {
 const ctx = await b.newContext({ viewport:{width:375,height:812}, deviceScaleFactor:2, hasTouch:true, isMobile:true, reducedMotion: mode==="reduced"?"reduce":"no-preference" });
 await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
 for (const path of ["","/projects/arquelume-ai-agent","/heap","/motion","/ruta-que-no-existe"]) {
  const p = await ctx.newPage();
  await p.goto(`${base}/${loc}${path}`,{waitUntil:"networkidle"}); await sleep(1200);
  // recorre para disparar contenidos dinámicos
  for (let y=0;y<30000;y+=900){ const done=await p.evaluate(y=>{scrollTo(0,y);return y>document.documentElement.scrollHeight},y); await sleep(60); if(done)break;}
  const r = await p.evaluate(()=>{const h=document.querySelector("header");const kids=[...h.querySelectorAll("a,button,select")].filter(e=>e.offsetParent!==null);const cs=kids.map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2}).sort((a,b)=>a-b);const tops=new Set();let last=-99;for(const c of cs){if(c-last>16){tops.add(c)}last=c}
   const wide=[...document.querySelectorAll("body *")].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0&&getComputedStyle(e).position!=="fixed"}).slice(0,4).map(e=>e.tagName+"."+String(e.className).slice(0,50)+" r="+Math.round(e.getBoundingClientRect().right));
   return {sw:document.documentElement.scrollWidth,iw:innerWidth,rows:tops.size,hh:Math.round(h.getBoundingClientRect().height),wide}});
  const ok = r.sw<=r.iw && r.rows<=2; if(!ok)bad++;
  console.log(ok?"OK  ":"FAIL",mode,loc,path||"/",JSON.stringify(r));
  await p.close();
 }
 await ctx.close();
}
await b.close(); console.log(bad?`${bad} fallos`:"todo OK");
process.exit(bad ? 1 : 0);
