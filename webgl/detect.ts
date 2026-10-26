import { getGPUTier } from "detect-gpu";
import { DEFAULT_TIER, DETECT_TIMEOUT_MS, tierFromDetect, type Tier } from "./quality";

/**
 * Detección inicial del tier a partir de la GPU (detect-gpu con benchmarks AUTOALOJADOS en
 * `/gpu-benchmarks`, sin llamadas a terceros). Nunca bloquea el contenido: si no responde en
 * `DETECT_TIMEOUT_MS` se aplica el tier medio y el resultado tardío se descarta.
 */
export interface Detection {
  tier: Tier;
  mobile: boolean;
  /** `gpu`: respondió a tiempo · `timeout`: tier por defecto · `error`: falló la detección. */
  source: "gpu" | "timeout" | "error";
  gpu?: string | undefined;
}

/** Valor mostrado por la secuencia de arranque: 3 = alto, 2 = medio, 1 = bajo. */
export const TIER_NUMBER: Record<Tier, number> = { high: 3, medium: 2, low: 1 };

export function benchmarksUrl(): string {
  return `${window.location.origin}/gpu-benchmarks`;
}

let cached: Promise<Detection> | null = null;

export function detectTier(timeoutMs = DETECT_TIMEOUT_MS): Promise<Detection> {
  cached ??= new Promise<Detection>((resolve) => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const timer = setTimeout(
      () => resolve({ tier: DEFAULT_TIER, mobile: coarse, source: "timeout" }),
      timeoutMs,
    );
    getGPUTier({ benchmarksURL: benchmarksUrl() })
      .then((result) => {
        clearTimeout(timer);
        resolve({
          tier: tierFromDetect(result),
          mobile: result.isMobile ?? coarse,
          source: "gpu",
          gpu: result.gpu,
        });
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({ tier: DEFAULT_TIER, mobile: coarse, source: "error" });
      });
  });
  return cached;
}
