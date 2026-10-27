## Context

Ver proposal.md (Why). Al llegar a este change existen el Technique Teardown y la tabla T1–T11 (00), el sitio completo con escenas sobre `WebGPURenderer` y fallback WebGL2 (01-06), Memory Heap (07), `/motion` (08) y los presupuestos de rendimiento, reduced motion y cadena de fallbacks (09). Falta verificarlo de forma automática y publicarlo. El repositorio es público y forma parte del portafolio, así que la propia infraestructura de calidad también se muestra.

## Goals / Non-Goals

**Goals:**
- Traducir cada criterio del brief §13 y del addendum §9 a una prueba ejecutable o, si no es automatizable, a un paso de protocolo manual verificable.
- Hacer que los presupuestos del change 09 bloqueen PRs, no solo se midan.
- Despliegues reproducibles con preview por PR y rollback inmediato.

**Non-Goals:**
- Pruebas de regresión visual pixel a pixel de escenas 3D (demasiado inestables entre GPUs y backends).
- Medición de 60 fps en CI (no hay GPU fiable); se verifica en la matriz de dispositivos reales con el Modo Debug.
- Monitorización de errores de terceros (Sentry, etc.).

## Decisions

### Playwright para E2E
Proyectos `desktop-chromium`, `desktop-firefox`, `desktop-webkit` y `mobile` (Android emulado, táctil) más `mobile-webkit` (iPhone emulado). Permite `javaScriptEnabled: false`, `reducedMotion: 'reduce'`, emulación de dispositivos, `hasTouch` e interceptar rutas. Alternativa: Cypress — descartado por soporte limitado a múltiples navegadores, táctil y contextos sin JS.

- **Forzado de backend gráfico**: tres fixtures con `addInitScript`. *Nueva generación*: solo en Chromium con los flags que habilitan el backend en headless (si el runner no lo soporta, el test se marca `skip` con motivo y queda cubierto por la matriz manual). *WebGL2*: `navigator.gpu` se oculta (`undefined`) para que el renderer use su fallback automático. *Sin WebGL*: además `getContext('webgl'|'webgl2')` devuelve `null`. Cada fixture ejercita la misma detección que usa el change 09.
- **Paridad de contenido**: un test recorre home, un caso, `/heap` y `/motion` con cada backend, extrae el árbol de accesibilidad (`page.accessibility.snapshot()` / `ariaSnapshot`) y compara los tres: deben ser idénticos. Además abre el Modo Debug y verifica que el indicador muestra `webgpu`, `webgl2` o `none`.
- **Hold-to-Execute**: ratón con `mouse.down()` + espera ≥ 800 ms + `mouse.up()`, y soltado temprano (< 800 ms) que no navega; teclado con Enter (abre corto) y `keyboard.down('Space')` sostenido (completo); táctil con `touchscreen` / eventos de puntero `pointerType: 'touch'` sostenidos en el proyecto `mobile`. Se verifica por estado accesible (progressbar, navegación, foco en `h1`), no por tiempos visuales.
- **Memory Heap**: arrastre con `mouse.move` en pasos para comprobar que la vista se desplaza; flechas del teclado mueven el foco entre bloques; la lista equivalente contiene exactamente los proyectos y experimentos de `content/`; "Run GC" cambia el orden según el criterio elegido (tecnología o año) comparado con los datos.
- **Logros**: estado limpio con `localStorage.clear()` en el fixture; se desbloquean `root_access` (terminal), `process_executed` (Hold-to-Execute), `heap_explorer` (`/heap`), `kernel_panic` (404) y `debugger_attached` (Modo Debug); se verifica aviso en región viva, contador en el Call Stack, persistencia tras recargar y que el foco y la navegación no se interrumpen mientras aparece el aviso.
- **Puerta de arranque**: con sesión limpia se elige "Iniciar con sonido" y "Iniciar en silencio" en tests separados; se verifica el estado del control de sonido, la persistencia de la elección en la sesión (recarga → boot corto sin puerta) y que la puerta es operable con teclado. El AudioContext se comprueba vía estado expuesto en el store, no reproduciendo audio.
- **/motion**: Replay de una transición cambia su estado a "reproduciendo" y vuelve a "en reposo"; el selector 0.25x/0.5x/1x modifica la duración medida (la 0.25x tarda ≈ 4× la 1x, con tolerancia); el interruptor de máscara muestra la capa interna.
- **Email simulado**: la Server Action usa un adaptador de envío; con `CONTACT_TRANSPORT=mock` responde éxito o error según el email de test (`fail@test.local` fuerza `500`).
- **Selectores**: roles y nombres accesibles (`getByRole`) en lugar de `data-testid`, para que los tests refuercen la accesibilidad.

