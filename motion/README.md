# motion

Sistema de movimiento de «COMPILE»: tokens, reloj único, scroll suave, señal de velocidad, fase
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
   cada transición; `window.__compileMotion.counts()` (con `?motionTest=1`) permite comprobarlo.

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

## Inventario coreográfico

Cada animación representa una transformación de datos de la narrativa (token → nodo → instrucción →
proceso → vértice → píxel) o un feedback de interacción. «Foco» = nº de focos de atención que ocupa
mientras se reproduce (máx. 3 simultáneos en pantalla).

| ID  | Fase                 | Dato / feedback                                                                    | Propiedades                         | Foco | Reducida                      |
| --- | -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- | ---- | ----------------------------- |
| T1  | BOOT                 | El arranque real (logs `[ OK ]`, progreso) → la marca COMPILE → el cursor del hero | transform, opacity                  | 2    | fundido, sin resorte ni CRT   |
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
| —   | Global               | Acento activo y tinte de fondo (4–6 %) interpolados con el scroll                  | custom property `--accent-active`   | 1    | igual (cambio de color)       |
| —   | Global               | Barra de progreso de lectura y revelado de encabezados (CSS nativo)                | transform, opacity                  | 1    | sin animación                 |

## Cómo se prueba

- Unitarios (Vitest): tokens ↔ CSS, resorte, reloj, velocidad, fase, controlador de transiciones,
  catálogo ↔ `docs/MOTION-SPEC.md`, post-order, chip, arranque, inventario (este archivo).
- En navegador: `?motionTest=1` expone `window.__compileMotion` (contadores, fase, variantes,
  `scrollTo(id, p)`, `replay`). No cambia el comportamiento.
- Desactivar una pieza: `motion/config.ts` (flags). Con todo desactivado el sitio es el HTML estático.
