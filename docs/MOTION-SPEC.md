# MOTION-SPEC — sistema de movimiento y catálogo T1–T11

> Referencia única para los changes 03, 04, 05, 07, 08 y 09. Fuente: [ADDENDUM-v2.md](./ADDENDUM-v2.md) §4–§5 y
> [BRIEF.md](./BRIEF.md) §5. **Regla:** si cambias un valor en el código (`motion/tokens.ts`,
> `motion/transitions/catalog.ts`), actualiza esta tabla en el mismo commit.
> Léase «`RenderPipeline`» donde el addendum dice «PostProcessing» (ver [STACK-VERSIONS.md](./STACK-VERSIONS.md)).

## 1. Tokens de movimiento (base)

| Token | Valor | Uso |
|---|---|---|
| `--ease-in-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) | Entradas y revelados |
| `--ease-scene` | `cubic-bezier(0.76, 0, 0.24, 1)` (quart in-out) | Transiciones de escena |
| `spring-ui` | stiffness ≈ 300, damping ≈ 30 | UI interactiva (Motion) |
| `--dur-micro` | 150 ms | Hover, foco, feedback |
| `--dur-ui` | 300 ms | Menús, toggles, tarjetas |
| `--dur-reveal` | 700 ms | Revelado de títulos y bloques |
| `scene-scrub` | equivalente a 1200–1800 ms | Transiciones scrubbed por scroll (la duración real depende de la velocidad del usuario) |
| `stagger-char` | 30–40 ms | Entre caracteres |
| `stagger-item` | 60–80 ms | Entre elementos de lista |
| `glitch-max` | < 300 ms | Techo de cualquier glitch |
| `--hold-duration` | 800 ms | Hold-to-Execute (T6): tiempo que hay que mantener pulsado |
| `--hold-click-max` | 200 ms | Una pulsación más corta, sin desplazarse, es un clic normal |
| `--dur-page-full` | 1100 ms | Transición tarjeta → caso tras un hold: expansión + entrega (techo medido, con esperas de navegación: 1200 ms) |
| `--dur-page-short` | 400 ms | Transición tarjeta → caso con clic / Enter: expansión + entrega (techo medido: 500 ms) |
| `--dur-fade-max` | 200 ms | Fundido de movimiento reducido al abrir un caso |
| `--dur-theme` | 600 ms | Cambio de tema: revelado circular desde el botón (T10) |

## 2. Catálogo T1–T11

Leyenda — **Disp.**: disparador (scroll / hold / clic / carga). **RM**: fallback `prefers-reduced-motion`.
**Tier bajo / WebGL2**: fallback cuando no hay compute (tier medio/bajo) o falta el backend de nueva generación.
«Lo implementa» indica el change que construye la **versión principal**; el fallback DOM/SVG lo construye el 03.

| # | Nombre | Disp. | Duración | Easing | Técnica (versión principal) | Lo implementa | RM | Tier bajo / WebGL2 |
|---|---|---|---|---|---|---|---|---|
| T1 | Puerta de arranque | carga (1.ª visita de la sesión) | ≤ 2,5 s hasta la puerta; 400 ms en visitas posteriores | `--ease-in-expo` (letras: `spring-ui`) | Logs POST → letras de COMPILE escalonadas con resorte → elección con/sin sonido → colapso CRT (línea → punto) → cursor del Hero | 03 | Fundido; sin colapso CRT; versión de 400 ms | Idéntico (es DOM/SVG) |
| T2 | Tokenización «Gommage» (SOURCE→LEXER) | scroll-scrub | `scene-scrub` | `--ease-scene` | Línea en MSDF disuelta de izquierda a derecha con umbral de ruido; cada glifo emite partículas (compute) que se reagrupan en tokens coloreados; bloom selectivo solo en el borde | 04 (fallback DOM: 03) | Tokens aparecen con fundido escalonado (`stagger-item`) | **Medio**: partículas 50k sin compute. **Bajo/WebGL2**: fragmentación DOM (clones de los tokens que vuelan con profundidad por escala a los carriles, scrubbed) |
| T3 | Ensamblaje del árbol (LEXER→PARSER) | scroll-scrub | `scene-scrub` | `--ease-scene` | Tokens viajan con Flip a sus nodos; ramas como tubos GPU iluminados con pulso de luz | 04 (fallback DOM: 03) | Ramas SVG estáticas con fundido | Ramas SVG con DrawSVG y puntos de luz |
| T4 | Aplanado al túnel (PARSER→BYTECODE) | scroll-scrub | `scene-scrub` | `--ease-scene` | Colapso post-order → túnel infinito, un anillo por empleo; la cámara avanza con el scroll | 04 (fallback DOM: 03) | Lista vertical con fundido | Colapso post-order en DOM → lista vertical con revelado por scroll |
| T5 | Carga en núcleos (BYTECODE→RUNTIME) | scroll-scrub | `scene-scrub` | `--ease-scene` | Barrido en espacio de pantalla con máscara de dithering Bayer teñida de ámbar; debajo aparece el die con núcleos que se encienden uno a uno | 04 (fallback DOM: 03) | Fundido cruzado, núcleos encendidos | Barrido con `mask-image` de patrón Bayer SVG + tarjetas que se encienden |
| T6 | Hold-to-Execute (RUNTIME→caso) | hold ≈ 800 ms (clic = versión corta) | completa ≤ 1200 ms; corta ≤ 500 ms | `--ease-scene`; anillo: `spring-ui` | Anillo de progreso «Ejecutando…»; el gemelo de la tarjeta se expande a pantalla completa con distorsión de lente y aberración en bordes → cabecera «Attaching debugger…» | 05 | Clic normal con fundido | Expansión 2D de la tarjeta; sin WebGL: navegación instantánea |
| T7 | Cambio de layout Grid/Lista/Heap (RUNTIME) | clic | `--dur-ui` + `stagger-item` | `--ease-in-expo` | Flip de tarjetas; los gemelos 3D las siguen sin saltos | 03 (DOM) · 04 (gemelos) · 07 (modo Heap) | Cambio con fundido | Flip DOM sin gemelos |
| T8 | Rasterización (RUNTIME→GPU) | scroll-scrub | `scene-scrub` | `--ease-scene` | Imagen del chip pixelada progresivamente (tamaño de píxel animado) hasta malla de vértices que se triangula en tiempo real | 04 (fallback DOM: 03) | Fundido entre imagen y malla estática | Rejilla de celdas SVG → malla de puntos y aristas |
| T9 | Convergencia (GPU→DISPLAY) | scroll-scrub | `scene-scrub` | `--ease-scene` | Píxeles (partículas de compute) migran a la silueta del monitor; gradiente espectral al ensamblarse | 04 (fallback DOM: 03) | Monitor aparece con fundido y gradiente estático | Celdas SVG que convergen al marco del monitor |
| T10 | Transiciones de UI (tema, filtros, menú) | clic | `--dur-ui` (tema: ≈ 600 ms) | `--ease-in-expo` | Tema con revelado circular desde el botón; filtros y menú con el componente `<ViewTransition>` de React (sin flag desde Next 16.4) | 05 | Cambio instantáneo / fundido | Sin soporte del navegador: GSAP Flip o cambio instantáneo |
| T11 | Glitch SDF (cambio de fase y 404) | scroll (cambio de fase) / carga de la 404 | < 300 ms | `--ease-scene` | Desplazamiento de canales RGB y salto de offset en la textura SDF del título de fase | 04 (DOM: 03) | Sin glitch; solo cambio de color de fase | Capas duplicadas del título con `feColorMatrix`/`feOffset` |

Reglas transversales (Brief §5): máx. 3 focos de animación simultáneos · solo `transform`, `opacity` y
`filter` en el DOM · el scroll nunca se secuestra · el elemento que sale de una fase es el que entra en la siguiente.

## 3. Máscara o render target interno (para el interruptor de `/motion`, change 08)

| # | Qué muestra el interruptor «ver internos» |
|---|---|
| T1 | Capas de scanline y máscara de colapso CRT (alfa del rectángulo que se reduce a línea y punto) |
| T2 | **Textura de ruido de umbral** de disolución (escala de grises, avanza de izquierda a derecha) y el borde donde actúa el bloom selectivo |
| T3 | Curva de cada rama y mapa de intensidad del pulso de luz a lo largo del tubo |
| T4 | Profundidad de los anillos del túnel (código de color por empleo) y posición de la cámara |
| T5 | **Matriz Bayer** (umbral ordenado) como máscara en espacio de pantalla y el render target de la escena entrante bajo el barrido |
| T6 | **Peso de la lente por píxel** (0 = centro limpio, 1 = borde; es la «vista de máscara» del prototipo) y la separación de los canales R/G/B de la aberración. La cara de la tarjeta es una SDF procedural: no hay render target que mostrar |
| T7 | Rectángulos DOM de origen y destino y los planos gemelos que los siguen |
| T8 | **Mapa de tamaño de píxel** (mosaico) y la malla de vértices antes y después de triangular |
| T9 | **Posiciones objetivo** de las partículas (silueta del monitor muestreada) y su campo de velocidad |
| T10 | Máscara circular de revelado (radio creciente desde el botón) |
| T11 | Desplazamiento por canal RGB y offset aplicado a la textura SDF |

## 4. Presupuestos que cada transición debe respetar

- < 100 draw calls por escena activa; partículas: alto 200k / medio 50k / bajo 0.
- INP < 200 ms durante la transición; trabajo pesado en GPU (compute) o Web Worker.
- Con tier alto/medio/bajo el cambio es en caliente y sin saltos (la variante nueva toma el `progress` actual).
- Cada transición tiene su fila aquí **y** un prototipo aislado (change 04) antes de integrarse.
