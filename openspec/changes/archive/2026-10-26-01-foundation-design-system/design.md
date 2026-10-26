## Context

Proyecto greenfield (carpeta vacía salvo `openspec/` y `docs/`). Ver proposal.md - Why. Restricciones clave del brief: JS inicial < 180 KB gzip, contenido esencial por SSR, tokens obligatorios, i18n es/en y código presentable públicamente. El addendum (`docs/ADDENDUM-v2.md` §0) exige fijar versiones exactas verificadas: vienen de `docs/STACK-VERSIONS.md` (change 00). Las decisiones de este change condicionan los changes 02–10.

## Goals / Non-Goals

**Goals:**
- Base de proyecto con TypeScript estricto, lint y formato listos.
- Una sola fuente de verdad para tokens (CSS) consumible desde Tailwind y desde TS.
- Modelo de contenido validado en build, con relaciones derivadas.
- Layout raíz accesible e internacionalizado sobre el que montar secciones y sistemas.

**Non-Goals:**
- Secciones de contenido (change 02), animación (03), WebGPU/WebGL (04), transiciones de página y toggle de tema animado (05), sistemas globales como la Vista Rápida, sonido o logros funcionales (06).
- Datos personales reales.

## Decisions

1. **Next.js App Router con `app/[locale]` y next-intl (middleware + `generateStaticParams`)**. Permite SSG de ambos idiomas y `lang` correcto por ruta. Alternativa: i18n en cliente → descartada por SEO y primer render.
2. **Tokens en `styles/tokens.css` + `@theme` de Tailwind v4**. Las variables primitivas (`--silicon-950`, `--cyan-400`…) viven en `:root`; las semánticas (`--color-bg`, `--color-surface`, `--color-accent`, `--color-phase-tint`) se reasignan por tema (`[data-theme="light"]`) y por fase (`[data-phase="parser"]`). Tailwind v4 consume las semánticas vía `@theme inline`, así las utilidades (`bg-surface`, `text-accent`) cambian solas. Alternativa: tokens en TS generando CSS → más indirección sin beneficio.
3. **Tokens de movimiento duplicados de forma controlada**: `motion/tokens.ts` exporta easings/duraciones/springs como constantes y un test compara sus valores con las variables CSS. Alternativa: leer `getComputedStyle` en runtime → coste y no disponible en SSR.
4. **Regla anti-hex**: Stylelint (`color-no-hex` + `declaration-property-value-disallowed-list`) para CSS y una regla ESLint `no-restricted-syntax` sobre literales `#xxx`/`rgb(` en `.tsx/.ts` fuera de `styles/tokens.css` y `motion/tokens.ts`. Alternativa: revisión manual → no verificable.
5. **Fuentes con `next/font/local`** desde `public/fonts/` (WOFF2 subset latin + latin-ext generados con `glyphhanger`/`pyftsubset`), `display: swap`, `adjustFontFallback` y `preload` solo para display y texto; JetBrains Mono sin preload (no es crítica para LCP). Alternativa: `next/font/google` → descarga en build, pero el brief pide autoalojadas con subset controlado.
6. **Tema sin parpadeo**: script inline bloqueante mínimo en `<head>` que lee `localStorage` (con try/catch) o `prefers-color-scheme` y fija `data-theme` en `<html>` antes del pintado; `suppressHydrationWarning` en `<html>`. El toggle animado llega en el change 05; aquí solo un control simple.
7. **Contenido con Zod + `satisfies`**: `content/*.ts` exporta datos tipados; `lib/content/schema.ts` define esquemas Zod; `lib/content/index.ts` valida, deriva `skillToProjects` y lanza error en import durante el build (y un script `pnpm content:check`). Textos localizados como `{ es: string; en: string }`. Placeholders marcados con un helper `ph("…")` que el script `content:todo` lista. Alternativa: CMS → fuera de alcance, el brief pide archivos tipados.
8. **Zustand** con store único en `lib/store.ts`, slices por dominio. Slices base: `phase`, `theme`, `sound` (`enabled` + `gateChoice: 'sound' | 'silent' | null`, en `sessionStorage` porque la puerta se recuerda por sesión), `debug`, `quickView`, `graphics` (`tier: 'auto' | 'high' | 'medium' | 'low'`, `backend: 'webgpu' | 'webgl2' | 'none' | 'pending'`), `achievements` (ids desbloqueados, en `localStorage` con try/catch). Solo se importa en componentes cliente. El backend lo escribe el runtime 3D (change 04) tras `init()`; aquí solo se define el contrato y el valor inicial `pending`. Alternativa: varios stores → más difícil de inspeccionar desde Modo Debug.
11. **Versiones exactas**: `package.json` sin `^`/`~`, copiadas de `docs/STACK-VERSIONS.md`; `pnpm` con `save-exact=true` en `.npmrc` para que futuras instalaciones también queden fijadas. Alternativa: rangos semver → builds no reproducibles y riesgo de romper la combinación three/R3F/Drei.
12. **Tokens de liquid glass**: `--glass-bg` (color de superficie con alfa), `--glass-bg-min-alpha` y `--glass-blur`, definidos por tema; el script de contraste evalúa el texto sobre el peor caso (vidrio sobre el fondo más claro u oscuro posible) y falla si no cumple AA. Solo se usan en Call Stack, terminal y lente del Heap (changes 06 y 07).
9. **Gestor de paquetes pnpm** y Node LTS fijado en `.nvmrc`/`engines`.
10. **CV** en `public/cv/cv-es.pdf` y `public/cv/cv-en.pdf` (placeholders) servidos con atributo `download`.

## Risks / Trade-offs

- [Variables CSS por fase + Tailwind v4 aún jóvenes] → usar solo `@theme inline` documentado y cubrir con un test visual mínimo en el change 10.
- [Script inline de tema bloquea el parseo] → mantenerlo < 1 KB y sin dependencias.
- [Validar contenido en import puede romper `next dev`] → el error es intencionado y descriptivo; `content:check` permite detectarlo antes.
- [Acentos oscurecidos en "Datasheet" pierden identidad] → ajustar solo luminosidad (OKLCH) manteniendo el tono; verificado por el script de contraste.

## Migration Plan

No aplica (proyecto nuevo). Rollback: eliminar los archivos generados.

## Open Questions

- Licencia de Geist/Unbounded/JetBrains Mono para autoalojar: todas son OFL; confirmar al descargar.
- Dominio definitivo (afecta a metadatos en el change 09).
