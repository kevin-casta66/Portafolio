# PROYECTO: «COMPILE» — Portafolio-odisea de [TU NOMBRE], [TU ROL]

> Documento fuente del proyecto. Las specs y changes de `openspec/` derivan de aquí.
> Si algo cambia en el brief, actualiza los changes con `/opsx:update`.

## 0. Tu rol y el objetivo
Actúa como un equipo senior formado por un Creative Developer (WebGL/GSAP), un diseñador UI/UX y un ingeniero frontend especializado en rendimiento. Vas a construir mi portafolio personal.

Objetivo único y no negociable: DESTACAR MIS HABILIDADES COMO DESARROLLADOR. Cada animación, transición e interacción debe cumplir dos funciones a la vez: impresionar y demostrar una capacidad técnica concreta. Nada se anima por decoración; todo movimiento representa una transformación de datos dentro de la narrativa. El sitio en sí es el proyecto más importante del portafolio, así que debe ser impecable en código, rendimiento y accesibilidad.

Restricción clave de UX: un reclutador con 30 segundos debe poder ver mi nombre, rol, propuesta de valor, mejores proyectos y descargar mi CV sin esperar ninguna animación.

## 1. Concepto y temática: «COMPILE — El viaje de una línea de código»
El visitante no "navega una web": sigue a una sola línea de código, `const dev = new Developer("[TU NOMBRE]")`, en su viaje por el interior de la máquina hasta convertirse en los píxeles que forman la página final. El scroll equivale a ciclos de reloj. Cada sección es una etapa real del pipeline de ejecución:

BOOT → SOURCE → LEXER → PARSER (AST) → BYTECODE → RUNTIME (CPU) → GPU → DISPLAY

Estética: "silicio iluminado". Interiores de chip vistos como arquitectura monumental, trazas de circuito que brillan, tipografía monoespaciada combinada con display expresiva, glitch muy controlado (solo en transiciones de fase), partículas que son literalmente tokens, bits y vértices. Debe sentirse como un documental de ingeniería de alto presupuesto, no como un cliché "hacker" verde sobre negro.

## 2. Mapa de la experiencia (secciones, contenido, animación y transición)

### 2.0 BOOT — Preloader
- Concepto: secuencia de arranque tipo POST/BIOS. Líneas como `[ OK ] Mounting /skills`, `[ OK ] Loading projects (6)`, `[ OK ] GPU detected: tier 3`.
- El progreso es REAL (assets, fuentes, escena 3D), no un timer falso. Duración máxima 2,5 s; botón "Saltar ⏎" visible desde el primer frame. Solo se muestra completo en la primera visita de la sesión; en visitas posteriores, versión de 400 ms.
- Salida: la pantalla se "apaga" como un CRT (colapso a una línea horizontal y luego a un punto) y ese punto se convierte en el cursor de texto del Hero.

### 2.1 SOURCE — Hero
- Contenido: nombre, rol, propuesta de valor en una frase, CTAs "Ver proyectos" y "Descargar CV", indicador de disponibilidad (🟢 Disponible para proyectos).
- Escena: un editor de código flotante con números de línea. Mi nombre se escribe con efecto de tecleo y autocompletado tipo IDE (el popup de sugerencias aparece y elige `Developer`). Fondo: retícula de circuito en WebGL con parallax suave al mover el ratón.
- Importante: el texto del Hero existe en el DOM desde el primer render (SSR). La animación de tecleo es una capa progresiva encima; si el JS tarda, el contenido ya está ahí.
- Transición a LEXER (scroll-scrub): la línea de código se fragmenta. Cada token (`const`, `dev`, `=`, `new`, `Developer`, `(`, `"..."`, `)`) se separa, se colorea según su tipo y sale disparado hacia la cámara con profundidad 3D.

### 2.2 LEXER — Sobre mí
- Concepto: el analizador léxico clasifica tokens. Mi biografía se presenta como un flujo de tokens que se ordenan en carriles por categoría: `keyword` (quién soy), `identifier` (cómo me llamo/dónde estoy), `string` (lo que me motiva), `number` (datos: años de experiencia, proyectos entregados, clientes).
- Los `number` son contadores animados que solo arrancan cuando entran en viewport.
- Interacción: al pasar el cursor por un token aparece un tooltip tipo IDE con el "tipo inferido" y una frase extra sobre mí.
- Transición a PARSER: los tokens vuelan con animación FLIP y se acoplan como nodos de un árbol que crece desde arriba.

