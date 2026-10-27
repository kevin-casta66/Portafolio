import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PrototypeControls } from "@/components/dev/PrototypeControls";
import { StageSections, isKnownStage } from "@/components/showcase/stage/StageSections";
import { routing } from "@/i18n/routing";

/**
 * Prototipo aislado de una transición (Add. §8.3): monta SOLO las dos secciones que la transición
 * conecta (más el canvas persistente del layout) y un control de progreso 0–1 manual en lugar del
 * scroll. Es una herramienta de desarrollo: en producción responde 404. Desde el change 08 comparte con
 * la vitrina `/motion` el módulo de escenarios (`StageSections`) y el reproductor de cada transición
 * (`components/showcase/stage/players.ts`): lo que se prototipa aquí es lo que se demuestra allí.
 */
export function generateStaticParams() {
  return [];
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ locale: string; transition: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale, transition } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const id = transition.toUpperCase();
  if (!isKnownStage(id)) notFound();

  // T6 (Hold-to-Execute) es una transición por TIEMPO, no por scroll: su escenario es una tarjeta y la
  // cabecera de su caso, y el control de progreso recorre la expansión y la entrega de la superficie.
  return (
    <div data-transition-prototype={id}>
      <StageSections id={id} />
      <PrototypeControls id={id} />
    </div>
  );
}
