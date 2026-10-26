## Context

Tras los changes 00–05 existen: el Technique Teardown con versiones verificadas, tokens y temas, secciones semánticas, coreografía de scroll con fase activa, velocidad de scroll y puerta de arranque con elección de sonido (`motion-system`, `phase-transitions`, `boot-sequence`), un único canvas persistente con `WebGPURenderer` y fallback WebGL2, registro de escenas y tiers de calidad (`webgl-runtime`, `adaptive-quality`) y casos de estudio con Hold-to-Execute. Los sistemas de este change son transversales: leen y escriben estado global compartido y se montan una sola vez en el layout raíz de `app/[locale]/`, sobreviviendo a la navegación entre rutas. Ver proposal.md (Why) y las specs de cada capability para los requisitos; docs/ADDENDUM-v2.md manda sobre el brief en lo relativo a debug, sonido y logros.

## Goals / Non-Goals

**Goals:**
- Un único store global como fuente de verdad para fase activa, tema, sonido, debug, Vista Rápida, logros y preferencia de cursor.
- Sistemas desacoplados: cada uno en `components/systems/<Sistema>/`, cargado de forma diferida salvo lo imprescindible en el primer render (header con Vista Rápida, CV y sonido; Call Stack con contador de logros).
- Un registro central de comandos y atajos, y otro de logros, para que terminal, panel `?`, controles de UI y changes posteriores compartan definición.
- No superar el presupuesto de JS inicial (< 180 KB gzip): terminal, herramientas de Debug, cursor, sonido y avisos de logros fuera del bundle inicial.

**Non-Goals:**
- Pase final de rendimiento, reduced motion global y fallbacks sin aceleración gráfica (change 09); aquí solo se respetan las preferencias en cada sistema.
- Tests e2e y Lighthouse CI (change 10).
- La vista Memory Heap y su lente (change 07) y la página /motion (change 08): este change solo les proporciona `liquid-glass` y el registro de logros.
- Comandos de terminal más allá de los listados en el brief.

## Decisions

### D1. Store global con slices y persistencia selectiva
Zustand con slices: `phase` (fase activa y velocidad de scroll, escrito por el change 03), `ui` (terminal/shortcuts abiertos), `prefs` (tema, sonido, cursor → `localStorage`), `session` (debug y elección de la puerta → `sessionStorage`), `achievements` (ids desbloqueados → `localStorage`), `quickView` (derivado de la URL). Persistencia con middleware `persist` por slice, envolviendo accesos en try/catch para degradar a memoria.
- Alternativa: React Context por sistema → descartada por re-renders en cascada y porque los sistemas fuera de React (ticker de GSAP, loop de R3F, nodos de audio) necesitan leer el estado con `getState()` y `subscribe()`.

### D2. Vista Rápida dirigida por URL (`?view=quick`)
El parámetro de búsqueda es la fuente de verdad; el layout lo lee en servidor y renderiza la variante de currículum por SSR (componente `QuickView` compuesto con los mismos datos de `content/`). El toggle hace `router.replace` conservando la ruta y el `locale`; los enlaces internos propagan el parámetro. Al desactivar se usa el ancla de la fase actual.
- Alternativa: estado solo en cliente → descartada: no sería compartible y provocaría parpadeo/CLS al hidratar.
- Impresión: `@media print` en `styles/print.css` (tema claro forzado, controles ocultos, `a[href]::after { content: attr(href) }`); el botón llama `window.print()`. No se genera PDF en servidor.

### D3. Registro de comandos y atajos
`lib/commands.ts` define `{ id, description, run(ctx), shortcut? }`. La terminal resuelve comandos contra el registro (autocompletado por prefijo; sugerencia por distancia de Levenshtein ≤ 2). El panel `?` se genera desde el mismo registro, garantizando que la documentación coincide con el comportamiento. Un único listener `keydown` global en `useGlobalShortcuts` ignora eventos cuando `event.target` es editable (`input`, `textarea`, `select`, `[contenteditable]`) o hay modificadores del sistema.
- Alternativa: listeners por componente → descartada por conflictos y documentación divergente.

### D4. Terminal y panel como diálogos nativos
`<dialog>` con `showModal()` para foco contenido, Escape y `::backdrop`; devolución de foco guardando `document.activeElement`. Salida en un `role="log"` con `aria-live="polite"`. La terminal se importa con `next/dynamic` al primer `~` o al hover/foco del botón (prefetch). Al abrirse llama `unlock('root_access')`.

### D5. Call Stack basado en la fase activa existente
Lee `phase` del store (actualizado por el `useScrollPhase` del change 03). Frames como `<a href="#phase-id">` dentro de `<nav aria-label>`; el salto usa el scroll suave (Lenis `scrollTo`) y luego enfoca el encabezado (`tabindex="-1"`). Incluye un botón con el contador `n/total` de logros que abre la lista (popover nativo). En móvil (`max-width` del breakpoint md) se renderiza la barra inferior con progreso vía `transform: scaleX()` (sin layout).

### D6. Modo Debug sobre el renderer existente, con herramientas diferidas
Overlay DOM con `pointer-events: none` salvo en sus paneles. Al activarlo por primera vez se importan dinámicamente **stats-gl** (FPS, tiempos de CPU y, con `timestamp-query` en WebGPU o `EXT_disjoint_timer_query_webgl2` en WebGL2, tiempos de GPU; si no hay extensión se muestra "GPU: n/d") y **Tweakpane** (panel de parámetros).
- Backend: se lee `renderer.backend.isWebGPUBackend` del `WebGPURenderer` creado por el change 04 y el tier de `adaptive-quality`; se muestra y se re-suscribe a cambios de tier.
- Wireframes: un flag del store que las escenas leen para activar `wireframe` en sus `NodeMaterial` (sin recrear materiales).
- Parámetros de shaders: cada escena registra sus `uniform()` TSL expuestos (`registerTweakables(sceneId, { bloomStrength, aberration, noise… })`) con rango y valor por defecto; Tweakpane genera los controles para la escena activa del registro de escenas y "Restablecer" reasigna los defaults. Los valores no se persisten.
- Cajas de componentes: `outline` en elementos con `data-debug-name` (outline no afecta layout). Fuerza render continuo mientras está activo para medir de forma honesta.
- Alternativa: panel de métricas propio → descartado; stats-gl ya resuelve consultas de tiempo de GPU en ambos backends y Tweakpane da controles accesibles y probados, ambos fuera del bundle inicial.

