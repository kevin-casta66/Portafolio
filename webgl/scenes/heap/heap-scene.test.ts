import { describe, expect, it } from "vitest";
import { buildHeapBlocks, layoutBlocks } from "@/lib/heap";
import type { FontMetrics } from "../../text/glyph-layout";
import { CELL_H, CELL_W, PITCH_X, PITCH_Y, blockAtPoint, copiesFor, panToCenter, slotsOf, tileOf } from "./grid";
import { buildInstances, layoutBlockText, wrapLines } from "./instances";
import {
  DRAG_THRESHOLD,
  MAX_SPEED,
  VelocityTracker,
  isDrag,
  lensMapPoint,
  lensUnmapPoint,
  lensUnmapRadius,
  stepInertia,
  wrap,
  wrapDelta,
} from "./inertia";

/** Fuente monoespaciada de mentira: cada carácter mide 0,6 em (28,8 de 48). */
const font: FontMetrics = (() => {
  const glyphs = new Map<
    string,
    { x: number; y: number; width: number; height: number; xoffset: number; yoffset: number; xadvance: number }
  >();
  let i = 0;
  for (const ch of "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúñ .,:;·–-…▸x_/()ÁÉÍÓÚ")
    glyphs.set(ch, { x: (i++ % 40) * 30, y: 0, width: 26, height: 50, xoffset: 1, yoffset: 6, xadvance: 28.8 });
  return { size: 48, lineHeight: 63, base: 50, scaleW: 1200, scaleH: 300, glyphs };
})();

const blocks = buildHeapBlocks(
  [
    { slug: "alpha", name: "Alpha", year: 2025, stack: ["react", "ts"] },
    {
      slug: "beta",
      name: "Beta con un nombre largo que no cabe en una sola línea del bloque",
      year: 2026,
      stack: ["dotnet"],
    },
    { slug: "gamma", name: "Gamma", year: 2026, stack: ["react"] },
    { slug: "delta", name: "Delta", year: 2024, stack: ["ts"] },
    { slug: "eps", name: "Eps", year: 2026, stack: ["dotnet", "react"] },
  ],
  [{ id: "shader", name: { es: "Shader", en: "Shader" }, year: 2026, stack: ["ts"] }],
);
const none = layoutBlocks(blocks, "none");
const tech = layoutBlocks(blocks, "tech");

