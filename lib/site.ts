/**
 * URL pública del sitio (canonical, hreflang, sitemap, Open Graph). Se lee del entorno en build
 * (`SITE_URL`, p. ej. `https://tu-dominio.com`); en local cae a `localhost`. Sin barra final.
 */
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Ruta absoluta de una ruta interna con prefijo de idioma (`/es/heap`). */
export const absoluteUrl = (path: string): string => `${siteUrl}${path}`;
