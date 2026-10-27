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
import { QuickView } from "@/components/quick-view/QuickView";
import { HashFocus } from "@/components/systems/HashFocus";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ grep?: string | string[]; view?: string | string[] }>;
};

/**
 * Página de inicio: las siete fases del pipeline en orden, como HTML semántico renderizado en el
 * servidor. Cada sección tiene `id`, `aria-labelledby` y `data-phase`: son el contrato de anclas
 * sobre el que se apoyan las coreografías (change 03) y los sistemas globales (change 06).
 */
export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { grep, view } = await searchParams;
  const filter = Array.isArray(grep) ? grep[0] : grep;
  const viewMode = Array.isArray(view) ? view[0] : view;

  // Vista Rápida (`?view=quick`): el currículum de una página, renderizado en el servidor.
  if (viewMode === "quick") return <QuickView />;

  return (
    <>
      <SourceSection />
      <LexerSection />
      <ParserSection />
      <BytecodeSection />
      <RuntimeSection grep={filter} />
      <GpuSection />
      <DisplaySection />
      <HashFocus />
    </>
  );
}
