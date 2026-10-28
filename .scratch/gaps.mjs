import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:1920,height:1080} });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es?motionTest=1",{waitUntil:"networkidle"});
await p.waitForFunction(()=>window.__portafolioApp?.store.getState().graphics.ready===true,null,{timeout:40000}); await sleep(4000);
for (const pass of [1,2]) {
await p.evaluate(()=>scrollTo(0,0)); await sleep(1500);
await p.evaluate(()=>{window.__t=[];const loop=t=>{window.__t.push([t,Math.round(scrollY)]);window.__raf=requestAnimationFrame(loop)};window.__raf=requestAnimationFrame(loop)});
const total=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
await p.mouse.move(960,540);
for(let y=0;y<total;y+=60){await p.mouse.wheel(0,60);await sleep(14)}
await sleep(1200);
const t=await p.evaluate(()=>{cancelAnimationFrame(window.__raf);return window.__t});
const gaps=[];for(let i=1;i<t.length;i++){const d=t[i][0]-t[i-1][0];if(d>120)gaps.push(`${Math.round(d)}ms@y=${t[i][1]}`)}
console.log("pasada",pass,"huecos >120ms:",gaps.join(" "));}
await b.close();
