import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
for (const variant of ["high","medium","low","reduced","none"]) {
const ctx = await b.newContext({ viewport:{width:1280,height:720} });
await ctx.addInitScript((v)=>{sessionStorage.setItem("portafolio:gate","silent"); if(v==="reduced")sessionStorage.setItem("portafolio:motion","reduced")},variant);
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es?motionTest=1"+(variant==="none"?"&webgl=none":""),{waitUntil:"networkidle"});
await sleep(5000);
if(["high","medium","low"].includes(variant)) { await p.evaluate(t=>window.__portafolioWebgl.setTier(t),variant); await sleep(1500);}
const r=await p.evaluate(()=>new Promise(res=>{const t=[];let y=0;const total=document.documentElement.scrollHeight-innerHeight;const step=()=>{t.push(performance.now());y+=12;scrollTo(0,y);if(y<total)requestAnimationFrame(step);else res(t)};requestAnimationFrame(step)}));
const d=r.slice(1).map((x,i)=>1000/(x-r[i])).sort((a,b)=>a-b);
const st=await p.evaluate(()=>window.__portafolioApp.store.getState().graphics.tier);
console.log(variant.padEnd(8),"mediana",d[Math.floor(d.length/2)].toFixed(1),"p5",d[Math.floor(d.length*0.05)].toFixed(1),"tier final",st);
await ctx.close();}
await b.close();
