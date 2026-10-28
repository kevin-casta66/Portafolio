import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:375,height:812}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage();
await p.goto(process.argv[2]||"http://localhost:3150/es",{waitUntil:"networkidle"}); await sleep(1500);
for (let y=0;y<30000;y+=900){ await p.evaluate(y=>scrollTo(0,y),y); await sleep(50);}
console.log(await p.evaluate(()=>{const out=[];const iw=document.documentElement.clientWidth;
 for(const e of document.querySelectorAll("body *")){const r=e.getBoundingClientRect();if(r.width===0||r.right<=iw+0.5)continue;
  let clipped=false,a=e.parentElement;while(a&&a!==document.body){const o=getComputedStyle(a);if(/hidden|auto|scroll|clip/.test(o.overflowX)){clipped=true;break}a=a.parentElement}
  const pos=getComputedStyle(e).position; if(clipped||pos==="fixed")continue;
  out.push(e.tagName+"#"+e.id+"."+String(e.className.baseVal??e.className).slice(0,70)+" right="+Math.round(r.right)+" w="+Math.round(r.width))}
 return {sw:document.documentElement.scrollWidth,iw,out:out.slice(0,12)}}));
await b.close();
