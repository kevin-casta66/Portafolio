## Context

Los changes 01 y 02 dejan un sitio Next.js (App Router) con tokens de diseño en `styles/tokens.css`, store global (Zustand), contenido tipado en `content/` y todas las secciones renderizadas en servidor como HTML semántico sin animación. El change 00 entrega `docs/MOTION-SPEC.md` (filas T1–T11: disparador, duración, easing, técnica y fallback) y las versiones exactas de las librerías. Este change superpone movimiento sin alterar ese HTML (ver proposal.md — Why). Restricciones clave: JS inicial < 180 KB gzip, CLS < 0,05, INP < 200 ms, contenido esencial visible en el primer render, cero scroll-jacking. Con el addendum, la versión principal de T2–T5, T8, T9 y el glitch SDF de T11 pertenecen al canvas (change 04); aquí se construye su fallback DOM/SVG y el reloj/señales que el canvas consumirá.

## Goals / Non-Goals

**Goals:**
- Un único motor de scroll y un único reloj de frame para todo el sitio, incluido el futuro render 3D.
- Coreografía separada del contenido: los componentes de sección no contienen lógica de animación; la reciben de hooks/timelines en `motion/` y `components/phases/*/use*Choreography.ts`.
- Progressive enhancement estricto: el estado final de cada animación es el estado del HTML SSR.
- Cada transición del catálogo con un contrato estable (`motion/transitions/<Tn>.ts`) que el change 04 pueda sustituir por su versión en canvas y el change 08 pueda reproducir aislada.

**Non-Goals:**
- Escenas WebGPU/WebGL, partículas, texto MSDF y postprocesado (change 04).
- Hold-to-Execute y T10 (change 05); diseño sonoro (change 06); vista Heap (change 07); página /motion (change 08).
- Versión reduced-motion completa con ilustraciones estáticas (change 09); aquí solo se implementa la variante reducida de cada transición indicada en la tabla de movimiento.

## Decisions

### D1. GSAP 3 completo para coreografía; Motion solo para UI de componentes
GSAP gestiona timelines scrubbed (ScrollTrigger), SplitText (tecleo, fragmentación, letras de COMPILE), Flip (Lexer→AST, filtros, Grid/Lista), DrawSVG/MorphSVG (ramas, trazas, cable del paquete, CRT), CustomEase (tokens de easing con nombre) y Observer (detección unificada de rueda/táctil/teclado para cerrar la puerta y para el drag del AST). Motion se reserva para micro-interacciones de estado (tilt con springs, popup de autocompletado, flip de tarjetas del lab). **Alternativa:** solo Motion (`useScroll`) — sin timelines encadenadas, Flip entre contenedores ni plugins SVG.

### D2. Reloj único: `gsap.ticker` como bucle maestro
Se desactiva el `requestAnimationFrame` propio de Lenis (`autoRaf: false`) y se llama `lenis.raf(time)` desde `gsap.ticker.add`; `ScrollTrigger.update` se ejecuta en el evento `scroll` de Lenis; `gsap.ticker.lagSmoothing(0)` evita saltos tras pestañas inactivas. `motion/clock.ts` expone `subscribe(cb, priority)` sobre el mismo ticker: el change 04 registrará ahí el `advance()` del canvas R3F (con `frameloop="never"`), de modo que scroll → animaciones DOM → render 3D se ejecutan en ese orden dentro del mismo frame. **Alternativa:** que R3F lleve su propio bucle — produce desfase de un frame entre gemelos DOM y planos WebGL.

### D3. Lenis solo suaviza; scroll siempre nativo
Lenis interpola `window.scrollY` sin transformar el contenedor (mantiene `position: sticky`, anclas y find-in-page). Sin `snap`. Los `pin` de ScrollTrigger usan `pinSpacing` con `scrub: true` (sin `scrub` numérico > 0,5 s para que la animación no siga avanzando sola al soltar). En táctil se usa el scroll nativo sin suavizado (`syncTouch: false`). Lenis se desactiva con `prefers-reduced-motion`. **Alternativa:** ScrollSmoother — transforma el contenido y complica sticky/anclas y los gemelos DOM↔WebGL.