### 2.3 PARSER (AST) — Habilidades
- Concepto: un Árbol de Sintaxis Abstracta vivo. La raíz es "Developer"; las ramas son categorías (Frontend, Backend, Cloud/DevOps, Datos, Diseño, Soft skills); las hojas son tecnologías.
- Cada hoja muestra evidencia, no barras de porcentaje: años de uso, número de proyectos donde la usé y un nivel cualitativo (Uso diario / Producción / Exploración).
- Interacción estrella: al hacer clic en una tecnología, el árbol atenúa todo lo demás y dibuja trazas de luz hacia los proyectos que la usan (vista previa de las tarjetas de la sección RUNTIME). Esto conecta habilidad con prueba práctica.
- Las ramas se dibujan con trazos SVG animados (stroke-dashoffset) y los nodos aparecen con resorte. En escritorio el árbol es horizontal y explorable con drag; en móvil se convierte en un árbol vertical colapsable.
- Transición a BYTECODE: el árbol se "aplana": los nodos colapsan en orden de recorrido (post-order) hasta formar una columna lineal de instrucciones.

### 2.4 BYTECODE — Experiencia y trayectoria
- Concepto: cada empleo o etapa es una función compilada: `fn empresa_2023_2025()`. Sus logros son instrucciones (`PUSH`, `CALL`, `OPTIMIZE`, `DEPLOY`) acompañadas de texto humano legible al lado.
- Un "program counter" (flecha brillante) avanza con el scroll y resalta la instrucción actual. La columna de registros a la derecha muestra el stack usado en ese empleo y se actualiza con cada función.
- Logros cuantificados siempre (ej.: "Reduje el tiempo de carga un 48%").
- Transición a RUNTIME: las instrucciones se cargan en los núcleos de un chip que aparece en 3D, entrando como un flujo de datos por los pines.

### 2.5 RUNTIME (CPU) — Proyectos (la sección más importante)
- Concepto: un die de procesador visto desde arriba, iluminado. Cada proyecto es un "proceso" corriendo en un núcleo, con su PID, estado (`running`, `deployed`, `open-source`) y métricas REALES: usuarios, puntuación Lighthouse, estrellas en GitHub, impacto de negocio.
- Cada tarjeta incluye: captura o video corto en bucle (autoplay silenciado, solo en viewport), rol, stack, problema resuelto en una línea, y enlaces a "Demo en vivo", "Código" y "Caso de estudio".
- Filtros por tecnología presentados como un comando: `ps aux | grep react`. El filtrado reordena las tarjetas con animación FLIP de layout.
- Hover: el núcleo correspondiente del chip se enciende y la tarjeta tiene inclinación 3D sutil con reflejo especular que sigue al cursor.
- Clic en "Caso de estudio": transición de elemento compartido (View Transitions API). La tarjeta se expande hasta ocupar la pantalla con el texto "Attaching debugger…" y se convierte en la página del caso.

### 2.6 Página de caso de estudio — "Debugger"
- Layout de depurador: panel lateral con "breakpoints" (índice del caso: Contexto, Problema, Arquitectura, Decisiones, Código destacado, Resultados, Aprendizajes).
- Diagrama de arquitectura animado que se construye por pasos a medida que se hace scroll.
- Bloques de código reales con resaltado de sintaxis y anotaciones al margen.
- Métricas de resultados como gráficos que se dibujan al entrar en viewport.
- Navegación entre casos con "Step over ▶" (siguiente) y "Step back ◀" (anterior). Volver al home deshace la transición de elemento compartido.

### 2.7 GPU — Laboratorio / Playground
- Concepto: el pipeline gráfico. La escena muestra vértices → triángulos → rasterización → píxeles.
- Contenido: 3-4 experimentos interactivos en vivo que demuestran habilidad técnica pura (un shader generativo controlable, una simulación física, una visualización de datos, una micro-interacción compleja).
- Cada experimento tiene el botón "</> Ver código" que gira la tarjeta 180° en 3D y muestra el fragmento clave del código.
- Transición a DISPLAY: todos los píxeles de la escena se reorganizan y convergen formando la silueta de un monitor.

