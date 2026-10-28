import fs from 'fs';
let s=fs.readFileSync('.scratch/comp.mjs','utf8').split('\n');
const i=s.findIndex(l=>l.includes('let p=src'));
s[i]=" map.sources.forEach((src,i)=>{ let p=norm(src);";
s.splice(1,0,"function norm(src){ src=src.replace('turbopack:///[project]/','').replace(/^.*?node_modules\/\.pnpm\/[^/]+\/node_modules\//,'nm:'); const c=src.indexOf('next/dist/compiled/'); if(c>=0) return 'nm:next-compiled/'+src.slice(c+19).split('/')[0]; return src.replace(/^(\.\.\/)+/,''); }");
fs.writeFileSync('.scratch/comp.mjs',s.join('\n'));
