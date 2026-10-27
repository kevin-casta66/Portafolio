# ADDENDUM v2 — «Portafolio»: Capa de referentes y técnicas de vanguardia (octubre 2026)

> Complementa a [BRIEF.md](./BRIEF.md). Donde lo contradiga (motor 3D, shaders, postprocesado,
> transiciones e interacciones), manda este addendum.

## 0. Cómo usar este addendum
Este documento complementa el prompt original de Portafolio (portafolio-odisea: BOOT → SOURCE → LEXER → PARSER → BYTECODE → RUNTIME → GPU → DISPLAY). Se mantienen intactos el concepto, las fases, la paleta, la tipografía, los principios de UX, la accesibilidad y los presupuestos de rendimiento.

Donde este addendum contradiga al original (motor 3D, shaders, postprocesado, transiciones e interacciones), manda este addendum.

Antes de escribir código, verifica en la documentación oficial la versión vigente de cada librería, comprueba la compatibilidad entre ellas y fija versiones exactas en package.json.

## 1. Referentes: qué técnica extraer de cada uno
Regla: los referentes inspiran TÉCNICAS, nunca se copia su diseño, assets, textos ni código. Todo se reinterpreta dentro de la narrativa Portafolio.

| Referente | Técnica a extraer | Dónde se aplica en Portafolio |
|---|---|---|
| Unseen Studio (unseen.co) | Puerta de entrada "con sonido / sin sonido", preloader con letras escalonadas, Click & Hold, mundo arrastrable de cuadrícula infinita, filtros de proyectos, partículas con hotspots | BOOT, RUNTIME, vista Memory Heap |
| Igloo Inc (Site of the Year 2024) | UI renderizada en WebGL con texto SDF, glitches por shader de bajo coste, simulación de fluidos | Títulos de fase, glitch entre fases, Hero |
| Bruno Simon (folio 2025) | TSL con WebGPU automático y fallback, portafolio con objetivos y logros, diseño sonoro | Sistema de logros, audio, motor 3D |
| Shader.se | Pipeline WebGPU dirigido por scroll (R3F + TSL + Lenis), renderizado selectivo por rango de scroll, transiciones en espacio de pantalla vs. ancladas a superficies 3D | Arquitectura de render y transiciones entre fases |
| Lusion (Site of the Year) | Escenas 3D interactivas con física y postprocesado cinematográfico | Laboratorio GPU |
| Codrops 2026 | Transiciones de página persistentes con WebGPU + seguimiento del DOM; disolución tipo "Gommage" (texto MSDF + partículas + bloom selectivo); grid infinito de liquid glass; tubos GPU iluminados; túnel infinito en scroll; dithering | Hero→Lexer, AST, Bytecode, casos de estudio |

Primer entregable: un documento "Technique Teardown" de una página que explique, para cada técnica de la tabla, cómo funciona por dentro, cómo se implementará con nuestro stack y en qué fase de Portafolio vive.

## 2. Stack actualizado (sustituye las partes 3D del original)
- **Motor 3D**: Three.js con `WebGPURenderer` (import desde 'three/webgpu'). Comprueba disponibilidad de WebGPU y usa el backend WebGL2 como fallback automático.
- **React Three Fiber**: crea el renderer con la fábrica asíncrona de `gl` (instanciar WebGPURenderer y esperar `init()` antes de devolverlo). Verifica la versión de R3F compatible.
- **Shaders**: exclusivamente TSL (Three Shading Language) con NodeMaterial. Prohibido ShaderMaterial y GLSL crudo, porque no funcionan con WebGPURenderer.
- **Compute shaders** (TSL + storage buffers): partículas de tokens, píxeles y paquetes de red; simulación de fluidos. Solo en tier gráfico alto.
- **Postprocesado**: clase PostProcessing de 'three/webgpu' con nodos TSL (bloom selectivo, aberración cromática, grano, dithering). Sustituye a EffectComposer y a la librería postprocessing de pmndrs.
- **Texto en WebGL**: MSDF (atlas generado con msdfgen o msdf-bmfont) con material TSL propio. El texto real SIEMPRE existe también en el DOM para SEO y accesibilidad; la versión MSDF es una capa visual sincronizada.
- **GSAP 3 completo** (ScrollTrigger, SplitText, Flip, MorphSVG, DrawSVG, CustomEase, Observer) + **Lenis**. Un único requestAnimationFrame: Lenis avanza desde gsap.ticker y la escena R3F se sincroniza con ese mismo reloj.
- **Transiciones de página**: las cinematográficas viven en el canvas persistente (no dependen de APIs experimentales). React `<ViewTransition>` con el flag experimental de Next.js solo para transiciones de UI (tema, filtros, menú), con detección de soporte y fallback a GSAP Flip.
- **CSS scroll-driven animations** (`animation-timeline: scroll()` / `view()`) para efectos ligeros solo-DOM (barras de progreso, revelados sutiles), dentro de `@supports`.
- **Audio**: Web Audio API (o Howler.js), desbloqueado por la puerta de entrada.
- **Física** (solo laboratorio): Rapier.
- **Herramientas de depuración visibles en Modo Debug**: stats-gl (FPS, tiempos de GPU) y Tweakpane para ajustar uniforms de los shaders en vivo.