describe("inercia y envoltura", () => {
  it("wrap y wrapDelta mantienen el periodo y devuelven el camino más corto", () => {
    expect(wrap(-10, 100)).toBe(90);
    expect(wrap(250, 100)).toBe(50);
    expect(wrapDelta(90, 100)).toBe(-10);
    expect(wrapDelta(-90, 100)).toBe(10);
    expect(wrapDelta(30, 100)).toBe(30);
  });

  it("la inercia continúa tras soltar, decelera y se detiene", () => {
    const m = { x: 0, y: 0, vx: 1500, vy: -400 };
    let steps = 0;
    let lastSpeed = Math.hypot(m.vx, m.vy);
    while (stepInertia(m, 1 / 60)) {
      const s = Math.hypot(m.vx, m.vy);
      expect(s).toBeLessThan(lastSpeed); // desacelera siempre
      lastSpeed = s;
      steps++;
      if (steps > 600) throw new Error("no se detiene");
    }
    expect(steps).toBeGreaterThan(30); // sigue moviéndose un buen rato
    expect(steps / 60).toBeLessThan(3); // y se para en pocos segundos
    expect(m.x).toBeGreaterThan(200); // recorrió distancia tras soltar
    expect(Math.hypot(m.vx, m.vy)).toBe(0);
  });

  it("umbral clic/arrastre de 6 px", () => {
    expect(DRAG_THRESHOLD).toBe(6);
    expect(isDrag(3, 4)).toBe(false); // 5 px
    expect(isDrag(6, 0)).toBe(true);
    expect(isDrag(5, 5)).toBe(true);
  });

  it("la velocidad al soltar sale de las últimas muestras y se acota", () => {
    const v = new VelocityTracker();
    for (let i = 0; i <= 6; i++) v.push(i * 16, i * 16, 0); // 1000 px/s
    expect(v.velocity(6 * 16 + 5).vx).toBeCloseTo(1000, -1);
    // Un dedo que se para antes de soltar no lanza la cuadrícula.
    expect(v.velocity(6 * 16 + 400)).toEqual({ vx: 0, vy: 0 });
    const fast = new VelocityTracker();
    fast.push(0, 0, 0);
    fast.push(10, 500, 0);
    const r = fast.velocity(11);
    expect(Math.hypot(r.vx, r.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
  });
});

describe("lente: mapa directo e inverso", () => {
  const cx = 400;
  const cy = 300;
  const R = 150;
  const m = 1.1;

  it("des-mapear lo mapeado devuelve el punto original (selección bajo la lente)", () => {
    for (const [px, py] of [
      [400, 300],
      [450, 320],
      [330, 250],
      [520, 380],
      [700, 700],
    ] as const) {
      const screen = lensMapPoint(px, py, cx, cy, R, m);
      const back = lensUnmapPoint(screen.x, screen.y, cx, cy, R, m);
      expect(back.x).toBeCloseTo(px, 3);
      expect(back.y).toBeCloseTo(py, 3);
    }
  });

  it("fuera del radio es la identidad y sin magnificación también", () => {
    expect(lensUnmapRadius(300, R, m)).toBe(300);
    expect(lensUnmapRadius(40, R, 0)).toBe(40);
  });
});

describe("cuadrícula infinita", () => {
  it("el tile es columns × rows celdas y el número de copias solo depende del viewport", () => {
    const tile = tileOf(none);
    expect(tile.w).toBe(4 * PITCH_X);
    expect(tile.h).toBe(2 * PITCH_Y); // 6 bloques en 4 columnas
    const small = copiesFor(1280, 720, tile);
    const double = layoutBlocks([...blocks, ...blocks.map((b) => ({ ...b, key: b.key + "x" }))], "none");
    const many = copiesFor(1280, 720, tileOf(double));
    expect(small.nx).toBeGreaterThanOrEqual(2);
    expect(many.ny).toBeLessThanOrEqual(small.ny); // más contenido no añade copias
  });

  it("blockAtPoint encuentra el bloque, ignora la separación y se repite en todas las copias", () => {
    const slot = slotsOf(none)[1]!;
    expect(blockAtPoint(none, slot.x + 10, slot.y + 10)?.key).toBe(slot.key);
    expect(blockAtPoint(none, slot.x + CELL_W + 5, slot.y + 10)).toBeNull(); // separación
    const tile = tileOf(none);
    expect(blockAtPoint(none, slot.x + 10 + tile.w * 3, slot.y + 10 - tile.h * 2)?.key).toBe(slot.key);
  });

  it("panToCenter deja el bloque en el centro del escenario", () => {
    const slot = slotsOf(none)[5]!;
    const pan = panToCenter(slot, 1000, 600);
    expect(24 + slot.x + pan.x + CELL_W / 2).toBeCloseTo(500, 6);
    expect(24 + slot.y + pan.y + CELL_H / 2).toBeCloseTo(300, 6);
  });
});

describe("instancias", () => {
  const base = {
    blocks,
    nx: 3,
    ny: 2,
    locale: "es" as const,
    font,
    skillNames: { react: "React", ts: "TypeScript", dotnet: ".NET" },
    labels: { project: "PROYECTO", experiment: "EXPERIMENTO" },
    stagger: 0.07,
  };

  it("wrapLines parte por palabras y trunca con «…»", () => {
    expect(wrapLines("uno dos tres", 7, 3)).toEqual(["uno dos", "tres"]);
    const lines = wrapLines("una frase extremadamente larga que no cabe en tres líneas de seis", 12, 3);
    expect(lines).toHaveLength(3);
    expect(lines.at(-1)!.endsWith("…")).toBe(true);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
  });

  it("cada bloque aparece exactamente una vez por copia", () => {
    const { blocks: b } = buildInstances({ ...base, from: none, to: none, includeOldLabels: false });
    expect(b.count).toBe(blocks.length * 3 * 2);
    const perCopy = new Map<string, string[]>();
    for (let i = 0; i < b.count; i++) {
      const copy = `${b.meta[i * 4]},${b.meta[i * 4 + 1]}`;
      perCopy.set(copy, [...(perCopy.get(copy) ?? []), b.keys[i]!]);
    }
    expect(perCopy.size).toBe(6);
    for (const keys of perCopy.values()) expect(new Set(keys).size).toBe(blocks.length);
  });

  it("los glifos de un bloque caben dentro de la celda", () => {
    for (const block of blocks) {
      const g = layoutBlockText({ address: block.address, name: block.name.es, meta: "PROYECTO · 2026" }, font);
      expect(g.length).toBeGreaterThan(10);
      for (const r of g) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(CELL_W);
        expect(r.y + r.h).toBeLessThanOrEqual(CELL_H);
      }
    }
  });

  it("«Run GC»: from es el layout anterior, to el nuevo y los retardos escalonan 60–80 ms", () => {
    const { blocks: b } = buildInstances({ ...base, from: none, to: tech, includeOldLabels: true });
    const key = tech.cells[2]!.key;
    const i = b.keys.indexOf(key);
    const fromSlot = slotsOf(none).find((s) => s.key === key)!;
    const toSlot = slotsOf(tech).find((s) => s.key === key)!;
    expect([b.from[i * 4], b.from[i * 4 + 1], b.from[i * 4 + 2], b.from[i * 4 + 3]]).toEqual([
      fromSlot.x,
      fromSlot.y,
      toSlot.x,
      toSlot.y,
    ]);
    expect(b.meta[i * 4 + 2]).toBeCloseTo(2 * 0.07, 6);
  });

  it("las etiquetas de grupo se añaden con el criterio y las viejas solo durante «Run GC»", () => {
    const stable = buildInstances({ ...base, from: tech, to: tech, includeOldLabels: false }).text.count;
    const during = buildInstances({ ...base, from: tech, to: tech, includeOldLabels: true }).text.count;
    const flat = buildInstances({ ...base, from: none, to: none, includeOldLabels: false }).text.count;
    expect(stable).toBeGreaterThan(flat);
    expect(during).toBeGreaterThan(stable);
  });
});
