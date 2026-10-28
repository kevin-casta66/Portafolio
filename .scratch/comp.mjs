import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
const B = process.env.BASE ?? "http://localhost:3150";
const route = "/" + process.argv[2];
function norm(src) {
  src = src.replace("turbopack:///[project]/", "");
  src = src.replace(/^.*?node_modules\/\.pnpm\/[^/]+\/node_modules\//, "nm:");
  const c = src.indexOf("next/dist/compiled/");
  if (c >= 0) return "nm:next-compiled/" + src.slice(c + 19).split("/")[0];
  return src.replace(/^(\.\.\/)+/, "");
}
const html = await (await fetch(B + route)).text();
const tags = [...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js[^"]*)"[^>]*>/g)];
const srcs = [...new Set(tags.filter((m) => !/noModule/.test(m[0])).map((m) => m[1]))];
const agg = {};
let tot = 0;
for (const s of srcs) {
  const name = s.split("?")[0].replace("/_next/", ".next/");
  const buf = fs.readFileSync(name);
  const gz = zlib.gzipSync(buf, { level: 9 }).length;
  tot += gz;
  const m = buf.toString("utf8").match(/sourceMappingURL=(\S+)/);
  let map;
  try {
    map = JSON.parse(fs.readFileSync(path.join(path.dirname(name), m[1]), "utf8"));
  } catch {
    agg["?nomap " + name] = gz;
    continue;
  }
  const sizes = map.sources.map((_, i) => (map.sourcesContent?.[i] ?? "").length);
  const sum = sizes.reduce((a, b) => a + b, 0) || 1;
  map.sources.forEach((src, i) => {
    const p = norm(src);
    const k = /^nm:/.test(p) ? p.split("/").slice(0, p.startsWith("nm:@") ? 2 : p.startsWith("nm:next-compiled") ? 2 : 1).join("/") : p.split("/").slice(0, +process.env.DEPTH || 3).join("/");
    agg[k] = (agg[k] || 0) + (gz * sizes[i]) / sum;
  });
}
console.log(route, "total (sin noModule)", (tot / 1024).toFixed(1));
console.log(
  Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, +process.argv[3] || 35)
    .map((x) => (x[1] / 1024).toFixed(1) + "K " + x[0])
    .join("\n"),
);
