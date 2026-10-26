import { ACCENT_TOKEN, PHASES, type PhaseId } from "@/motion/phase";

/**
 * Colores del motor 3D. TODO color sale de los tokens de `styles/tokens.css` (ESLint prohíbe los
 * literales): se leen del DOM una vez por tema y se convierten a sRGB con un canvas 2D (acepta
 * cualquier sintaxis CSS, incluido `oklch()`). La mezcla del acento entre fases se hace aquí en
 * OKLab, igual que `color-mix(in oklch, …)` del CSS, sin leer estilos calculados en cada frame.
 */
export type RGB = [number, number, number];

let probeCtx: CanvasRenderingContext2D | null = null;

/** Convierte un color CSS (cualquier sintaxis) a sRGB 0..1. */
export function cssToRgb(css: string): RGB {
  probeCtx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const ctx = probeCtx;
  if (!ctx) return [0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "black";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [(data[0] ?? 0) / 255, (data[1] ?? 0) / 255, (data[2] ?? 0) / 255];
}

/** Lee un token (`--accent-lexer`, `--bg`…) resuelto en el tema actual. */
export function readToken(name: string): RGB {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.display = "none";
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return cssToRgb(resolved);
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function srgbToOklab([r, g, b]: RGB): RGB {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToSrgb([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp(toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp(toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  const A = srgbToOklab(a);
  const B = srgbToOklab(b);
  return oklabToSrgb([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export interface TokenColors {
  bg: RGB;
  text: RGB;
  textMuted: RGB;
  border: RGB;
  surface: RGB;
  keyword: RGB;
  type: RGB;
  string: RGB;
  punct: RGB;
  accents: Record<PhaseId, RGB>;
}

export function readTokenColors(): TokenColors {
  const accents = {} as Record<PhaseId, RGB>;
  for (const phase of PHASES) accents[phase] = readToken(`--accent-${ACCENT_TOKEN[phase]}`);
  return {
    bg: readToken("--bg"),
    text: readToken("--text"),
    textMuted: readToken("--text-muted"),
    border: readToken("--border"),
    surface: readToken("--surface"),
    keyword: readToken("--syntax-keyword"),
    type: readToken("--syntax-type"),
    string: readToken("--syntax-string"),
    punct: readToken("--syntax-punct"),
    accents,
  };
}

/** Acento interpolado entre dos fases (misma regla que `accentCss`). */
export function accentRgb(
  colors: TokenColors,
  from: PhaseId,
  to: PhaseId | null,
  mix: number,
): RGB {
  const a = colors.accents[from];
  if (!to || mix <= 0) return a;
  const b = colors.accents[to];
  return mix >= 1 ? b : mixRgb(a, b, mix);
}
