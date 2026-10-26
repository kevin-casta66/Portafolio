## Context

Ver proposal.md (Why). Al llegar a este change existen: Technique Teardown y tabla T1–T11 (00), tokens y temas (01), secciones SSR estáticas (02), coreografía GSAP + Lenis con un único rAF en `motion/` (03), un canvas persistente con `WebGPURenderer` (fallback automático a WebGL2), registro de escenas con renderizado selectivo, gemelos DOM↔WebGL, shaders TSL, compute en tier alto y tiers de calidad en caliente (04), casos MDX con Hold-to-Execute y `<ViewTransition>` para UI (05), sistemas globales con logros, sonido y liquid glass en Zustand (06), Memory Heap en `/heap` (07) y la vitrina `/motion` (08). Este change no añade experiencia nueva: endurece lo existente para cumplir §9–§11 del brief y §7/§9 del addendum. La integración en CI corresponde a `10-testing-deployment`; aquí se dejan los scripts locales y los umbrales.

## Goals / Non-Goals

**Goals:**
- Un único "modo de experiencia" derivado (`full` | `reduced` | `fallback2d`) más el backend gráfico activo (`webgpu` | `webgl2` | `none`), que todas las fases y sistemas consultan, en lugar de comprobaciones dispersas.
- Mediciones reproducibles localmente para cada presupuesto (bundle, Lighthouse, INP, fps, draw calls, partículas, a11y).
- Metadatos y datos estructurados generados desde `content/`, sin duplicar información.

**Non-Goals:**
- Pipelines de CI, despliegue, matriz de dispositivos reales y tests E2E de regresión (change 10).
- Rediseñar fases, sistemas, `/heap` o `/motion`; solo se añaden sus variantes reducida y 2D.
- Soporte para navegadores sin JavaScript más allá del contenido SSR ya garantizado en 02.

## Decisions

1. **Modo de experiencia centralizado en el store.** `lib/experience.ts` calcula el modo a partir de: preferencia manual (sessionStorage) > `prefers-reduced-motion` > capacidad gráfica/tier > degradación por fps. Se expone en Zustand y como atributo `data-experience` en `<html>` para que CSS pueda reaccionar antes de hidratar. El backend real lo reporta el renderer tras `init()` y se guarda junto al modo (lo muestra el Modo Debug de 06). *Alternativa:* cada componente lee `matchMedia` por su cuenta → inconsistente y difícil de probar.

2. **Script inline mínimo en `<head>` para evitar parpadeo.** Lee sessionStorage y `matchMedia` y fija `data-experience` antes del primer pintado (igual que el tema en 01). *Alternativa:* resolver tras hidratar → CLS y flash de animaciones.

3. **Rama reducida en `motion/`, no en los componentes.** Los timelines reutilizables y el catálogo T1–T11 reciben el modo; en `reduced` se sustituyen por fábricas de fundido de opacidad (≤ 300 ms) según la columna "fallback reduced motion" de la tabla de 00. ScrollTrigger sigue activo solo para la fase activa y el Call Stack. Hold-to-Execute pasa a clic con fundido; `/heap` desactiva inercia y lente (lista + desplazamiento discreto); los avisos de logros aparecen sin desplazamiento; `/motion` muestra fotogramas clave estáticos y el Replay reproduce la versión reducida salvo que el usuario lo pida explícitamente. *Alternativa:* desactivar GSAP por completo → se perdería el tracking de fase.

4. **Cadena de fallbacks gráficos en tres niveles.** (a) `WebGPURenderer` con backend WebGPU; (b) mismo renderer con backend WebGL2 automático: idéntico grafo de escenas TSL, sin compute (las partículas de compute se sustituyen por sus variantes de tier medio/bajo), mismo contenido; (c) sin WebGL2 o GPU por debajo del mínimo → `fallback2d`. Antes del import dinámico se comprueba `navigator.gpu` y un contexto WebGL2 de prueba; si ninguno sirve, el chunk 3D nunca se descarga. El change 04 ya lo implementa (`webgl/core/backend.ts`: `hasAnyBackend`, `forcedBackend` con el flag de depuración `webgl2`/`none`); aquí se reutiliza y se integra con `lib/experience.ts`, sin duplicarlo. *Alternativa:* WebGL1 como cuarto nivel → coste de mantenimiento sin cobertura relevante en 2026.

5. **Ilustraciones estáticas y fallback 2D compartidos.** Cada fase (y `/heap`) tiene un componente `PhaseIllustration` (SVG inline con `currentColor` y tokens) que sirve tanto para `reduced` como para `fallback2d`; en `fallback2d` se añaden animaciones CSS ligeras (stroke-dashoffset, opacity, scroll-driven en `@supports`) que respetan la narrativa. *Alternativa:* imágenes raster por fase → más peso y sin theming.

6. **Pérdida de contexto y degradación.** Listeners de pérdida/restauración de dispositivo o contexto en el canvas raíz cambian el modo a `fallback2d` temporalmente y restauran al recuperarse. Se parte de lo que ya hace el change 04 (`webgl/WebglRoot.tsx` + `webgl/dispose.ts`): ante una pérdida recrea el contexto una vez, esperando `await renderer.dispose()` (asíncrono en three r186) para que nunca convivan dos contextos, y a la segunda pérdida pasa al DOM del change 03. Este change añade la transición explícita a `fallback2d` y la restauración posterior respetando esa misma espera. El monitor de fps de 04 baja tiers en caliente; si en tier bajo sigue < 30 fps durante 3 s, fija `fallback2d` en sesión.

