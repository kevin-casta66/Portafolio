import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport:{width:1280,height:900}, reducedMotion:"reduce" });
await ctx.addInitScript(()=>{sessionStorage.setItem("portafolio:gate","silent")});
const p = await ctx.newPage();
await p.goto("http://localhost:3150/es",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
for (let y=0;y<12000;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(150)}
await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{const out=[];const el=document.querySelector("#experiment-generative-shader button[aria-pressed]");let e=el;while(e&&e!==document.body){const cs=getComputedStyle(e);if(cs.opacity!=="1")out.push(e.tagName+"."+(e.className||"").toString().slice(0,40)+" op="+cs.opacity+" anim="+(e.getAnimations?.().length||0));e=e.parentElement}return {out,exp:document.documentElement.dataset.experience}}));
const sel=await p.evaluate(()=>{const s=document.querySelector("select");let e=s;const out=[];while(e&&e!==document.body){const cs=getComputedStyle(e);if(cs.opacity!=="1")out.push(e.tagName+"."+(e.className||"").toString().slice(0,40)+" op="+cs.opacity);e=e.parentElement}return out});console.log(sel);
await b.close();
