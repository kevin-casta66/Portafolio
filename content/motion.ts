import type { DemoId } from "@/motion/showcase";
import type { duration, easing } from "@/motion/tokens";

/**
 * Catálogo de transiciones T1–T11 de la página pública `/motion` (change 08, design D4). Es la ÚNICA
 * fuente de sus textos: se deriva de docs/MOTION-SPEC.md §2–§3 (si cambias una fila allí, actualiza
 * esta entrada, y viceversa). Un test comprueba que existen exactamente T1–T11 y que todo token de
 * duración y easing referenciado existe en `motion/tokens.ts`.
 */
export interface Localized {
  es: string;
  en: string;
}

/** Easing de la transición: un token de curva o el resorte de UI. */
export type EasingRef = keyof typeof easing | "spring";
export type DurationRef = keyof typeof duration;

export interface MotionEntry {
  id: DemoId;
  name: Localized;
  trigger: Localized;
  /** Duraciones que ve el visitante: cada token se muestra con su valor real (de `motion/tokens.ts`). */
  durationTokens: DurationRef[];
  /** Easings que ve el visitante: cada token se dibuja con su curva real. */
  easingTokens: EasingRef[];
  technique: Localized;
  reducedMotion: Localized;
  lowTier: Localized;
  /** Nota técnica breve. */
  note: Localized;
  /** Qué muestra «Ver internos» (docs/MOTION-SPEC.md §3). */
  internals: Localized;
}

