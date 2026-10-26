import { HalfFloatType, LinearFilter, StorageTexture, type WebGPURenderer } from "three/webgpu";
import type { FrameState } from "../core/frame";
import { TSL, type N } from "../nodes/tsl";

const { Fn, instancedArray, instanceIndex, uniform, vec2, vec4, float, floor, exp, mix, clamp, texture, textureStore, uvec2, int, max } = TSL;

/**
 * «Fluido de silicio»: simulación 2D de baja resolución (N×N, p. ej. 128²) en compute shaders
 * (solo WebGPU, tier alto). Estado en storage buffers con ping-pong (calor + velocidad); cada frame
 * el puntero inyecta calor y velocidad, el campo se advecta (semi-Lagrangiano), se difunde y decae.
 * El último paso escribe el calor en una `StorageTexture` filtrada que el shader de la retícula
 * muestrea con bilinear (la estela de calor del hero).
 */
export interface Fluid {
  /** Nodo de calor (0..1) en las coordenadas `uvNode` (origen arriba-izquierda, 0..1). */
  heatAt(uvNode: N): N;
  /** Actualiza uniforms del puntero; devuelve `true` mientras queda calor visible. */
  update(frame: FrameState): boolean;
  compute(renderer: WebGPURenderer, frame: FrameState): void;
  dispose(): void;
}

/** Segundos que se sigue simulando tras el último movimiento del puntero (el calor se disipa). */
const SETTLE_SECONDS = 3;

export function createFluid(renderer: WebGPURenderer, resolution: number): Fluid {
  const n = resolution;
  const count = n * n;

  const heat = [instancedArray(count, "float"), instancedArray(count, "float")];
  const vel = [instancedArray(count, "vec2"), instancedArray(count, "vec2")];

  const tex = new StorageTexture(n, n);
  tex.type = HalfFloatType;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;

  const uPtr = uniform(vec2(0.5, 0.5)); // puntero en celdas
  const uPtrVel = uniform(vec2(0, 0)); // desplazamiento del puntero por frame (celdas)
  const uSplat = uniform(0); // 0 sin puntero activo
  const uDt = uniform(1 / 60);

  const cell = (x: N, y: N): N => int(clamp(y, 0, n - 1)).mul(n).add(int(clamp(x, 0, n - 1)));

  /** Interpolación bilinear de un buffer escalar en coordenadas de celda. */
  const bilerp = (buf: N, p: N): N => {
    const q = vec2(clamp(p.x, 0, n - 1.001), clamp(p.y, 0, n - 1.001));
    const q0 = floor(q);
    const f = q.sub(q0);
    const a = buf.element(cell(q0.x, q0.y));
    const b = buf.element(cell(q0.x.add(1), q0.y));
    const c = buf.element(cell(q0.x, q0.y.add(1)));
    const d = buf.element(cell(q0.x.add(1), q0.y.add(1)));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  };

  const makeStep = (src: number, dst: number, write: boolean) =>
    Fn(() => {
      const i = instanceIndex;
      const x = float(i.mod(n));
      const y = float(i.div(n));
      const p = vec2(x, y);
      const v = vel[src]!.element(i);

      // Advección semi-Lagrangiana: de dónde viene el calor de esta celda.
      const from = p.sub(v.mul(uDt).mul(60));
      let h = bilerp(heat[src]!, from);

      // Difusión: mezcla con el promedio de los vecinos.
      const avg = heat[src]!.element(cell(x.sub(1), y))
        .add(heat[src]!.element(cell(x.add(1), y)))
        .add(heat[src]!.element(cell(x, y.sub(1))))
        .add(heat[src]!.element(cell(x, y.add(1))))
        .mul(0.25);
      h = mix(h, avg, 0.22);

      // Inyección del puntero (gaussiana) y arrastre de velocidad.
      const d2 = p.sub(uPtr).lengthSq();
      const splat = exp(d2.div(-(n * n) / 900)).mul(uSplat);
      h = h.add(splat.mul(0.9)).mul(0.987);
      const vNext = v.mul(0.965).add(uPtrVel.mul(splat).mul(0.35));

      heat[dst]!.element(i).assign(clamp(h, 0, 2));
      vel[dst]!.element(i).assign(vNext);
      if (write) textureStore(tex, uvec2(int(x), int(y)), vec4(clamp(h, 0, 1), 0, 0, 1)).toWriteOnly();
    })().compute(count);

  // Dos pasos por frame (0→1 y 1→0): el resultado final siempre queda en el buffer 0 y en la textura.
  const stepA = makeStep(0, 1, false);
  const stepB = makeStep(1, 0, true);

  let lastPtr: { x: number; y: number } | null = null;
  let activeUntil = 0;

  return {
    heatAt: (uvNode) => max(texture(tex, uvNode).r, 0),
    update(frame) {
      const gx = (frame.pointer.x / frame.viewW) * n;
      const gy = (frame.pointer.y / frame.viewH) * n;
      const moving = frame.pointer.active && frame.pointer.moved && !frame.reduced;
      if (moving && lastPtr) {
        uPtrVel.value.set(gx - lastPtr.x, gy - lastPtr.y);
        uSplat.value = 1;
        activeUntil = frame.time + SETTLE_SECONDS;
      } else {
        uSplat.value = 0;
        uPtrVel.value.set(0, 0);
      }
      uPtr.value.set(gx, gy);
      lastPtr = { x: gx, y: gy };
      uDt.value = Math.min(1 / 30, frame.dt || 1 / 60);
      return frame.time < activeUntil;
    },
    compute(renderer, frame) {
      if (frame.time >= activeUntil + 0.1) return;
      renderer.compute(stepA);
      renderer.compute(stepB);
    },
    dispose() {
      tex.dispose();
      for (const b of [...heat, ...vel]) (b as { dispose?: () => void }).dispose?.();
    },
  };
}
