import type { GraphicsBackend } from "@/lib/store";

/**
 * Detección del backend gráfico y creación del renderer. `WebGPURenderer` (`three/webgpu`) cae solo
 * a su backend WebGL2 cuando no hay `navigator.gpu` o falla el adaptador; aquí solo se comprueba si
 * existe ALGÚN backend antes de montar el canvas, y se publica cuál quedó activo tras `init()`.
 */
export type BackendSupport = "webgpu" | "webgl2" | "none";

/** Parámetro de prueba/depuración: fuerza el backend (`?webgl=webgl2|none`). */
export function forcedBackend(): "webgl2" | "none" | null {
  const value = new URLSearchParams(window.location.search).get("webgl");
  return value === "webgl2" || value === "none" ? value : null;
}

let cachedSupport: BackendSupport | undefined;

function probeWebgl2(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    // Libera el contexto de prueba al momento: no debe contar como uno de los vivos del navegador.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Qué backend permite el navegador, SIN descargar el código 3D (se llama antes del import dinámico).
 * El resultado se cachea para toda la página; el flag de depuración `?webgl=` lo fuerza.
 */
export function backendSupport(): BackendSupport {
  if (cachedSupport) return cachedSupport;
  const forced = forcedBackend();
  if (forced === "none") return (cachedSupport = "none");
  if (
    forced !== "webgl2" &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    navigator.gpu
  ) {
    return (cachedSupport = "webgpu");
  }
  return (cachedSupport = probeWebgl2() ? "webgl2" : "none");
}

let pendingDetection: Promise<BackendSupport> | undefined;

/**
 * Versión definitiva de `backendSupport()`: además de `navigator.gpu` pide un adaptador WebGPU (puede
 * existir la API sin GPU utilizable) y, si no hay, prueba WebGL2. Se cachea la promesa: el import dinámico del
 * motor 3D la espera, así que sin ningún backend el chunk 3D nunca se descarga.
 */
export function detectBackend(): Promise<BackendSupport> {
  pendingDetection ??= (async () => {
    if (forcedBackend() === "none") return (cachedSupport = "none");
    if (forcedBackend() !== "webgl2" && typeof navigator !== "undefined" && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) return (cachedSupport = "webgpu");
      } catch {
        /* sin adaptador: se prueba WebGL2 */
      }
    }
    return (cachedSupport = probeWebgl2() ? "webgl2" : "none");
  })();
  return pendingDetection;
}

export function hasAnyBackend(): boolean {
  return backendSupport() !== "none";
}

interface BackendLike {
  isWebGPUBackend?: boolean;
}

export function backendOf(renderer: { backend: unknown }): Exclude<GraphicsBackend, "pending"> {
  return (renderer.backend as BackendLike).isWebGPUBackend ? "webgpu" : "webgl2";
}
