import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";

const spec = readFileSync(new URL("../../docs/MOTION-SPEC.md", import.meta.url), "utf8");

/** Filas T1–T11 de la tabla de docs/MOTION-SPEC.md (columnas separadas por `|`). */
function specRows(): Record<string, string[]> {
  const rows: Record<string, string[]> = {};
  for (const line of spec.split("\n")) {
    const match = /^\| (T\d+) \|(.*)\|$/.exec(line);
    // Solo la primera tabla (catálogo, 8 columnas tras el id); la de «internos» se ignora.
    const cells = match?.[2]?.split("|").map((c) => c.trim());
    if (match?.[1] && cells && cells.length >= 8 && !rows[match[1]]) rows[match[1]] = cells;
  }
  return rows;
}

describe("catálogo de transiciones ↔ docs/MOTION-SPEC.md", () => {
  const rows = specRows();

  it("existen exactamente T1–T11", () => {
    expect(CATALOG.map((e) => e.id)).toEqual(Array.from({ length: 11 }, (_, i) => `T${i + 1}`));
  });

  it.each(CATALOG.map((e) => [e.id, e] as const))(
    "%s coincide con su fila (nombre, disparador y easing)",
    (id, entry) => {
      const cells = rows[id];
      expect(cells, `falta la fila ${id}`).toBeDefined();
      const [name, trigger, , easing] = cells as string[];
      expect(name).toBe(entry.name);
      expect(easing).toContain(entry.easing);
      const triggerText = (trigger ?? "").toLowerCase();
      const expected = {
        carga: "carga",
        "scroll-scrub": "scroll-scrub",
        hold: "hold",
        clic: "clic",
        scroll: "scroll",
      }[entry.trigger];
      expect(triggerText).toContain(expected);
    },
  );

  it("la versión principal en canvas es del change 04 salvo T1, T6, T7 y T10", () => {
    for (const e of CATALOG) {
      expect(["03", "04", "05"]).toContain(e.owner);
    }
    expect(CATALOG.filter((e) => e.owner === "04").map((e) => e.id)).toEqual([
      "T2",
      "T3",
      "T4",
      "T5",
      "T8",
      "T9",
      "T11",
    ]);
  });
});
