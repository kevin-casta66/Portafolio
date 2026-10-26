# webgl

Capa 3D de «COMPILE» (change 04): un único canvas persistente con `WebGPURenderer` (`three/webgpu`,
fallback automático a WebGL2), shaders **solo en TSL** y render selectivo por rango de scroll. Todo
se carga **después del LCP** (`components/systems/WebglLoader.tsx`) en chunks diferidos; sin ningún
backend no se monta nada y el sitio es el HTML completo con las transiciones DOM del change 03.

## Reglas

1. **Un canvas, un renderer, un reloj.** `WebglRoot.tsx` monta un `<Canvas>` de R3F con
   `frameloop="never"`; el motor se suscribe al reloj único (`motion/shared.ts`, prioridad 100) y
   llama a `advance()` solo si algo cambió (scroll, puntero, tamaño, gemelos o animación).
2. **Sin GLSL.** Nada de `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` ni `.glsl`: lo
   impiden ESLint y `pnpm check:no-glsl` (incluido en `pnpm lint`).
3. **Colores solo de tokens.** `core/color.ts` lee los tokens CSS y los pasa a uniforms
   (`nodes/globals.ts`); el acento entre fases se mezcla en OKLab como el CSS.
4. **APIs de three r186.** Postprocesado con `RenderPipeline` (no `PostProcessing`, deprecada),
   `await renderer.dispose()` (asíncrono, ver `dispose.ts`) y render targets en píxeles físicos
   (`rt-size.ts`: los viewports de RT ya no se escalan por el pixel ratio).
5. **Contenido siempre en el DOM.** Cada escena es una capa visual sobre contenido DOM autosuficiente;
   el canvas es `aria-hidden` y no recibe eventos (los escenarios DOM recogen puntero y teclado).

## Estructura

| Módulo | Qué hace |
|---|---|
| `WebglRoot.tsx` | Canvas R3F, fábrica async de `gl`, pérdida de contexto (un reintento), gancho de pruebas `?motionTest=1` |
| `core/engine.ts` | Registro de escenas, carga/liberación por rango, composición con `RenderPipeline`, monitor de FPS |
| `core/twins.ts` | Gemelos DOM↔3D (`data-twin`), lectura de rects en lote |
| `core/layout.ts`, `core/frame.ts`, `core/color.ts`, `core/camera.ts` | Rangos de sección, estado por frame, tokens, cámara a escala de píxel |
| `quality.ts`, `detect.ts` | Tiers alto/medio/bajo, presets, regla de móvil, detect-gpu con benchmarks autoalojados |
| `postfx.ts` | Composición de capas → aberración → bloom selectivo (MRT `glow`, tier alto) → grano → Bayer |
| `scenes/` | SOURCE (retícula + fluido compute), RUNTIME (chip), GPU (pipeline), DISPLAY (monitor), lab, texto MSDF |
| `transitions/` | Variantes canvas de T2, T3, T4, T5, T8, T9 (T11 vive en `scenes/text.ts`) y la escena de T6 (`T6.scene.ts`: gemelo de la tarjeta con lente y aberración; sin render targets ni texturas; solo existe mientras `t6.armed`, ver `motion/shared.ts`) |
| `text/` | Atlas MSDF (`pnpm webgl:msdf`), maquetación por palabras DOM, glitch de títulos |
| `lab/`, `workers/` | Experimentos del laboratorio; física Rapier y triangulación de T8 en Web Workers |

## Scripts

- `pnpm webgl:msdf` — regenera los atlas MSDF (`public/webgl/msdf`).
- `pnpm webgl:sync` — copia los benchmarks de detect-gpu a `public/gpu-benchmarks`.
- `pnpm webgl:assets` — pipeline de modelos (Meshopt) y texturas (KTX2 con `toktx`, si está instalado).
- `pnpm webgl:budget` — falla si los assets 3D superan 1,5 MB.
- `pnpm check:no-glsl` — falla si aparece GLSL o un material de shader clásico.

## Prototipos

`/[locale]/prototypes/T2…T9|T11` y `T6` (tarjeta + cabecera del caso; control de progreso y «Ver máscara de la lente») (solo en desarrollo; en producción 404) monta las dos secciones que
conecta cada transición y un control de progreso 0–1, con selector de variante canvas/DOM/reducida.
