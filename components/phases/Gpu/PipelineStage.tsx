import { getTranslations } from "next-intl/server";

const STAGES = ["vertices", "triangles", "raster", "pixels"] as const;

/**
 * Escenario del pipeline gráfico (GPU). El canvas 3D dibuja la malla del chip encima del recuadro
 * (gemelo `data-twin="pipeline"`) y la hace avanzar con el scroll: vértices → triángulos →
 * rasterización → píxeles. El contenido real es esta lista numerada de etapas (texto visible), así
 * que un lector de pantalla o la versión sin 3D recorren lo mismo sin depender de la animación.
 */
export async function PipelineStage() {
  const t = await getTranslations("Gpu.pipeline");

  return (
    <div className="col-span-12 mb-10">
      <p className="mb-3 max-w-prose text-fg-muted">{t("intro")}</p>
      <div
        data-pipeline-stage
        role="group"
        aria-label={t("label")}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div aria-hidden="true" data-twin="pipeline" className="aspect-[3/1] min-h-48" />
        <ol className="relative grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {STAGES.map((stage, index) => (
            <li
              key={stage}
              data-pipeline-label={stage}
              className="border-border p-3 text-sm sm:border-l sm:first:border-l-0"
            >
              <p className="font-mono text-xs text-accent">
                {t("stage")} {index + 1}
              </p>
              <p className="font-display text-base font-semibold">{t(stage)}</p>
              <p className="text-fg-muted">{t(`${stage}Body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
