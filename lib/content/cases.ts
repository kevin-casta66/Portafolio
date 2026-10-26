import type { Project } from "./schema";

/** Posición de un caso de estudio en el recorrido «Step back / Step over». */
export interface CaseNavEntry {
  /** Slug del caso (`links.caseStudy`), el de la ruta `/projects/<slug>`. */
  slug: string;
  /** Proyecto al que pertenece. */
  projectSlug: string;
  /** Posición (0 = primero) y total de casos. */
  index: number;
  total: number;
  /** Slug del caso anterior / siguiente en el orden de `content/projects.ts`; `null` en los extremos. */
  prev: string | null;
  next: string | null;
}

export interface CaseNav {
  /** Casos en el orden del modelo de contenido (el de los proyectos). */
  entries: CaseNavEntry[];
  bySlug: Record<string, CaseNavEntry>;
  /** `hasCaseStudy` por proyecto: decide si su tarjeta muestra el enlace «Caso de estudio». */
  hasCaseStudy: Record<string, boolean>;
}

/**
 * Calcula el recorrido entre casos: solo cuentan los proyectos que enlazan a un caso, en el mismo
 * orden en que aparecen en `content/projects.ts`. Los extremos no tienen anterior / siguiente.
 */
export function buildCaseNav(projects: readonly Pick<Project, "slug" | "links">[]): CaseNav {
  const withCase = projects.filter((p) => p.links.caseStudy !== undefined);
  const entries = withCase.map((p, index): CaseNavEntry => {
    const prev = withCase[index - 1]?.links.caseStudy ?? null;
    const next = withCase[index + 1]?.links.caseStudy ?? null;
    return {
      slug: p.links.caseStudy as string,
      projectSlug: p.slug,
      index,
      total: withCase.length,
      prev,
      next,
    };
  });
  return {
    entries,
    bySlug: Object.fromEntries(entries.map((e) => [e.slug, e])),
    hasCaseStudy: Object.fromEntries(projects.map((p) => [p.slug, p.links.caseStudy !== undefined])),
  };
}
