import fs from "node:fs";
const dir=".next/static/chunks/";
const marks={three:/WebGPURenderer|__THREE__|THREE\.WebGLRenderer/,three2:/MeshBasicNodeMaterial/, gsap:/gsap\.registerPlugin|GreenSock|_gsap/, scrolltrigger:/ScrollTrigger/, lenis:/lenis/i, tone:/Tone\.js|standardized-audio-context/, r3f:/react-three-fiber|__r3f/, rapier:/rapier/i};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js"))){const t=fs.readFileSync(dir+f,"utf8");const hit=Object.entries(marks).filter(([k,r])=>r.test(t)).map(x=>x[0]);if(hit.length)console.log(f,(t.length/1024|0)+"K",hit.join(","));}
