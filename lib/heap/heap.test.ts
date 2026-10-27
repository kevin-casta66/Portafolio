import { describe, expect, it } from "vitest";
import { rawContent } from "@/content";
import { assignAddresses, fnv1a32, formatAddress } from "./address";
import { blockKey, buildHeapBlocks, findHeapProblems, type HeapBlock } from "./blocks";
import { layoutBlocks, orderBlocks } from "./layout";

const blocks = buildHeapBlocks(rawContent.projects, rawContent.experiments);

describe("direcciones del heap", () => {
  it("FNV-1a de 32 bits coincide con los vectores conocidos", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("son estables entre ejecuciones y no dependen del orden de entrada", () => {
    const keys = blocks.map((b) => b.key);
    const a = assignAddresses(keys);
    const b = assignAddresses([...keys].reverse());
    expect(Object.fromEntries(a)).toEqual(Object.fromEntries(b));
    for (const block of blocks) expect(block.address).toBe(a.get(block.key));
  });

  it("están alineadas a 16 bytes y con formato 0x + 8 dígitos", () => {
    for (const { address } of blocks) {
      expect(address).toMatch(/^0x[0-9a-f]{8}$/);
      expect(Number.parseInt(address, 16) % 16).toBe(0);
    }
  });

  it("son únicas para todo el contenido actual", () => {
    expect(new Set(blocks.map((b) => b.address)).size).toBe(blocks.length);
    expect(findHeapProblems(blocks)).toEqual([]);
  });

  it("resuelve una colisión forzada avanzando de 16 en 16 de forma determinista", () => {
    // Dos claves con el mismo hash alineado: se buscan hasta encontrar una pareja (fuerza bruta acotada).
    const seen = new Map<number, string>();
    let pair: [string, string] | null = null;
    for (let i = 0; i < 400_000 && !pair; i++) {
      const key = `x:${i}`;
      const aligned = (fnv1a32(key) & ~15) >>> 0;
      const other = seen.get(aligned);
      if (other) pair = [other, key];
      else seen.set(aligned, key);
    }
    expect(pair).not.toBeNull();
    const [a, b] = pair as [string, string];
    const map = assignAddresses([b, a]);
    const first = [a, b].sort()[0] as string;
    const second = [a, b].sort()[1] as string;
    expect(map.get(first)).toBe(formatAddress((fnv1a32(first) & ~15) >>> 0));
    expect(Number.parseInt(map.get(second) as string, 16)).toBe(
      (((fnv1a32(second) & ~15) >>> 0) + 16) >>> 0,
    );
  });
});

describe("bloques del heap", () => {
  it("cada proyecto y cada experimento aparece exactamente una vez", () => {
    expect(blocks).toHaveLength(rawContent.projects.length + rawContent.experiments.length);
    for (const p of rawContent.projects)
      expect(blocks.filter((b) => b.key === blockKey("project", p.slug))).toHaveLength(1);
    for (const e of rawContent.experiments)
      expect(blocks.filter((b) => b.key === blockKey("experiment", e.id))).toHaveLength(1);
  });

  it("un experimento sin año usa el del proyecto más reciente", () => {
    const out = buildHeapBlocks(
      [{ slug: "p", name: "P", year: 2024, stack: ["a"] }, { slug: "q", name: "Q", year: 2026, stack: ["a"] }],
      [{ id: "e", name: { es: "E", en: "E" }, stack: ["b"] }],
    );
    expect(out.find((b) => b.id === "e")?.year).toBe(2026);
  });

  it("lanza con claves repetidas y detecta direcciones repetidas", () => {
    const p = { slug: "p", name: "P", year: 2024, stack: ["a"] };
    expect(() => buildHeapBlocks([p, p], [])).toThrow(/duplicados/);
    const dup: HeapBlock[] = [blocks[0] as HeapBlock, { ...(blocks[1] as HeapBlock), address: (blocks[0] as HeapBlock).address }];
    expect(findHeapProblems(dup).some((m) => m.includes("la comparten"))).toBe(true);
  });
});

describe("layout del heap", () => {
  for (const criterion of ["none", "tech", "year"] as const) {
    it(`«${criterion}» cubre todos los bloques sin duplicarlos ni solaparlos`, () => {
      const layout = layoutBlocks(blocks, criterion);
      const keys = layout.cells.map((c) => c.key);
      expect(new Set(keys).size).toBe(blocks.length);
      expect([...keys].sort()).toEqual(blocks.map((b) => b.key).sort());
      const slots = layout.cells.map((c) => `${c.col},${c.row}`);
      expect(new Set(slots).size).toBe(slots.length);
      for (const c of layout.cells) {
        expect(c.col).toBeLessThan(layout.columns);
        expect(c.row).toBeLessThan(layout.rows);
      }
      expect(layout.groups.reduce((n, g) => n + g.count, 0)).toBe(criterion === "none" ? 0 : blocks.length);
    });
  }

  it("tech agrupa por la tecnología principal y year es cronológico", () => {
    const tech = layoutBlocks(blocks, "tech");
    for (const cell of tech.cells) {
      const block = blocks.find((b) => b.key === cell.key) as HeapBlock;
      expect(cell.group).toBe(`tech:${block.primaryTech}`);
    }
    const years = layoutBlocks(blocks, "year").groups.map((g) => Number(g.label));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("las etiquetas ocupan su propia fila y las celdas empiezan debajo", () => {
    const layout = layoutBlocks(blocks, "year");
    for (const group of layout.groups) {
      const rows = layout.cells.filter((c) => c.group === group.id).map((c) => c.row);
      expect(Math.min(...rows)).toBe(group.row + 1);
    }
  });

  it("el orden de la lista sigue el layout y es estable", () => {
    const layout = layoutBlocks(blocks, "tech");
    const ordered = orderBlocks(blocks, layout).map((b) => b.key);
    expect(ordered).toEqual(layout.cells.map((c) => c.key));
    expect(layoutBlocks(blocks, "tech")).toEqual(layout);
  });
});

import { moveFocus } from "./navigate";
import { resolveDestinations, experimentAnchor, projectAnchor } from "./destination";

describe("navegación por teclado del heap", () => {
  const layout = layoutBlocks(blocks, "none", 4);
  const at = (col: number, row: number) => layout.cells.find((c) => c.col === col && c.row === row)?.key as string;

  it("derecha/izquierda se mueven por la fila y no envuelven", () => {
    expect(moveFocus(layout, at(0, 0), "right")).toBe(at(1, 0));
    expect(moveFocus(layout, at(1, 0), "left")).toBe(at(0, 0));
    expect(moveFocus(layout, at(0, 0), "left")).toBe(at(0, 0));
    expect(moveFocus(layout, at(3, 0), "right")).toBe(at(3, 0));
  });

  it("arriba/abajo saltan de fila y eligen la columna más cercana", () => {
    expect(moveFocus(layout, at(0, 0), "down")).toBe(at(0, 1));
    expect(moveFocus(layout, at(0, 1), "up")).toBe(at(0, 0));
    expect(moveFocus(layout, at(0, 0), "up")).toBe(at(0, 0));
    const last = layout.cells[layout.cells.length - 1];
    expect(moveFocus(layout, (last as { key: string }).key, "down")).toBe((last as { key: string }).key);
  });

  it("Inicio/Fin van al primer y último bloque y con grupos se saltan las etiquetas", () => {
    expect(moveFocus(layout, at(2, 1), "first")).toBe(layout.cells[0]?.key);
    expect(moveFocus(layout, at(0, 0), "last")).toBe(layout.cells[layout.cells.length - 1]?.key);
    const grouped = layoutBlocks(blocks, "year", 4);
    const rows = new Set(grouped.cells.map((c) => c.row));
    for (const group of grouped.groups) expect(rows.has(group.row)).toBe(false);
    let key = grouped.cells[0]?.key as string;
    const visited = new Set([key]);
    for (let i = 0; i < 40; i++) {
      key = moveFocus(grouped, key, "down");
      visited.add(key);
    }
    expect(visited.size).toBeGreaterThan(1);
  });
});

describe("destinos de apertura", () => {
  const dest = resolveDestinations(blocks, rawContent.projects);

  it("todos los bloques tienen un destino válido", () => {
    expect(Object.keys(dest).sort()).toEqual(blocks.map((b) => b.key).sort());
    for (const d of Object.values(dest)) {
      if ("url" in d) expect(d.url).toMatch(/^https?:\/\//);
      else expect(d.path.startsWith("/")).toBe(true);
    }
  });

  it("los proyectos con caso abren el caso y los experimentos su tarjeta del laboratorio", () => {
    const cases = new Set(rawContent.projects.flatMap((p) => (p.links.caseStudy ? [p.links.caseStudy] : [])));
    for (const block of blocks) {
      const d = dest[block.key];
      if (block.kind === "experiment") expect(d).toEqual({ type: "lab", path: "/", hash: experimentAnchor(block.id) });
      else if (d?.type === "case") expect(cases.has(d.caseSlug)).toBe(true);
      else if (d?.type === "card") expect(d.hash).toBe(projectAnchor(block.id));
    }
  });
});
