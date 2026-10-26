## 1. Runtime base

- [ ] 1.1 Instalar `three`, `@react-three/fiber`, `@react-three/drei`, `detect-gpu` con las versiones exactas de `docs/STACK-VERSIONS.md` y verificar que `npm ls` no muestra conflictos de peer dependencies
- [ ] 1.2 Añadir regla de ESLint y script `check:no-glsl` que prohíben `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` y archivos `.glsl/.vert/.frag`; verificar que fallan con un archivo de prueba y pasan en limpio
- [ ] 1.3 Crear el canvas persistente en `app/[locale]/layout.tsx` (import dinámico tras LCP, `aria-hidden`, `pointer-events: none`) con fábrica async de `WebGPURenderer` y `await init()`; verificar en DevTools que hay un solo canvas y que persiste al navegar a un caso y volver
- [ ] 1.4 Publicar `renderer.backend` (`webgpu`/`webgl2`) en el store y no montar el canvas si no hay backend; verificar en Chrome (webgpu), con `navigator.gpu` anulado (webgl2) y con `getContext` anulado (sin canvas, contenido completo)
- [ ] 1.5 Conectar el render a `gsap.ticker` con `frameloop="never"` y `advance()`; verificar con Performance que scroll, timelines y render ocurren en el mismo frame y que no hay frames sin cambios
- [ ] 1.6 Limitar DPR a 2 y verificar con densidad emulada 3 que `renderer.getPixelRatio()` devuelve 2
- [ ] 1.7 Manejar `device.lost`/`webglcontextlost` cayendo al fallback del change 03, con `await renderer.dispose()` (asíncrono en r186) antes de cualquier reintento; verificar forzando la pérdida con `WEBGL_lose_context` que nunca hay dos contextos vivos a la vez
- [ ] 1.8 Crear el helper `rtSize()` (píxeles físicos = CSS × DPR efectivo × escala del tier; viewports/scissors de RT en esas unidades, ya que r186 no los escala por pixel ratio) con test unitario; verificar con DPR 1 y 2 emulados que un RT de transición cubre el viewport completo sin quedar en un cuarto de pantalla

## 2. Registro de escenas, gemelos y señales globales

- [ ] 2.1 Implementar `webgl/registry.ts` con rangos de scroll por fase y render selectivo; verificar con `renderer.info` que en RUNTIME solo se renderiza la escena del chip
- [ ] 2.2 Implementar carga dinámica por escena al acercarse a su rango; verificar en Network que cada chunk se pide solo al llegar a su fase
- [ ] 2.3 Implementar liberación de geometrías, texturas y render targets al salir de rango; verificar que `renderer.info.memory` vuelve al mismo valor tras recorrer el home tres veces
- [ ] 2.4 Implementar gemelos DOM↔3D (`data-twin`, lectura de rects en batch, cámara ortográfica a escala de píxel, `ResizeObserver`); verificar con una tarjeta de prueba que no hay desfase visible al hacer scroll rápido y al redimensionar
- [ ] 2.5 Implementar la señal `uScrollVelocity` con suavizado y límite; verificar que vuelve a 0 al detener el scroll y que el texto no supera el límite de aberración calibrado

## 3. Calidad adaptativa

- [ ] 3.1 Integrar `getGPUTier()` con benchmarks autoalojados y timeout de 1,5 s (por defecto tier medio) y enviar el tier al boot; verificar que el boot muestra `GPU detected: tier N` y que con red bloqueada se aplica tier medio sin retrasar el hero
- [ ] 3.2 Definir presets alto/medio/bajo (partículas 200k/50k/0, fluido, bloom, resolución de RT) y multiplicador móvil 0,3; verificar con un test unitario de la tabla de presets
- [ ] 3.3 Implementar monitor de FPS (< 50 durante 2 s baja un tier, nunca sube) con cambio en caliente; verificar con CPU throttling 6× que el tier baja sin recargar y conservando el scroll
- [ ] 3.4 Añadir contador de draw calls por escena al store; verificar que todas las fases en tier alto quedan por debajo de 100

## 4. Texto MSDF y postprocesado

