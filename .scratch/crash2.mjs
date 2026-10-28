import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base=process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:1280,height:800} });
const p = await ctx.newPage();
let crashed=false; p.on("crash",()=>{crashed=true;console.log("CRASH")});
await p.goto(base+"/es?motionTest=1",{waitUntil:"networkidle"});
await p.waitForSelector("[data-boot-gate] [data-boot-choice='sound']"); await sleep(700);
await p.click("[data-boot-gate] [data-boot-choice='sound']"); await sleep(4000);
const heap=async()=>{try{return await p.evaluate(()=>Math.round(performance.memory.usedJSHeapSize/1e6)+"MB ctx="+window.__portafolioWebgl?.liveContexts?.()+" y="+Math.round(scrollY))}catch(e){return "ERR"}};
for (const id of ["lexer","parser","bytecode","runtime","gpu","display"]) {
  await p.evaluate(id=>document.getElementById(id)?.scrollIntoView(),id); await sleep(1500);
  const toks=p.locator(`#${id} button, #${id} [role=treeitem], #${id} a`); const n=Math.min(await toks.count(),12);
  for(let r=0;r<2;r++) for(let i=0;i<n&&!crashed;i++){ const bb=await toks.nth(i).boundingBox().catch(()=>null); if(bb&&bb.y>0&&bb.y<790) await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2,{steps:2}).catch(()=>{}); await sleep(40);}
  console.log(id, await heap());
  if(crashed)break;
}
await b.close();
