import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base=process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:1280,height:800} });
const p = await ctx.newPage();
p.on("crash",()=>console.log("CRASH"));
p.on("console",m=>{if(m.type()==="error"||m.type()==="warning")console.log("console",m.type(),m.text().slice(0,200))});
await p.goto(base+"/es?motionTest=1",{waitUntil:"networkidle"});
await p.waitForSelector("[data-boot-gate] [data-boot-choice='sound']"); await sleep(700);
await p.click("[data-boot-gate] [data-boot-choice='sound']");
await sleep(5000);
for (const ph of ["source","lexer","parser","bytecode","runtime"]) { try { await p.evaluate(e=>window.__portafolioSound.emit(e),"phase:"+ph); console.log("ok",ph);} catch(e){console.log("ERR",ph,String(e).slice(0,80));break} await sleep(1500);}
await b.close();
