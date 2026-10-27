# motion

Sistema de movimiento de «Portafolio»: tokens, reloj único, scroll suave, señal de velocidad, fase
activa, coreografías por sección y transiciones entre fases. Referencias: `docs/MOTION-SPEC.md`
(tabla T1–T11), `docs/ADDENDUM-v2.md` §4–§5 y §7.

## Reglas (se hacen cumplir en CI)

1. **Un solo bucle de frame.** Todo lo que avanza por frame se suscribe a `clock.ts` (que cuelga de
   un único callback de `gsap.ticker`). ESLint prohíbe `requestAnimationFrame` fuera de `motion/`.
2. **Sin valores literales.** Easings, duraciones y staggers salen de `tokens.ts` (espejo de
   `styles/tokens.css`, con test). ESLint prohíbe `cubic-bezier(...)`, `duration: 0.3`, `ease: "..."`
   y `stagger: n` fuera de `motion/`.
3. **Solo propiedades de composición**: `transform`, `opacity`, `filter` y trazo SVG
   (`stroke-dashoffset`/`dasharray` de DrawSVG) más `mask`/`mask-image` en capas decorativas.
4. **El scroll es nativo.** Lenis solo interpola `scrollY`; sin `snap`; los `scrub` son `true` (el
   progreso ES la posición de scroll).
5. **Las animaciones revelan, no ocultan.** El HTML SSR es siempre el estado final. Los estados
   iniciales «ocultos» los pone JS (`gsap.set`/`from`) y se revierten al limpiar. Convención
   `js-motion` / `boot-pending` en `<html>`: ver `lib/motion-script.ts`.
6. **Máximo 3 focos simultáneos** (columna «Foco» del inventario).
7. **Limpieza obligatoria**: `gsap.context` + `ctx.onCleanup` en cada coreografía, `destroy()` en
   cada transición; `window.__portafolioMotion.counts()` (con `?motionTest=1`) permite comprobarlo.

## Estructura

