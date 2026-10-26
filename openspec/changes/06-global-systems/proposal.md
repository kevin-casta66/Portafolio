## Why

El brief (docs/BRIEF.md §3) define un conjunto de sistemas globales que recorren todo el sitio: navegación "Call Stack", terminal oculta, modo Debug, Vista Rápida para reclutadores, cursor contextual, botones magnéticos, sonido opcional y atajos de teclado. El ADDENDUM v2 (docs/ADDENDUM-v2.md §2 y §5) los amplía con un sistema de logros, diseño sonoro por fase, vidrio líquido con disciplina y un modo Debug que expone el backend gráfico y permite ajustar shaders en vivo. Son los que convierten la experiencia en una demostración técnica coherente y, a la vez, garantizan la ruta rápida del reclutador (Vista Rápida + CV a un clic). Tras tener secciones, coreografía, escenas 3D y casos de estudio, es el momento de añadir la capa transversal que los orquesta.

Depende de: `00-technique-teardown`, `01-foundation-design-system`, `02-static-semantic-sections`, `03-scroll-choreography` (puerta de arranque con elección de sonido, fase activa, velocidad de scroll), `04-webgl-scenes` (backend gráfico, tiers, parámetros de escena), `05-case-studies-view-transitions` (Hold-to-Execute).

## What Changes

- Barra lateral "Call Stack" con las fases como frames de una pila, fase activa iluminada con su color, salto por clic/teclado, contador de logros y barra inferior compacta con progreso en móvil.
- Terminal oculta (tecla `~` o botón) con comandos `help`, `about`, `projects`, `skills`, `cv`, `contact`, `theme`, `debug`, `clear`, autocompletado con Tab, historial con flechas, anuncios `aria-live` y logro `root_access` al abrirla.
- Modo Debug con backend gráfico activo (nueva generación vs fallback) y tier, wireframes, cajas de componentes, FPS, tiempos de CPU/GPU y panel para ajustar parámetros de shaders en vivo; herramientas descargadas solo al activarlo; logro `debugger_attached`.
- Vista Rápida ⚡: toggle siempre visible en el header que muestra un currículum de una sola página, escaneable, con animaciones mínimas, botón de impresión/PDF y estado enlazable.
- Cursor personalizado contextual (caret, mira, ⟨/⟩, arrastre), desactivado en táctil y respetando preferencias del usuario.
- Botones magnéticos en los CTAs principales sin alterar su área de clic ni el foco.
- Diseño sonoro: preferencia inicial tomada de la puerta de arranque, ambiente distinto por fase con fundidos cruzados, sonidos de UI sutiles, tono que responde a la velocidad del scroll y botón de silencio siempre visible.
- Sistema de logros: avisos discretos `ACHIEVEMENT_UNLOCKED: <id>`, catálogo inicial (`root_access`, `process_executed`, `heap_explorer`, `kernel_panic`, `debugger_attached`), registro extensible, contador en el Call Stack y persistencia local.
- Vidrio líquido restringido al Call Stack, la terminal y la lente del Heap, con contraste AA garantizado y degradación opaca.
- Panel de atajos de teclado documentados al pulsar `?`.

## Capabilities

### New Capabilities
- `call-stack-navigation`: navegación global por fases presentada como pila de llamadas, en escritorio y móvil.
- `terminal`: terminal interactiva oculta con comandos, autocompletado, historial y logro de acceso.
- `debug-mode`: superposición técnica con backend gráfico, wireframes, cajas de componentes, métricas de render y ajuste de shaders en vivo.
- `quick-view`: modo reclutador con currículum de una página, imprimible y siempre accesible.
- `custom-cursor`: cursor contextual que comunica el tipo de elemento bajo el puntero.
- `magnetic-buttons`: atracción magnética en CTAs principales.
- `sound`: diseño sonoro opcional (ambiente por fase, UI, tono por velocidad) con preferencia desde la puerta de arranque.
- `keyboard-shortcuts`: atajos globales y panel de ayuda accesible con `?`.
- `achievements`: logros por exploración con avisos no bloqueantes, registro extensible y persistencia local.
- `liquid-glass`: material de vidrio líquido restringido a superficies concretas con contraste AA garantizado.

### Modified Capabilities
<!-- Ninguna: los sistemas globales se añaden como capabilities nuevas. -->

## Impact

- Código: `components/systems/` (CallStack, Terminal, DebugOverlay, QuickView, Cursor, SoundManager, ShortcutsPanel, Achievements), `components/ui/Glass`, header de `app-shell`, store global (fase, tema, sonido, debug, Vista Rápida, logros).
- Integración con `boot-sequence` (elección de sonido), `phase-transitions` (fase activa y velocidad de scroll), `webgl-runtime`/`adaptive-quality` (backend, tier, wireframes, métricas, parámetros de escena), `hold-to-execute` (logro `process_executed`), `not-found-page` (logro `kernel_panic`), `theming`, `content-model`.
- Los changes `07-memory-heap` (lente de vidrio, logro `heap_explorer`) y `08-motion-showcase` reutilizan `liquid-glass` y el registro de logros.
- Dependencias nuevas cargadas bajo demanda: herramientas de medición y de ajuste de parámetros (solo con Debug). Assets de audio cortos (solo con sonido activo).
- Sin cambios de API externa.
