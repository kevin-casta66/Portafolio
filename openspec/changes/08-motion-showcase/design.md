## Context

Al llegar a este change existen: la fuente única de tokens de movimiento (`motion/tokens.ts`, change 03), los prototipos aislados de cada transición (T1/T7/T11 DOM en 03; T2–T5, T8, T9 y T11 SDF en 04; T6 y T10 en 05; T7 Heap en 07), el canvas persistente con registro de escenas y tiers de calidad (04), la terminal y el registro de logros (06), y la tabla de especificación T1–T11 de docs/MOTION-SPEC.md (00). Ver proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Una vitrina que reutiliza exactamente el código de producción de cada transición: si la demo funciona, la transición del sitio funciona.
- Coste cero de 3D hasta que el usuario lo pide.

**Non-Goals:**
- Un editor de easings o de transiciones (solo se visualizan, no se editan ni exportan).
- Ajuste de uniforms en vivo (eso es Tweakpane en el Modo Debug, change 06).

## Decisions

### D1. Interfaz común `TransitionDemo` en los prototipos
Cada transición del registro `motion/transitions/registry.ts` (change 03: variantes `dom`/`reduced` y modo `replay(progress)`; change 04: variante `canvas` y prototipos aislados en `app/[locale]/(dev)/prototypes/`) se envuelve en un adaptador con la misma forma: `mount(el)`, `replay()`, `setSpeed(0.25|0.5|1)`, `setInternals(bool)`, `renderPoster()` y `dispose()`. La página solo conoce esa interfaz. Las transiciones GSAP implementan la velocidad con `timeline.timeScale()`; las WebGL multiplican el delta del reloj compartido de la escena. **Alternativa:** reimplementar versiones "de demo" — duplica código y diverge del sitio real.

### D2. Escenario WebGL único gestionado por el canvas persistente
Las demos 3D se registran como escenas en el registro del change 04, cada una anclada a la región DOM de su tarjeta mediante un gemelo DOM↔3D (`data-twin`, change 04) y renderizada solo mientras está activa. Un `showcaseStore` (Zustand) guarda `activeDemoId`; activar una demo hace `dispose()`/pausa de la anterior antes de montar la nueva. **Alternativa:** un canvas por tarjeta — múltiples contextos, viola la arquitectura y los presupuestos.

### D3. Curvas de easing en SVG generadas desde los tokens
`EasingCurve` lee `motion/tokens.ts` y dibuja la `cubic-bezier` como `<path>` SVG (y el spring muestreado como polilínea). En SSR se emite la curva estática; en cliente se añade el punto que recorre la curva y la previsualización. **Alternativa:** canvas 2D — no tiene versión sin JS ni es accesible.

### D4. Catálogo tipado en `content/motion.ts`
Un array de 11 entradas (`id`, `trigger`, `durationToken`, `easingToken`, `technique`, `reducedMotionFallback`, `note` es/en, `demo` = import dinámico del adaptador, `poster`). Se deriva de docs/MOTION-SPEC.md; un test comprueba que hay exactamente T1–T11 y que cada token referenciado existe. **Alternativa:** MDX — más libre, pero sin validación de tokens ni de completitud.

### D5. Fotogramas estáticos pregenerados
Cada demo tiene un póster (AVIF/WebP) generado una vez con un script de Playwright que captura el estado final de cada prototipo. Se usa en SSR, sin JS, con reduced motion y para demos inactivas. **Alternativa:** `renderPoster()` en cliente — requeriría cargar el motor 3D para cada tarjeta.

### D6. Carga diferida e intersección
El adaptador de cada demo se importa con `import()` al primer Replay. Un `IntersectionObserver` pausa la demo activa cuando sale del viewport. El motor 3D solo entra con la primera demo WebGL.

### D7. Reduced motion y fallback
`useExperienceMode()` (change 09 lo consolida; aquí se consume la preferencia ya existente de 03/04) decide: con reduced motion no hay hover-preview ni autoplay; sin WebGL, el adaptador se resuelve a la variante 2D que los prototipos ya incluyen y la tarjeta muestra la etiqueta "Fallback 2D".

### D8. Integración con sistemas globales
Se añade el comando `motion` al registro de comandos compartido de la terminal y el logro `motion_inspector` al registro de logros, ambos definidos en el change 06; el enlace del footer usa la navegación localizada.

## Risks / Trade-offs

- [Los prototipos de 03–07 no exponen la interfaz común] → Tarea explícita de adaptación por transición; un test de contrato falla si falta algún método.
- [Una demo WebGL deja recursos vivos al cambiar] → `dispose()` obligatorio y verificación en Modo Debug de que geometrías/texturas vuelven al valor base.
- [La página supera los presupuestos Lighthouse por los pósters] → Pósters con tamaños responsivos y `loading="lazy"` fuera del primer viewport.
- [Las notas técnicas divergen de MOTION-SPEC.md] → Una sola fuente (`content/motion.ts`) y MOTION-SPEC.md enlaza a ella o se regenera desde ella.
