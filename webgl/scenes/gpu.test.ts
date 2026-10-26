import { describe, expect, it } from "vitest";
import { pipelineProgress, stageOf } from "./gpu";

describe("progreso del pipeline GPU", () => {
  const H = 800;
  const h = 300;

  it("es 0 con el escenario entrando por abajo y 1 al salir por arriba", () => {
    expect(pipelineProgress(H, h, H)).toBe(0);
    expect(pipelineProgress(-h, h, H)).toBe(1);
  });

  it("avanza de forma monótona al subir el escenario (scroll hacia abajo)", () => {
    let last = -1;
    for (let top = H; top >= -h; top -= 20) {
      const p = pipelineProgress(top, h, H);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });

  it("es una función pura de la posición: retroceder recorre las mismas etapas en orden inverso", () => {
    const forward: number[] = [];
    for (let top = H; top >= -h; top -= 25) forward.push(stageOf(pipelineProgress(top, h, H)));
    const backward: number[] = [];
    for (let top = -h; top <= H; top += 25) backward.push(stageOf(pipelineProgress(top, h, H)));
    // Mismas posiciones ⇒ mismas etapas (sin histéresis ni estado): la inversa es el reverso exacto.
    expect(backward.reverse()).toEqual(forward);
  });

  it("recorre las 4 etapas en orden: vértices → triángulos → rasterización → píxeles", () => {
    const seen: number[] = [];
    for (let top = H; top >= -h; top -= 10) {
      const s = stageOf(pipelineProgress(top, h, H));
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });
});
