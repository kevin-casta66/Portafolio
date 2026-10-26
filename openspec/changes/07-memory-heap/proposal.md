## Why

El ADDENDUM v2 (docs/ADDENDUM-v2.md §4 T7, §5 «Memory Heap» y §9) pide una vista de mundo donde todos los proyectos y experimentos se exploran como bloques de memoria en una cuadrícula infinita. Es la técnica de «mundo arrastrable» de los referentes reinterpretada en la narrativa COMPILE: el visitante inspecciona el heap del proceso `Developer`. Demuestra dominio de instancing, inercia, refracción en GPU y accesibilidad de interfaces no lineales. Complementa la sección RUNTIME del BRIEF (docs/BRIEF.md §2.5) sin sustituirla.

Depende de: `00-technique-teardown` (técnicas y tabla T1–T11), `01-foundation-design-system` (tokens, content-model, i18n), `02-static-semantic-sections` (tarjetas de proyecto y experimentos), `03-scroll-choreography` (motion-system), `04-webgl-scenes` (canvas persistente, gemelos DOM↔WebGL, tiers de calidad), `05-case-studies-view-transitions` (Hold-to-Execute y casos de estudio) y `06-global-systems` (liquid-glass, logros, cursor, terminal).

## What Changes

- Nueva ruta `/heap` por locale (`/es/heap`, `/en/heap`) con contenido SSR: lista accesible de todos los proyectos y experimentos como bloques de memoria.
- Cada bloque tiene una dirección hexadecimal estable, derivada del contenido (no aleatoria), y muestra tipo (proyecto/experimento), nombre, año y tecnologías.
- Capa visual de cuadrícula infinita que se arrastra con inercia (ratón, táctil y rueda/trackpad), renderizada en el canvas persistente con instancing.
- Lente de liquid glass que sigue al cursor, amplía y refracta lo que hay debajo (solo tiers medio y alto).
- Botón «Run GC» que reorganiza los bloques por tecnología o por año, con animación continua.
- Navegación por teclado con flechas sobre la cuadrícula y lista equivalente para lectores de pantalla.
- Integración con el conmutador Grid / Lista / Heap de RUNTIME (T7): al elegir Heap las tarjetas del home se convierten en bloques sin cortes.
- Abrir un bloque usa Hold-to-Execute o clic normal (change 05).
- Entrar por primera vez desbloquea el logro `heap_explorer` (change 06).
- Variantes para reduced motion y sin WebGL: lista/cuadrícula 2D estática con el mismo contenido.
- Metadatos SEO propios de la ruta.

## Capabilities

### New Capabilities
- `memory-heap`: vista de mundo `/heap` que presenta proyectos y experimentos como bloques de memoria explorables, con reorganización «Run GC», lente de vidrio, navegación accesible y alternativas sin animación ni WebGL.

### Modified Capabilities
<!-- Ninguna. Las integraciones con projects-section (T7), hold-to-execute, achievements y liquid-glass se consumen tal como las definen los changes 02–06. -->

## Impact

- **Rutas**: `app/[locale]/heap/` (página, metadatos), enlace desde el conmutador de RUNTIME, la terminal (comando `heap` opcional vía registro de comandos de 06) y el Call Stack.
- **Código**: `components/phases/Runtime/` (modo Heap del conmutador), nuevo `components/heap/` (lista DOM, controles), `webgl/scenes/heap/` (bloques instanciados, lente), `motion/` (inercia, timeline de Run GC), `lib/heap/` (direcciones hex, layout y orden).
- **Contenido**: lee `content/projects.ts` y `content/experiments.ts`; no añade campos obligatorios.
- **Rendimiento**: escena nueva sujeta al presupuesto por escena (< 100 draw calls) y a los tiers de calidad; chunk propio cargado solo en `/heap` o al elegir el modo Heap.
- **Tests**: los E2E del change 10 deberán cubrir `/heap` con ratón, teclado, táctil, reduced motion y sin WebGL.
