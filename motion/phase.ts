/**
 * Lógica pura de fases: qué fase está activa, cuánto avanza la transición hacia la siguiente y qué
 * color de acento corresponde. Sin DOM ni GSAP, para poder probarla. `phase-runtime.ts` la conecta
 * al scroll.
 */
export const PHASES = [
  "source",
  "lexer",
  "parser",
  "bytecode",
  "runtime",
  "gpu",
  "display",
] as const;
export type PhaseId = (typeof PHASES)[number];

/** Caja de una sección en coordenadas de documento. */
export interface SectionBox {
  id: PhaseId;
  top: number;
  bottom: number;
}

export interface PhaseSnapshot {
  /** Fase cuya sección contiene la línea de lectura (centro del viewport). */
  phase: PhaseId;
  /** Progreso 0..1 a través de la sección activa. */
  progress: number;
  /** Fase de la que parte la interpolación de color (último centro de sección superado). */
  from: PhaseId;
  /** Fase hacia la que se interpola y avance (0 en el centro de `from`, 1 en el de `to`). */
  to: PhaseId | null;
  mix: number;
  /** Progreso global 0..1 de todo el documento. */
  global: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Token de acento de cada fase; DISPLAY reutiliza el de GPU como color sólido (su relleno es el gradiente). */
export const ACCENT_TOKEN: Record<PhaseId, string> = {
  source: "source",
  lexer: "lexer",
  parser: "parser",
  bytecode: "bytecode",
  runtime: "runtime",
  gpu: "gpu",
  display: "gpu",
};

export function readPhase(
  boxes: SectionBox[],
  probeY: number,
  scrollY: number,
  maxScroll: number,
): PhaseSnapshot {
  const global = maxScroll > 0 ? clamp01(scrollY / maxScroll) : 0;
  const sorted = [...boxes].sort((a, b) => a.top - b.top);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last)
    return { phase: "source", progress: 0, from: "source", to: null, mix: 0, global };

  // Fase activa: la sección que contiene la línea de lectura.
  let index = sorted.findIndex((b) => probeY >= b.top && probeY < b.bottom);
  if (index < 0) index = probeY < first.top ? 0 : sorted.length - 1;
  const current = sorted[index] as SectionBox;
  const progress = clamp01((probeY - current.top) / Math.max(1, current.bottom - current.top));

  // Color: interpolación continua entre centros de secciones consecutivas, así nunca salta.
  const centers = sorted.map((b) => (b.top + b.bottom) / 2);
  let segment = -1;
  for (let i = 0; i < centers.length - 1; i++) {
    if (probeY >= (centers[i] as number) && probeY < (centers[i + 1] as number)) segment = i;
  }
  if (segment < 0) {
    const edge = probeY < (centers[0] as number) ? first : last;
    return { phase: current.id, progress, from: edge.id, to: null, mix: 0, global };
  }
  const a = centers[segment] as number;
  const b = centers[segment + 1] as number;
  return {
    phase: current.id,
    progress,
    from: (sorted[segment] as SectionBox).id,
    to: (sorted[segment + 1] as SectionBox).id,
    mix: clamp01((probeY - a) / (b - a)),
    global,
  };
}

/** Interpola dos acentos en OKLCH usando los tokens (válido en ambos temas). */
export function accentCss(from: PhaseId, to: PhaseId | null, mix: number): string {
  const a = `var(--accent-${ACCENT_TOKEN[from]})`;
  if (!to || mix <= 0) return a;
  const b = `var(--accent-${ACCENT_TOKEN[to]})`;
  if (mix >= 1) return b;
  return `color-mix(in oklch, ${a} ${((1 - mix) * 100).toFixed(1)}%, ${b})`;
}

/** Tinte de fondo: el acento activo al 5 % (rango permitido 4–6 %). */
export const TINT_PERCENT = 5;
export const tintCss = (accent: string): string =>
  `color-mix(in srgb, ${accent} ${TINT_PERCENT}%, transparent)`;
