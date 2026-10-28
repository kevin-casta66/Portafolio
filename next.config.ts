import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Casos de estudio (change 05): los `.mdx` de `content/cases/` se importan desde la ruta del caso
// (no son páginas por sí mismos). `remark-frontmatter` solo hace que MDX IGNORE el bloque YAML del
// principio; los metadatos los lee y valida `lib/cases` (también `pnpm content:check`, sin pasar por
// el compilador de MDX). Los plugins van por nombre (cadenas) para que sirvan con Turbopack.
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-frontmatter"] },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Medios (change 09, 4.7): AVIF primero y WebP de respaldo; con `sizes` + dimensiones reservadas en cada `<Image>`.
  images: { formats: ["image/avif", "image/webp"] },
  // Análisis de bundle (change 09, `scripts/perf/`): `SOURCEMAPS=1 pnpm build` emite mapas para atribuir bytes a módulos.
  productionBrowserSourceMaps: process.env.SOURCEMAPS === "1",
};

export default withMDX(withNextIntl(nextConfig));
