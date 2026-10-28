import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
for (const [w,h] of [[1280,720],[1920,1080]]) {
const ctx = await b.newContext({ viewport:{width:w,height:h} });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es?motionTest=1",{waitUntil:"networkidle"});
await sleep(5000);
const fps=await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(n/2)};requestAnimationFrame(f)}));
const st=await p.evaluate(()=>window.__portafolioApp.store.getState().graphics);
console.log(w+"x"+h,"idle fps",fps,JSON.stringify(st));
// scroll test in page JS (no playwright overhead): programmatic smooth scroll
const r=await p.evaluate(()=>new Promise(res=>{const t=[];let y=0;const total=document.documentElement.scrollHeight-innerHeight;const step=()=>{t.push(performance.now());y+=12;scrollTo(0,y);if(y<total)requestAnimationFrame(step);else res(t)};requestAnimationFrame(step)}));
const d=r.slice(1).map((x,i)=>1000/(x-r[i])).sort((a,b)=>a-b);
console.log("  scroll programático: mediana",d[Math.floor(d.length/2)].toFixed(1),"p5",d[Math.floor(d.length*0.05)].toFixed(1),"frames",r.length);
await ctx.close();}
await b.close();
