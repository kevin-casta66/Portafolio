# STACK-VERSIONS — versiones verificadas de «COMPILE»

> Verificado el **2026-10-26** con `npm view <pkg> version`, documentación oficial y una instalación
> real (`npm install --ignore-scripts`) en una carpeta temporal. Node 24.14.1 / npm 11.11.0.
> Lo consume el change `01-foundation-design-system`: copia la sección **Versiones exactas** tal cual.
> Para revalidar: `npm view <pkg> version` y repetir la prueba de instalación (ver «Cómo revalidar»).
> El change `10-testing-deployment` vuelve a revisarlo antes del despliegue.

## Versiones exactas

Sin `^` ni `~` (usar `npm install --save-exact`). Se instalan como `dependencies` salvo indicación.

| Paquete | Versión | Fuente | Notas |
|---|---|---|---|
| `next` | `16.4.3` | [nextjs.org/docs](https://nextjs.org/docs), `dist-tag latest` | App Router, Server Actions. Requiere Node ≥ 20.9 |
| `react` / `react-dom` | `19.3.1` | npm | **Debe ser < 19.4** (peer de R3F 9.8.2) |
| `typescript` (dev) | `6.0.3` | npm | **No usar 7.x**: `typescript-eslint@8.72.0` exige `<6.1.0` |
| `tailwindcss` / `@tailwindcss/postcss` | `4.3.3` | [tailwindcss.com](https://tailwindcss.com/docs) | v4, tokens como variables CSS |
| `next-intl` | `4.14.9` | [next-intl.dev](https://next-intl.dev) | Peer `next ^16` ok |
| `zustand` | `5.0.16` | npm | |
| `zod` | `4.6.7` | npm | |
| `motion` | `14.6.0` | [motion.dev](https://motion.dev) | Peer React 18/19 |
| `gsap` | `3.15.0` | [gsap.com](https://gsap.com/docs/v3/) | Incluye ScrollTrigger, SplitText, Flip, MorphSVG, DrawSVG, CustomEase, Observer (verificado en el paquete). Licencia estándar gratuita |
| `lenis` | `1.3.27` | [lenis.darkroom.engineering](https://github.com/darkroomengineering/lenis) | Se avanza desde `gsap.ticker` (`autoRaf: false`) |
| `three` | `0.186.1` | [threejs.org](https://threejs.org/docs/) | Exporta `three/webgpu` y `three/tsl` (verificado en `exports`) |
| `@react-three/fiber` | `9.8.2` | [r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/api/canvas) | Peer `react >=19 <19.4`, `three >=0.156` |
| `@react-three/drei` | `10.7.9` | [drei.docs.pmnd.rs](https://drei.docs.pmnd.rs) | Peer `@react-three/fiber ^9`, `three >=0.159` |
| `@dimforge/rapier3d-compat` | `0.21.0` | [rapier.rs](https://rapier.rs/docs/user_guides/javascript/getting_started_js) | Se usa **directo** (Web Worker en el laboratorio) |
| `stats-gl` | `4.2.3` | npm | Modo Debug. Ver `overrides` |
| `tweakpane` | `4.0.5` | [tweakpane.github.io](https://tweakpane.github.io/docs/) | Modo Debug (ajuste de uniforms) |
| `detect-gpu` | `5.0.70` | npm | Tier gráfico inicial |
| `react-hook-form` | `7.91.0` | npm | |
| `resend` | `6.34.1` | npm | Solo servidor |
| `@next/mdx` / `@mdx-js/loader` / `@mdx-js/react` | `16.4.3` / `3.1.1` / `3.1.1` | npm | Casos de estudio |
| `shiki` | `4.5.0` | [shiki.style](https://shiki.style) | Resaltado en build |
| `@playwright/test` (dev) | `1.64.1` | [playwright.dev](https://playwright.dev) | |
| `@lhci/cli` (dev) | `0.15.1` | npm | |
| `eslint` (dev) | `10.13.0` | npm | |
| `typescript-eslint` (dev) | `8.72.0` | npm | Peer `eslint ^10`, `typescript >=4.8.4 <6.1.0` |
| `eslint-config-next` (dev) | `16.4.3` | npm | |
| `@types/react` / `@types/react-dom` (dev) | `19.3.0` / `19.3.0` | npm | |
| `@types/three` (dev) | `0.186.0` | npm | Coincide con `three` |
| `@types/node` (dev) | `26.6.5` | npm | |
| `msdf-bmfont-xml` (dev, opcional) | `2.8.0` | npm | Generación del atlas MSDF (alternativa: `msdfgen`) |

### `overrides` obligatorio

```json
"overrides": { "@react-three/drei": { "stats-gl": "4.2.3" } }
```

Sin él, Drei instala su propio `stats-gl@2.4.2` con un segundo `three@0.170.0` anidado (duplica three y
rompe `instanceof`). Con el override, `npm ls three` muestra una única copia `0.186.1`.

### Paquetes que NO se instalan

- `@react-three/rapier` (`2.2.0`): fija `@dimforge/rapier3d-compat@0.19.2` y envuelve la física en React;
  el laboratorio ejecuta Rapier en un Web Worker usando `@dimforge/rapier3d-compat` directamente.
- `postprocessing` (pmndrs) y `EffectComposer`: sustituidos por el pipeline de `three/webgpu` (Addendum §2).

## Verificaciones puntuales

| # | Comprobación | Resultado | Fuente |
|---|---|---|---|
| 1 | `three/webgpu` y `three/tsl` existen en `three@0.186.1` | ✅ `exports` contiene `./webgpu` y `./tsl` | paquete npm |
| 2 | `WebGPURenderer` cae solo a WebGL2 | ✅ «falls back to a WebGL 2 backend»; opción `forceWebGL` para forzarlo (útil en tests) | [docs WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) |
| 3 | R3F admite fábrica asíncrona de `gl` | ✅ `gl={async (props) => { const r = new THREE.WebGPURenderer(props as any); await r.init(); return r }}`; R3F la espera y hace `dispose` al desmontar | [R3F Canvas v9.8.2](https://r3f.docs.pmnd.rs/api/canvas) |
| 4 | `<ViewTransition>` en Next 16 | ⚠️ **Experimental**: `experimental.viewTransition: true` en `next.config`; el componente se importa de `react`; la doc advierte «no recomendado para producción». Sin soporte del navegador no anima. → T10 conserva el fallback a GSAP Flip | [Next.js viewTransition](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) |
| 5 | WebGPU en Safari 26 / iOS 26 | ✅ disponible (web.dev, nov 2025); Firefox con soporte parcial (Windows 141+, Mac ARM64 Tahoe 145+). Mantener el fallback WebGL2 | [web.dev](https://web.dev/blog/webgpu-supported-major-browsers) |
| 6 | Plugins de GSAP incluidos en `gsap` | ✅ `SplitText`, `MorphSVGPlugin`, `DrawSVGPlugin`, `Flip`, `ScrollTrigger`, `CustomEase`, `Observer` presentes | paquete npm |
| 7 | Árbol de dependencias | ✅ 875 paquetes, `npm ls` sin errores, una sola copia de `three` | prueba de instalación |

## ⚠️ Cambio que afecta a los changes 04, 06 y 09: `PostProcessing` → `RenderPipeline`

En `three@0.186.1` la clase `PostProcessing` sigue exportada pero está **deprecada desde r183**: hereda de
`RenderPipeline` y avisa por consola. El código nuevo debe usar **`RenderPipeline`** (`outputNode`,
`outputColorTransform`; mismo uso con nodos TSL de bloom, aberración, grano y dithering).
El Addendum y los changes dicen «PostProcessing de three/webgpu»; léase como «`RenderPipeline`».
(Fuentes: código de `three@0.186.1`, que incluye `RenderPipeline.js` y `PostProcessing.js`; las notas de r186 mencionan
`DirectRenderPipeline`. Otras fuentes secundarias coinciden. Confirmar en la guía de migración oficial al implementar el change 04.)

Otros cambios de r186 a tener en cuenta: `Renderer.dispose()` ahora es **asíncrono** (esperarlo al desmontar
el canvas) y los viewports de render targets ya no se escalan por el pixel ratio (importa en las transiciones
con render targets).

## Matriz de compatibilidad

| Par | Resultado |
|---|---|
| React ↔ Next | Next 16.4.3 acepta `react ^19` → ✅ con 19.3.1 |
| React ↔ R3F | R3F 9.8.2 exige `react >=19 <19.4` → ✅ con 19.3.1 (**no subir a 19.4 sin revisar R3F**) |
| three ↔ R3F ↔ Drei | R3F `three >=0.156`, Drei `three >=0.159` + `fiber ^9` → ✅ con 0.186.1 |
| three ↔ stats-gl | `stats-gl@4.2.3` peer `three *` → ✅ (con el `overrides` de arriba) |
| Lenis ↔ GSAP | Independientes; se enlazan avanzando Lenis desde `gsap.ticker` y `lenis.on('scroll', ScrollTrigger.update)` → ✅ |
| Tailwind v4 ↔ Next | `@tailwindcss/postcss@4.3.3` → ✅ |
| next-intl ↔ Next | `next ^16` en peers → ✅ |
| TypeScript ↔ typescript-eslint | `<6.1.0` → ✅ con 6.0.3; ❌ con 7.x |
| MDX ↔ Next | `@next/mdx@16.4.3` con `@mdx-js/loader` y `@mdx-js/react` 3.1.1 → ✅ |

## Cómo revalidar

```bash
# 1. versiones vigentes
npm view next version && npm view three version   # etc.
# 2. instalación exacta en una carpeta temporal
mkdir dry && cd dry && npm init -y && npm install --save-exact --ignore-scripts <paquete@versión> ...
# 3. árbol sano y un único three
npm ls            # sin «invalid» ni «ERESOLVE»
npm ls three      # solo 0.186.1
```
