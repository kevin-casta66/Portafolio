## Why

Las tarjetas de proyecto (RUNTIME) solo resumen cada trabajo; un reclutador técnico necesita ver el razonamiento, la arquitectura y el impacto real detrás de cada proyecto. Este change entrega las páginas de caso de estudio "Debugger" (docs/BRIEF.md §2.6) y la transición que conecta home ↔ caso como un mismo proceso que se "ejecuta" y se "depura". Según docs/ADDENDUM-v2.md (§2, §4 T6 y T10, §5 Hold-to-Execute), que manda sobre el brief en transiciones e interacciones, la transición cinematográfica vive en el canvas persistente y no en APIs experimentales, se dispara con Hold-to-Execute, y las transiciones de vista del navegador quedan solo para la UI (tema, filtros, menú).

Depende de: `00-technique-teardown` (tabla de movimiento T1–T11 y versiones verificadas), `01-foundation-design-system` (tokens, tema, app-shell, content-model), `02-static-semantic-sections` (tarjetas de proyectos), `03-scroll-choreography` (motion-system, reloj único, scroll suave) y `04-webgl-scenes` (canvas único persistente, gemelos DOM↔WebGL, render targets, tiers de calidad).

## What Changes

- Nueva ruta de caso de estudio por proyecto y locale (`/[locale]/projects/[slug]`), generada estáticamente desde un archivo MDX por caso en `content/cases/`.
- Layout "Debugger": panel lateral de breakpoints (Contexto, Problema, Arquitectura, Decisiones, Código destacado, Resultados, Aprendizajes) que resalta la sección activa y permite saltar a ella.
- Diagrama de arquitectura que se construye por pasos con el scroll.
- Bloques de código con resaltado de sintaxis generado en build y anotaciones al margen.
- Gráficos de métricas de resultados que se dibujan al entrar en viewport, con equivalente accesible (tabla/texto).
- Navegación entre casos "Step over ▶" / "Step back ◀".
- 404 para slugs inexistentes; contenido completo legible sin JavaScript.
- **Hold-to-Execute (T6)**: mantener pulsado ~800 ms un proceso muestra un anillo de progreso con "Ejecutando…"; al completarse, el gemelo WebGL de la tarjeta se expande a pantalla completa con distorsión de lente y aberración cromática en los bordes y se convierte en la cabecera del caso ("Attaching debugger…"). Clic normal = versión corta; teclado: Enter abre, mantener Espacio ejecuta la completa; táctil: mantener el dedo; reduced motion: fundido. Desbloquea el logro `process_executed`.
- Transición inversa al volver al home desde el canvas persistente, contrayendo la cabecera hasta la tarjeta y restaurando el scroll.
- **Transiciones de UI (T10)**: cambio de tema con revelado circular desde el botón, reordenado de filtros y apertura de menú mediante el componente `<ViewTransition>` de React (estable en React 19.3 y sin configuración en Next 16.4: ya no hay flag experimental) con detección de soporte y fallback a Flip.
- Degradación: en tier bajo o sin WebGL la transición de página pasa a una versión 2D o instantánea; con reduced motion, fundido corto.
- **BREAKING (respecto a la versión anterior de este change)**: la transición tarjeta → caso ya no usa la View Transitions API del navegador.

## Capabilities

### New Capabilities
- `case-study-pages`: páginas de caso de estudio "Debugger" generadas desde contenido MDX, con índice de breakpoints, diagrama por pasos, código anotado, métricas accesibles y navegación entre casos.
- `page-transitions`: transición cinematográfica home ↔ caso en el canvas persistente, transiciones de UI (tema, filtros, menú) y su degradación progresiva por soporte, tier y reduced motion.
- `hold-to-execute`: interacción de mantener pulsado sobre un proceso para ejecutarlo, con anillo de progreso, equivalentes de teclado, táctil y reduced motion, anuncio accesible y disparo del logro asociado.

### Modified Capabilities
<!-- Ninguna: las ampliaciones a projects-section/theming se expresan como requisitos de las capabilities nuevas. -->

## Impact

- Código: `app/[locale]/projects/[slug]/`, `components/case-study/` (Debugger layout, Breakpoints, ArchitectureDiagram, AnnotatedCode, MetricChart, StepNav), `components/systems/HoldToExecute`, `motion/` (controlador de transición de página, hook de hold, wrapper de transiciones de UI con fallback Flip), `webgl/nodes/` (lente + aberración en TSL) y la escena/plano de T6 en `webgl/transitions/` (donde el change 04 registra las variantes canvas, `webgl/transitions/registry.ts`) con su prototipo en `/[locale]/prototypes/T6`, toggle de tema, `content/cases/*.mdx`.
- Dependencias nuevas: MDX (compilación en build). Shiki ya está instalado desde el change 04 (`shiki` 4.5.0, `lib/highlight.ts` con tema de variables CSS) y se reutiliza. `<ViewTransition>` se usa solo para UI y no requiere flag en `next.config`.
- Integración: usa los gemelos DOM↔WebGL y render targets del change 04, y el registro de logros del change 06 (`process_executed`; si 06 aún no está aplicado, el evento se emite y se ignora).
- Modelo de contenido: cada proyecto con caso de estudio referencia su archivo MDX; validación de que los slugs coinciden.
- SEO: nuevas páginas estáticas con metadatos por caso (OG/JSON-LD se cierra en el change 09).
