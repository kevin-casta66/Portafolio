## 1. Scaffold del proyecto

- [x] 1.1 Crear la app Next.js (App Router, TypeScript, pnpm) en la raíz con las versiones exactas de `docs/STACK-VERSIONS.md`, `save-exact=true` en `.npmrc` y Node LTS en `.nvmrc` y `engines`; verificar que `pnpm dev` sirve una página en localhost y que `package.json` no contiene `^` ni `~`
- [x] 1.2 Activar TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) y alias `@/*`; verificar que `pnpm tsc --noEmit` pasa
- [x] 1.3 Configurar ESLint, Prettier y Stylelint con scripts `lint`, `format`, `typecheck`; verificar que `pnpm lint` pasa sin errores
- [x] 1.4 Crear la estructura de carpetas de §8 (`app/[locale]`, `components/{phases,systems,ui}`, `webgl`, `motion`, `content`, `content/cases`, `lib`, `styles`, `messages`, `public/{fonts,cv}`) con un README breve por carpeta; verificar que existen
- [x] 1.5 Instalar Tailwind CSS v4 e importarlo en `app/globals.css`; verificar que una utilidad de prueba se aplica en el navegador

## 2. Design tokens

- [x] 2.1 Crear `styles/tokens.css` con primitivas de la paleta Silicio y acentos de fase, y tokens semánticos (`bg`, `surface`, `surface-elevated`, `border`, `text`, `text-muted`, `accent`, `phase-tint`); verificar en DevTools que `:root` expone todos
- [x] 2.2 Añadir variantes por fase (`[data-phase=source|lexer|parser|bytecode|runtime|gpu|display]`) que reasignan `accent` y `phase-tint` (4-6%) y el gradiente espectro de DISPLAY; verificar con una página de muestra temporal
- [x] 2.3 Añadir tokens de movimiento (easings, duraciones, staggers) en CSS y su espejo en `motion/tokens.ts` con spring {stiffness: 300, damping: 30}; verificar con un test unitario que ambos valores coinciden
- [x] 2.4 Definir escala tipográfica fluida con `clamp()` (xs…display), escala de espaciado y grilla de 12 columnas con gutter ≥ 16 px en móvil; verificar a 360 px y 1440 px que no hay scroll horizontal
- [x] 2.5 Exponer los tokens semánticos a Tailwind con `@theme inline`; verificar que `bg-surface text-accent` resuelve a variables CSS
- [x] 2.6 Añadir tokens de liquid glass (`--glass-bg`, `--glass-bg-min-alpha`, `--glass-blur`) por tema; verificar que existen en ambos temas en DevTools
- [x] 2.7 Añadir regla Stylelint y regla ESLint que prohíben colores literales fuera de `styles/tokens.css` y `motion/tokens.ts`; verificar que un hex de prueba en un componente hace fallar `pnpm lint`

## 3. Tipografía

- [x] 3.1 Descargar Unbounded (variable), Geist y JetBrains Mono, generar subsets WOFF2 latin + latin-ext en `public/fonts/` y documentar el comando en el README; verificar tamaños resultantes
- [x] 3.2 Cargarlas con `next/font/local` (swap, fallback ajustado; preload solo display y texto) y exponer `--font-display`, `--font-sans`, `--font-mono`; verificar en Network que se sirven desde el mismo origen
- [x] 3.3 Verificar que un título con `font-weight: 550` usa el eje variable y que el CLS por cambio de fuente es < 0,01 en Lighthouse local

## 4. Temas

- [x] 4.1 Definir el tema "Datasheet" bajo `[data-theme="light"]` reasignando todos los tokens semánticos y oscureciendo acentos en OKLCH; verificar visualmente ambos temas
- [x] 4.2 Añadir script inline en `<head>` que aplica tema guardado o `prefers-color-scheme` antes del pintado, con try/catch; verificar recargando con tema claro guardado que no hay destello
- [x] 4.3 Crear un control simple de cambio de tema que persiste la elección; verificar que la elección prevalece sobre la preferencia del sistema tras recargar
- [x] 4.4 Crear `scripts/check-contrast.ts` que calcula contraste de todas las parejas texto/fondo de ambos temas, incluido texto sobre vidrio en el peor fondo posible, y falla si alguna no cumple AA; verificar que `pnpm tokens:contrast` pasa y que bajar `--glass-bg-min-alpha` lo hace fallar

## 5. Layout raíz e i18n

- [x] 5.1 Configurar next-intl (es por defecto, en) con middleware, `app/[locale]/layout.tsx`, `generateStaticParams` y `messages/{es,en}.json`; verificar que `/` redirige según `Accept-Language` y `lang` es correcto
- [x] 5.2 Responder 404 para prefijos de idioma no soportados; verificar visitando `/fr`
- [x] 5.3 Implementar el layout con skip link, `header`, `main#content`, `footer`; verificar con teclado que el primer Tab muestra el skip link y lleva el foco a `main`
- [x] 5.4 Implementar el header: nombre (enlace a inicio), "Descargar CV" (PDF del idioma con `download`), espacio para Vista Rápida y selector de idioma que conserva la ruta; verificar con JS desactivado que el CV se descarga
- [x] 5.5 Añadir los CV placeholder `public/cv/cv-es.pdf` y `cv-en.pdf`; verificar que ambas URLs responden 200
- [x] 5.6 Crear el store global en `lib/store.ts` (fase, tema, sonido=off, gateChoice=null, debug=off, quickView=off, tier=auto, backend=pending, achievements=[]) con persistencia de `gateChoice` en sesión y de logros en almacenamiento local (con try/catch); verificar con tests unitarios los valores por defecto, la persistencia y que un almacenamiento que lanza error no rompe la carga

## 6. Modelo de contenido

- [x] 6.1 Definir esquemas y tipos en `lib/content/schema.ts` (perfil, proyecto, habilidad, experiencia, logro, experimento, texto localizado); verificar con `pnpm typecheck`
- [x] 6.2 Crear `content/profile.ts`, `projects.ts` (6 proyectos), `skills.ts`, `experience.ts`, `experiments.ts` con datos placeholder marcados con `ph()`; verificar que compilan contra los tipos
- [x] 6.3 Implementar `lib/content/index.ts` que valida, deriva `projectsBySkill` y lanza errores descriptivos (habilidad huérfana, referencia rota, id duplicado, logro sin cifra, caso inexistente); verificar con tests unitarios de cada caso de error
- [x] 6.4 Añadir scripts `content:check` (se ejecuta en `prebuild`) y `content:todo` (lista placeholders); verificar que añadir una habilidad huérfana hace fallar `pnpm build`
- [x] 6.5 Renderizar en `app/[locale]/page.tsx` un listado mínimo de nombre, rol y proyectos desde el contenido; verificar que aparece en el HTML del servidor (`curl` sin JS)

## 7. Verificación del change

- [x] 7.1 Ejecutar `pnpm lint && pnpm typecheck && pnpm test && pnpm build` y verificar que todo pasa
- [x] 7.2 Revisar la página en es/en, tema claro/oscuro y 360 px/1440 px; verificar sin errores de consola ni scroll horizontal
