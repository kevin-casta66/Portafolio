import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

/** Rutas `A.b.c` de todas las claves hoja de un catálogo. */
function keys(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const valueAt = (catalog: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], catalog);

describe("catálogos de traducción", () => {
  it("es y en tienen exactamente las mismas claves", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it("ninguna traducción está vacía", () => {
    for (const catalog of [es, en]) {
      const empty = keys(catalog).filter((path) => {
        const value = valueAt(catalog, path);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty).toEqual([]);
    }
  });
});