### 2.8 DISPLAY — Contacto
- Concepto: la línea de código del inicio por fin es un píxel en pantalla. El monitor muestra un formulario con estética de terminal (nombre, email, mensaje), pero con la usabilidad de un formulario moderno: labels visibles, validación en vivo, mensajes de error claros.
- Al enviar: el mensaje se empaqueta como un paquete de red que viaja por un cable animado hacia un "servidor"; la respuesta vuelve como `200 OK ✓ Mensaje recibido`. Si falla: `500` con botón de reintento y un email alternativo.
- Debajo: email copiable con un clic (feedback "Copiado al portapapeles"), redes, CV y la frase de cierre: "Programa finalizado con código de salida 0".

### 2.9 Página 404
- "Segmentation fault (core dumped)". La pantalla tiene glitch, se "vuelca la memoria" en hexadecimal y un botón "Reiniciar proceso" lleva al inicio.

## 3. Sistemas globales
- **Navegación "Call Stack"**: barra lateral fija con las fases apiladas como frames de una pila de llamadas (`main() › parser() › runtime()`). La fase activa se ilumina con el color de su fase. Clic para saltar. En móvil se convierte en una barra inferior compacta con indicador de progreso.
- **Terminal oculta**: tecla `~` (o botón en el menú) abre una terminal funcional con comandos: `help`, `about`, `projects`, `skills`, `cv`, `contact`, `theme`, `debug`, `clear`. Con autocompletado por Tab e historial con flechas.
- **Modo Debug**: activable desde la terminal o un botón. Muestra wireframes de las escenas 3D, cajas de los componentes, contador de FPS y tiempos de renderizado. Demuestra dominio técnico y orgullo por el rendimiento.
- **Vista Rápida ⚡ (modo reclutador)**: toggle siempre visible en el header que transforma el sitio en un currículum limpio de una sola página, con animaciones mínimas, todo el contenido escaneable y botón de impresión/PDF. Esta es la red de seguridad de UX: lo espectacular nunca bloquea lo esencial.
- **Cursor personalizado**: un caret de texto que cambia según el contexto (se convierte en mira sobre elementos interactivos, en "⟨/⟩" sobre código, en flecha de arrastre sobre el AST). Desactivado en dispositivos táctiles y respetando el cursor del sistema para quien lo prefiera.
- **Botones magnéticos** en los CTAs principales.
- **Sonido opcional**: apagado por defecto. Clics sutiles de teclado, zumbido eléctrico ambiental al cambiar de fase. Botón de sonido claramente visible.
- **Atajos de teclado** documentados al presionar `?`.

## 4. Dirección de arte

### Paleta (regla 60-30-10: base oscura, superficies, un solo acento dominante por fase)
- Base "Silicio": #07080C | Superficie: #0E1118 | Superficie elevada: #151A24 | Bordes: #232A38
- Texto principal: #E8ECF4 | Texto secundario: #8A93A6
- Acentos por fase (cada fase tiñe sutilmente el fondo con su color al 4-6% de opacidad):
  - SOURCE/LEXER: cian #22D3EE
  - PARSER: violeta #A78BFA
  - BYTECODE: lima #A3E635
  - RUNTIME: ámbar #FBBF24
  - GPU: magenta #F472B6
  - DISPLAY: espectro completo (gradiente de todos los acentos), simbolizando que todo converge.
- El cambio de color entre fases se interpola con el scroll, nunca cambia de golpe.
- Tema claro "Datasheet" (hoja técnica impresa): papel #F4F1EA, tinta #12141A, acentos oscurecidos hasta cumplir contraste WCAG AA. Toggle de tema con transición circular que se expande desde el botón (View Transitions).
- Todo el color se define como design tokens (CSS custom properties); prohibido usar valores hex sueltos en componentes.

### Tipografía
- Display: Unbounded (variable). Su peso se anima en hover y en las entradas de los títulos.
- Texto: Geist.
- Código y datos: JetBrains Mono.
- Escala tipográfica fluida con clamp(). Fuentes con subset, autoalojadas y precargadas.

### Composición
- Grilla de 12 columnas, mucho espacio negativo, una idea principal por pantalla.
- Textura: grano de película muy sutil y líneas de circuito como elemento gráfico recurrente que conecta las secciones entre sí.
- Iconografía lineal de trazo fino, consistente (Lucide o set propio).

