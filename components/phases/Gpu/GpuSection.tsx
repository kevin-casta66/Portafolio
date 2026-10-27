import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content, getSkillProjects } from "@/lib/content";
import { highlightTokens } from "@/lib/highlight";
import { ExperimentCard } from "./ExperimentCard";
import { PipelineStage } from "./PipelineStage";

/** GPU — laboratorio. Base estática de las demos interactivas que llegan con el change 04. */
export async function GpuSection() {
  const locale = await getLocale();
  const t = await getTranslations("Gpu");
  // El laboratorio muestra entre 3 y 4 experimentos.
  const experiments = content.experiments.slice(0, 4);
  // Datos de la visualización: habilidades con sus años y proyectos (derivados del contenido).
  const dataset = content.skills.map((skill) => ({
    label: skill.name,
    years: skill.years,
    projects: getSkillProjects(skill.id).length,
  }));

  // Resaltado de los fragmentos de código (Shiki, en el servidor).
  const highlighted = await Promise.all(experiments.map((e) => highlightTokens(e.code)));

  return (
    <section
      data-debug-name="GpuSection"
      id="gpu"
      data-phase="gpu"
      aria-labelledby="gpu-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="gpu" phase="GPU" title={t("title")} intro={t("intro")} />
        <PipelineStage />
        <ul className="col-span-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {experiments.map((experiment, index) => (
            <li key={experiment.id} id={`experiment-${experiment.id}`} className="flex scroll-mt-24">
              <div className="flex w-full">
                <ExperimentCard
                  id={experiment.id}
                  kind={experiment.kind}
                  dataset={experiment.kind === "dataviz" ? dataset : undefined}
                  name={experiment.name[locale]}
                  summary={experiment.summary[locale]}
                  image={experiment.image}
                  alt={experiment.alt[locale]}
                  codeTokens={highlighted[index] ?? []}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
