import { describe, expect, it } from "vitest";
import { rawContent } from "@/content";
import { findPlaceholders, ph } from "./placeholder";
import type { ProjectInput, RawContent } from "./schema";
import { ContentError, validateContent } from "./validate";

const opts = { caseExists: () => true };
const clone = (): RawContent => structuredClone(rawContent);

function errorsOf(raw: RawContent, caseExists = opts.caseExists): string[] {
  try {
    validateContent(raw, { caseExists });
  } catch (e) {
    if (e instanceof ContentError) return e.problems;
    throw e;
  }
  return [];
}

describe("validateContent", () => {
  it("el contenido de ejemplo es válido", () => {
    expect(errorsOf(clone())).toEqual([]);
  });

  it("deriva proyectos por habilidad (mcp → 1 proyecto, react → 2)", () => {
    const content = validateContent(clone(), opts);
    expect((content.projectsBySkill["mcp"] ?? []).map((p) => p.slug)).toEqual(["arquelume-ai-agent"]);
    const slugs = (content.projectsBySkill["react"] ?? []).map((p) => p.slug).sort();
    expect(slugs).toEqual(["compile-portfolio", "facturas-app"]);
  });

  it("falla con una habilidad huérfana indicando su id", () => {
    const raw = clone();
    raw.skills.push({
      id: "rust",
      name: "Rust",
      category: "backend",
      years: 1,
      level: "exploring",
    });
    expect(errorsOf(raw)).toContain(
      "habilidad huérfana «rust»: ningún proyecto la usa en su stack",
    );
  });

  it("falla con una referencia rota indicando proyecto y referencia", () => {
    const raw = clone();
    (raw.projects[0] as ProjectInput).stack.push("cobol");
    expect(errorsOf(raw)).toContain(
      "el proyecto «arquelume-ai-agent» referencia la habilidad inexistente «cobol»",
    );
  });

  it("falla con identificadores duplicados", () => {
    const raw = clone();
    raw.projects.push(structuredClone(raw.projects[0] as ProjectInput));
    expect(errorsOf(raw).some((p) => p.includes("identificador duplicado «arquelume-ai-agent»"))).toBe(
      true,
    );
  });

  it("falla con un logro sin cifra", () => {
    const raw = clone();
    const first = raw.experience[0];
    if (!first) throw new Error("fixture");
    first.achievements[0] = {
      op: "PUSH",
      text: { es: "Mejoré todo mucho.", en: "Improved everything a lot." },
    };
    expect(errorsOf(raw).some((p) => p.includes("sin cifra cuantificada"))).toBe(true);
  });

  it("falla con un caso de estudio inexistente", () => {
    const raw = clone();
    (raw.projects[0] as ProjectInput).links.caseStudy = "no-existe";
    const problems = errorsOf(raw, () => false);
    expect(problems).toContain(
      "el proyecto «arquelume-ai-agent» enlaza al caso inexistente content/cases/no-existe.es.mdx",
    );
  });

  it("falla con un estado de proyecto inválido", () => {
    const raw = clone();
    (raw.projects[0] as unknown as { status: string }).status = "archived";
    expect(errorsOf(raw).some((p) => p.startsWith("projects[0].status"))).toBe(true);
  });

  it("falla indicando el campo cuando falta una traducción", () => {
    const raw = clone();
    (raw.projects[1] as unknown as { problem: { es: string; en: string } }).problem.en = "";
    expect(errorsOf(raw).some((p) => p.startsWith("projects[1].problem.en"))).toBe(true);
  });

  it("falla con porcentajes en lugar de niveles cualitativos", () => {
    const raw = clone();
    (raw.skills[0] as unknown as { level: string }).level = "90%";
    expect(errorsOf(raw).some((p) => p.startsWith("skills[0].level"))).toBe(true);
  });
});

describe("placeholders", () => {
  it("detecta los campos marcados con ph() y no los identificadores", () => {
    const found = findPlaceholders(rawContent.experiments, "experiments");
    expect(found).toContain("experiments[0].name.es");
    expect(found).not.toContain("experiments[0].id");
  });

  it("un valor real (sin ph) deja de listarse", () => {
    const real = { name: "Valor real", other: ph("Pendiente") };
    expect(findPlaceholders(real)).toEqual(["other"]);
  });
});
