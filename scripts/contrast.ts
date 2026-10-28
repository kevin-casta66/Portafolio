/**
 * Utilidades de contraste WCAG sobre styles/tokens.css (sin dependencias).
 * Entiende colores #rrggbb y oklch(L C H), y resuelve cadenas de var(--x).
 */

export type Theme = "dark" | "light";
type Rgb = readonly [number, number, number]; // 0..1, sRGB codificado (gamma)

const AA_TEXT = 4.5;

export interface Check {
  theme: Theme;
  label: string;
  tokens: string[];
  ratio: number;
  min: number;
  ok: boolean;
}

/** Declaraciones `--x: valor` por bloque de selector (sin anidación, sin comentarios). */
function parseBlocks(css: string): { selector: string; vars: Record<string, string> }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: { selector: string; vars: Record<string, string> }[] = [];
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars: Record<string, string> = {};
    for (const d of (m[2] ?? "").matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars[d[1] as string] = (d[2] as string).replace(/\s+/g, " ").trim();
    }
    blocks.push({ selector: (m[1] ?? "").trim(), vars });
  }
  return blocks;
}

export function themeVars(css: string, theme: Theme): Record<string, string> {
  const blocks = parseBlocks(css);
  const base = Object.assign(
    {},
    ...blocks.filter((b) => b.selector === ":root").map((b) => b.vars),
  );
  const own = Object.assign(
    {},
    ...blocks.filter((b) => b.selector.includes(`[data-theme="${theme}"]`)).map((b) => b.vars),
  );
  return { ...base, ...own };
}

function resolve(name: string, vars: Record<string, string>, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Referencia circular en --${name}`);
  const raw = vars[name];
  if (raw === undefined) throw new Error(`Token --${name} no definido`);
  const ref = /^var\(--([\w-]+)\)$/.exec(raw);
  return ref ? resolve(ref[1] as string, vars, new Set(seen).add(name)) : raw;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const encode = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const decode = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function oklchToRgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return [encode(clamp01(r)), encode(clamp01(g)), encode(clamp01(bl))];
}

export function parseColor(value: string): Rgb {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = Number.parseInt(hex[1] as string, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const ok = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value);
  if (ok) return oklchToRgb(Number(ok[1]), Number(ok[2]), Number(ok[3]));
  throw new Error(`Color no soportado por el verificador: "${value}"`);
}

export const color = (name: string, vars: Record<string, string>): Rgb =>
  parseColor(resolve(name, vars));

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Compone `fg` con opacidad `alpha` sobre `bg` (mezcla en sRGB codificado, como el navegador). */
export const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb => [
  fg[0] * alpha + bg[0] * (1 - alpha),
  fg[1] * alpha + bg[1] * (1 - alpha),
  fg[2] * alpha + bg[2] * (1 - alpha),
];

const BACKDROPS: Record<string, Rgb> = { negro: [0, 0, 0], blanco: [1, 1, 1] };

/** Colores de texto que pueden aparecer sobre vidrio (Call Stack, terminal, lente del Heap). */
export const GLASS_TEXT_TOKENS = [
  "text",
  "text-muted",
  "accent-source",
  "accent-parser",
  "accent-bytecode",
  "accent-runtime",
  "accent-gpu",
] as const;

/**
 * Opacidad mínima del fondo del vidrio para que TODO el texto sobre él cumpla AA contra el peor
 * fondo posible (negro y blanco puros detrás). Es la que fija el diseño: los tokens
 * `--glass-bg-min-alpha` y `--glass-bg-strong-alpha` deben ser mayores o iguales. Búsqueda binaria,
 * porque el contraste crece con la opacidad.
 */
export function minGlassAlpha(css: string, theme: Theme): number {
  const v = themeVars(css, theme);
  const surface = color("surface", v);
  const passes = (alpha: number): boolean =>
    Object.values(BACKDROPS).every((backdrop) => {
      const glass = over(surface, alpha, backdrop);
      return GLASS_TEXT_TOKENS.every((name) => contrast(color(name, v), glass) >= AA_TEXT);
    });
  if (!passes(1)) return Number.POSITIVE_INFINITY; // ni opaco alcanza: un color de texto no es válido
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (passes(mid)) high = mid;
    else low = mid;
  }
  return high;
}

export function runChecks(css: string): Check[] {
  const checks: Check[] = [];
  for (const theme of ["dark", "light"] as const) {
    const v = themeVars(css, theme);
    const push = (label: string, tokens: string[], fg: Rgb, bg: Rgb, min = AA_TEXT): void => {
      const ratio = contrast(fg, bg);
      checks.push({ theme, label, tokens, ratio, min, ok: ratio >= min });
    };

    for (const fgName of ["text", "text-muted"]) {
      for (const bgName of ["bg", "surface", "surface-elevated"]) {
        push(`${fgName} sobre ${bgName}`, [fgName, bgName], color(fgName, v), color(bgName, v));
      }
    }
    for (const phase of ["source", "lexer", "parser", "bytecode", "runtime", "gpu"]) {
      for (const bgName of ["bg", "surface", "surface-elevated"]) {
        const name = `accent-${phase}`;
        push(`${name} sobre ${bgName}`, [name, bgName], color(name, v), color(bgName, v));
      }
    }

    // Indicador de foco (WCAG 2.4.11 / 1.4.11): ≥ 3:1 frente al fondo adyacente, con el acento de cada fase.
    if (v["focus-caret"] === undefined) throw new Error("Falta --focus-caret");
    for (const phase of ["source", "lexer", "parser", "bytecode", "runtime", "gpu"]) {
      for (const bgName of ["bg", "surface", "surface-elevated"]) {
        push(`--focus-caret (acento ${phase}) sobre ${bgName}`, ["focus-caret", bgName], color(`accent-${phase}`, v), color(bgName, v), 3);
      }
    }

    // Texto sobre vidrio: peor caso = fondo extremo detrás de la superficie translúcida. Se comprueban
    // los dos materiales (normal y fuerte) con TODOS los colores de texto que pueden ir sobre vidrio.
    for (const [alphaName, label] of [
      ["glass-bg-min-alpha", "vidrio"],
      ["glass-bg-strong-alpha", "vidrio fuerte"],
    ] as const) {
      const alphaRaw = v[alphaName];
      if (alphaRaw === undefined) throw new Error(`Falta --${alphaName}`);
      const alpha = Number(alphaRaw);
      for (const [backdropName, backdrop] of Object.entries(BACKDROPS)) {
        const glass = over(color("surface", v), alpha, backdrop);
        for (const fgName of GLASS_TEXT_TOKENS) {
          push(
            `${fgName} sobre ${label} (fondo ${backdropName})`,
            [fgName, alphaName],
            color(fgName, v),
            glass,
          );
        }
      }
    }
  }
  return checks;
}