## 5. Sistema de movimiento (motion design system)
- Easing de entrada: cubic-bezier(0.16, 1, 0.3, 1) (expo out).
- Easing de transiciones de escena: cubic-bezier(0.76, 0, 0.24, 1) (quart in-out).
- UI interactiva: springs (stiffness ≈ 300, damping ≈ 30).
- Duraciones: micro 150 ms · UI 300 ms · revelado 700 ms · transiciones de escena scrubbed por scroll (equivalente a 1200-1800 ms).
- Stagger: 30-40 ms entre caracteres, 60-80 ms entre elementos de lista.
- Reglas coreográficas:
  1. Toda animación representa una transformación de datos de la narrativa (token → nodo → instrucción → proceso → vértice → píxel).
  2. Máximo 3 focos de animación simultáneos en pantalla.
  3. El texto importante nunca depende de una animación para ser legible; las animaciones revelan, no ocultan.
  4. Las transiciones entre fases son continuas: el elemento que sale de una fase es literalmente el que entra en la siguiente.
  5. Glitch solo durante cambios de fase y en menos de 300 ms.
  6. Animar solo transform, opacity y filter en el DOM; nunca propiedades que causen layout.

## 6. Principios UI/UX
- Ley de los 5 segundos: nombre, rol y CTAs visibles en el primer render.
- Jerarquía clara: Proyectos es la sección con mayor peso visual y espacio.
- Dos rutas de usuario: el explorador (experiencia completa) y el reclutador (Vista Rápida + CV a un clic, siempre visibles).
- Feedback inmediato en cada interacción (hover, focus, active, loading, success, error).
- Las animaciones con scroll nunca secuestran el scroll: el usuario siempre controla la velocidad y puede retroceder. Nada de scroll bloqueado.
- Estados vacíos y de error diseñados (por ejemplo, si un video no carga, se muestra un póster).
- Móvil se rediseña, no se encoge: el AST pasa a árbol vertical, el chip pasa a tarjetas deslizables, las partículas se reducen un 70% y los gestos táctiles sustituyen al hover.

## 7. Stack técnico (con justificación)
- **Next.js (última versión estable, App Router) + React + TypeScript estricto**: SSR/SSG para SEO y contenido instantáneo, layouts persistentes que permiten un canvas WebGL que sobrevive entre rutas, Server Actions para el formulario.
- **Tailwind CSS v4**: tokens de diseño como variables CSS y estilos consistentes.
- **GSAP (ScrollTrigger, SplitText, Flip, MorphSVG, DrawSVG)**: coreografías complejas basadas en scroll, división de texto y transiciones de layout. Todos sus plugins son gratuitos.
- **Lenis**: scroll suave sincronizado con ScrollTrigger mediante el ticker de GSAP.
- **React Three Fiber + Drei + postprocessing + shaders GLSL propios**: escenas 3D (chip, partículas de tokens, pipeline de GPU), bloom y aberración cromática controlados.
- **Motion (Framer Motion)**: micro-interacciones y estados de componentes de UI (menús, toggles, tarjetas).
- **View Transitions API**: transiciones de elemento compartido entre el home y los casos de estudio, y el cambio de tema.
- **Zustand**: estado global (fase actual, tema, sonido, modo debug, Vista Rápida, calidad gráfica).
- **MDX + Shiki**: casos de estudio escritos en Markdown con código resaltado.
- **next-intl**: español e inglés.
- **React Hook Form + Zod + Resend**: formulario de contacto validado en cliente y servidor.
- **detect-gpu**: calidad gráfica adaptativa según el dispositivo.
- **Vercel**: despliegue, analytics y Speed Insights.
- **Playwright + Lighthouse CI**: tests end-to-end y control de rendimiento en cada PR.

