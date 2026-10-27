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
Cada transición se toma de donde realmente vive tras aplicar 03–07 (change 03: `motion/transitions/index.ts` → `TRANSITIONS`, con variantes `dom`/`reduced` y su `TransitionDef`; change 04: `webgl/transitions/registry.ts` → `CANVAS_TRANSITIONS`, escenas `T*.scene.ts`; T6: `motion/t6.ts` + `webgl/transitions/T6.scene.ts`; T10: `motion/uiTransition.ts`; T11: glitch DOM `motion/transitions/glitch.ts` y SDF en `webgl/scenes/text.ts`; T7: Flip de `LayoutToggle` y modo Heap de 07) y se envuelve en un adaptador con la misma forma: `mount(el)`, `replay()`, `setSpeed(0.25|0.5|1)`, `setInternals(bool)`, `renderPoster()` y `dispose()`. La página solo conoce esa interfaz. Las transiciones GSAP implementan la velocidad con `timeline.timeScale()`; las WebGL multiplican el delta del reloj compartido de la escena. **Alternativa:** reimplementar versiones "de demo" — duplica código y diverge del sitio real.

**Corrección tras aplicar 04–07:** la ruta de prototipos `app/[locale]/(dev)/prototypes/[transition]` devuelve 404 en producción, así que `/motion` NO puede depender de ella. Su arnés (montar las dos secciones que conecta cada transición, el control de progreso y el selector de variante; `components/dev/PrototypeControls.tsx`, `components/dev/T6Prototype.tsx`) se extrae a un módulo reutilizable fuera de `(dev)` que usan tanto los prototipos como `/motion`, sin duplicar código.

**Internos:** hoy solo T6 tiene vista de máscara (`maskView` de la lente). Para el resto, «Ver internos» requiere añadir a cada escena/timeline una salida de depuración controlada por un uniform o flag (sin coste cuando está apagada), según la tabla de docs/MOTION-SPEC.md §3: T2 textura de ruido de umbral y borde del bloom, T3 curva e intensidad del pulso, T4 profundidad de anillos y cámara, T5 matriz Bayer y RT entrante, T8 mapa de tamaño de píxel y malla antes/después, T9 posiciones objetivo y campo de velocidad, T11 desplazamiento RGB/offset; T1, T7 y T10 (DOM) muestran cajas de inicio/fin y la máscara de colapso/revelado. Cualquier render target de depuración se dimensiona con `rtSize()` y se libera en `dispose()`.

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
Se añade el comando `motion` a `COMMAND_IDS` de `lib/commands.ts` y el logro `motion_inspector` con `defineAchievement` en `content/achievements.ts` (registro y `unlock()` de 06; aún no existe), y `/motion` al `app/sitemap.ts` que creó el change 07; el enlace del footer usa la navegación localizada.

## Risks / Trade-offs

- [Los prototipos de 03–07 no exponen la interfaz común] → Tarea explícita de adaptación por transición; un test de contrato falla si falta algún método.
- [Una demo WebGL deja recursos vivos al cambiar] → `dispose()` obligatorio y verificación en Modo Debug de que geometrías/texturas vuelven al valor base.
- [La página supera los presupuestos Lighthouse por los pósters] → Pósters con tamaños responsivos y `loading="lazy"` fuera del primer viewport.
- [Las notas técnicas divergen de MOTION-SPEC.md] → Una sola fuente (`content/motion.ts`) y MOTION-SPEC.md enlaza a ella o se regenera desde ella.
