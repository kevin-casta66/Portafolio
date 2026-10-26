import { notFound } from "next/navigation";

/** Cualquier ruta no definida dentro de un idioma válido muestra `not-found` con el layout del idioma. */
export default function CatchAllPage() {
  notFound();
}
