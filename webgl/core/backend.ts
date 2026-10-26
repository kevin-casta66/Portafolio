import type { GraphicsBackend } from "@/lib/store";

/**
 * Detección del backend gráfico y creación del renderer. `WebGPURenderer` (`three/webgpu`) cae solo
 * a su backend WebGL2 cuando no hay `navigator.gpu` o falla el adaptador; aquí solo se comprueba si
 * existe ALGÚN backend antes de montar el canvas, y se publica cuál quedó activo tras `init()`.
 */
export function hasAnyBackend(): boolean {
  if (typeof navigator !== "undefined" && "gpu" in navigator && navigator.gpu) return true;
  try {
    const probe = document.createElement("canvas");
    return probe.getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

/** Parámetro de prueba/depuración: fuerza el backend (`?webgl=webgl2|none`). */
export function forcedBackend(): "webgl2" | "none" | null {
  const value = new URLSearchParams(window.location.search).get("webgl");
  return value === "webgl2" || value === "none" ? value : null;
}

interface BackendLike {
  isWebGPUBackend?: boolean;
}

export function backendOf(renderer: { backend: unknown }): Exclude<GraphicsBackend, "pending"> {
  return (renderer.backend as BackendLike).isWebGPUBackend ? "webgpu" : "webgl2";
}
