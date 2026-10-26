import { getLocale } from "next-intl/server";
import { CaseHeader } from "@/components/case-study/CaseHeader";
import { ProcessCard } from "@/components/phases/Runtime/ProcessCard";
import { content } from "@/lib/content";
import { loadCase } from "@/lib/cases";
import type { Locale } from "@/i18n/routing";

/**
 * Escenario del prototipo de T6 (herramienta de desarrollo): una tarjeta de proyecto y la cabecera de
 * su caso, una junto a otra y visibles a la vez, para recorrer la expansión con el control de progreso.
 * No navega: el prototipo reproduce solo la superficie (`playT6`), exactamente como lo hará /motion.
 */
export async function T6Prototype() {
  const locale = (await getLocale()) as Locale;
  const project = content.projects.find((p) => p.links.caseStudy !== undefined);
  const parsed = project?.links.caseStudy ? loadCase(project.links.caseStudy, locale) : null;
  if (!project || !parsed) return <p className="p-8 font-mono">No hay ningún caso de estudio.</p>;
  const skillNames = new Map(content.skills.map((s) => [s.id, s.name]));

  return (
    <section data-phase="runtime" aria-label="Prototipo T6" className="min-h-screen py-10 pb-32">
      <div className="grid-12 items-start gap-y-8">
        <div className="col-span-12 sm:col-span-5">
          <ProcessCard project={project} skillNames={skillNames} />
        </div>
        <div className="col-span-12 sm:col-span-7">
          <div data-t6-proto-case>
            <CaseHeader
              title={parsed.frontmatter.title}
              summary={parsed.frontmatter.summary}
              project={project}
              locale={locale}
              placeholder={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
