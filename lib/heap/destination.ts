import type { HeapBlock } from "./blocks";

/**
 * Destino de apertura de un bloque (tarea 2.4). Serializable y sin locale: la UI lo convierte en
 * `Link` (interno, con prefijo de idioma) o en un enlace externo. Siempre hay uno válido:
 *  - proyecto con caso de estudio → el caso (Hold-to-Execute de 05);
 *  - sin caso → su demo; sin demo → su código; sin enlaces → su tarjeta en RUNTIME;
 *  - experimento → su tarjeta en el laboratorio GPU.
 */
export type HeapDestination =
  | { type: "case"; path: string; caseSlug: string }
  | { type: "demo" | "code"; url: string }
  | { type: "card" | "lab"; path: "/"; hash: string };

interface ProjectLinks {
  slug: string;
  links: { demo?: string | undefined; code?: string | undefined; caseStudy?: string | undefined };
}

/** Ancla de la tarjeta de un proyecto en RUNTIME (`ProcessCard`) y de un experimento en GPU. */
export const projectAnchor = (slug: string): string => `project-${slug}`;
export const experimentAnchor = (id: string): string => `experiment-${id}`;

export function resolveDestinations(
  blocks: readonly HeapBlock[],
  projects: readonly ProjectLinks[],
): Record<string, HeapDestination> {
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const result: Record<string, HeapDestination> = {};
  for (const block of blocks) {
    if (block.kind === "experiment") {
      result[block.key] = { type: "lab", path: "/", hash: experimentAnchor(block.id) };
      continue;
    }
    const project = bySlug.get(block.id);
    if (!project) throw new Error(`heap: el bloque «${block.key}» no tiene proyecto`);
    const { caseStudy, demo, code } = project.links;
    result[block.key] = caseStudy
      ? { type: "case", path: `/projects/${caseStudy}`, caseSlug: caseStudy }
      : demo
        ? { type: "demo", url: demo }
        : code
          ? { type: "code", url: code }
          : { type: "card", path: "/", hash: projectAnchor(block.id) };
  }
  return result;
}