### D4. Señal de velocidad fuera de React
`motion/velocity.ts` lee `lenis.velocity` en el ticker, la normaliza con una constante por breakpoint, la acota con `clamp(-1, 1)` y la suaviza con amortiguación exponencial (`damp` con constante ≈ token de revelado). Se expone como objeto mutable `{ value }` + `subscribe`, nunca en Zustand, para no re-renderizar. Con reduced motion queda fija en 0. El change 04 la conecta a un uniform global; el change 06 al tono del audio.

### D5. Tokens de movimiento duplicados en CSS y TS desde una única fuente
`motion/tokens.ts` define easings, duraciones, stagger y spring; un script genera las custom properties `--ease-in-expo`, `--ease-scene`, `--dur-micro|ui|reveal` en `styles/tokens.css`. `CustomEase.create` registra los mismos nombres. Una regla de lint (`no-restricted-syntax` sobre literales `cubic-bezier`/duraciones numéricas fuera de `motion/`) hace cumplir el spec. Los valores de cada transición se leen de `motion/transitions/catalog.ts`, que refleja `docs/MOTION-SPEC.md`.

### D6. Carga diferida de la capa de animación
`MotionProvider` se monta con `next/dynamic` (`ssr: false`) y su import se dispara tras el LCP: `requestIdleCallback` (fallback `setTimeout`) después del evento `load`/`PerformanceObserver` de LCP. GSAP, plugins y Lenis viven en ese chunk; plugins de fases bajas (Flip, MorphSVG) se importan cuando su sección se acerca. Hasta entonces el scroll es nativo y el contenido está en su estado final. **Alternativa:** import estático — rompe el presupuesto de JS inicial.

### D7. CSS scroll-driven animations para efectos ligeros
Barras de progreso (Call Stack móvil, lectura) y revelados sutiles usan `animation-timeline: scroll()` / `view()` dentro de `@supports (animation-timeline: view())`; fuera del bloque el estado es el final. No se usan para nada que deba sincronizarse con el canvas (eso va por el reloj único).

### D8. Fase activa y color: un ScrollTrigger por sección
`useScrollPhase` registra un ScrollTrigger por sección (`start: "top center"`, `end: "bottom center"`) que actualiza `phase` en Zustand (cambia raramente) y `phaseProgress`/`globalProgress` en un objeto mutable leído por el canvas. El acento activo se interpola en OKLCH entre tokens de fases adyacentes y se escribe en `--accent-active` y `--accent-tint` (alfa 0,05) con `gsap.quickSetter`, sin re-render.

### D9. Transiciones como contrato intercambiable
Cada transición vive en `motion/transitions/T<n>-<nombre>.ts` y exporta `{ id, dom(ctx), reduced(ctx) }`; el change 04 añadirá `canvas(ctx)`. `motion/transitions/select.ts` elige la variante según `qualityTier`, soporte gráfico, preferencia de movimiento y si la escena está lista; si cambia la variante a mitad de recorrido, la nueva se crea con el `progress` actual del ScrollTrigger (sin saltos). Fallbacks concretos según el addendum: T2 fragmentación DOM (reducida: fundido escalonado), T3 Flip + ramas SVG con DrawSVG, T4 colapso post-order → lista vertical con revelado, T5 barrido con `mask-image` de patrón Bayer en SVG teñido de ámbar y tarjetas encendiéndose, T8 pixelado por rejilla de celdas SVG → malla de puntos y aristas, T9 celdas SVG que convergen al marco del monitor. Cada transición registra en `motion/transitions/registry.ts` un modo `replay(progress)` aislado para la página /motion (change 08).