## 3. Arquitectura de render reforzada
- **Canvas persistente único** en el layout raíz, que sobrevive a la navegación entre rutas.
- **Registro de escenas**: cada fase declara su rango de scroll. Por frame solo se renderizan las escenas cuyo rango está activo (renderizado selectivo); las demás no cuestan nada.
- **Gemelos DOM↔WebGL**: cada tarjeta de proyecto, imagen y título relevante tiene un plano WebGL "gemelo" que sigue su rectángulo del DOM (getBoundingClientRect sincronizado con Lenis). Así una tarjeta puede salir del layout HTML y convertirse en geometría 3D sin cortes.
- **Render targets** para transiciones: la escena saliente y la entrante se renderizan a texturas y un shader TSL las mezcla con la máscara de la transición.
- **Tiers de calidad** (detect-gpu + caída de FPS medida en tiempo real): alto (compute, fluidos, bloom), medio (partículas reducidas, sin fluidos), bajo (planos con texturas y transiciones 2D). El cambio de tier es en caliente y sin recargar.
- Liberación estricta de recursos (dispose de geometrías, texturas y render targets) al salir de cada escena.

## 4. Catálogo definitivo de transiciones (mapeado a Portafolio)
Cada transición se documenta con: disparador (scroll / hold / clic), duración, easing, técnica y fallback para reduced motion.

- **T1 · Puerta de arranque (BOOT)**: tras los logs del POST aparecen dos opciones, "▶ Iniciar con sonido" y "Iniciar en silencio". Las letras de Portafolio entran escalonadas, una por una con resorte. Al elegir, el colapso CRT del original desemboca en el cursor del Hero. La elección desbloquea el AudioContext y se recuerda en la sesión. Fallback: fundido.
- **T2 · Tokenización "Gommage" (SOURCE → LEXER, scroll-scrub)**: la línea de código en MSDF se disuelve de izquierda a derecha con un umbral de ruido animado. Cada glifo emite partículas (compute shader) que se reagrupan formando los tokens coloreados del Lexer, con bloom selectivo solo en el borde de disolución. Fallback: los tokens aparecen con fundido escalonado.
- **T3 · Ensamblaje del árbol (LEXER → PARSER)**: los tokens viajan con Flip hasta sus nodos y las ramas del AST se dibujan como tubos GPU iluminados que crecen a lo largo de curvas. La luz recorre el tubo como corriente eléctrica. Fallback: ramas SVG con DrawSVG.
- **T4 · Aplanado al túnel (PARSER → BYTECODE)**: el árbol colapsa en recorrido post-order y las instrucciones resultantes forman un túnel infinito por el que la cámara avanza con el scroll. Cada empleo es un anillo del túnel. Fallback: lista vertical con revelado por scroll.
- **T5 · Carga en núcleos (BYTECODE → RUNTIME)**: barrido en espacio de pantalla con máscara de dithering ordenado (Bayer) teñido en ámbar. Bajo el barrido aparece el die del procesador con sus núcleos encendiéndose uno a uno.
- **T6 · Hold-to-Execute (RUNTIME → caso de estudio)**: ver sección 5.
- **T7 · Cambio de layout (RUNTIME)**: alternar entre Grid, Lista y Heap (vista de mundo). Las tarjetas se reacomodan con Flip y sus gemelos WebGL las siguen sin saltos.
- **T8 · Rasterización (RUNTIME → GPU)**: la imagen del chip se pixela progresivamente (pixel size animado en TSL) hasta convertirse en una malla de vértices que se triangula en tiempo real.
- **T9 · Convergencia (GPU → DISPLAY)**: los píxeles, como partículas de compute, migran hacia la silueta del monitor. El gradiente espectral de todos los acentos aparece en el momento del ensamblaje.
- **T10 · Transiciones de UI**: cambio de tema con revelado circular desde el botón, filtros y menú, usando `<ViewTransition>` con fallback.
- **T11 · Glitch SDF**: en cada cambio de fase, el título de la fase sufre un glitch de menos de 300 ms (desplazamiento de canales RGB y salto de offset en la textura SDF). También en la 404.

