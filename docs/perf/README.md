# Rendimiento, accesibilidad y fallbacks (change 09)

Informes y scripts locales de `09-performance-a11y-fallbacks`. Todo se mide contra el build de producción
(`SITE_URL=http://localhost:3150 CONTACT_TRANSPORT=mock pnpm build` + `next start -p 3150`). Máquina de referencia:
portátil Intel Core Ultra 7 255U (GPU integrada Intel, D3D11), 47 GB, Windows 11, Chrome estable 156 (Playwright
`channel: "chrome"`). Los números son de esa máquina; los móviles reales los valida la persona dueña del proyecto.

## Scripts (todos aceptan `BASE=http://localhost:3150`)

| Script | Qué comprueba | Salida |
| --- | --- | --- |
| `pnpm perf:bundle` (`scripts/check-bundle.ts`) | JS inicial por ruta < 180 KB gzip y sin three/GSAP/Lenis/Tone/Rapier | `docs/perf/bundle.json` |
| `pnpm perf:lighthouse` | Lighthouse móvil local (`lighthouse` 13.6.0) en `/es`, `/en`, caso, `/heap`, `/motion` | `docs/perf/lighthouse/` |
| `pnpm perf:inp` | INP por interacción en móvil emulado (CPU ×4, táctil) | `docs/perf/inp.json` |
| `pnpm perf:fps` | fps en recorrido completo con cada backend | `docs/perf/fps.json` |
| `pnpm perf:scenes` | draw calls y partículas por escena activa y tier | `docs/perf/scenes.json` |
| `pnpm perf:overflow` | `scrollWidth <= innerWidth` y cabecera <= 2 filas a 375 px | consola |
| `pnpm perf:experience` | `data-experience` antes del primer pintado, control manual, carga tras LCP, scroll nativo, DPR 3 | consola |
| `pnpm perf:media` | cero terceros, fuentes precargadas, CLS, AVIF, vídeos | consola |
| `node scripts/perf/matrix.mjs` | matriz modo x tema x idioma x página (7.1) | `docs/perf/matrix.json` |
| `pnpm a11y:axe` / `pnpm a11y:keyboard` | axe (60 combinaciones) y teclado/estructura | consola |
| `pnpm seo:verify` | metadatos, hreflang, OG 1200x630, JSON-LD, sitemap, robots, 404 | consola |
| `pnpm webgl:msdf-opt` | recompresión sin pérdida de los atlas MSDF | consola |

## Resultados

### JS inicial (gzip nivel 9) — criterio de design.md D9

Línea base antes del change: `/es` 256,99 KB (suma literal de los 12 scripts del HTML, incluido el polyfill `noModule`).

| Ruta | Antes | Ahora (ejecutado por navegadores modernos) | Ahora (literal, con `noModule`) |
| --- | --- | --- | --- |
| `/es` y `/en` | 256,99 | **178,97** | 217,56 |
| caso | 200,6 | **161,90** | 200,49 |
| `/heap` | 495,64 | **165,46** | 204,06 |
| `/motion` | 208,88 | **170,47** | 209,06 |

Medidas: formulario de contacto sin zod ni react-hook-form (-46,7 KB; las reglas viven en `lib/contact/schema.ts` sin dependencias),
`/heap` carga la escena tras el LCP (`HeapSceneLoader`, -292 KB), el chip 2D de RUNTIME vive en su propio módulo (-2 KB)
y el resto de ilustraciones queda en servidor. **Desviación documentada:** el script `polyfills` de Next (`noModule`, 38,6 KB) no se
cuenta en el presupuesto porque ningún navegador con módulos ES lo descarga; el literal se informa aparte. Con el criterio literal
las rutas siguen por encima de 180 KB (el suelo de Next + React 19 son ~132 KB gzip).

### Lighthouse móvil (perfil por defecto: Moto G Power emulado, 4G lento simulado, CPU x4; mediana de 3; Chrome con GPU)

