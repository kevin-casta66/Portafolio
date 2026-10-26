import localFont from "next/font/local";

/**
 * Fuentes autoalojadas (OFL-1.1). Cada familia se carga en dos subsets: `latin` (cubre español e
 * inglés) con precarga, y `latin-ext` sin precarga como respaldo por carácter: el navegador solo la
 * descarga si falta un glifo en la primera. Se sincronizan con `pnpm fonts:sync`.
 * next/font exige opciones literales, por eso no se factorizan.
 */

export const unbounded = localFont({
  src: "../public/fonts/unbounded-latin-wght-normal.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  variable: "--font-unbounded",
  adjustFontFallback: "Arial",
  preload: true,
});

export const unboundedExt = localFont({
  src: "../public/fonts/unbounded-latin-ext-wght-normal.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  variable: "--font-unbounded-ext",
  adjustFontFallback: false,
  preload: false,
});

export const geist = localFont({
  src: "../public/fonts/geist-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist",
  adjustFontFallback: "Arial",
  preload: true,
});

export const geistExt = localFont({
  src: "../public/fonts/geist-latin-ext-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist-ext",
  adjustFontFallback: false,
  preload: false,
});

// JetBrains Mono no es crítica para el LCP: sin precarga.
export const jetbrains = localFont({
  src: "../public/fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains",
  adjustFontFallback: false,
  preload: false,
});

export const jetbrainsExt = localFont({
  src: "../public/fonts/jetbrains-mono-latin-ext-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains-ext",
  adjustFontFallback: false,
  preload: false,
});

/** Clases que declaran las variables de fuente; se aplican en `<html>`. */
export const fontVariables = [unbounded, unboundedExt, geist, geistExt, jetbrains, jetbrainsExt]
  .map((font) => font.variable)
  .join(" ");
