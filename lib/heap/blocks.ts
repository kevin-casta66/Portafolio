import type { Localized } from "@/lib/content/schema";
import { assignAddresses } from "./address";

export type HeapKind = "project" | "experiment";

/**
 * Un bloque de memoria: un proyecto o un experimento del contenido, exactamente una vez. Es la ÚNICA
 * forma que consumen la lista SSR, la cuadrícula 2D y la escena 3D (design D1/D3).
 */
export interface HeapBlock {
  /** `<tipo>:<id>`: único en todo el heap y base de la dirección. */
  key: string;
  /** Slug del proyecto o id del experimento. */
  id: string;
  kind: HeapKind;
  /** Dirección hexadecimal estable (`0x1a2b3c40`). */
  address: string;
  name: Localized;
  year: number;
  /** Ids de habilidad (`content/skills.ts`); el nombre visible lo resuelve la UI. */
  stack: readonly string[];
  /** Tecnología principal (la primera del stack): decide el grupo de «Run GC» por tecnología. */
  primaryTech: string;
}

interface ProjectLike {
  slug: string;
  name: string;
  year: number;
  stack: readonly string[];
}
interface ExperimentLike {
  id: string;
  name: Localized;
  year?: number | undefined;
  stack: readonly string[];
}

export const blockKey = (kind: HeapKind, id: string): string => `${kind}:${id}`;

/**
 * Une proyectos y experimentos (en ese orden, el del contenido) y les asigna dirección. Un
 * experimento sin año usa el del proyecto más reciente. Lanza si una clave se repite.
 */
export function buildHeapBlocks(
  projects: readonly ProjectLike[],
  experiments: readonly ExperimentLike[],
): HeapBlock[] {
  const fallbackYear = projects.reduce((max, p) => Math.max(max, p.year), 0);
  const draft = [
    ...projects.map((p) => ({
      key: blockKey("project", p.slug),
      id: p.slug,
      kind: "project" as const,
      name: { es: p.name, en: p.name },
      year: p.year,
      stack: p.stack,
    })),
    ...experiments.map((e) => ({
      key: blockKey("experiment", e.id),
      id: e.id,
      kind: "experiment" as const,
      name: e.name,
      year: e.year ?? fallbackYear,
      stack: e.stack,
    })),
  ];
  const keys = draft.map((b) => b.key);
  const repeated = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (repeated.length > 0) throw new Error(`heap: bloques duplicados: ${[...new Set(repeated)].join(", ")}`);
  const addresses = assignAddresses(keys);
  return draft.map((b) => ({
    ...b,
    address: addresses.get(b.key) as string,
    primaryTech: b.stack[0] ?? "",
  }));
}

/** Problemas de integridad del heap (vacío si todo está bien): claves y direcciones únicas. */
export function findHeapProblems(blocks: readonly HeapBlock[]): string[] {
  const problems: string[] = [];
  const byAddress = new Map<string, string>();
  const keys = new Set<string>();
  for (const block of blocks) {
    if (keys.has(block.key)) problems.push(`heap: bloque duplicado «${block.key}»`);
    keys.add(block.key);
    const other = byAddress.get(block.address);
    if (other !== undefined)
      problems.push(`heap: la dirección ${block.address} la comparten «${other}» y «${block.key}»`);
    byAddress.set(block.address, block.key);
    if (!/^0x[0-9a-f]{8}$/.test(block.address))
      problems.push(`heap: dirección con formato inválido en «${block.key}»: ${block.address}`);
  }
  return problems;
}