### D7. Cursor y botones magnéticos con springs de Motion
Cursor: un único elemento `position: fixed`, `pointer-events: none`, `aria-hidden`, movido con `transform` mediante `useSpring` (stiffness 300, damping 30). La forma se resuelve por delegación (`closest('[data-cursor]')`, `a, button` → mira, `pre, code` → código). Montado solo si `matchMedia('(pointer: fine)')` y la preferencia del usuario lo permiten. Magnéticos: componente `Magnetic` que envuelve el CTA y aplica `transform` a un hijo interno visual, dejando el elemento interactivo (y su anillo de foco) en su sitio.

### D8. Diseño sonoro con Web Audio API
`SoundManager` (cargado de forma diferida) usa la Web Audio API directamente:
- El `AudioContext` se crea/reanuda en el gesto de la puerta de arranque ("Iniciar con sonido") o en el botón de sonido; la elección de la puerta se lee del slice `session`.
- Grafo: `masterGain` (silencio instantáneo con `setTargetAtTime`, < 150 ms) ← buses `ambience` y `ui`. Cada fase tiene un loop de ambiente (WebM/Opus + fallback AAC) descargado solo con sonido activo; al cambiar `phase` se hace un fundido cruzado con rampas de ganancia de ~1,2 s.
- Tono por velocidad: un `OscillatorNode` suave con filtro paso-bajo cuya `frequency` sigue la velocidad de Lenis (leída del store, suavizada con `setTargetAtTime`, con límites de altura y volumen).
- Sonidos de UI: sprites cortos en un `AudioBuffer`.
- `visibilitychange` suspende/reanuda el contexto.
- Alternativa: Howler.js → descartada: el grafo de buses, la modulación continua por velocidad y los fundidos por fase requieren nodos de Web Audio que Howler abstrae; usarlo añadiría peso sin ahorrar código.

### D9. Sistema de logros con registro extensible
`lib/achievements.ts` exporta `defineAchievement({ id, title, description, hint })` y `unlock(id)`. El catálogo inicial se define en `content/achievements.ts`; changes posteriores (07, 08) añaden los suyos con `defineAchievement` en su propio módulo. Un test unitario recorre el registro y falla ante ids duplicados. `unlock` es idempotente: si el id ya está en el slice `achievements`, no hace nada. Los avisos se renderizan en un contenedor fijo (`role="status"`, `aria-live="polite"`, sin foco) con cola FIFO; cada aviso dura ~4 s, es descartable y usa fundido con movimiento reducido.
- Alternativa: eventos DOM personalizados sin registro → descartada: el contador necesita conocer el total y la lista con pistas.

### D10. Vidrio líquido como primitiva única
`components/ui/Glass` es la única forma de aplicar el material: `backdrop-filter: blur() saturate()` más un filtro SVG de desplazamiento para la refracción del borde, con el fondo tintado definido por tokens (`--glass-bg`, `--glass-bg-strong`). La opacidad mínima del fondo por tema se calcula en build con el script de contraste del change 01 contra el peor caso (blanco puro detrás en oscuro, tinta detrás en claro), garantizando AA sin depender del contenido. `@supports not (backdrop-filter: blur(1px))` y `@media (prefers-reduced-transparency: reduce)` cambian a la superficie elevada opaca. Una regla de lint restringe los imports de `Glass` a CallStack, Terminal y la lente del Heap.
- Alternativa: medir el contraste en tiempo real contra la escena → descartada por coste en GPU y riesgo de INP; el peor caso estático es más simple y seguro.

## Risks / Trade-offs

- [Atajo `~` en teclados con distribución española, donde requiere AltGr] → aceptar tanto `event.key === '~'` como `Backquote`/`º`, y documentar el botón alternativo.
- [Vista Rápida por URL duplica rutas en caché/SEO] → `canonical` a la URL sin parámetro; se resuelve en el change 09 (seo).
- [Medición de FPS y tiempos de GPU altera el rendimiento] → solo con Debug activo; las consultas de tiempo se muestrean cada 500 ms.
- [El filtro SVG de refracción es caro en móvil] → en tier bajo o pantallas táctiles se usa solo `backdrop-filter` sin desplazamiento.
- [Cursor personalizado añade latencia percibida] → spring rápido y opción de cursor del sistema persistida.
- [Audio bloqueado por políticas de autoplay] → el contexto se crea en el gesto de la puerta; si se llega sin puerta, se reanuda en la primera interacción y el botón refleja el estado real.
- [Ambientes de audio aumentan la transferencia] → loops cortos (< 150 KB por fase) descargados solo con sonido activo y solo para la fase actual y la siguiente.
- [Avisos de logros distraen] → máximo uno visible a la vez, discretos y descartables.

## Open Questions

- Atajos exactos para Vista Rápida, Debug, tema y sonido (p. ej. `q`, `d`, `t`, `m`): se fijan en el registro de comandos durante la implementación sin afectar specs.
- Textos finales y pistas de cada logro: se redactan en `content/achievements.ts` sin afectar specs.
