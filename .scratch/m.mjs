import zlib from 'node:zlib';
const B='http://localhost:3150';
const marks={three:/WebGPURenderer|isWebGPURenderer|REVISION="18|__THREE__/, gsap:/GreenSock|gsap\.registerPlugin|_gsap/, lenis:/lenis|Lenis/, tone:/Tone\.js|ToneAudio/};
for (const r of process.argv.slice(2)) {
  const html = await (await fetch(B+r)).text();
  const srcs=[...new Set([...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js[^"]*)"/g)].map(m=>m[1]))];
  let tot=0; const rows=[];
  for (const s of srcs){ const buf=Buffer.from(await (await fetch(B+s)).arrayBuffer()); const g=zlib.gzipSync(buf,{level:9}).length; tot+=g; const t=buf.toString('utf8'); rows.push([g,s.split('/').pop(),Object.entries(marks).filter(([k,re])=>re.test(t)).map(x=>x[0]).join(',')]); }
  rows.sort((a,b)=>b[0]-a[0]);
  console.log(r,(tot/1024).toFixed(2),'KB',srcs.length,'scripts\n  '+rows.slice(0,8).map(x=>(x[0]/1024).toFixed(1)+' '+x[1]+' '+x[2]).join('\n  '));
}