7. **INP primero.** Ningún handler de interacción ejecuta trabajo > 50 ms en el hilo principal: los cálculos pesados (layout del Heap, reorganización "Run GC", filtrado con muchos elementos, preparación de buffers de partículas) se mueven a compute en GPU o a un Web Worker; las animaciones disparadas por interacción arrancan en el frame siguiente (`requestAnimationFrame`) tras pintar el feedback inmediato. *Alternativa:* `scheduler.yield` aislado → insuficiente para cálculos de layout del Heap.

8. **Cero scroll-jacking.** Lenis solo suaviza (sin `infinite`, sin bloquear wheel/touch); en móvil se usa scroll nativo. Los pins de ScrollTrigger tienen longitud proporcional al contenido y nunca impiden retroceder ni saltar con el Call Stack o el teclado (PageDown, Inicio/Fin).

9. **Presupuestos verificados por script.** `scripts/check-bundle.ts` lee el manifiesto de build de Next y suma el gzip de los chunks de primer render por ruta (`/[locale]`, caso, `/heap`, `/motion`); falla si ≥ 180 KB o si incluye `three`, `gsap` (salvo el núcleo mínimo si se justifica), `lenis` o `webgl/`. GSAP, Lenis, Three.js y las escenas se importan tras el LCP (`PerformanceObserver` de LCP + idle). El Modo Debug expone draw calls y número de partículas por escena activa; un script Playwright local recorre las fases en cada tier y falla si alguna escena supera 100 draw calls o el presupuesto de partículas (200k/50k/0). Línea base heredada: al cerrar el change 04 el JS inicial de `/es` medía 249,7 KB gzip (suma con gzip nivel 9 de los 12 scripts `/_next/static/**/*.js` referenciados por el HTML del build de producción), por encima del umbral ya antes del 04 (246,2 KB); el script usa ese mismo criterio para que las cifras sean comparables, y la reducción hasta < 180 KB es trabajo de este change (three/R3F y las escenas ya van en chunks diferidos tras el LCP desde el 04). *Alternativa:* solo bundle analyzer visual → no verificable.

10. **Medios.** `next/image` con AVIF/WebP y `sizes` explícitos; vídeos con `<video muted playsinline preload="none" poster>` controlados por IntersectionObserver; texturas 3D en KTX2 (pendiente heredado del change 04, tarea 5.6: requiere el binario `toktx`; el pipeline Meshopt y el presupuesto de 1,5 MB ya existen); atlas MSDF comprimidos. Fuentes con `next/font/local` (subset, `display: swap`, `adjustFontFallback`) para CLS ≈ 0.

11. **Accesibilidad.** Foco visible con `:focus-visible` y token `--focus-caret`. Diálogos (terminal, atajos) con `<dialog>` nativo. El AST implementa el patrón ARIA `tree` (roving tabindex); `/heap` expone una cuadrícula navegable con flechas y una lista equivalente; Hold-to-Execute expone progreso con `role="progressbar"` y anuncio al completarse. El canvas raíz lleva `aria-hidden="true"`; todo texto MSDF es un espejo visual de un nodo DOM real. Los paneles de liquid glass usan un token de opacidad de fondo mínima por tema validado por script de contraste. Auditoría con axe en un script Playwright local sobre página × tema × locale × modo.

12. **SEO con APIs del App Router.** `generateMetadata` por página (home, casos, `/heap`, `/motion`) leyendo `content/` y mensajes de next-intl; `alternates.languages` para hreflang; `app/sitemap.ts` y `app/robots.ts` generados desde los slugs y rutas públicas; `opengraph-image.tsx` con `ImageResponse` usando tokens de la fase; JSON-LD `Person`/`CreativeWork` en un componente servidor.

## Risks / Trade-offs

- [Lighthouse móvil penaliza el hilo principal por GSAP/Lenis/Three] → cargarlos tras LCP; en móvil scroll nativo sin Lenis.
- [El backend WebGL2 rinde peor que WebGPU con el mismo grafo TSL] → arrancar en tier medio si el backend es WebGL2 y dejar que el monitor de fps ajuste.
- [Diferencias visuales sutiles entre backends] → el criterio es igualdad de contenido, no de píxeles; se documentan diferencias aceptadas en `docs/perf/`.
- [Liquid glass con fondos dinámicos puede romper el contraste] → medir el peor caso sobre la escena más clara de cada fase y fijar la opacidad mínima con margen.
- [Worker para el Heap añade complejidad] → solo si la medición de INP lo exige; empezar con medición.
- [La matriz de auditoría a11y es grande] → limitar a 5 páginas (home, caso, 404, `/heap`, `/motion`) × 2 temas × 2 locales × 3 modos y paralelizar.
- [Medición de fps dependiente del hardware] → documentar la máquina de referencia y usar trazas de rendimiento sin throttling.

## Migration Plan

Cambios aditivos. Orden: modo de experiencia y backend → reduced → cadena de fallbacks → presupuestos (INP, bundle, draw calls) → a11y → SEO. Rollback: el modo `full` sigue siendo el comportamiento de 08 si se revierte `lib/experience.ts`.

## Open Questions

- Máquina de referencia concreta para "escritorio de gama media" (se puede fijar al medir sin cambiar el plan).
