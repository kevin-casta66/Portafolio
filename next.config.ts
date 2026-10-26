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
};

export default withMDX(withNextIntl(nextConfig));
