import { z } from "zod";

/** Secciones («breakpoints») de un caso de estudio, en el orden canónico del depurador. */
export const BREAKPOINT_IDS = [
  "context",
  "problem",
  "architecture",
  "decisions",
  "code",
  "results",
  "learnings",
] as const;
export type BreakpointId = (typeof BREAKPOINT_IDS)[number];

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser kebab-case (a-z, 0-9, -)");

/** Una métrica de resultados: valor de partida y valor final, para dibujar la barra y la tabla. */
export const caseMetricSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  unit: z.string().max(12),
  before: z.number().min(0),
  after: z.number().min(0),
  /** `lower`: mejorar es bajar (latencia); `higher`: mejorar es subir (usuarios). */
  better: z.enum(["lower", "higher"]),
});

const diagramNodeSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(28),
  /** Posición en la rejilla del diagrama (0, 1, 2…): las coordenadas las calcula el componente. */
  col: z.number().int().min(0).max(5),
  row: z.number().int().min(0).max(3),
});

/** Un paso del diagrama: qué nodos y conexiones aparecen y su descripción textual equivalente. */
const diagramStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  nodes: z.array(idSchema).min(1),
  edges: z.array(z.tuple([idSchema, idSchema])).default([]),
});

export const caseFrontmatterSchema = z
  .object({
    /** Debe coincidir con el nombre del archivo (`<slug>.<locale>.mdx`). */
    slug: idSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    /** `true` mientras el texto sea de ejemplo: se avisa en la página y `pnpm content:todo` lo lista. */
    placeholder: z.boolean().default(false),
    /** Secciones que tiene el caso, en el orden en que se muestran. */
    breakpoints: z.array(z.enum(BREAKPOINT_IDS)).min(1),
    metrics: z.array(caseMetricSchema).default([]),
    diagram: z
      .object({
        nodes: z.array(diagramNodeSchema).min(2),
        steps: z.array(diagramStepSchema).min(1),
      })
      .optional(),
  })
  .superRefine((fm, ctx) => {
    const add = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: "custom", message, path });

    const seen = new Set<string>();
    fm.breakpoints.forEach((id, i) => {
      if (seen.has(id)) add(`breakpoint repetido «${id}»`, ["breakpoints", i]);
      seen.add(id);
    });
    const canonical = BREAKPOINT_IDS.filter((id) => seen.has(id));
    if (canonical.join() !== fm.breakpoints.join())
      add(`los breakpoints deben seguir el orden: ${BREAKPOINT_IDS.join(", ")}`, ["breakpoints"]);

    if (fm.diagram && !seen.has("architecture"))
      add("hay diagrama pero falta el breakpoint «architecture»", ["diagram"]);
    if (!fm.diagram && seen.has("architecture"))
      add("el breakpoint «architecture» necesita `diagram`", ["breakpoints"]);
    if (fm.metrics.length > 0 && !seen.has("results"))
      add("hay métricas pero falta el breakpoint «results»", ["metrics"]);
    if (fm.metrics.length === 0 && seen.has("results"))
      add("el breakpoint «results» necesita al menos una métrica", ["metrics"]);

    const metricIds = new Set<string>();
    fm.metrics.forEach((m, i) => {
      if (metricIds.has(m.id)) add(`métrica repetida «${m.id}»`, ["metrics", i, "id"]);
      metricIds.add(m.id);
    });

    if (fm.diagram) {
      const nodes = new Set<string>();
      const cells = new Set<string>();
      fm.diagram.nodes.forEach((n, i) => {
        if (nodes.has(n.id)) add(`nodo repetido «${n.id}»`, ["diagram", "nodes", i, "id"]);
        nodes.add(n.id);
        const cell = `${n.col},${n.row}`;
        if (cells.has(cell)) add(`dos nodos en la celda (${cell})`, ["diagram", "nodes", i]);
        cells.add(cell);
      });
      const introduced = new Set<string>();
      fm.diagram.steps.forEach((step, i) => {
        for (const id of step.nodes) {
          if (!nodes.has(id))
            add(`el paso ${i + 1} usa el nodo inexistente «${id}»`, ["diagram", "steps", i, "nodes"]);
          introduced.add(id);
        }
        for (const [from, to] of step.edges) {
          if (!nodes.has(from) || !nodes.has(to))
            add(`el paso ${i + 1} conecta nodos inexistentes «${from}» → «${to}»`, [
              "diagram",
              "steps",
              i,
              "edges",
            ]);
        }
      });
      for (const id of nodes) {
        if (!introduced.has(id))
          add(`el nodo «${id}» no aparece en ningún paso`, ["diagram", "nodes"]);
      }
    }
  });

export type CaseFrontmatter = z.infer<typeof caseFrontmatterSchema>;
export type CaseMetric = z.infer<typeof caseMetricSchema>;
export type DiagramStep = NonNullable<CaseFrontmatter["diagram"]>["steps"][number];