| Ruta | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/es` | 79 | 100 | 100 | 100 | 1,21 s | 0,017 | 939 ms |
| `/en` | 84 | 100 | 100 | 100 | 1,21 s | 0,017 | 600 ms |
| caso | **96** | 100 | 100 | 100 | 0,91 s | 0 | 210 ms |
| `/heap` | **91** | 100 | 100 | 100 | 1,06 s | 0 | 377 ms |
| `/motion` | **100** | 100 | 100 | 100 | 0,91 s | 0 | 26 ms |

**No se alcanza Performance >= 90 en la home** (79–84; hay variación de 5–10 puntos entre ejecuciones). A11y/BP/SEO = 100, LCP y CLS
cumplen en todas. Lo que queda es Total Blocking Time con todas las capas activas: hidratación de la home (~330 ms por tarea a CPU x4),
evaluación del módulo del motor 3D (~300 ms), montaje de GSAP/ScrollTrigger (~250 ms) y la lectura de `getComputedStyle` de GSAP al fijar
estados iniciales. Ya aplicado: coreografías y transiciones montadas una por tarea (`lib/yield.ts`), el render 3D cede el fotograma tras
un pulsado, Lenis solo con puntero fino. Pendiente (decisión del usuario): hidratación diferida por sección o partir el chunk del motor.

### INP (móvil 390x844, DPR 2, táctil, CPU x4, tier medio; límite 200 ms) — `docs/perf/inp.json`

Mejor de las últimas ejecuciones (hay ruido de ±60 ms entre ejecuciones; valores raros de 250–550 ms se deben a la espera del compositor
en una trama, no al hilo principal): ajustes de sonido primera apertura 152 ms (antes 216; ahora el panel se monta en reposo tras el
LCP), terminal 104, AST 72, Hold 80, formulario 176, `/heap` Run GC 40, celda con teclado 32; arrastre táctil del heap y filtros < 16 ms
(no registran). Estos valores se deben confirmar en un móvil real.

### fps (escritorio 1920x1080, scroll continuo de la home) — `docs/perf/fps.json`

El cuello de botella era `--accent-active` reescrito en `<html>` en cada fotograma (recalcular el estilo de todo el documento, ~18 ms):
la mezcla se discretiza en 8 pasos por transición (`motion/phase-runtime.ts`). Mediana: 28 fps → **56–60 fps** (el rAF en reposo de este
navegador es 57–60). WebGL2 en caliente: 59,9 fps, sin paradas. Nueva generación en caliente: 57,1 fps con 7 paradas de 130–460 ms.
En frío cada escena compila sus shaders al entrar por primera vez (paradas de 150–840 ms en las zonas GPU/DISPLAY). **No se cumple**
"ningún tramo de 1 s por debajo de 50 fps" en la pasada en frío; mediana >= 58 se cumple solo con WebGL2.

### Draw calls y partículas — `docs/perf/scenes.json`

Escena con más draw calls: 6 (< 100) en los tres tiers y en ambos backends; partículas máx. 200 000 / 50 000 / 0 (tier alto/medio/bajo).

### Matriz de verificación integral (7.1) — `docs/perf/matrix.json`

64 combinaciones (full nueva generación, full WebGL2 forzado, reduced, fallback2d x oscuro/claro x es/en x home/caso/`/heap`/`/motion`):
64/64 con el estado esperado (`data-experience`, backend, canvas, ilustraciones 2D, lang, tema, sin errores) y contenido idéntico entre
modos en 16/16 (página x tema x idioma). La firma compara el conjunto de textos de contenido, encabezados, enlaces visibles y secciones; solo
se excluyen los avisos propios del modo reducido que exige la spec (nota de «sin previsualización animada» y «Reproducir animación completa»).

## Checklist 7.1 (firmado con las ejecuciones anteriores)

- [x] full con backend de nueva generación: contenido y narrativa idénticos (matriz 16/16).
- [x] full con WebGL2 forzado (`?webgl=webgl2`): idéntico; backend `webgl2` publicado.
- [x] reduced (manual, sessionStorage): idéntico salvo los avisos propios del modo; sin canvas animado, ilustraciones 2D visibles.
- [x] fallback2d (`?webgl=none`): idéntico; sin canvas, ilustraciones 2D en las siete fases.
- [x] tema claro y oscuro, es y en en los cuatro modos.
- [x] axe: 0 violaciones en 60 combinaciones (5 páginas x 2 temas x 2 idiomas x 3 modos).
- [x] SEO: metadatos, canonical, hreflang, OG 1200x630, JSON-LD Person/CreativeWork, sitemap (ambos idiomas), robots, 404 `noindex`.
- [x] 375 px: sin desbordamiento horizontal y cabecera de 2 filas en home, caso, `/heap`, `/motion` y 404.

## Pendientes y desviaciones

- Home: Lighthouse Performance 79–84 (< 90) por TBT; ver arriba.
- fps: la pasada en frío tiene paradas por compilación de shaders; nueva generación 57 fps en caliente.
- NVDA (5.4–5.7) y móvil real (INP, fps, 3.6 con CPU x6 real): no verificables aquí. Los scripts de teclado/DOM pasan.
- 6.3: el validador oficial de Schema.org no se pudo usar sin conexión; el JSON-LD se comprueba por estructura y tipo.
- `verify-sound-real.mjs` aborta con «Target crashed» contra el build de producción en el paso 5–6 (pasa 77/77 contra `next dev`);
  `verify-sound.mjs` (56/56) y `verify-sound-ux.mjs` (24/24) pasan en producción.
- KTX2 sigue diferido (decisión del usuario). Los atlas MSDF se recomprimieron sin pérdida (-20 % y -26 %, píxeles idénticos).
- Dependencias que quedan sin uso tras quitar el formulario de zod/RHF del JS de cliente: `react-hook-form` y `@hookform/resolvers`
  (zod sigue usándose en el servidor para validar `content/`).
