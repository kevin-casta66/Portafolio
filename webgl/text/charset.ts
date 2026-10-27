/**
 * Glifos de cada atlas MSDF. Es la ÚNICA fuente de verdad: la comparten el script que genera los
 * atlas (`scripts/build-msdf.ts`), el test de cobertura y el runtime (que usa el DOM como respaldo
 * si un texto contiene un glifo que no está en el atlas).
 */
export type MsdfFontName = "unbounded-600" | "jetbrains-mono-400";

export const MSDF_FONTS: readonly {
  name: MsdfFontName;
  package: string;
  file: string;
}[] = [
  { name: "unbounded-600", package: "@fontsource/unbounded", file: "unbounded-latin-600-normal.woff2" },
  {
    name: "jetbrains-mono-400",
    package: "@fontsource/jetbrains-mono",
    file: "jetbrains-mono-latin-400-normal.woff2",
  },
];

/** ASCII imprimible (0x20–0x7E). */
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(0x20 + i)).join("");
/** Acentos y signos del español/inglés usados en títulos y en la línea de código. */
const SPANISH = "áéíóúüñÁÉÍÓÚÜÑ¿¡·–—…’‘“”«»";

// Ambas fuentes llevan los acentos: la línea de código del hero (monoespaciada) incluye el nombre del perfil.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- la firma por fuente se mantiene para el script y el test
export function msdfCharset(_font: MsdfFontName): string {
  return ASCII + SPANISH;
}

export function charsetSet(font: MsdfFontName): Set<string> {
  return new Set(msdfCharset(font));
}

/** Primer carácter que falta en el atlas (o `null` si el texto está completamente cubierto). */
export function firstMissingGlyph(text: string, font: MsdfFontName): string | null {
  const set = charsetSet(font);
  for (const ch of text.normalize("NFC")) if (ch !== "\n" && !set.has(ch)) return ch;
  return null;
}
