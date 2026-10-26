## Why

«COMPILE» parte de cero: no existe proyecto, ni sistema visual, ni contenido. Antes de construir secciones, coreografías o escenas 3D se necesita una base común —tokens de diseño, tipografía, temas, layout accesible, i18n y un modelo de contenido tipado— para que todo lo posterior sea consistente y el autor pueda editar su información sin tocar componentes. Corresponde al paso 1 de la sección 12 de `docs/BRIEF.md` (y a §4, §7, §8 y la parte de i18n de §11), ajustado por `docs/ADDENDUM-v2.md` §0 (versiones exactas verificadas) y §2 (stack 3D WebGPU/TSL, audio con puerta de entrada, logros).

## What Changes

- Scaffold de la aplicación (Next.js App Router, TypeScript estricto, Tailwind CSS v4) con versiones exactas (sin rangos) tomadas de `docs/STACK-VERSIONS.md` (change 00) con la estructura de carpetas de §8 (`app/[locale]`, `components/{phases,systems,ui}`, `webgl/`, `motion/`, `content/`, `lib/`, `styles/tokens.css`).
- Design tokens como CSS custom properties: paleta "Silicio" completa, acentos por fase (cian, violeta, lima, ámbar, magenta, espectro DISPLAY), tinte de fondo por fase (4-6%), tema claro "Datasheet" con acentos oscurecidos a contraste AA, easings, duraciones, staggers, escala tipográfica fluida con `clamp()`, espaciado y grilla de 12 columnas.
- Tokens de superficie translúcida (liquid glass) con opacidad mínima de fondo que garantiza contraste AA del texto en ambos temas (Add. §5).
- Prohibición verificable de colores hex sueltos fuera del archivo de tokens.
- Tipografías autoalojadas con subset y preload: Unbounded (variable, display), Geist (texto), JetBrains Mono (código/datos).
- Tema oscuro (por defecto) y claro, persistido y sin destello de tema incorrecto al cargar.
- Layout raíz: landmarks (`header`, `main`, `footer`), skip link, header con nombre, enlace "Descargar CV" y espacio reservado para el toggle de Vista Rápida; selector de idioma.
- Internacionalización es/en con rutas por prefijo de locale y `lang` correcto.
- Modelo de contenido tipado (perfil, proyectos, habilidades, experiencia, experimentos) con datos de ejemplo marcados como placeholder; relaciones habilidad↔proyecto derivadas automáticamente; validación que hace fallar el build si una habilidad no está respaldada por al menos un proyecto o si hay referencias rotas.
- Store global base (fase actual, tema, sonido y elección de la puerta de arranque, modo debug, Vista Rápida, tier de calidad, backend gráfico activo `webgpu`/`webgl2`/`none`, logros desbloqueados) con valores por defecto; logros persistidos localmente.

## Capabilities

### New Capabilities
- `design-tokens`: tokens de color, movimiento, tipografía fluida, espaciado y grilla; regla de no usar colores literales fuera de los tokens.
- `typography`: familias tipográficas autoalojadas, subset, precarga y roles (display, texto, código).
- `theming`: temas oscuro "Silicio" y claro "Datasheet", persistencia, contraste AA y ausencia de parpadeo.
- `app-shell`: layout raíz accesible, header con CV y Vista Rápida, i18n es/en con rutas por locale y estado global base (incluye backend gráfico, tier, elección de sonido y logros).
- `content-model`: datos tipados y editables del portafolio, relaciones habilidad↔proyecto derivadas y validación de integridad.

### Modified Capabilities
<!-- Ninguna: es el primer change del proyecto. -->

## Impact

- Depende de: `00-technique-teardown` (versiones exactas en `docs/STACK-VERSIONS.md`). Todos los changes 02–10 dependen de él.
- Crea el proyecto completo (`package.json`, configuración de TypeScript, Tailwind, ESLint, next-intl) y las carpetas de §8.
- Nuevas dependencias (versión exacta según `docs/STACK-VERSIONS.md`): next, react, react-dom, typescript, tailwindcss v4, next-intl, zustand, zod (validación de contenido). Las dependencias 3D, GSAP y audio se instalan en sus changes respectivos, también con versión exacta.
- Archivos clave: `styles/tokens.css`, `app/[locale]/layout.tsx`, `content/*.ts`, `lib/content/*`, `lib/store.ts`, `messages/{es,en}.json`, `public/cv/`.
- Los datos personales reales (`BRIEF.md › Mis datos`) aún no existen: se usan placeholders explícitos a reemplazar por el autor.