## 5. Interacciones nuevas
- **Hold-to-Execute**: en cada proceso (proyecto), mantener pulsado durante unos 800 ms muestra un anillo de progreso alrededor del cursor con el texto "Ejecutando…". Al completarse, el plano gemelo de la tarjeta se expande hasta ocupar la pantalla, con distorsión de lente y aberración cromática en los bordes, y se convierte en la cabecera del caso de estudio ("Attaching debugger…"). Reglas de UX obligatorias: un clic normal también abre el proyecto con una versión corta de la transición; con teclado, Enter abre y mantener Espacio ejecuta la versión completa; en móvil es mantener el dedo; con reduced motion es un clic normal con fundido. Soltar antes de tiempo revierte el anillo con un resorte.
- **Memory Heap (vista de mundo)**: ruta `/heap`. Todos los proyectos y experimentos flotan en una cuadrícula infinita que se arrastra con inercia, como bloques de memoria con su dirección hexadecimal. Una lente de liquid glass sigue al cursor, ampliando y refractando lo que hay debajo. El botón "Run GC" reorganiza los bloques por tecnología o año con animación. Navegable con flechas del teclado y con una lista accesible equivalente.
- **Hotspots en el chip**: los núcleos del die tienen hotspots con partículas que reaccionan al hover y muestran la ficha rápida del proyecto.
- **Reacción a la velocidad del scroll**: la velocidad que reporta Lenis alimenta un uniform global. A más velocidad, más estiramiento de las partículas y más aberración cromática; al detenerse, todo vuelve suavemente al reposo. Con límites para que nunca afecte la legibilidad.
- **Fluido de silicio (solo tier alto)**: en el Hero, el cursor deja una estela de "calor" sobre la retícula del circuito mediante una simulación de fluido en compute.
- **Sistema de logros**: al descubrir cosas aparece un aviso discreto tipo log, por ejemplo `ACHIEVEMENT_UNLOCKED: root_access` (abrir la terminal), `process_executed` (primer Hold-to-Execute), `heap_explorer` (entrar en Memory Heap), `kernel_panic` (encontrar la 404), `debugger_attached` (activar el Modo Debug). El contador vive en el Call Stack y se guarda en localStorage. Nunca bloquea ni interrumpe la navegación.
- **Diseño sonoro**: un ambiente distinto por fase (zumbido eléctrico, clics de reloj, ventiladores de GPU), sonidos de UI sutiles y un tono cuya altura responde a la velocidad del scroll. Todo silenciable desde un botón siempre visible y respetando la elección de la puerta de entrada.
- **Liquid glass con disciplina**: solo en el Call Stack, la terminal y la lente del Heap. El texto sobre vidrio debe pasar contraste AA en ambos temas; si no lo pasa, se aumenta la opacidad del fondo.

## 6. Página pública /motion (vitrina del sistema de movimiento)
Una página que muestra el propio sistema de animación como prueba de habilidad: los tokens de easing dibujados como curvas interactivas, las duraciones, y cada transición del catálogo (T1–T11) reproducible de forma aislada con botón "Replay", control de velocidad (0.25x, 0.5x, 1x) y un interruptor que muestra la máscara o el render target que usa por dentro. Incluye una breve nota técnica de cada una.

## 7. Guardarraíles de rendimiento (refuerzan los del original)
- INP < 200 ms es prioritario: ninguna animación ni cálculo pesado puede bloquear una interacción. Trabajo pesado en GPU (compute) o en Web Workers.
- Cero scroll-jacking: el scroll siempre es nativo (Lenis solo suaviza). Se permite pinning con ScrollTrigger, pero el usuario controla la velocidad y la dirección.
- El contenido HTML se pinta primero. GSAP, Three.js y las escenas se cargan después del LCP con import dinámico.
- Presupuesto por escena activa: menos de 100 draw calls, partículas por tier (alto 200k, medio 50k, bajo 0) y texturas KTX2.
- Pruebas obligatorias en un Android de gama media y en un iPhone con Safari 26, además de escritorio con Chrome y Firefox.

## 8. Entregables adicionales
1. Technique Teardown (sección 1).
2. Tabla de especificación de movimiento con T1–T11 completas.
3. Prototipo aislado de cada transición antes de integrarla en el flujo completo.
4. Página /motion.
5. README técnico del repositorio explicando la arquitectura de render, porque el código también es parte del portafolio.

## 9. Criterios de aceptación adicionales
- El sitio funciona con WebGPU y con el fallback WebGL2 sin diferencias de contenido, y el Modo Debug indica qué backend está activo.
- Ninguna transición tiene cortes: el elemento que sale de una fase es literalmente el que entra en la siguiente.
- Hold-to-Execute, Memory Heap y el sistema de logros funcionan con ratón, teclado y táctil, y tienen alternativa con reduced motion.
- Lighthouse móvil mantiene los presupuestos del prompt original con todas las capas nuevas activas.
- Ninguna técnica de los referentes se presenta copiada: todas están reinterpretadas en la narrativa Portafolio.