### Matriz de dispositivos reales
`docs/DEVICE-MATRIX.md` define la matriz obligatoria: Android de gama media (modelo de referencia fijado al ejecutarla) con Chrome, iPhone con Safari 26, escritorio con Chrome y con Firefox. Para cada combinación hay un protocolo de recorrido (boot y puerta, las 7 fases, Hold-to-Execute, `/heap`, `/motion`, tema claro, reduced motion, rotación en móvil) con resultados esperados y campos para backend activo, tier, fps mediana y observaciones. Lo automatizable se cubre con los proyectos emulados de Playwright; el protocolo manual es requisito de la checklist de lanzamiento. Alternativa: granja de dispositivos en la nube — descartada por coste; puede añadirse después sin cambiar specs.

### axe-core vía @axe-core/playwright
Auditoría con etiquetas WCAG 2.2 A/AA, falla en `serious` y `critical`. Cubre estados interactivos (Vista Rápida, terminal, tema claro, `/heap`, `/motion`, aviso de logro visible) que Lighthouse no alcanza.

### Vitest para unitarias
Cubre la integridad del modelo de contenido (habilidad ↔ proyecto), el validador de placeholders y la lógica pura de logros y de modo de experiencia.

### Lighthouse CI
`@lhci/cli` con preset móvil, `numberOfRuns: 3`, URLs inicio, caso, 404, `/heap` y `/motion`. Aserciones `categories:*`, `largest-contentful-paint`, `cumulative-layout-shift` y `total-blocking-time` (INP no es medible en laboratorio; TBT es el proxy). "Todas las capas activas" significa que la auditoría se ejecuta sobre la build de producción sin flags que desactiven 3D, sonido, logros o liquid glass, y que un paso posterior de Playwright con `PerformanceObserver` mide INP en las interacciones clave sobre la misma build. El tamaño de JS inicial se comprueba con `budget.json` y con `scripts/check-bundle.ts` del change 09. Informes a `temporary-public-storage` enlazados desde el PR.

### GitHub Actions
`ci.yml` con jobs `check` (typecheck, lint, unit) → `e2e` (matriz por proyecto de Playwright) y `lighthouse` en paralelo sobre `next build && next start`. Caché de dependencias y navegadores. Branch protection exige todos los checks.

### Vercel
Integración Git nativa: preview por PR, producción en `main`, Instant Rollback, variables de entorno por entorno (Resend solo en servidor, nunca `NEXT_PUBLIC_*`). `@vercel/analytics` y `@vercel/speed-insights` se cargan tras la hidratación.

### README técnico
Secciones: concepto Portafolio; arquitectura de render (canvas persistente único en el layout raíz, renderer con backend de nueva generación y fallback WebGL2, registro de escenas con renderizado selectivo por rango de scroll, gemelos DOM↔3D, render targets + máscaras para transiciones, tiers alto/medio/bajo en caliente, shaders y compute en TSL, un único reloj de animación) con un diagrama; decisiones clave; presupuestos y cómo se verifican; cómo ejecutar, probar y editar `content/`; enlaces a `docs/TECHNIQUE-TEARDOWN.md`, `docs/MOTION-SPEC.md` y `docs/DEVICE-MATRIX.md`; créditos de referentes como inspiración de técnicas.

### Guardia de placeholders y checklist
Un script `check-placeholders` recorre `content/` y falla si `VERCEL_ENV=production`; en preview solo advierte. `docs/LAUNCH.md` incluye además: matriz de dispositivos completada, informe Lighthouse de producción y la revisión "técnicas reinterpretadas, no copiadas" (por cada fila del Technique Teardown: confirmar que no hay assets, textos, código ni composición de los referentes).

## Risks / Trade-offs

- [El backend de nueva generación no está disponible en runners headless] → test marcado `skip` con motivo explícito y cobertura obligatoria en la matriz manual; WebGL2 y sin WebGL siempre se prueban en CI.
- [Variabilidad de Lighthouse en runners compartidos] → 3 ejecuciones, mediana, y reintento único en Performance.
- [Tests E2E frágiles por animaciones y holds] → flujos funcionales con `reducedMotion: 'reduce'` salvo los que verifican el modo completo; esperar por estados accesibles, no por tiempos; tolerancias amplias en `/motion`.
- [WebGL en CI usa render por software y es lento] → los E2E del modo completo verifican montaje, backend y ausencia de errores; el detalle visual queda fuera.
- [La matriz manual puede saltarse] → es ítem bloqueante de `docs/LAUNCH.md`.
- [El bloqueo por placeholders impide desplegar a producción hasta tener datos reales] → intencionado; previews siguen funcionando.

## Migration Plan

1. Configurar proyecto en Vercel enlazado al repositorio y variables de entorno.
2. Activar workflows y branch protection en `main`.
3. Reemplazar placeholders, ejecutar la matriz de dispositivos, completar la checklist y fusionar a `main` para el primer despliegue.
4. Rollback: Instant Rollback de Vercel al despliegue previo.

## Open Questions

- Dominio definitivo de producción (no afecta a specs ni tareas; se configura en Vercel).
- Modelo concreto de Android de gama media para la matriz (se fija al ejecutarla).
