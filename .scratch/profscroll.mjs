import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:1280,height:720} });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
await p.goto("http://localhost:3150/es?motionTest=1",{waitUntil:"networkidle"}); await sleep(6000);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval",{interval:300}); await cdp.send("Profiler.start");
await p.evaluate(()=>new Promise(res=>{let y=0;const total=document.documentElement.scrollHeight-innerHeight;const step=()=>{y+=12;scrollTo(0,y);if(y<total)requestAnimationFrame(step);else res()};requestAnimationFrame(step)}));
const {profile}=await cdp.send("Profiler.stop");
const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const self=new Map();profile.samples.forEach((id,i)=>self.set(id,(self.get(id)||0)+profile.timeDeltas[i]));
const agg={};for(const [id,t] of self){const cf=nodes.get(id).callFrame;const k=(cf.url.split("/").pop()||"(native)")+" :: "+(cf.functionName||"(anon)")+":"+cf.lineNumber+":"+cf.columnNumber;agg[k]=(agg[k]||0)+t}
const total=[...self.values()].reduce((a,b)=>a+b,0);
console.log("total ms",Math.round(total/1000));
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>Math.round(x[1]/1000)+"ms "+x[0]).join("\n"));
await b.close();
