import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/**
 * Presupuesto de JavaScript inicial (change 09, spec `performance-budgets`): por ruta (home, caso,
 * `/heap`, `/motion`) suma el gzip nivel 9 de los scripts `/_next/static/**\/*.js` que referencia el HTML de
 * producción y falla (código 1) si
 *   - la suma de lo que ejecutan los navegadores modernos es >= 180 KB, o
 *   - algún script inicial contiene librerías diferibles (three, GSAP/ScrollTrigger, Lenis, Tone, Rapier).
 *
 * Criterio de medición = el del change 04 (misma fórmula, comparable con el histórico de design.md D9),
 * con UNA precisión: el script `polyfills` de Next (`noModule`, ~38,6 KB) NO se cuenta en el total del
 * presupuesto porque ningún navegador con módulos ES lo descarga ni lo ejecuta; se informa aparte
 * («literal») para que la cifra comparable con la línea base (256,99 KB en /es antes del change 09) siga
 * visible. Para obtener el literal: columna `literal`.
 *
 * Uso (sobre `next build` + `next start`):
 *   BASE=http://localhost:3150 pnpm exec tsx scripts/check-bundle.ts [--json docs/perf/bundle.json]
 */
export const BUDGET_BYTES = 180 * 1024;

/** Marcas que delatan una librería diferible dentro de un script inicial. */
export const FORBIDDEN: Record<string, RegExp> = {
  three: /WebGPURenderer|__THREE__|MeshBasicNodeMaterial/,
  gsap: /gsap\.registerPlugin|GreenSock/,
  lenis: /smoothWheel/,
  tone: /standardized-audio-context|ToneAudioNode/,
  rapier: /rapier3d|RAPIER/,
};

export interface ScriptRef {
  src: string;
  noModule: boolean;
}

export function extractScripts(html: string): ScriptRef[] {
  const seen = new Map<string, ScriptRef>();
  for (const match of html.matchAll(/<script\b[^>]*\ssrc="([^"]+\.js[^"]*)"[^>]*>/g)) {
    const src = match[1] as string;
    if (!src.includes("/_next/static/")) continue;
    if (!seen.has(src)) seen.set(src, { src, noModule: /\snoModule(=|\s|>)/i.test(match[0]) });
  }
  return [...seen.values()];
}

export function gzipBytes(content: Buffer | string): number {
  return gzipSync(content, { level: 9 }).length;
}

export function forbiddenIn(source: string): string[] {
  return Object.entries(FORBIDDEN)
    .filter(([, re]) => re.test(source))
    .map(([name]) => name);
}

export interface RouteReport {
  route: string;
  /** Lo que ejecutan los navegadores con módulos ES: la cifra del presupuesto. */
  bytes: number;
  /** Con el polyfill `noModule` (criterio literal del change 04). */
  literalBytes: number;
  scripts: { src: string; bytes: number; noModule: boolean }[];
  forbidden: { src: string; libs: string[] }[];
  ok: boolean;
}

export async function measureRoute(base: string, route: string, budget = BUDGET_BYTES): Promise<RouteReport> {
  const html = await (await fetch(base + route)).text();
  const refs = extractScripts(html);
  const scripts: RouteReport["scripts"] = [];
  const forbidden: RouteReport["forbidden"] = [];
  for (const ref of refs) {
    const buffer = Buffer.from(await (await fetch(base + ref.src)).arrayBuffer());
    scripts.push({ src: ref.src, bytes: gzipBytes(buffer), noModule: ref.noModule });
    const libs = ref.noModule ? [] : forbiddenIn(buffer.toString("utf8"));
    if (libs.length > 0) forbidden.push({ src: ref.src, libs });
  }
  const bytes = scripts.filter((s) => !s.noModule).reduce((n, s) => n + s.bytes, 0);
  const literalBytes = scripts.reduce((n, s) => n + s.bytes, 0);
  return { route, bytes, literalBytes, scripts, forbidden, ok: bytes < budget && forbidden.length === 0 };
}

function caseSlug(): string {
  const dir = join(process.cwd(), "content", "cases");
  const file = readdirSync(dir).find((f) => f.endsWith(".es.mdx"));
  if (!file) throw new Error("no hay casos en content/cases");
  return file.replace(/\.es\.mdx$/, "");
}

export function defaultRoutes(): string[] {
  return ["/es", "/en", `/es/projects/${caseSlug()}`, "/es/heap", "/es/motion"];
}

const kb = (n: number) => (n / 1024).toFixed(2).padStart(7);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = process.env["BASE"] ?? "http://localhost:3150";
  const jsonIndex = process.argv.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? process.argv[jsonIndex + 1] : undefined;
  const reports: RouteReport[] = [];
  for (const route of defaultRoutes()) reports.push(await measureRoute(base, route));
  console.log(`JS inicial por ruta (gzip nivel 9, presupuesto < ${BUDGET_BYTES / 1024} KB; base ${base})`);
  console.log(`${"ruta".padEnd(44)} ${"KB".padStart(7)} ${"literal".padStart(8)}  estado`);
  for (const r of reports) {
    const libs = r.forbidden.map((f) => `${f.libs.join("+")} en ${f.src.split("/").pop()}`).join("; ");
    console.log(
      `${r.route.padEnd(44)} ${kb(r.bytes)} ${kb(r.literalBytes)}  ${r.ok ? "ok" : `FALLA ${r.bytes >= BUDGET_BYTES ? "(peso) " : ""}${libs}`}`,
    );
  }
  if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ budget: BUDGET_BYTES, reports }, null, 2));
  if (reports.some((r) => !r.ok)) process.exit(1);
}
