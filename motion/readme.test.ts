import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");

interface Row {
  id: string;
  phase: string;
  data: string;
  props: string;
  focus: number;
  reduced: string;
}

/** Filas de la tabla «Inventario coreográfico» (se parte por `|` no escapado). */
function inventory(): Row[] {
  const start = readme.indexOf("## Inventario coreográfico");
  const end = readme.indexOf("## Cómo se prueba");
  const block = readme.slice(start, end);
  return block
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| ID") && !/^\|\s*-{3}/.test(line))
    .map((line) => {
      const cells = line
        .replace(/\\\|/g, "§")
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim().replaceAll("§", "|"));
      const [id = "", phase = "", data = "", props = "", focus = "", reduced = ""] = cells;
      return { id, phase, data, props, focus: Number(focus), reduced };
    });
}

describe("inventario coreográfico (motion/README.md)", () => {
  const rows = inventory();

  it("tiene entradas", () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
  });

  it("ninguna entrada supera los 3 focos de animación", () => {
    for (const row of rows) {
      expect(row.focus, `${row.id} ${row.phase}`).toBeGreaterThanOrEqual(1);
      expect(row.focus, `${row.id} ${row.phase}`).toBeLessThanOrEqual(3);
    }
  });

  it("cada entrada indica qué dato transforma o qué interacción retroalimenta, y sus propiedades", () => {
    for (const row of rows) {
      expect(row.data.length, `${row.id} ${row.phase}: dato`).toBeGreaterThan(5);
      expect(row.props.length, `${row.id} ${row.phase}: propiedades`).toBeGreaterThan(1);
      expect(row.reduced.length, `${row.id} ${row.phase}: variante reducida`).toBeGreaterThan(2);
    }
  });

  it("incluye las transiciones del catálogo que implementa este change", () => {
    const ids = rows.map((r) => r.id);
    for (const id of ["T1", "T2", "T3", "T4", "T5", "T7", "T8", "T9", "T11"])
      expect(ids).toContain(id);
  });

  it("solo anuncia propiedades de composición (o trazo/máscara/texto decorativo)", () => {
    const forbidden = /\b(width|height|top|left|margin|padding)\b/i;
    for (const row of rows) expect(row.props, `${row.id} ${row.phase}`).not.toMatch(forbidden);
  });
});
