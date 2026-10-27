import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { buildHeapBlocks } from "@/lib/heap";

/**
 * Datos del heap para el cliente (change 07): los mismos bloques que la página `/heap` serializa en su HTML.
 * Los pide la transición RUNTIME → Heap (T7) al pasar el puntero o el foco por el botón «Heap»: así el
 * home puede dibujar los bloques en el canvas ANTES de navegar, sin traer `lib/content` (solo servidor)
 * al JS del cliente. Es estático (se genera en el build, una vez por idioma).
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  const blocks = buildHeapBlocks(content.projects, content.experiments);
  const skillNames = Object.fromEntries(content.skills.map((s) => [s.id, s.name]));
  return Response.json({ blocks, skillNames });
}