### D10. Puerta de arranque (T1) no bloqueante
`BootGate` es un componente cliente montado en el layout sobre el contenido (`position: fixed`), no renderizado en SSR. Decisiones para que nunca bloquee:
- No es un diálogo modal: el contenido detrás no se marca `inert`. El skip link, el toggle de Vista Rápida y el enlace al CV del header tienen `z-index` superior y siguen operables; activarlos cierra la puerta en silencio.
- Los logs están en un `role="status"` con `aria-live="off"` durante la animación y un resumen final único; las dos opciones son `<button>`. El foco inicial no se mueve a la puerta (queda en el documento), así que el primer Tab llega al skip link y luego a las opciones.
- Observer cierra la puerta en silencio ante rueda/táctil/teclas de scroll y Escape; Enter/"Saltar ⏎" equivale a silencio.
- No se muestra con `?view=quick`, con hash de sección, en rutas distintas del home ni sin JS.
- La elección se guarda en `sessionStorage` (`compile:sound = on|off`, en try/catch) y en el store (`soundChoice`). "Con sonido" llama a `AudioContext.resume()` dentro del handler del clic (gesto del usuario) mediante un `audioUnlock()` mínimo que el change 06 reutiliza; no se descarga ningún audio aquí.
- El progreso agrega promesas reales (`bootRegistry.track(promise, label)`: fuentes, imágenes críticas, conteo de proyectos; el change 04 añade GPU y escena) con `Promise.race` contra 2 500 ms. Visitas posteriores: versión de 400 ms sin opciones.
- Salida CRT: timeline `scaleY → scaleX` sobre el overlay; el punto final toma el rect del cursor del Hero y entrega el control al timeline de tecleo. Reduced motion: letras sin resorte y fundido.
**Alternativa descartada:** puerta modal obligatoria — obliga al reclutador a decidir antes de ver nada y viola la regla de los 5 segundos.

### D11. Estado inicial seguro: clase `js-motion` en `<html>`
El HTML SSR siempre está en estado final. Un script inline mínimo añade `js-motion` antes del primer pintado; los estados iniciales "ocultos" solo se aplican por JS dentro de `useGSAP` (`gsap.set` / `from`) y nunca en CSS SSR. Textos con SplitText llevan `aria-label` con el texto completo y fragmentos `aria-hidden`.

### D12. Glitch T11 (versión DOM) como filtro temporal
Capas duplicadas `aria-hidden` del título con desplazamiento de canales (`filter` con `feColorMatrix`/`feOffset` precalculados y `transform`), disparado por `onToggle` del ScrollTrigger de fase con throttle por fase. Duración según la fila T11 (< 300 ms). El change 04 lo sustituye por el glitch SDF cuando el canvas está activo.

### D13. Inventario coreográfico documentado
`motion/README.md` lista cada animación con: fase, id T1–T11 si aplica, dato que transforma o feedback que da, propiedades animadas y foco (1-3).

## Risks / Trade-offs

- [Peso de GSAP + plugins + Lenis + Motion] → todo fuera del bundle inicial (D6); plugins por sección; medir con el analizador de bundle en cada tarea.
- [Puerta ignorada por quien hace scroll de inmediato → nunca oye el sonido] → aceptado: el botón de sonido del change 06 permite activarlo después; preferible a bloquear.
- [Divergencia entre fallback DOM y versión canvas] → mismo contrato de inicio/fin por transición (D9) y comparación visual en las tareas del change 04.
- [Flip entre secciones con layouts distintos en móvil] → variantes simplificadas (fundido + translate) vía `gsap.matchMedia`.
- [Scrub largo en pantallas pequeñas] → longitudes de transición en `vh` por breakpoint, equivalentes a 1200-1800 ms de scroll medio.
- [Hidratación y SplitText alteran el DOM SSR] → SplitText tras hidratación y `split.revert()` en limpieza.
- [Bucle de actualización en Zustand por scroll] → solo `phase` y `soundChoice` van a React; progreso, velocidad y color fuera de React.
- [Pin sin scrub numérico se siente brusco] → suavizado lo aporta Lenis, no el scrub.

## Migration Plan

Change aditivo sobre el sitio estático. Cada coreografía y la puerta pueden desactivarse individualmente (flag en `motion/config.ts`) sin afectar al contenido; rollback = desactivar el flag o revertir el change.

## Open Questions

- Duración exacta en `vh` de cada transición de fase; se ajustará con pruebas de usuario sin cambiar specs (los valores viven en `docs/MOTION-SPEC.md`).
- Constante de normalización de la velocidad por breakpoint; se calibra en el change 04 con el efecto visual real.
