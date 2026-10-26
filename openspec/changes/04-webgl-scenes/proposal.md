## Why

La narrativa «COMPILE» necesita una capa 3D que, además de impresionar, demuestre dominio de render en GPU: la retícula de circuito del hero, el chip donde corren los proyectos, el pipeline gráfico del laboratorio, el monitor final y las transiciones continuas entre fases (docs/BRIEF.md §2, §8, §9). El ADDENDUM v2 (docs/ADDENDUM-v2.md §2, §3, §4, §5, §7) sustituye el motor 3D original: backend de nueva generación con fallback automático, shaders solo en lenguaje de nodos, compute shaders, gemelos DOM↔3D, render selectivo por rango de scroll, transiciones mezcladas en render targets y tiers de calidad en caliente. Con el contenido estático (02) y la coreografía DOM (03) listos, toca añadir esta capa sin romper presupuestos ni la regla de que el contenido esencial nunca depende de una animación.

Depende de: `00-technique-teardown` (Technique Teardown, tabla T1–T11 y versiones verificadas), `01-foundation-design-system`, `02-static-semantic-sections`, `03-scroll-choreography` (fallbacks DOM de cada transición y reloj único).

## What Changes

- Runtime 3D único y persistente entre rutas, con backend preferente de nueva generación y fallback automático sin diferencias de contenido; backend activo consultable (lo mostrará el Modo Debug del change 06).
- Registro de escenas: cada fase declara su rango de scroll y solo se renderizan las escenas activas en ese frame.
- Gemelos DOM↔3D para tarjetas de proyecto, imágenes y títulos relevantes, que siguen el rectángulo de su elemento DOM sincronizados con el scroll suave.
- Señal global de velocidad de scroll, acotada, que estira partículas y aumenta la aberración cromática sin afectar la legibilidad.
- Calidad adaptativa en tres tiers (alto/medio/bajo) con cambio en caliente, detección por GPU y por caída de FPS medida; presupuestos de draw calls, partículas y texturas comprimidas.
- Escenas por fase: retícula de circuito con fluido de silicio (solo tier alto), chip/die con hotspots de partículas y ficha rápida de proyecto, pipeline GPU y monitor final.
- Texto 3D de campo de distancia multicanal sincronizado con el DOM, que conserva siempre el texto real.
- Transiciones de escena T2, T3, T4, T5, T8, T9 y T11 mezcladas mediante render targets y máscaras, cada una con su fallback del change 03 y con un prototipo aislado antes de integrarse (Add. §8.3).
- Laboratorio GPU con 3-4 experimentos interactivos, incluida una simulación con motor de física y postprocesado cinematográfico.

## Capabilities

### New Capabilities
- `webgl-runtime`: contexto gráfico único y persistente, selección de backend con fallback, registro de escenas con render selectivo, gemelos DOM↔3D, señal de velocidad de scroll, carga tras LCP, liberación de recursos y equivalente DOM.
- `adaptive-quality`: tiers alto/medio/bajo, detección inicial y degradación en caliente por FPS, presupuestos por escena activa y reglas de móvil.
- `webgl-scenes`: escenas 3D de cada fase (hero con fluido, chip con hotspots, pipeline GPU, monitor) y su postprocesado.
- `webgl-text`: títulos y líneas de código renderizados como texto de campo de distancia, sincronizados con su gemelo DOM.
- `scene-transitions`: transiciones 3D entre fases (T2, T3, T4, T5, T8, T9, T11), su mezcla saliente/entrante, sus fallbacks y sus prototipos aislados.
- `lab-experiments`: experimentos interactivos del laboratorio GPU, sus controles accesibles y la vista de código.

### Modified Capabilities
<!-- Ninguna. Las capabilities de sección del change 02 y de movimiento del change 03 se consumen sin cambiar sus requisitos. -->

## Impact

- Nuevas carpetas: `webgl/` (runtime, registro de escenas, gemelos, nodos TSL, compute, postprocesado, atlas MSDF, assets), `webgl/prototypes/` (una ruta aislada por transición), `components/phases/Gpu/experiments/`.
- Layout raíz `app/[locale]/layout.tsx`: monta el canvas persistente tras el LCP.
- Store global: `quality.tier`, `renderer.backend`, `scenes.active`, `scroll.velocity`.
- Change 03: el reloj único (ticker) conduce también el render 3D; las transiciones DOM del 03 se convierten en fallback de tier bajo / reduced motion.
- Boot (change 03): recibe progreso real de carga 3D y el tier (`GPU detected: tier N`).
- Dependencias nuevas (versiones exactas según `docs/STACK-VERSIONS.md`): `three` (entrada `three/webgpu`), `@react-three/fiber`, `@react-three/drei`, `detect-gpu`, `@dimforge/rapier3d-compat`; herramientas de build `msdf-bmfont`/`msdfgen`, `gltf-transform`, `toktx`. Se eliminan del plan `@react-three/postprocessing` y cualquier GLSL crudo.
- Presupuesto de JS inicial (< 180 KB gzip): todo el código 3D queda en chunks posteriores al LCP.