export const motionCatalog: readonly MotionEntry[] = [
  {
    id: "T1",
    name: { es: "Puerta de arranque", en: "Boot gate" },
    trigger: { es: "Carga (1.ª visita de la sesión)", en: "Load (first visit of the session)" },
    durationTokens: ["reveal"],
    easingTokens: ["inExpo", "spring"],
    technique: {
      es: "Líneas de arranque tipo POST, letras de la marca escalonadas con resorte, elección con o sin sonido y colapso CRT (línea → punto) hasta el cursor del hero.",
      en: "POST-style boot lines, brand letters staggered with a spring, a sound / no-sound choice and a CRT collapse (line → dot) into the hero caret.",
    },
    reducedMotion: {
      es: "Fundido, sin colapso CRT y versión de 400 ms.",
      en: "Fade, no CRT collapse and a 400 ms version.",
    },
    lowTier: { es: "Idéntica: es DOM/SVG.", en: "Identical: it is DOM/SVG." },
    note: {
      es: "El progreso refleja recursos reales (fuentes, proyectos, GPU detectada), no un temporizador. Las visitas posteriores de la sesión usan la versión corta.",
      en: "Progress reflects real resources (fonts, projects, detected GPU), not a timer. Later visits in the same session use the short version.",
    },
    internals: {
      es: "Las capas de scanline y la máscara del colapso CRT, además de las cajas de los elementos animados.",
      en: "The scanline layers and the CRT collapse mask, plus the boxes of the animated elements.",
    },
  },
  {
    id: "T2",
    name: { es: "Tokenización «Gommage»", en: "“Gommage” tokenization" },
    trigger: { es: "Scroll (scrub) · SOURCE → LEXER", en: "Scroll (scrub) · SOURCE → LEXER" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "La línea de código se disuelve de izquierda a derecha con un umbral de ruido; cada glifo emite partículas (compute) que se reagrupan en tokens coloreados, con bloom selectivo solo en el borde.",
      en: "The code line dissolves left to right with a noise threshold; each glyph emits particles (compute) that regroup into coloured tokens, with selective bloom only at the edge.",
    },
    reducedMotion: {
      es: "Los tokens aparecen con un fundido escalonado.",
      en: "Tokens appear with a staggered fade.",
    },
    lowTier: {
      es: "Medio: 50 000 partículas sin compute. Bajo o WebGL2: fragmentación DOM con clones.",
      en: "Medium: 50,000 particles without compute. Low or WebGL2: DOM fragmentation with clones.",
    },
    note: {
      es: "Hasta 200 000 partículas simuladas en la GPU con buffers de almacenamiento; el scroll solo mueve el progreso, sin estado de React por frame.",
      en: "Up to 200,000 particles simulated on the GPU with storage buffers; scroll only drives the progress, with no React state per frame.",
    },
    internals: {
      es: "La textura de ruido de umbral de la disolución (escala de grises, avanza de izquierda a derecha) y el borde donde actúa el bloom selectivo.",
      en: "The dissolve noise-threshold texture (greyscale, advancing left to right) and the edge where the selective bloom acts.",
    },
  },
  {
    id: "T3",
    name: { es: "Ensamblaje del árbol", en: "Tree assembly" },
    trigger: { es: "Scroll (scrub) · LEXER → PARSER", en: "Scroll (scrub) · LEXER → PARSER" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "Los tokens viajan con Flip hasta sus nodos y las ramas son tubos GPU iluminados con un pulso de luz.",
      en: "Tokens travel with Flip to their nodes and the branches are lit GPU tubes carrying a light pulse.",
    },
    reducedMotion: {
      es: "Ramas SVG estáticas con fundido.",
      en: "Static SVG branches with a fade.",
    },
    lowTier: {
      es: "Ramas SVG con DrawSVG y puntos de luz.",
      en: "SVG branches with DrawSVG and light dots.",
    },
    note: {
      es: "La geometría de cada tubo se calcula como una cinta que sigue la curva del árbol real de habilidades, no un dibujo aparte.",
      en: "Each tube's geometry is a ribbon following the curve of the real skills tree, not a separate drawing.",
    },
    internals: {
      es: "La curva de cada rama y el mapa de intensidad del pulso de luz a lo largo del tubo.",
      en: "The curve of each branch and the intensity map of the light pulse along the tube.",
    },
  },
  {
    id: "T4",
    name: { es: "Aplanado al túnel", en: "Flattening into a tunnel" },
    trigger: { es: "Scroll (scrub) · PARSER → BYTECODE", en: "Scroll (scrub) · PARSER → BYTECODE" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "El árbol colapsa en post-order y se convierte en un túnel infinito con un anillo por empleo; la cámara avanza con el scroll.",
      en: "The tree collapses in post-order into an endless tunnel with one ring per job; the camera advances with the scroll.",
    },
    reducedMotion: { es: "Lista vertical con fundido.", en: "Vertical list with a fade." },
    lowTier: {
      es: "Colapso post-order en DOM y lista vertical revelada con el scroll.",
      en: "DOM post-order collapse and a vertical list revealed on scroll.",
    },
    note: {
      es: "El orden de los anillos es el orden del DOM de la experiencia, así que el túnel nunca contradice el contenido.",
      en: "The order of the rings is the DOM order of the experience, so the tunnel never contradicts the content.",
    },
    internals: {
      es: "La profundidad de los anillos (código de color por empleo) y la posición de la cámara.",
      en: "The ring depth (colour-coded per job) and the camera position.",
    },
  },
  {
    id: "T5",
    name: { es: "Carga en núcleos", en: "Loading into cores" },
    trigger: { es: "Scroll (scrub) · BYTECODE → RUNTIME", en: "Scroll (scrub) · BYTECODE → RUNTIME" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "Un barrido en espacio de pantalla con máscara de dithering Bayer teñida de ámbar; debajo aparece el die con los núcleos encendiéndose uno a uno.",
      en: "A screen-space sweep with an amber-tinted Bayer dithering mask; underneath, the die appears with its cores lighting up one by one.",
    },
    reducedMotion: {
      es: "Fundido cruzado con los núcleos ya encendidos.",
      en: "Cross-fade with the cores already lit.",
    },
    lowTier: {
      es: "Barrido con mask-image de patrón Bayer SVG y tarjetas que se encienden.",
      en: "Sweep with a Bayer SVG mask-image and cards that light up.",
    },
    note: {
      es: "La matriz Bayer 8×8 es una función de nodos TSL: la misma en WebGPU y WebGL2.",
      en: "The 8×8 Bayer matrix is a TSL node function: the same on WebGPU and WebGL2.",
    },
    internals: {
      es: "La matriz Bayer (umbral ordenado) como máscara en espacio de pantalla y la escena entrante bajo el barrido.",
      en: "The Bayer matrix (ordered threshold) as a screen-space mask and the incoming scene under the sweep.",
    },
  },
  {
    id: "T6",
    name: { es: "Hold-to-Execute", en: "Hold-to-Execute" },
    trigger: { es: "Mantener pulsado ≈ 800 ms (clic = versión corta)", en: "Hold ≈ 800 ms (click = short version)" },
    durationTokens: ["hold", "pageFull", "pageShort"],
    easingTokens: ["scene", "spring"],
    technique: {
      es: "Un anillo de progreso «Ejecutando…»; el gemelo de la tarjeta se expande a pantalla completa con distorsión de lente y aberración en los bordes y se convierte en la cabecera del caso.",
      en: "A “Running…” progress ring; the card's twin expands to full screen with lens distortion and edge aberration and becomes the case header.",
    },
    reducedMotion: { es: "Clic normal con fundido.", en: "Plain click with a fade." },
    lowTier: {
      es: "Expansión 2D de la tarjeta; sin WebGL, navegación instantánea.",
      en: "2D card expansion; without WebGL, instant navigation.",
    },
    note: {
      es: "La cara de la tarjeta se dibuja por código (SDF), sin texturas, así que el efecto no consume memoria de GPU extra.",
      en: "The card face is drawn procedurally (SDF), with no textures, so the effect adds no GPU memory.",
    },
    internals: {
      es: "El peso de la lente por píxel (0 = centro limpio, 1 = borde) y los canales de aberración.",
      en: "The lens weight per pixel (0 = clean centre, 1 = edge) and the aberration channels.",
    },
  },
  {
    id: "T7",
    name: { es: "Cambio de layout Grid / Lista / Heap", en: "Grid / List / Heap layout switch" },
    trigger: { es: "Clic", en: "Click" },
    durationTokens: ["ui"],
    easingTokens: ["inExpo"],
    technique: {
      es: "Flip de tarjetas con un retardo escalonado entre elementos; los gemelos 3D las siguen sin saltos y el modo Heap las convierte en bloques de memoria.",
      en: "Card Flip with a staggered delay between items; the 3D twins follow without jumps and Heap mode turns them into memory blocks.",
    },
    reducedMotion: { es: "Cambio con fundido.", en: "Switch with a fade." },
    lowTier: { es: "Flip DOM sin gemelos.", en: "DOM Flip without twins." },
    note: {
      es: "Esta demo alterna Cuadrícula y Lista; el paso a Heap navega a otra ruta y se ve en la propia vista /heap.",
      en: "This demo toggles Grid and List; the switch to Heap navigates to another route and is seen in the /heap view itself.",
    },
    internals: {
      es: "Los rectángulos DOM de origen y destino de cada tarjeta, que son los planos que siguen los gemelos.",
      en: "The source and destination DOM rectangles of each card, which are the planes the twins follow.",
    },
  },
  {
    id: "T8",
    name: { es: "Rasterización", en: "Rasterization" },
    trigger: { es: "Scroll (scrub) · RUNTIME → GPU", en: "Scroll (scrub) · RUNTIME → GPU" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "La imagen del chip se pixela de forma progresiva hasta una malla de vértices que se triangula en tiempo real.",
      en: "The chip image is progressively pixelated until it becomes a vertex mesh that is triangulated in real time.",
    },
    reducedMotion: {
      es: "Fundido entre la imagen y la malla estática.",
      en: "Fade between the image and the static mesh.",
    },
    lowTier: {
      es: "Rejilla de celdas SVG que se convierte en malla de puntos y aristas.",
      en: "SVG cell grid that turns into a mesh of points and edges.",
    },
    note: {
      es: "La triangulación de Delaunay se calcula en un Web Worker: el hilo principal no sufre tareas largas.",
      en: "The Delaunay triangulation runs in a Web Worker: the main thread sees no long tasks.",
    },
    internals: {
      es: "El mapa de tamaño de píxel (mosaico) y la malla de vértices antes y después de triangular.",
      en: "The pixel-size map (mosaic) and the vertex mesh before and after triangulation.",
    },
  },
  {
    id: "T9",
    name: { es: "Convergencia", en: "Convergence" },
    trigger: { es: "Scroll (scrub) · GPU → DISPLAY", en: "Scroll (scrub) · GPU → DISPLAY" },
    durationTokens: ["sceneMin", "sceneMax"],
    easingTokens: ["scene"],
    technique: {
      es: "Los píxeles (partículas de compute) migran a la silueta del monitor y aparece el gradiente espectral al ensamblarse.",
      en: "Pixels (compute particles) migrate to the monitor silhouette and the spectral gradient appears as it assembles.",
    },
    reducedMotion: {
      es: "El monitor aparece con un fundido y un gradiente estático.",
      en: "The monitor fades in with a static gradient.",
    },
    lowTier: {
      es: "Celdas SVG que convergen al marco del monitor.",
      en: "SVG cells converging onto the monitor frame.",
    },
    note: {
      es: "Las posiciones objetivo son la silueta del monitor muestreada una vez; la simulación solo integra la velocidad hacia ellas.",
      en: "The target positions are the monitor silhouette sampled once; the simulation only integrates velocity towards them.",
    },
    internals: {
      es: "Las posiciones objetivo de las partículas (silueta del monitor muestreada) y su campo de velocidad.",
      en: "The particles' target positions (sampled monitor silhouette) and their velocity field.",
    },
  },
  {
    id: "T10",
    name: { es: "Transiciones de UI", en: "UI transitions" },
    trigger: { es: "Clic (tema, filtros, menú)", en: "Click (theme, filters, menu)" },
    durationTokens: ["ui", "theme"],
    easingTokens: ["inExpo"],
    technique: {
      es: "El tema cambia con un revelado circular desde el botón; los filtros y el índice móvil usan el componente de transición de vista de React.",
      en: "The theme changes with a circular reveal from the button; filters and the mobile index use React's view-transition component.",
    },
    reducedMotion: { es: "Cambio instantáneo.", en: "Instant change." },
    lowTier: {
      es: "Sin soporte del navegador: GSAP Flip o cambio instantáneo.",
      en: "Without browser support: GSAP Flip or an instant change.",
    },
    note: {
      es: "Se detecta el soporte de la API de transiciones de vista y, si falta, se cae a Flip; el contenido del cambio es idéntico en ambos caminos. Esta demo muestra el revelado del tema (ida y vuelta); los filtros y el índice móvil se ven en el sitio real.",
      en: "View Transitions API support is detected and, when missing, it falls back to Flip; the content of the change is identical on both paths. This demo shows the theme reveal (there and back); filters and the mobile index are seen on the real site.",
    },
    internals: {
      es: "La máscara circular de revelado (radio creciente desde el botón).",
      en: "The circular reveal mask (radius growing from the button).",
    },
  },
  {
    id: "T11",
    name: { es: "Glitch SDF", en: "SDF glitch" },
    trigger: { es: "Cambio de fase y carga de la 404", en: "Phase change and 404 load" },
    durationTokens: ["glitchMax"],
    easingTokens: ["scene"],
    technique: {
      es: "Desplazamiento de canales RGB y salto de offset en la textura SDF del título de fase, siempre por debajo de 300 ms.",
      en: "RGB channel displacement and an offset jump in the phase title's SDF texture, always under 300 ms.",
    },
    reducedMotion: {
      es: "Sin glitch: solo cambia el color de la fase.",
      en: "No glitch: only the phase colour changes.",
    },
    lowTier: {
      es: "Capas duplicadas del título con feColorMatrix y feOffset.",
      en: "Duplicated title layers with feColorMatrix and feOffset.",
    },
    note: {
      es: "El texto real sigue en el DOM: el glitch es solo la capa visual, así que un lector de pantalla no oye nada raro.",
      en: "The real text stays in the DOM: the glitch is only the visual layer, so a screen reader hears nothing odd.",
    },
    internals: {
      es: "El desplazamiento por canal RGB y el offset aplicado a la textura SDF.",
      en: "The per-channel RGB displacement and the offset applied to the SDF texture.",
    },
  },
];
