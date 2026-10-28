/**
 * Verificación SEO (change 09, tareas 6.1–6.4) contra un servidor en marcha (idealmente `next start`
 * tras `next build`; en dev la 404 puede responder 200 por el streaming).
 * Uso: `BASE=http://localhost:3000 node scripts/seo/verify.mjs`. Sale con 1 si algo falla.
 */
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const SLUGS = (process.env.SLUGS ?? "arquelume-ai-agent,domonow-spec-driven").split(",");
const LOCALES = ["es", "en"];
let fails = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1];
const metas = (html) => [...html.matchAll(/<(?:meta|link)\b[^>]*>/g)].map((m) => m[0]);

const paths = ["", "/heap", "/motion", ...SLUGS.map((s) => `/projects/${s}`)];
for (const locale of LOCALES) {
  for (const path of paths) {
    const url = `${BASE}/${locale}${path}`;
    const res = await fetch(url);
    const html = await res.text();
    const tags = metas(html);
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
    const desc = attr(tags.find((t) => /name="description"/.test(t)) ?? "", "content") ?? "";
    const canonical = attr(tags.find((t) => /rel="canonical"/.test(t)) ?? "", "href");
    const alts = Object.fromEntries(
      tags.filter((t) => /rel="alternate"/.test(t) && attr(t, "hreflang")).map((t) => [attr(t, "hreflang"), attr(t, "href")]),
    );
    const ogImage = attr(tags.find((t) => /property="og:image"/.test(t)) ?? "", "content");
    const label = `${locale}${path || "/"}`;
    ok(`${label}: HTTP 200`, res.status === 200);
    ok(`${label}: <html lang>`, new RegExp(`<html[^>]*lang="${locale}"`).test(html));
    ok(`${label}: título y descripción propios`, title.length > 5 && desc.length > 40 && !/línea de código|line of code/.test(desc), `${title} | ${desc.slice(0, 50)}…`);
    ok(`${label}: canonical absoluto`, canonical === url, String(canonical));
    ok(`${label}: hreflang es/en/x-default absolutos`, ["es", "en", "x-default"].every((k) => alts[k]?.startsWith("http")), JSON.stringify(alts));
    ok(`${label}: og:image`, Boolean(ogImage));
    if (ogImage) {
      const img = await fetch(ogImage.startsWith("http") ? ogImage.replace(/^https?:\/\/[^/]+/, BASE) : BASE + ogImage);
      const buf = Buffer.from(await img.arrayBuffer());
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      ok(`${label}: og:image 1200×630 PNG`, img.status === 200 && (img.headers.get("content-type") ?? "").includes("image/png") && w === 1200 && h === 630, `${w}×${h}`);
    }
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    if (path === "") ok(`${label}: JSON-LD Person`, ld.some((d) => d["@type"] === "Person" && d.name && d.jobTitle && d.url && d.sameAs?.length && d.knowsAbout?.length));
    if (path.startsWith("/projects/"))
      ok(`${label}: JSON-LD CreativeWork`, ld.some((d) => d["@type"] === "CreativeWork" && d.name && d.description && d.author?.name && d.datePublished && d.url));
  }
}

// sitemap y robots
const sm = await fetch(`${BASE}/sitemap.xml`);
const xml = await sm.text();
ok("sitemap.xml 200 XML", sm.status === 200 && (sm.headers.get("content-type") ?? "").includes("xml"));
for (const locale of LOCALES) for (const path of paths) {
  const loc = new RegExp(`https?://[^<]*/${locale}${path.replace(/\//g, "\/")}<`);
  ok(`sitemap incluye /${locale}${path}`, loc.test(xml));
}
ok("sitemap con alternativas xhtml:link", /xhtml:link/.test(xml));
const rb = await fetch(`${BASE}/robots.txt`);
const robots = await rb.text();
ok("robots.txt 200 con Sitemap", rb.status === 200 && /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i.test(robots), robots.replace(/\n/g, " | "));

// 404
for (const url of [`${BASE}/es/no-existe`, `${BASE}/en/projects/no-existe`]) {
  const r = await fetch(url);
  const h = await r.text();
  ok(`404 ${url.replace(BASE, "")}: estado 404`, r.status === 404, String(r.status));
  ok(`404 ${url.replace(BASE, "")}: noindex`, /name="robots"[^>]*content="[^"]*noindex/.test(h) || /noindex/.test(r.headers.get("x-robots-tag") ?? ""));
}
console.log(fails ? `\n${fails} comprobación(es) fallida(s).` : "\nTodo correcto.");
process.exit(fails ? 1 : 0);