| Módulo                                             | Qué hace                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tokens.ts`                                        | easings, duraciones, stagger, resorte, `cssEase`                                      |
| `spring.ts`                                        | oscilador amortiguado: `springEase` (GSAP) y `springLinear` (CSS `linear()`)          |
| `clock.ts`                                         | reloj único con prioridades (scroll 0 · señales 10 · animación 50 · render 3D 100)    |
| `gsap.ts`                                          | registro de plugins y eases con nombre (`EASE.*`)                                     |
| `smooth-scroll.ts`                                 | Lenis sobre el reloj único                                                            |
| `velocity.ts`                                      | señal global de velocidad ∈ [-1, 1], fuera de React                                   |
| `phase.ts` / `phase-state.ts` / `phase-runtime.ts` | fase activa, progreso y acento interpolado (OKLCH)                                    |
| `boot.ts`                                          | registro de arranque con progreso real                                                |
| `transitions/`                                     | contrato `{ id, dom, reduced }`, catálogo, selector, controlador y T2–T5, T8, T9, T11 |
| `choreography/`                                    | hero, lexer, parser, bytecode, runtime                                                |
| `traces.ts`, `chip.ts`, `tree-order.ts`            | trazas de luz, chip procedural (T8) y post-order (T4)                                 |
| `runtime.ts`                                       | ensamblaje (chunk diferido tras el LCP)                                               |
| `useHold.ts`                                       | Hold-to-Execute: máquina de estados pura (testeable) + hook de Pointer Events/teclado |
| `pageTransition.ts`, `t6.ts`, `transition-mode.ts` | T6: orquestación home ⇄ caso, superficie/timeline (`playT6`) y modo (full/2d/instant/fade) |
| `uiTransition.ts`                                  | T10: tema (revelado circular), menú y filtros con transiciones de vista o FLIP        |
| `choreography/case.ts`                             | caso de estudio: diagrama por pasos con el scroll y gráficos de métricas              |

## Inventario coreográfico

Cada animación representa una transformación de datos de la narrativa (token → nodo → instrucción →
proceso → vértice → píxel) o un feedback de interacción. «Foco» = nº de focos de atención que ocupa
mientras se reproduce (máx. 3 simultáneos en pantalla).

| ID  | Fase                 | Dato / feedback                                                                    | Propiedades                         | Foco | Reducida                      |
| --- | -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- | ---- | ----------------------------- |
| T1  | BOOT                 | El arranque real (logs `[ OK ]`, progreso) → la marca Portafolio → el cursor del hero | transform, opacity                  | 2    | fundido, sin resorte ni CRT   |
| —   | SOURCE               | Tecleo de `const dev = new Developer("…")` con autocompletado (token tecleado)     | opacity, transform (cursor)         | 2    | sin tecleo                    |
| T2  | SOURCE→LEXER         | Tokens de la línea de código → carriles del analizador léxico                      | transform, opacity                  | 2    | tokens con fundido escalonado |
| —   | LEXER                | Contadores `number` (dato → valor final)                                           | texto (aria-hidden mientras cuenta) | 1    | valor final directo           |
| T3  | LEXER→PARSER         | Tokens → nodos del árbol; ramas dibujadas                                          | transform, opacity, trazo SVG       | 3    | árbol con fundido             |
| —   | PARSER               | Ramas con DrawSVG y nodos con resorte                                              | trazo SVG, transform, opacity       | 2    | sin animación                 |
| —   | PARSER               | Arrastre del árbol con inercia                                                     | scroll del contenedor (puntero)     | 1    | sin arrastre                  |
| —   | PARSER               | Selección → trazas de luz hacia los proyectos que usan la tecnología               | trazo SVG, filter                   | 2    | sin trazas                    |
| T4  | PARSER→BYTECODE      | Nodos → columna lineal (post-order) → funciones                                    | transform, opacity                  | 2    | lista con fundido             |
| —   | BYTECODE             | Program counter y registros por función                                            | transform, opacity                  | 2    | sin program counter           |
| T5  | BYTECODE→RUNTIME     | Instrucciones → procesos; núcleos que se encienden                                 | transform, opacity, filter, mask    | 3    | fundido cruzado de tarjetas   |
| T7  | RUNTIME              | Cambio de layout Grid/Lista (reacomodo FLIP)                                       | transform                           | 1    | fundido                       |
| —   | RUNTIME              | Filtro `ps aux \| grep` → reordenado FLIP, fundido de salida                       | transform, opacity                  | 1    | sin animación                 |
| —   | RUNTIME              | Hover de tarjeta: inclinación 3D y reflejo especular                               | transform, opacity                  | 1    | sin inclinación               |
| —   | RUNTIME              | Video: play/pause según viewport                                                   | — (media)                           | 1    | póster                        |
| T8  | RUNTIME→GPU          | Chip → píxeles → malla de vértices y aristas                                       | opacity (grupos SVG)                | 2    | fundido de tarjetas           |
| —   | GPU                  | Giro 180° de la tarjeta para ver el código                                         | transform                           | 1    | fundido entre caras           |
| T9  | GPU→DISPLAY          | Píxeles → marco del monitor con gradiente espectral                                | transform, opacity, trazo SVG       | 3    | monitor con fundido           |
| —   | DISPLAY              | Paquete de red ligado al resultado real (200 / 500)                                | transform, opacity                  | 1    | sin paquete                   |
| T11 | Cambio de fase / 404 | Glitch del título de fase (< 300 ms)                                               | transform, opacity (capa externa)   | 1    | sin glitch                    |
| —   | 404                  | Volcado de memoria hexadecimal que se escribe                                      | texto decorativo (aria-hidden)      | 1    | volcado completo              |
| T6  | RUNTIME→caso (y vuelta) | Tarjeta → proceso ejecutado → cabecera del caso («Attaching debugger…»)         | opacity, transform (superficie 2D), canvas (lente) | 3    | fundido ≤ 200 ms, sin expansión |
| —   | RUNTIME              | Anillo de progreso del hold (Hold-to-Execute)                                      | trazo SVG, opacity                  | 1    | sin anillo, apertura con fundido |
| T10 | Global               | Cambio de tema (círculo desde el botón), filtros y menú con transiciones de vista  | clip-path de la vista nueva, transform, opacity | 1    | cambio directo                |
| —   | CASO                 | Diagrama de arquitectura construido por pasos con el scroll; barras de métricas    | trazo SVG, transform, opacity       | 2    | diagrama completo, barras finales |
| —   | Global               | Acento activo y tinte de fondo (4–6 %) interpolados con el scroll                  | custom property `--accent-active`   | 1    | igual (cambio de color)       |
| —   | Global               | Barra de progreso de lectura y revelado de encabezados (CSS nativo)                | transform, opacity                  | 1    | sin animación                 |

## Cómo se prueba

- Unitarios (Vitest): tokens ↔ CSS, resorte, reloj, velocidad, fase, controlador de transiciones,
  catálogo ↔ `docs/MOTION-SPEC.md`, post-order, chip, arranque, inventario (este archivo).
- En navegador: `?motionTest=1` expone `window.__portafolioMotion` (contadores, fase, variantes,
  `scrollTo(id, p)`, `replay`). No cambia el comportamiento.
- Desactivar una pieza: `motion/config.ts` (flags). Con todo desactivado el sitio es el HTML estático.

## Vitrina `/motion` (change 08)

La página pública `/[locale]/motion` enseña los tokens (`tokens.ts`, curvas dibujadas desde sus valores) y el
catálogo T1–T11 (`content/motion.ts`). **Cada demo ejecuta el código real de producción** en un escenario
aislado, no una versión «de demo»:

- `app/stage/[locale]/[transition]` es un layout raíz mínimo (tema, i18n, reloj de movimiento y canvas; sin cabecera,
  puerta de arranque, terminal ni cursor) que monta SOLO las secciones que conecta la transición
  (`components/showcase/stage/StageSections.tsx`, compartido con la ruta de prototipos de desarrollo).
- `components/showcase/stage/players.ts` tiene un reproductor por transición con la misma forma (`Player`: `play`,
  `showEnd`, `seek`, `setInternals`…). Reutiliza `replay()` del registro de transiciones, `playT6`, el glitch del título,
  el Flip de `LayoutToggle`, el revelado de tema y la puerta de arranque real (`BootGate demo`).
- `StageClient` publica `window.__showcaseStage` (`StageApi`, `motion/showcase.ts`); la tarjeta de `/motion` monta el
  escenario en un iframe del mismo origen al primer Replay (`components/showcase/stage-demo.ts`, `TransitionDemo`) y lo retira
  al cambiar de demo: así solo hay una demo viva y se liberan de golpe contexto, escenas y render targets.
- Velocidad (0.25×/0.5×/1×): `gsap.globalTimeline.timeScale()` + `Element.prototype.animate` parcheado en el escenario.
- «Ver internos»: las demos WebGL leen `state.internals` (`webgl/transitions/state.ts`); las DOM dibujan sus cajas
  (`styles/showcase.css`). Apagado no cambia ni un píxel del sitio real.
- Pósters estáticos: `pnpm motion:posters` (necesita `pnpm build && pnpm start` y el Chrome instalado) escribe
  `public/motion/posters/T1…T11.webp` a partir de `/stage/es/<Tn>?poster=1`.