## 8. Arquitectura
- Un único `<Canvas>` de R3F fijo en el layout raíz, renderizando cada escena en regiones del DOM mediante `<View>` de Drei (evita múltiples contextos WebGL).
- Escenas 3D cargadas de forma diferida (dynamic import) por sección; se pausan cuando no están visibles. `frameloop="demand"` cuando no hay movimiento.
- Todo el contenido (proyectos, habilidades, experiencia, experimentos) vive en archivos de datos tipados (`/content/*.ts` y `/content/cases/*.mdx`) para que yo pueda editarlo sin tocar componentes. Las relaciones habilidad↔proyecto se calculan automáticamente desde esos datos.
- Estructura sugerida:
  - `app/[locale]/` (páginas), `app/[locale]/projects/[slug]/` (casos de estudio)
  - `components/phases/` (una carpeta por fase: Source, Lexer, Parser, Bytecode, Runtime, Gpu, Display)
  - `components/systems/` (CallStack, Terminal, DebugOverlay, QuickView, Cursor, SoundManager)
  - `components/ui/` (primitivas reutilizables)
  - `webgl/` (escenas, shaders, materiales)
  - `motion/` (tokens de easing, timelines reutilizables, hooks como useScrollPhase)
  - `content/`, `lib/`, `styles/tokens.css`
- Componentes pequeños, sin lógica de animación mezclada con contenido: la coreografía vive en hooks/timelines separados.
- Limpieza obligatoria de timelines, ScrollTriggers y listeners al desmontar (gsap.context / useGSAP).

## 9. Rendimiento (presupuestos obligatorios)
- Lighthouse móvil: Performance ≥ 90, Accesibilidad, Buenas prácticas y SEO = 100.
- LCP < 2,5 s · CLS < 0,05 · INP < 200 ms · 60 fps estables en escritorio de gama media.
- JS inicial < 180 KB gzip (el chunk 3D se carga después del contenido principal).
- Modelos glTF comprimidos con Draco/Meshopt, texturas KTX2, imágenes AVIF/WebP con tamaños responsivos, videos cortos en WebM/MP4 con póster.
- Device pixel ratio limitado a 2; calidad adaptativa (partículas, postprocesado, sombras) según el tier de GPU y bajadas de FPS detectadas en tiempo real.

## 10. Accesibilidad y fallbacks
- `prefers-reduced-motion`: versión alternativa completa con fundidos suaves en lugar de transformaciones, sin parallax, sin escenas 3D en movimiento (se muestran ilustraciones estáticas de cada fase).
- Sin WebGL o GPU débil: fallback 2D con SVG/CSS que conserva la narrativa.
- HTML semántico, todo el contenido del canvas tiene equivalente en el DOM, landmarks, skip link, orden de foco lógico, foco visible estilizado como un caret brillante, `aria-live` en la terminal y en el resultado del formulario, contraste AA en ambos temas, navegación completa por teclado (incluido el árbol de habilidades).

## 11. SEO y contenido
- Metadatos por página, Open Graph dinámico (imagen generada con el estilo de cada fase), datos estructurados `Person` y `CreativeWork` por proyecto, sitemap, hreflang ES/EN.
- Textos breves y orientados a resultados: cada proyecto responde qué problema resolví, cómo y con qué impacto.

## 12. Orden de implementación
1. Design tokens, tipografías, layout base y modelo de contenido tipado.
2. Todas las secciones en HTML semántico y estático, funcionales y accesibles sin animación.
3. Lenis + GSAP: coreografías de scroll y transiciones entre fases.
4. Escenas WebGL y shaders, cargados de forma diferida.
5. Transiciones de página (View Transitions) y casos de estudio en MDX.
6. Sistemas globales: Call Stack, Terminal, Modo Debug, Vista Rápida, cursor, sonido.
7. Pase de rendimiento, reduced motion, fallbacks y accesibilidad.
8. Tests con Playwright, Lighthouse CI y despliegue en Vercel.

## 13. Criterios de aceptación
- La narrativa token → nodo → instrucción → proceso → vértice → píxel es continua y comprensible sin leer ninguna explicación.
- Cada habilidad está vinculada a al menos un proyecto que la demuestra.
- La Vista Rápida y el CV son accesibles en un clic desde cualquier punto del sitio.
- El sitio funciona completo con teclado, con reduced motion y sin WebGL.
- Se cumplen todos los presupuestos de rendimiento en móvil.
- El código es limpio, tipado, documentado y está listo para mostrarse públicamente en GitHub, porque también es parte del portafolio.

## Mis datos (rellenar)
- Nombre: [ ] · Rol: [ ] · Propuesta de valor en una frase: [ ]
- Proyectos (nombre, problema, rol, stack, métricas, enlaces): [ ]
- Habilidades con años y nivel: [ ]
- Experiencia (empresa, fechas, logros cuantificados): [ ]
- Redes, email y enlace al CV: [ ]
