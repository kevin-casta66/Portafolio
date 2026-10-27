/**
 * Puente entre el motor 3D (chunk del canvas) y el Modo Debug (chunk de la interfaz). Es un módulo
 * mínimo, SIN `three` (solo tipos laxos), para que el chunk de Debug no arrastre el motor:
 *
 *  - El motor publica aquí su renderer (stats-gl necesita el `WebGPURenderer` para medir tiempos de
 *    GPU) y avisa tras cada frame renderizado (CPU del frame).
 *  - Debug se suscribe al renderer: si el canvas se recrea tras una pérdida de contexto, el renderer
 *    nuevo llega por la misma vía y stats-gl se reinicializa con él.
 */
type Listener = (renderer: unknown | null) => void;

class DebugBridge {
  private current: unknown | null = null;
  private readonly listeners = new Set<Listener>();
  /** Tiempo de CPU (ms) que tardó el último frame renderizado; lo escribe el motor. */
  lastCpuMs = 0;
  /** Se llama tras cada frame renderizado (solo hay suscriptor con Debug activo). */
  onFrame: (() => void) | null = null;

  get renderer(): unknown | null {
    return this.current;
  }

  setRenderer(renderer: unknown | null): void {
    this.current = renderer;
    this.listeners.forEach((listener) => listener(renderer));
  }

  /** Llama de inmediato con el renderer actual (o `null`) y de nuevo en cada cambio. */
  subscribeRenderer(listener: Listener): () => void {
    listener(this.current);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const debugBridge = new DebugBridge();
