const fs=require('fs');
const route=process.argv[2], names=process.argv[3].split(',');
const L=fs.readFileSync('.scratch/graph.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const agg={};const per={};
for(const p of L){ if(p.type!=='part'||p.route!==route)continue; const b=p.filename.split('/').pop(); if(!names.includes(b))continue;
 let s=p.source_path.replace(/\[project\]\//,''); s=s.replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//,'nm:');
 const k=/^nm:/.test(s)?s.split('/').slice(0,s.startsWith('nm:@')?2:1).join('/'):s.split('/').slice(0,3).join('/');
 (per[b]??={})[k]=(per[b][k]||0)+p.compressed_size; agg[k]=(agg[k]||0)+p.compressed_size;}
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,45).map(x=>(x[1]/1024).toFixed(1)+'K '+x[0]).join('\n'));
