import { describe, expect, it } from "vitest";
import { LOOP_SECONDS, TONE, ambienceLoop, phasesToPreload, toneFor, uiSound, type PhaseName } from "./synth";

const PHASES: PhaseName[] = ["source", "lexer", "parser", "bytecode", "runtime", "gpu", "display"];
const RATE = 8000; // frecuencia baja: las propiedades no dependen de ella y las pruebas son rápidas

const peak = (data: Float32Array) => data.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (data: Float32Array) => Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);

describe("ambiente por fase", () => {
  it("cada fase tiene un bucle audible, acotado y distinto", () => {
    const loops = PHASES.map((p) => ambienceLoop(p, RATE));
    for (const data of loops) {
      expect(data).toHaveLength(RATE * LOOP_SECONDS);
      expect(peak(data)).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(rms(data)).toBeGreaterThan(0.005);
      expect(data.every((v) => Number.isFinite(v))).toBe(true);
    }
    // ningún par de fases suena igual
    for (let i = 0; i < loops.length; i++)
      for (let j = i + 1; j < loops.length; j++) {
        const a = loops[i] as Float32Array;
        const b = loops[j] as Float32Array;
        let same = true;
        for (let k = 0; k < a.length && same; k += 37) if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 1e-4) same = false;
        expect(same, `${PHASES[i]} vs ${PHASES[j]}`).toBe(false);
      }
  });

  it("es determinista: la misma fase suena igual en cada visita", () => {
    expect(ambienceLoop("gpu", RATE)).toEqual(ambienceLoop("gpu", RATE));
  });

  it("el bucle no da salto: el final enlaza con el principio", () => {
    for (const phase of PHASES) {
      const data = ambienceLoop(phase, RATE);
      const jump = Math.abs((data[data.length - 1] ?? 0) - (data[0] ?? 0));
      // un salto no mayor que un paso típico entre muestras vecinas
      let step = 0;
      for (let i = 1; i < data.length; i++) step = Math.max(step, Math.abs((data[i] ?? 0) - (data[i - 1] ?? 0)));
      expect(jump, phase).toBeLessThanOrEqual(step + 1e-6);
    }
  });
});

describe("sonidos de interfaz", () => {
  it("son cortos y más suaves que el techo del ambiente más su bus", () => {
    for (const name of ["key", "enter", "toggle", "achievement", "open"] as const) {
      const data = uiSound(name, RATE);
      expect(data.length / RATE).toBeLessThanOrEqual(0.5);
      expect(peak(data)).toBeLessThanOrEqual(0.7 + 1e-6);
      expect(peak(data)).toBeGreaterThan(0.1);
      expect(data[0]).toBeCloseTo(0, 5); // ataque suave: sin chasquido
    }
  });
});

describe("tono según la velocidad del scroll", () => {
  it("en reposo está en su altura de reposo y sube de forma proporcional", () => {
    expect(toneFor(0)).toEqual({ hz: TONE.restHz, gain: TONE.restGain });
    const half = toneFor(0.5);
    const full = toneFor(1);
    expect(half.hz).toBeGreaterThan(TONE.restHz);
    expect(full.hz).toBeGreaterThan(half.hz);
    expect(half.hz).toBeCloseTo((TONE.restHz + TONE.maxHz) / 2, 5);
  });

  it("no supera el límite de altura ni de volumen, sea cual sea la velocidad", () => {
    for (const v of [1, 5, -3, 100]) {
      const { hz, gain } = toneFor(v);
      expect(hz).toBeLessThanOrEqual(TONE.maxHz);
      expect(gain).toBeLessThanOrEqual(TONE.maxGain);
    }
  });

  it("la dirección del scroll no cambia la altura (usa el módulo)", () => {
    expect(toneFor(-0.6)).toEqual(toneFor(0.6));
  });
});

describe("precarga", () => {
  it("solo la fase actual y la siguiente", () => {
    expect(phasesToPreload("runtime", PHASES)).toEqual(["runtime", "gpu"]);
    expect(phasesToPreload("source", PHASES)).toEqual(["source", "lexer"]);
  });
  it("en la última fase solo la actual", () => {
    expect(phasesToPreload("display", PHASES)).toEqual(["display"]);
  });
  it("una fase desconocida no precarga nada", () => {
    expect(phasesToPreload("boot" as PhaseName, PHASES)).toEqual([]);
  });
});
