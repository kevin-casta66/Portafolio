import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
for (const args of [[],["--use-angle=d3d11","--ignore-gpu-blocklist","--enable-gpu-rasterization","--enable-unsafe-webgpu"]]) {
const b = await chromium.launch({ channel: "chrome", args });
const p = await (await b.newContext()).newPage();
await p.goto("about:blank");
console.log(args.join(" ")||"default", await p.evaluate(async()=>{const c=document.createElement("canvas");const g=c.getContext("webgl2");const e=g.getExtension("WEBGL_debug_renderer_info");let gpu=null;try{gpu=!!(await navigator.gpu?.requestAdapter())}catch{}return {r:g.getParameter(e.UNMASKED_RENDERER_WEBGL),webgpu:gpu}}));
await b.close();}
