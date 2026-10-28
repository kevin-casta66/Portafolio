import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:412,height:823}, deviceScaleFactor:1.75, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval",{interval:500});
await cdp.send("Profiler.start");
await p.goto(process.argv[2]||"http://localhost:3150/es",{waitUntil:"load"});
await sleep(9000);
const {profile} = await cdp.send("Profiler.stop");
const nodes=new Map(profile.nodes.map(n=>[n.id,n]));
const self=new Map();
const dt=profile.timeDeltas;
profile.samples.forEach((id,i)=>{self.set(id,(self.get(id)||0)+dt[i])});
const agg={};
for(const [id,t] of self){const n=nodes.get(id);const cf=n.callFrame;const k=(cf.url.split("/").pop()||"(native)")+" :: "+(cf.functionName||"(anon)")+":"+cf.lineNumber+":"+cf.columnNumber;agg[k]=(agg[k]||0)+t}
const files={};for(const [k,t] of Object.entries(agg)){const f=k.split(" :: ")[0];files[f]=(files[f]||0)+t}
console.log("por archivo (ms):",Object.entries(files).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]+" "+Math.round(x[1]/1000)).join(" | "));
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,22).map(x=>Math.round(x[1]/1000)+"ms "+x[0]).join("\n"));
await b.close();
