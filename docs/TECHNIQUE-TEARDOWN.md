# Technique Teardown — «COMPILE»

> Primer entregable del [ADDENDUM-v2](./ADDENDUM-v2.md) §1. Cada fila explica **cómo funciona por dentro**,
> **cómo lo haremos** con nuestro stack ([STACK-VERSIONS](./STACK-VERSIONS.md)) y **en qué fase** vive.
> Describe mecanismos generales; no se inspeccionó ni se copia código de terceros. Transiciones: [MOTION-SPEC](./MOTION-SPEC.md).

| Técnica (referente) | Cómo funciona por dentro | Cómo lo haremos | Fase |
|---|---|---|---|
| Puerta con/sin sonido (Unseen) | Los navegadores bloquean el audio hasta un gesto del usuario; la elección es ese gesto y desbloquea el `AudioContext` | Dos `<button>` tras los logs POST; el clic crea/reanuda el contexto Web Audio y guarda la elección en la sesión | BOOT (T1) |
| Preloader con letras escalonadas (Unseen) | Cada letra es un elemento con la misma animación y un retardo creciente | SplitText + resorte de GSAP con `stagger-char`; progreso real de assets | BOOT (T1) |
| Click & Hold (Unseen) | Un temporizador de pulsación avanza un progreso 0→1; soltar antes lo revierte | Hook de hold (~800 ms) con anillo SVG; clic corto = versión corta; teclado Enter/Espacio | RUNTIME → caso (T6) |
| Grid infinito arrastrable (Unseen / Codrops) | Un mundo con coordenadas que se repiten por módulo; el arrastre aplica velocidad con inercia y la cámara se envuelve | Bloques instanciados con envoltura modular en TSL; Observer para ratón/táctil/teclado; lista DOM equivalente | Memory Heap (07) |
| Filtros de proyectos (Unseen) | Reordenar elementos midiendo su posición antes y después (FLIP) | `ps aux \| grep <tech>` + GSAP Flip; gemelos 3D siguen el rect | RUNTIME (T7) |
| Partículas con hotspots (Unseen) | Un buffer de partículas en GPU y puntos activos que reaccionan al puntero | Compute con storage buffers (tier alto) + ficha rápida del proyecto en cada núcleo del die | RUNTIME |
| UI en WebGL con texto SDF/MSDF (Igloo) | Un atlas guarda distancias al borde del glifo; el shader las umbraliza y queda nítido a cualquier escala y se puede disolver o desplazar | Atlas MSDF (`msdf-bmfont-xml`) + material TSL; **el texto real siempre existe en el DOM** y el MSDF es una capa sincronizada | Títulos de fase, T2, T11 |
| Glitch por shader de bajo coste (Igloo) | Desplazar canales RGB y saltar el offset de la textura durante unos fotogramas | Nodo TSL con `step` temporal; < 300 ms; versión DOM con `feColorMatrix` | Cambio de fase (T11) |
| Simulación de fluidos (Igloo) | Un campo de velocidad en texturas/buffers que se advecta y disipa cada frame | Estela de «calor» del cursor en compute sobre la retícula; solo tier alto | SOURCE (Hero) |
| TSL con WebGPU y fallback (Bruno Simon) | TSL es un grafo de nodos que se compila a WGSL (WebGPU) o a GLSL (WebGL2) | `three/webgpu` + fábrica async de `gl` en R3F; solo NodeMaterial; backend visible en Modo Debug | Motor 3D |
| Logros (Bruno Simon) | Eventos de descubrimiento registrados en un almacén persistente | Registro extensible; aviso `ACHIEVEMENT_UNLOCKED: id`, contador en el Call Stack, `localStorage` | Sistema global (06) |
| Diseño sonoro (Bruno Simon) | Un grafo de audio con una capa ambiente por fase y sonidos puntuales | Web Audio directo: ambiente con fundido cruzado, clics de UI, tono ligado a la velocidad de scroll | Sistema global (06) |
| Pipeline WebGPU por scroll + render selectivo (Shader.se) | Un único bucle de render; cada escena declara su rango de scroll y solo se dibuja la activa | Registro de escenas; `frameloop="never"` con `advance()` desde `gsap.ticker` (reloj de Lenis) | Arquitectura de render |
| Transiciones en espacio de pantalla vs. superficie 3D (Shader.se) | Una máscara 2D sobre la imagen final, o geometría que se deforma en el mundo | Barrido Bayer en pantalla (T5); lente sobre el gemelo anclado a la tarjeta (T6) | T5, T6, T8 |
| Escenas con física y postpro cinematográfico (Lusion) | Un motor de física avanza un mundo y sus transformaciones alimentan el render; el post añade bloom y aberración | Rapier en un Web Worker; `RenderPipeline` con bloom selectivo, aberración, grano | Laboratorio GPU |
| Transiciones persistentes con seguimiento del DOM (Codrops) | El canvas es fijo y plano-gemelos copian el rect de cada elemento del DOM | Gemelos `data-twin` (`getBoundingClientRect` por tick, sincronizado con Lenis) y render targets saliente/entrante mezclados por máscara TSL | Todas |
| Disolución «Gommage» (Codrops) | Umbral de ruido animado sobre el texto; los píxeles que cruzan el umbral emiten partículas | MSDF + ruido TSL + compute; bloom selectivo solo en el borde de disolución | SOURCE→LEXER (T2) |
| Liquid glass (Codrops) | Refracción: desplazar el muestreo del fondo según un mapa de normales/lente | Filtro de fondo con opacidad mínima para contraste AA; solo Call Stack, terminal y lente del Heap | Sistema global, Heap |
| Tubos GPU iluminados (Codrops) | Una geometría tubular sobre una curva con un pulso de brillo que viaja por un parámetro `u` | Tubos con nodo TSL de pulso; fallback SVG con DrawSVG | LEXER→PARSER (T3) |
| Túnel infinito en scroll (Codrops) | Anillos repetidos con la cámara avanzando; el módulo recicla los anillos al pasar | Un anillo por empleo; cámara ligada al progreso del scroll | PARSER→BYTECODE (T4) |
| Dithering (Codrops) | Comparar el valor con una matriz de umbrales (Bayer) para decidir qué píxel enciende | Máscara Bayer en espacio de pantalla teñida de ámbar | BYTECODE→RUNTIME (T5) |