- [ ] 4.1 Generar atlas MSDF de Unbounded y JetBrains Mono con el subset es/en en el build y un test que compara los glifos de los títulos con el atlas; verificar que el test falla al añadir un carácter fuera del atlas
- [ ] 4.2 Implementar texto MSDF con material TSL como gemelo de su elemento DOM (DOM oculto solo visualmente); verificar con lector de pantalla que el título DOM se anuncia y con zoom 200% que el MSDF es nítido
- [ ] 4.3 Montar `RenderPipeline` de `three/webgpu` (no `PostProcessing`, deprecada desde r183) con `outputNode` = pass → bloom selectivo con MRT → aberración → grano → dithering, bloom solo en tier alto y cambio de tier reasignando `outputNode`; verificar visualmente en tier alto y medio, que no se importa ninguna librería de postprocesado externa y que la consola no muestra avisos de deprecación de three

## 5. Escenas por fase

- [ ] 5.1 Escena SOURCE: retícula de circuito TSL con parallax de puntero y contraste AA del texto encima; verificar con medición de contraste sobre captura
- [ ] 5.2 Fluido de silicio en compute (solo tier alto) con estela de calor; verificar que aparece en tier alto y no se crean buffers en medio/bajo
- [ ] 5.3 Escena RUNTIME: die con un núcleo por proyecto, encendido al hover/foco de tarjeta y hotspots de partículas con ficha rápida accesible por teclado y táctil; verificar con ratón, Tab y emulación táctil
- [ ] 5.4 Escena GPU: pipeline vértices → triángulos → rasterización → píxeles reversible con el scroll; verificar avanzando y retrocediendo
- [ ] 5.5 Escena DISPLAY: monitor con gradiente espectral que enmarca el formulario sin interceptar eventos; verificar que todos los campos son operables con ratón y teclado
- [ ] 5.6 Pipeline de assets (gltf-transform Meshopt/Draco, KTX2 con toktx) y script de presupuesto ≤ 1,5 MB; verificar que el script falla si se supera

## 6. Transiciones de escena (prototipo → integración)

- [ ] 6.1 Crear la ruta de prototipos de desarrollo con canvas aislado y control de progreso 0–1, excluida de producción; verificar que devuelve 404 en build de producción
- [ ] 6.2 Prototipar e integrar T2 Gommage (disolución por ruido, partículas compute hacia tokens, bloom solo en el borde); verificar en el prototipo y en el flujo, avanzando y retrocediendo
- [ ] 6.3 Prototipar e integrar T3 tubos iluminados con pulso de luz; verificar en prototipo y flujo y que el fallback SVG del change 03 se usa en tier bajo
- [ ] 6.4 Prototipar e integrar T4 túnel de instrucciones con un anillo por empleo en orden DOM; verificar el orden contra `content/experience.ts`
- [ ] 6.5 Prototipar e integrar T5 barrido con dithering Bayer ámbar y encendido secuencial de núcleos; verificar en prototipo y flujo
- [ ] 6.6 Prototipar e integrar T8 rasterización (pixelado progresivo → malla triangulada, triangulación en worker); verificar que no hay long tasks > 50 ms en el hilo principal
- [ ] 6.7 Prototipar e integrar T9 convergencia de píxeles al monitor con gradiente espectral; verificar en prototipo y flujo
- [ ] 6.8 Prototipar e integrar T11 glitch SDF < 300 ms en cambios de fase y en la 404, omitido con reduced motion; verificar la duración con Performance
- [ ] 6.9 Verificar el recorrido completo en tier alto, medio, bajo y sin backend 3D: sin cortes ni fotogramas en negro, scroll nunca bloqueado y fallbacks del change 03 activos donde corresponde

## 7. Laboratorio GPU

- [ ] 7.1 Definir 3-4 experimentos en `content/experiments.ts` con imagen estática, descripción y snippet; verificar que la validación de contenido pasa
- [ ] 7.2 Implementar el shader generativo TSL con controles nativos etiquetados y `aria-valuetext`; verificar con teclado y lector de pantalla
- [ ] 7.3 Implementar la simulación física con Rapier en un Web Worker, interacción por puntero, táctil y teclado; verificar que INP se mantiene < 200 ms durante la interacción
- [ ] 7.4 Implementar la visualización de datos y, si aplica, la micro-interacción compleja; verificar interacción con ratón y teclado
- [ ] 7.5 Añadir postprocesado cinematográfico solo en tier alto y el volteo "</> Ver código" con gestión de foco e `inert`; verificar en tier alto/medio y con Tab
- [ ] 7.6 Verificar que sin backend 3D cada experimento muestra su imagen estática y su vista de código funciona
