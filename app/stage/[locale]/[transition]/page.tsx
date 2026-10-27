import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { StageClient } from "@/components/showcase/stage/StageClient";
import { StageSections, isKnownStage } from "@/components/showcase/stage/StageSections";
import { routing } from "@/i18n/routing";
import { DEMO_IDS } from "@/motion/showcase";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DEMO_IDS.map((transition) => ({ locale, transition })));
}

/**
 * Escenario aislado de una transición para la vitrina `/motion` (change 08): solo las secciones que la
 * transición conecta, con el mismo código de producción, y un cliente que publica `window.__showcaseStage`.
 * `data-transition-prototype` desactiva las transiciones enganchadas al scroll de la página (el
 * escenario las reproduce a mano, igual que la ruta de prototipos).
 */
export default async function StagePage({
  params,
}: {
  params: Promise<{ locale: string; transition: string }>;
}) {
  const { locale, transition } = await params;
  const id = transition.toUpperCase();
  if (!hasLocale(routing.locales, locale) || !isKnownStage(id)) {
    return <p className="p-8 font-mono">Escenario desconocido.</p>;
  }
  setRequestLocale(locale);
  return (
    <div data-transition-prototype={id} data-stage-id={id}>
      <StageSections id={id} />
      <StageClient id={id} />
    </div>
  );
}
