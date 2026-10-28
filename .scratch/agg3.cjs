const fs=require('fs');
const route=process.argv[2];
const L=fs.readFileSync('.scratch/graph.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const async=new Set();L.filter(x=>x.type==='group'&&x.route===route).forEach(g=>g.outputs.forEach(o=>async.add(o)));
const init=new Set(L.filter(x=>x.type==='output'&&x.route===route&&x.filename.includes('/static/chunks/')&&!async.has(x.filename)).map(x=>x.filename));
console.log('initial chunks',init.size);
const agg={};let tot=0;
for(const p of L){ if(p.type!=='part'||p.route!==route||!init.has(p.filename))continue;
 let s=p.source_path.replace(/\[project\]\//,''); s=s.replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//,'nm:');
 const k=/^nm:/.test(s)?s.split('/').slice(0,s.startsWith('nm:@')?2:1).join('/'):s.split('/').slice(0,3).join('/');
 agg[k]=(agg[k]||0)+p.compressed_size; tot+=p.compressed_size;}
console.log('total',(tot/1024).toFixed(1));
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,45).map(x=>(x[1]/1024).toFixed(1)+'K '+x[0]).join('\n'));
