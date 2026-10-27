## Why

El sistema de movimiento de Portafolio (tokens de easing, duraciones y el catálogo de transiciones T1–T11) es una de las habilidades técnicas más fuertes del portafolio, pero dentro del recorrido narrativo pasa desapercibido: el visitante ve el resultado, no el oficio. El ADDENDUM v2 (docs/ADDENDUM-v2.md §6 y §8.3–8.4) pide una página pública `/motion` que exponga el propio sistema como prueba de habilidad, reproduciendo cada transición de forma aislada y enseñando cómo funciona por dentro.

Depende de: `00-technique-teardown` (tabla de especificación T1–T11 y notas técnicas), `01-foundation-design-system` (tokens, i18n, app-shell), `02`–`03` (sistema de movimiento, transiciones DOM T1/T7/T11), `04-webgl-scenes` (prototipos aislados de las transiciones WebGL, tiers de calidad, render targets), `05-case-studies-view-transitions` (T6 Hold-to-Execute, T10), `06-global-systems` (terminal, registro de logros) y `07-memory-heap` (T7 en vista Heap).

## What Changes

- Nueva página pública `/[locale]/motion` (es/en), generada estáticamente y enlazada desde el footer y desde la terminal (comando `motion`).
- Visualizador de tokens de movimiento: cada easing dibujado como curva interactiva (punto que recorre la curva y previsualización de un elemento animado), más duraciones, staggers y springs, todo leído de la misma fuente de tokens que usa el sitio.
- Catálogo T1–T11: una tarjeta por transición con disparador, duración, easing, técnica, fallback de reduced motion y nota técnica breve; botón "Replay", control de velocidad 0.25x / 0.5x / 1x e interruptor "Ver internos" que muestra la máscara o el render target que usa la transición.
- Las demos reutilizan los prototipos aislados de cada transición creados en los changes 03–07; la página no reimplementa ninguna transición.
- Una sola demo 3D activa a la vez; el resto muestran un fotograma estático hasta que se activan.
- Reduced motion: fotogramas estáticos por defecto; las demos solo se reproducen bajo petición explícita del usuario.
- Sin WebGL: cada demo WebGL muestra su versión 2D de respaldo e indica que se está viendo el fallback.
- Navegación completa por teclado.
- Nuevo logro `motion_inspector` en el registro de logros del change 06, que se desbloquea al reproducir una transición en `/motion`.

## Capabilities

### New Capabilities
- `motion-showcase`: página pública `/motion` que muestra los tokens de movimiento como curvas interactivas y permite reproducir de forma aislada cada transición T1–T11, con control de velocidad, vista de internos, notas técnicas y alternativas accesibles (teclado, reduced motion, sin WebGL).

### Modified Capabilities
<!-- Ninguna. El comando de terminal y el logro se añaden como requisitos de esta capability para no modificar specs de changes aún no archivados. -->

## Impact

- **Rutas**: nueva `app/[locale]/motion/` (SSG) con metadatos propios y entrada en el sitemap.
- **Código**: `components/showcase/` (EasingCurve, TransitionDemo, SpeedControl, InternalsToggle); las transiciones de `motion/transitions/registry.ts` (variantes DOM del change 03 y `canvas` del change 04) deben exponer una interfaz común de demo (play/replay, velocidad, modo internos, fotograma estático).
- **Contenido**: `content/motion.ts` (catálogo T1–T11 tipado, derivado de docs/MOTION-SPEC.md) y textos es/en.
- **Sistemas globales**: nuevo comando `motion` en la terminal, enlace en el footer y logro `motion_inspector`.
- **Rendimiento**: la página carga el motor 3D solo cuando el usuario activa una demo WebGL; debe cumplir los mismos presupuestos Lighthouse móvil que el resto del sitio.
