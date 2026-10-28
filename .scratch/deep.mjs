import fs from "node:fs"; import zlib from "node:zlib"; import path from "node:path";
const B="http://localhost:3150"; const route="/"+process.argv[2]; const filt=process.argv[3];
const html=await (await fetch(B+route)).text();
const srcs=[...new Set([...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js[^"]*)"[^>]*>/g)].filter(m=>!/noModule/.test(m[0])).map(m=>m[1]))];
const agg={};
for(const s of srcs){const name=s.split("?")[0].replace("/_next/",".next/");const buf=fs.readFileSync(name);const gz=zlib.gzipSync(buf,{level:9}).length;
 const m=buf.toString("utf8").match(/sourceMappingURL=(\S+)/);const map=JSON.parse(fs.readFileSync(path.join(path.dirname(name),m[1]),"utf8"));
 const sizes=map.sources.map((_,i)=>(map.sourcesContent?.[i]??"").length);const sum=sizes.reduce((a,b)=>a+b,0)||1;
 map.sources.forEach((src,i)=>{ if(!src.includes(filt))return; const k=src.replace(/^.*?node_modules\/\.pnpm\/[^/]+\/node_modules\//,"").split("/").slice(0,+process.argv[4]||5).join("/"); agg[k]=(agg[k]||0)+gz*sizes[i]/sum;});}
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,30).map(x=>(x[1]/1024).toFixed(2)+"K "+x[0]).join("\n"));
