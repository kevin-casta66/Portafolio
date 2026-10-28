import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const { chromium } = require("@playwright/test");
import fs from "node:fs";
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext()).newPage();
const out=[];
for (let i=0;i<=14;i++){const n=String(i).padStart(2,"0");
 const A="data:image/png;base64,"+fs.readFileSync(`.scratch/ab/old-${n}.png`).toString("base64"), B="data:image/png;base64,"+fs.readFileSync(`.scratch/ab/new-${n}.png`).toString("base64");
 out.push(await p.evaluate(async([A,B])=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s});const [a,b]=await Promise.all([load(A),load(B)]);const c=document.createElement("canvas");c.width=a.width;c.height=a.height;const x=c.getContext("2d");x.drawImage(a,0,0);const da=x.getImageData(0,0,c.width,c.height).data;x.drawImage(b,0,0);const db=x.getImageData(0,0,c.width,c.height).data;let sum=0,n=0,ma=0,mb=0;for(let k=0;k<da.length;k+=4){const d=Math.abs(da[k]-db[k])+Math.abs(da[k+1]-db[k+1])+Math.abs(da[k+2]-db[k+2]);if(d>30)n++;sum+=d;ma+=da[k]+da[k+1]+da[k+2];mb+=db[k]+db[k+1]+db[k+2]}return {meanDiff:+(sum/(da.length/4)).toFixed(2),changedPx:n,lumOld:+(ma/(da.length/4*3)).toFixed(2),lumNew:+(mb/(da.length/4*3)).toFixed(2)}},[A,B]));}
out.forEach((o,i)=>console.log(i,JSON.stringify(o)));
await b.close();
