import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content } from "@/lib/content";
import { ChipStage, type ChipProject } from "./ChipStage";
import { CardTransition } from "./CardTransition";
import { ProcessCard } from "./ProcessCard";
import { ProcessFilter } from "./ProcessFilter";

/**
 * RUNTIME — proyectos, la sección con más peso visual. El filtro llega por `?grep=` y se aplica en
 * el servidor; un valor que no corresponde a ninguna tecnología equivale a «todos».
 */
export async function RuntimeSection({ grep }: { grep?: string | undefined }) {
  const t = await getTranslations("Runtime");
  const locale = await getLocale();
  const skillNames = new Map(content.skills.map((s) => [s.id, s.name]));

  const options = [...new Set(content.projects.flatMap((p) => p.stack))].sort();
  const active = grep && options.includes(grep) ? grep : "";
  const projects = active
    ? content.projects.filter((p) => p.stack.includes(active))
    : content.projects;

  // Fichas del chip: el mismo contenido que las tarjetas, ya resuelto al idioma de la página.
  const chipProjects: ChipProject[] = content.projects.map((p) => {
    const metric = p.metrics[0];
    return {
      slug: p.slug,
      name: p.name,
      pid: p.pid,
      status: p.status,
      stack: p.stack.map((id) => skillNames.get(id) ?? id),
      metric: { label: metric?.label[locale] ?? "", value: metric?.value ?? "" },
    };
  });

  return (
    <section
      data-debug-name="RuntimeSection"
      id="runtime"
      data-phase="runtime"
      aria-labelledby="runtime-title"
      className="scroll-mt-20 border-t border-border py-20 sm:py-32"
    >
      <div className="grid-12">
        <SectionHeader
          id="runtime"
          phase="RUNTIME (CPU)"
          title={t("title")}
          intro={t("intro")}
          size="dominant"
        />

        <ChipStage projects={chipProjects} />

        <ProcessFilter options={options} value={active} count={projects.length} />

        {projects.length > 0 ? (
          <ul
            id="runtime-list"
            data-layout="grid"
            className="relative col-span-12 grid gap-8 lg:grid-cols-2"
          >
            {projects.map((project) => (
              <li key={project.slug}>
                <CardTransition name={`proc-${project.slug}`}>
                  <ProcessCard project={project} skillNames={skillNames} />
                </CardTransition>
              </li>
            ))}
          </ul>
        ) : (
          <p className="col-span-12 text-fg-muted">{t("empty")}</p>
        )}
      </div>
    </section>
  );
}
