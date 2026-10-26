import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { BreakpointId } from "@/lib/cases/schema";

/**
 * Una sección («breakpoint») de un caso de estudio. El título sale de los mensajes (siempre el mismo
 * en todos los casos) y el encabezado es enfocable: el índice salta aquí y mueve el foco al `h2`.
 * Es HTML de servidor: se lee completo sin JavaScript.
 */
export async function Breakpoint({ id, children }: { id: BreakpointId; children: ReactNode }) {
  const t = await getTranslations("Case.breakpoints");
  return (
    <section
      id={`bp-${id}`}
      data-breakpoint={id}
      aria-labelledby={`bp-${id}-title`}
      className="scroll-mt-36 border-t border-border pt-10 pb-12 first:border-t-0 first:pt-0"
    >
      <h2
        id={`bp-${id}-title`}
        tabIndex={-1}
        className="font-display text-2xl font-semibold leading-tight sm:text-3xl"
      >
        {t(id)}
      </h2>
      <div className="mt-5 space-y-5 text-lg">{children}</div>
    </section>
  );
}
