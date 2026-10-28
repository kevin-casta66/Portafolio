import { serializeJsonLd } from "@/lib/seo";

/** Datos estructurados JSON-LD (componente de servidor). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
