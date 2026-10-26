import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content } from "@/lib/content";
import { ExperimentCard } from "./ExperimentCard";

/** GPU — laboratorio. Base estática de las demos interactivas que llegan con el change 04. */
export async function GpuSection() {
  const locale = await getLocale();
  const t = await getTranslations("Gpu");
  // El laboratorio muestra entre 3 y 4 experimentos.
  const experiments = content.experiments.slice(0, 4);

  return (
    <section
      id="gpu"
      data-phase="gpu"
      aria-labelledby="gpu-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="gpu" phase="GPU" title={t("title")} intro={t("intro")} />
        <ul className="col-span-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {experiments.map((experiment) => (
            <li key={experiment.id} className="flex">
              <div className="flex w-full">
                <ExperimentCard
                  name={experiment.name[locale]}
                  summary={experiment.summary[locale]}
                  image={experiment.image}
                  alt={experiment.alt[locale]}
                  code={experiment.code}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
