import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const tag = process.argv[2];
const b = await chromium.launch({ channel: "chrome", args:["--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport:{width:1280,height:800} });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es?motionTest=1&webgl=webgl2",{waitUntil:"networkidle"});
await p.waitForFunction(()=>window.__portafolioWebgl?.engine?.(), null, {timeout:60000});
await p.waitForTimeout(2000);
const info = await p.evaluate(()=>{const b=document.querySelector("#bytecode").getBoundingClientRect();return {top:b.top+scrollY,h:b.height,H:document.documentElement.scrollHeight}});
console.log(info);
const start = info.top - 3200, end = info.top + 300;
const stats=[];
for (let i=0;i<=14;i++){
  const y = Math.round(start + (end-start)*i/14);
  await p.evaluate(y=>scrollTo(0,y),y);
  await p.waitForTimeout(2200);
  await p.screenshot({path:`.scratch/ab/${tag}-${String(i).padStart(2,"0")}.png`});
  const s = await p.evaluate(()=>({backend:window.__portafolioWebgl?.info?.(), p:null}));
  stats.push(s.backend?.drawCalls);
}
console.log(tag, "drawCalls", stats.join(","));
await b.close();
