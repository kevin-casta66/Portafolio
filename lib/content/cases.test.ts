import { describe, expect, it } from "vitest";
import { buildCaseNav } from "./cases";

const project = (slug: string, caseStudy?: string) => ({
  slug,
  links: caseStudy ? { caseStudy } : {},
});

describe("recorrido entre casos de estudio", () => {
  const nav = buildCaseNav([
    project("a", "caso-a"),
    project("b"),
    project("c", "caso-c"),
    project("d", "caso-d"),
  ]);

  it("sigue el orden de los proyectos y se salta los que no tienen caso", () => {
    expect(nav.entries.map((e) => e.slug)).toEqual(["caso-a", "caso-c", "caso-d"]);
    expect(nav.bySlug["caso-c"]).toMatchObject({ prev: "caso-a", next: "caso-d", index: 1, total: 3 });
  });

  it("en los extremos no hay anterior / siguiente", () => {
    expect(nav.bySlug["caso-a"]).toMatchObject({ prev: null, next: "caso-c" });
    expect(nav.bySlug["caso-d"]).toMatchObject({ prev: "caso-c", next: null });
  });

  it("marca hasCaseStudy por proyecto", () => {
    expect(nav.hasCaseStudy).toEqual({ a: true, b: false, c: true, d: true });
  });

  it("con un solo caso, ambos extremos son nulos; sin casos no hay nada", () => {
    expect(buildCaseNav([project("a", "x")]).entries[0]).toMatchObject({ prev: null, next: null });
    const none = buildCaseNav([project("a"), project("b")]);
    expect(none.entries).toEqual([]);
    expect(none.hasCaseStudy).toEqual({ a: false, b: false });
  });
});
