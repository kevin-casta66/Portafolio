import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
for (const variant of ["base","no-accent-writes","no-lenis-read"]) {
const ctx = await b.newContext({ viewport:{width:1280,height:720} });
await ctx.addInitScript((v)=>{sessionStorage.setItem("portafolio:gate","silent");
 if(v==="no-accent-writes"){const o=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(n,val,p){if(n==="--accent-active")return;return o.call(this,n,val,p)}}
},variant);
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es?motionTest=1",{waitUntil:"networkidle"});
await sleep(6000);
const r=await p.evaluate(()=>new Promise(res=>{const t=[];let y=0;const total=document.documentElement.scrollHeight-innerHeight;const step=()=>{t.push(performance.now());y+=12;scrollTo(0,y);if(y<total)requestAnimationFrame(step);else res(t)};requestAnimationFrame(step)}));
const d=r.slice(1).map((x,i)=>1000/(x-r[i])).sort((a,b)=>a-b);
console.log(variant.padEnd(18),"mediana",d[Math.floor(d.length/2)].toFixed(1),"p5",d[Math.floor(d.length*0.05)].toFixed(1),"frames",r.length);
await ctx.close();}
await b.close();
