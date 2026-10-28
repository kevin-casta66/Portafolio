import { describe, expect, it } from "vitest";
import { content } from "@/lib/content";
import { caseJsonLd, localizedAlternates, personJsonLd, serializeJsonLd } from "./seo";

describe("SEO (change 09)", () => {
  it("canonical y hreflang con es, en y x-default", () => {
    const a = localizedAlternates("en", "/heap");
    expect(a.canonical).toBe("/en/heap");
    expect(a.languages).toEqual({ es: "/es/heap", en: "/en/heap", "x-default": "/es/heap" });
  });

  it("Person sale de content/", () => {
    const p = personJsonLd("es") as Record<string, unknown>;
    expect(p["@type"]).toBe("Person");
    expect(p.name).toBe(content.profile.name);
    expect(p.jobTitle).toBe(content.profile.role.es);
    expect((p.knowsAbout as string[]).length).toBe(content.skills.length);
  });

  it("CreativeWork por caso y null si no hay proyecto", () => {
    const slug = content.caseNav.entries[0]!.slug;
    const w = caseJsonLd("en", slug, "T", "S") as Record<string, unknown>;
    expect(w["@type"]).toBe("CreativeWork");
    expect(String(w.url)).toMatch(new RegExp(`/en/projects/${slug}$`));
    expect(w.datePublished).toMatch(/^\d{4}$/);
    expect(caseJsonLd("es", "no-existe", "T", "S")).toBeNull();
  });

  it("serializa sin cerrar el script", () => {
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});
