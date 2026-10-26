import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BytecodeSection } from "@/components/phases/Bytecode/BytecodeSection";
import { DisplaySection } from "@/components/phases/Display/DisplaySection";
import { GpuSection } from "@/components/phases/Gpu/GpuSection";
import { LexerSection } from "@/components/phases/Lexer/LexerSection";
import { ParserSection } from "@/components/phases/Parser/ParserSection";
import { RuntimeSection } from "@/components/phases/Runtime/RuntimeSection";
import { SourceSection } from "@/components/phases/Source/SourceSection";
import { PrototypeControls } from "@/components/dev/PrototypeControls";
import { T6Prototype } from "@/components/dev/T6Prototype";
import { routing } from "@/i18n/routing";

/**
 * Prototipo aislado de una transición (Add. §8.3): monta SOLO las dos secciones que la transición
 * conecta (más el canvas persistente del layout) y un control de progreso 0–1 manual en lugar del
 * scroll. Es una herramienta de desarrollo: en producción responde 404 y el change 08 reutiliza los
 * mismos módulos en `/motion`.
 */
const PAGES: Record<string, { from: () => Promise<React.JSX.Element>; to: () => Promise<React.JSX.Element> }> = {
  T2: { from: SourceSection, to: LexerSection },
  T3: { from: LexerSection, to: ParserSection },
  T4: { from: ParserSection, to: BytecodeSection },
  T5: { from: BytecodeSection, to: () => RuntimeSection({}) },
  T8: { from: () => RuntimeSection({}), to: GpuSection },
  T9: { from: GpuSection, to: DisplaySection },
  T11: { from: LexerSection, to: ParserSection },
};

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
  // T6 (Hold-to-Execute) es una transición por TIEMPO, no por scroll: su prototipo es una tarjeta y la
  // cabecera de su caso, y el control de progreso recorre la expansión y la entrega de la superficie.
  if (id === "T6") {
    return (
      <div data-transition-prototype={id}>
        <T6Prototype />
        <PrototypeControls id={id} />
      </div>
    );
  }
  const page = PAGES[id];
  if (!page) notFound();

  return (
    <div data-transition-prototype={id}>
      {await page.from()}
      {await page.to()}
      <PrototypeControls id={id} />
    </div>
  );
}
