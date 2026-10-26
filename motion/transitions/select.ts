import type { Variant } from "./contract";

/**
 * Selector de variante de cada transición (design D9). La versión en canvas solo se usa cuando el
 * canvas está listo y el tier gráfico lo permite; sin WebGL/WebGPU, en tier bajo o con el canvas aún
 * sin cargar se usa la versión DOM/SVG; con movimiento reducido, la variante reducida de la tabla.
 */
export interface VariantInputs {
  reducedMotion: boolean;
  /** El canvas persistente (change 04) terminó de cargar y registró sus escenas. */
  canvasReady: boolean;
  tier: "auto" | "high" | "medium" | "low";
  backend: "pending" | "webgpu" | "webgl2" | "none";
}

export function selectVariant({
  reducedMotion,
  canvasReady,
  tier,
  backend,
}: VariantInputs): Variant {
  if (reducedMotion) return "reduced";
  const canvasUsable =
    canvasReady && (backend === "webgpu" || backend === "webgl2") && tier !== "low";
  return canvasUsable ? "canvas" : "dom";
}

/** Si la variante elegida no existe para una transición, cae a la siguiente disponible. */
export function resolveVariant(wanted: Variant, available: readonly Variant[]): Variant | null {
  const order: Variant[] =
    wanted === "reduced" ? ["reduced", "dom"] : wanted === "canvas" ? ["canvas", "dom"] : ["dom"];
  return order.find((v) => available.includes(v)) ?? null;
}