## Reinterpretar, no copiar

Regla: de cada referente se toma **la técnica**, nunca su diseño, assets, textos ni código.

| Referente | Se toma | Reinterpretación en COMPILE |
|---|---|---|
| Unseen Studio | Puerta de sonido, letras escalonadas, hold, mundo arrastrable, hotspots | Los logs POST → puerta; el hold «ejecuta» un proceso; el mundo es un heap de memoria con direcciones hex |
| Igloo Inc | Texto SDF, glitch barato, fluidos | Títulos de fase y glitch en cambios de fase; el fluido es «calor» sobre un circuito |
| Bruno Simon | TSL con fallback, logros, sonido | Logros con nombres de sistema (`root_access`, `kernel_panic`); ambiente por etapa del pipeline |
| Shader.se | Render selectivo, pantalla vs. superficie | Escenas por fase con rango de scroll; barrido de dithering (pantalla) frente a la lente del gemelo (superficie) |
| Lusion | Física y postpro cinematográfico | Laboratorio GPU con experimentos propios |
| Codrops 2026 | Gommage, tubos, túnel, dithering, liquid glass | Código → tokens → árbol → bytecode → chip: cada técnica transporta un dato de la narrativa |

Comprobación antes del lanzamiento: ningún asset, texto ni fragmento de código de terceros; cada técnica aparece
con una función narrativa propia (token → nodo → instrucción → proceso → vértice → píxel).
