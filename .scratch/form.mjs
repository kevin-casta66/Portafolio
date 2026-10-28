import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent");window.__l=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__l.push({t:Math.round(e.startTime),d:Math.round(e.duration),bd:Math.round(e.blockingDuration),rs:Math.round(e.renderStart-e.startTime),sl:Math.round(e.styleAndLayoutStart-e.startTime),s:e.scripts.map(s=>({f:(s.sourceURL||"").split("/").pop(),fn:s.sourceFunctionName,n:(s.invoker||"").slice(0,40),d:Math.round(s.duration),fl:Math.round(s.forcedStyleAndLayoutDuration)}))})}).observe({type:"long-animation-frame",buffered:true})});
const p = await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
await p.goto("http://localhost:3150/es?motionTest=1",{waitUntil:"networkidle"});
await p.waitForFunction(()=>document.documentElement.dataset.motionReady==="true"&&window.__portafolioApp?.store.getState().graphics.ready===true,null,{timeout:30000}).catch(()=>{});
await sleep(2500);
await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});

await p.evaluate(()=>{window.__l.length=0});
await p.evaluate(()=>window.scrollTo(0,0)); await sleep(2500); await p.evaluate(()=>{window.__l.length=0}); await p.tap("[data-sound-settings]"); await sleep(1500);
for (const e of await p.evaluate(()=>window.__l)) console.log(JSON.stringify(e));
await b.close();
