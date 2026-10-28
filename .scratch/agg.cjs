const fs=require('fs');const L=fs.readFileSync('.scratch/graph.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const route=process.argv[2]||'/[locale]';
const files=process.argv[3]; // filter chunk basename
const agg={};let tot=0;
for(const p of L){ if(p.type!=='part'||p.route!==route||!p.filename.includes('/static/chunks/'))continue; if(files&&!p.filename.includes(files))continue;
 let s=p.source_path.replace(/\[project\]\//,''); s=s.replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//,'nm:'); 
 const k=/^nm:/.test(s)?s.split('/').slice(0,s.startsWith('nm:@')?2:1).join('/'):s.split('/').slice(0,2).join('/');
 agg[k]=(agg[k]||0)+p.compressed_size; tot+=p.compressed_size;}
console.log('total compressed',(tot/1024).toFixed(1));
console.log(Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,40).map(x=>(x[1]/1024).toFixed(1)+'K '+x[0]).join('\n'));
