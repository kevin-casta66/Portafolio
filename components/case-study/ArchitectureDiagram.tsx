import { getTranslations } from "next-intl/server";
import type { CaseFrontmatter } from "@/lib/cases/schema";
import { NODE_H, NODE_W, layoutDiagram } from "./diagram-layout";

type Diagram = NonNullable<CaseFrontmatter["diagram"]>;

/**
 * Diagrama de arquitectura. El SVG se renderiza COMPLETO en el servidor (es el estado final) y cada
 * paso tiene su descripción en texto justo al lado; con JavaScript, `motion/choreography/case.ts` lo
 * construye por pasos con el scroll (reversible) a partir de los atributos `data-step`. Con movimiento
 * reducido no se crea ninguna timeline y se ve entero.
 */
export async function ArchitectureDiagram({ diagram }: { diagram: Diagram }) {
  const t = await getTranslations("Case.diagram");
  const laid = layoutDiagram(diagram);

  return (
    <div
      data-case-diagram
      data-steps={diagram.steps.length}
      className="my-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
    >
      <div
        tabIndex={0}
        role="region"
        aria-label={t("region")}
        className="overflow-x-auto rounded-lg border border-border bg-surface p-3 lg:sticky lg:top-28"
      >
        <svg
          role="img"
          aria-label={t("label")}
          viewBox={`0 0 ${laid.width} ${laid.height}`}
          style={{ minWidth: `${laid.cols * 7.5}rem` }}
          className="block h-auto w-full"
        >
          {laid.edges.map((edge) => (
            <g key={edge.key} data-diagram-edge data-step={edge.step}>
              <path d={edge.d} fill="none" strokeWidth={2} className="stroke-accent" />
              <path d={edge.arrow} data-diagram-arrow className="fill-accent" />
            </g>
          ))}
          {laid.nodes.map((node) => (
            <g key={node.id} data-diagram-node data-step={node.step}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                strokeWidth={1.5}
                className="fill-surface-elevated stroke-border"
              />
              <text
                x={node.x + NODE_W / 2}
                y={node.y + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-fg font-mono"
                fontSize={14}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div>
        <h3 className="sr-only">{t("stepsHeading")}</h3>
        <ol className="space-y-6">
          {diagram.steps.map((step, k) => (
            <li
              key={k}
              data-diagram-step={k}
              className="rounded-lg border border-border bg-surface p-4 data-[active=true]:border-accent"
            >
              <p className="font-mono text-xs text-accent">{t("step", { n: k + 1 })}</p>
              <h4 className="mt-1 font-display text-lg font-semibold">{step.title}</h4>
              <p className="mt-1 text-base text-fg-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
