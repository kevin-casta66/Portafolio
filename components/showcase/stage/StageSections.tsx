import { BytecodeSection } from "@/components/phases/Bytecode/BytecodeSection";
import { DisplaySection } from "@/components/phases/Display/DisplaySection";
import { GpuSection } from "@/components/phases/Gpu/GpuSection";
import { LexerSection } from "@/components/phases/Lexer/LexerSection";
import { ParserSection } from "@/components/phases/Parser/ParserSection";
import { RuntimeSection } from "@/components/phases/Runtime/RuntimeSection";
import { SourceSection } from "@/components/phases/Source/SourceSection";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { T6Prototype } from "@/components/dev/T6Prototype";
import { T1Stage } from "@/components/showcase/stage/T1Stage";
import { content } from "@/lib/content";
import type { DemoId } from "@/motion/showcase";

/**
 * Secciones que monta el escenario de cada transición (Add. §8.3): SOLO las dos que conecta, más el
 * canvas persistente del layout. Lo comparten la ruta de prototipos de desarrollo
 * (`app/[locale]/(dev)/prototypes/[transition]`, con deslizador de progreso) y la ruta pública de
 * escenarios que usa `/motion` (`app/stage/[locale]/[transition]`): el código que se demuestra es el
 * mismo en ambos sitios y el de producción.
 */
const SCROLL_PAGES: Partial<Record<DemoId, { from: () => Promise<React.JSX.Element>; to: () => Promise<React.JSX.Element> }>> = {
  T2: { from: SourceSection, to: LexerSection },
  T3: { from: LexerSection, to: ParserSection },
  T4: { from: ParserSection, to: BytecodeSection },
  T5: { from: BytecodeSection, to: () => RuntimeSection({}) },
  T8: { from: () => RuntimeSection({}), to: GpuSection },
  T9: { from: GpuSection, to: DisplaySection },
  // El glitch (T11) se dispara sobre el título de LEXER al cambiar de fase.
  T11: { from: SourceSection, to: LexerSection },
};

export const isKnownStage = (id: string): id is DemoId =>
  id === "T1" || id === "T6" || id === "T7" || id === "T10" || id in SCROLL_PAGES;

/** El escenario (servidor) de una transición; `null` si el id no es del catálogo. */
export async function StageSections({ id }: { id: string }) {
  if (!isKnownStage(id)) return null;
  if (id === "T6") return <T6Prototype />;
  if (id === "T1")
    return (
      <>
        {await SourceSection()}
        <T1Stage projectCount={content.projects.length} />
      </>
    );
  if (id === "T7")
    return <>{await RuntimeSection({})}</>;
  if (id === "T10")
    return (
      <>
        <div data-stage-theme className="fixed right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        {await RuntimeSection({})}
      </>
    );
  const page = SCROLL_PAGES[id];
  if (!page) return null;
  return (
    <>
      {await page.from()}
      {await page.to()}
    </>
  );
}
