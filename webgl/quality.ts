/**
 * Calidad adaptativa (lógica pura, sin three ni DOM): tiers, presets, regla de móvil y degradación
 * por FPS medidos. El runtime (`core/quality-runtime.ts`) la conecta a la GPU y al store.
 */
export type Tier = "high" | "medium" | "low";
export const TIERS: readonly Tier[] = ["high", "medium", "low"];

export interface QualityPreset {
  tier: Tier;
  /** Partículas máximas (escritorio). 0 = no se crean buffers de partículas. */
  particles: number;
  /** Simulación de fluido de silicio (estela de calor) en compute. */
  fluid: boolean;
  /** Resolución del lado del fluido (celdas por eje). */
  fluidResolution: number;
  /** Bloom selectivo. */
  bloom: boolean;
  /** Grano de película. */
  grain: boolean;
  /** Escala de resolución de los render targets (1, 0,75, 0,5). */
  rtScale: number;
  /** Escenas con geometría 3D y compute; `false` = planos con textura y transiciones 2D. */
  scenes3d: boolean;
  /** Postprocesado cinematográfico de los experimentos (profundidad de campo, bloom, grano). */
  cinematic: boolean;
}

export const PRESETS: Record<Tier, QualityPreset> = {
  high: {
    tier: "high",
    particles: 200_000,
    fluid: true,
    fluidResolution: 128,
    bloom: true,
    grain: true,
    rtScale: 1,
    scenes3d: true,
    cinematic: true,
  },
  medium: {
    tier: "medium",
    particles: 50_000,
    fluid: false,
    fluidResolution: 0,
    bloom: false,
    grain: true,
    rtScale: 0.75,
    scenes3d: true,
    cinematic: false,
  },
  low: {
    tier: "low",
    particles: 0,
    fluid: false,
    fluidResolution: 0,
    bloom: false,
    grain: false,
    rtScale: 0.5,
    scenes3d: false,
    cinematic: false,
  },
};

/** Multiplicador de partículas en móvil: al menos −70 % respecto al tier equivalente de escritorio. */
export const MOBILE_PARTICLE_FACTOR = 0.3;

export function particlesFor(tier: Tier, mobile: boolean): number {
  const base = PRESETS[tier].particles;
  return mobile ? Math.floor(base * MOBILE_PARTICLE_FACTOR) : base;
}

export function stepTierDown(tier: Tier): Tier {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.min(TIERS.length - 1, i + 1)] ?? "low";
}

/** Tier por defecto si la detección no responde a tiempo. */
export const DEFAULT_TIER: Tier = "medium";
/** Tiempo máximo de espera de la detección de GPU. */
export const DETECT_TIMEOUT_MS = 1500;

/** Convierte el resultado de detect-gpu (`tier` 0–3, `type`) al tier propio. */
export function tierFromDetect(result: { tier: number; type?: string }): Tier {
  if (result.type === "BLOCKLISTED" || result.type === "FALLBACK") return DEFAULT_TIER;
  if (result.tier >= 3) return "high";
  if (result.tier === 2) return "medium";
  return "low";
}

export const FPS_FLOOR = 50;
export const FPS_WINDOW_MS = 2000;
/** Un hueco mayor entre frames consecutivos es inactividad (render selectivo), no lentitud. */
export const FPS_MAX_GAP_MS = 250;

export interface FpsMonitor {
  /** Registra un frame renderizado en `nowMs`. Devuelve `true` si hay que bajar un tier. */
  frame(nowMs: number): boolean;
  reset(): void;
  fps(): number;
}

/**
 * Monitor de FPS: media móvil sobre los últimos frames renderizados; si se mantiene por debajo de
 * `FPS_FLOOR` durante `FPS_WINDOW_MS` seguidos pide bajar un tier. Los huecos largos (no se
 * renderizaba nada) reinician la medición: un pico puntual no cambia el tier.
 */
export function createFpsMonitor(
  floor = FPS_FLOOR,
  windowMs = FPS_WINDOW_MS,
  maxGapMs = FPS_MAX_GAP_MS,
): FpsMonitor {
  let last: number | null = null;
  let belowSince: number | null = null;
  let avg = 60;
  const SMOOTH = 0.1;

  return {
    frame(nowMs) {
      if (last === null || nowMs - last > maxGapMs) {
        last = nowMs;
        belowSince = null;
        return false;
      }
      const dt = nowMs - last;
      last = nowMs;
      if (dt <= 0) return false;
      avg = avg + (1000 / dt - avg) * SMOOTH;
      if (avg < floor) {
        belowSince ??= nowMs;
        if (nowMs - belowSince >= windowMs) {
          belowSince = null;
          avg = 60;
          return true;
        }
      } else {
        belowSince = null;
      }
      return false;
    },
    reset() {
      last = null;
      belowSince = null;
      avg = 60;
    },
    fps: () => avg,
  };
}
