import { parse as parseYaml } from "yaml";
import { BREAKPOINT_IDS, caseFrontmatterSchema, type CaseFrontmatter } from "./schema";

export class CaseError extends Error {
  constructor(
    readonly file: string,
    readonly problems: string[],
  ) {
    super(`Caso de estudio inválido (${file}):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "CaseError";
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const BREAKPOINT_TAG = /<Breakpoint\s+id=["']([a-z-]+)["']/g;

export interface ParsedCase {
  frontmatter: CaseFrontmatter;
  /** Cuerpo MDX sin el bloque de metadatos. */
  body: string;
}

/**
 * Lee y valida un caso (`content/cases/<slug>.<locale>.mdx`) SIN pasar por el compilador de MDX:
 * así lo usan igual `pnpm content:check`, el build y los tests. `file` es el nombre del archivo
 * (`arquelume-ai-agent.es.mdx`) y se comprueba contra `slug` y los `<Breakpoint>` del cuerpo.
 */
export function parseCase(source: string, file: string): ParsedCase {
  const match = FRONTMATTER.exec(source);
  if (!match) throw new CaseError(file, ["falta el bloque de metadatos (--- … ---) al principio"]);

  let raw: unknown;
  try {
    raw = parseYaml(match[1] ?? "");
  } catch (error) {
    throw new CaseError(file, [
      `YAML inválido: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  const result = caseFrontmatterSchema.safeParse(raw);
  if (!result.success) {
    throw new CaseError(
      file,
      result.error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`),
    );
  }
  const frontmatter = result.data;
  const body = source.slice(match[0].length);

  const problems: string[] = [];
  const nameSlug = file.replace(/\.(es|en)\.mdx$/, "");
  if (frontmatter.slug !== nameSlug)
    problems.push(`slug «${frontmatter.slug}» no coincide con el nombre del archivo «${nameSlug}»`);

  const inBody = [...body.matchAll(BREAKPOINT_TAG)].map((m) => m[1] as string);
  for (const id of inBody) {
    if (!(BREAKPOINT_IDS as readonly string[]).includes(id))
      problems.push(`<Breakpoint id="${id}"> no existe`);
  }
  for (const id of frontmatter.breakpoints) {
    if (!inBody.includes(id))
      problems.push(
        `el breakpoint «${id}» está en los metadatos pero falta <Breakpoint id="${id}"> en el cuerpo`,
      );
  }
  for (const id of inBody) {
    if (!frontmatter.breakpoints.includes(id as never))
      problems.push(`<Breakpoint id="${id}"> está en el cuerpo pero no en los metadatos`);
  }
  if (problems.length === 0 && inBody.join() !== frontmatter.breakpoints.join())
    problems.push("el orden de los <Breakpoint> del cuerpo no coincide con el de los metadatos");
  if (frontmatter.diagram && !body.includes("<ArchitectureDiagram"))
    problems.push("hay `diagram` en los metadatos pero falta <ArchitectureDiagram /> en el cuerpo");
  if (frontmatter.metrics.length > 0 && !body.includes("<MetricChart"))
    problems.push("hay `metrics` en los metadatos pero falta <MetricChart /> en el cuerpo");

  if (problems.length > 0) throw new CaseError(file, problems);
  return { frontmatter, body };
}
