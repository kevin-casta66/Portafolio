## Purpose

Convierte el scroll en ciclos de reloj: determina la fase activa del pipeline, interpola su color y proporciona la versión DOM/SVG de las transiciones entre fases (fallback de la versión en canvas), en la que el elemento que sale de una fase es el que entra en la siguiente.

## Requirements

### Requirement: Fase activa derivada del scroll
El sistema SHALL determinar en todo momento la fase activa (SOURCE, LEXER, PARSER, BYTECODE, RUNTIME, GPU, DISPLAY), el progreso dentro de cada transición y el progreso global a partir de la posición de scroll, y exponerlos como estado global consumible por otros sistemas (navegación, sonido, escenas 3D).

#### Scenario: Cambio de fase
- **WHEN** la sección de Habilidades ocupa el centro del viewport
- **THEN** la fase activa es PARSER

#### Scenario: Carga con ancla
- **WHEN** la página se abre directamente en `#projects`
- **THEN** la fase activa inicial es RUNTIME sin pasar visualmente por las fases previas

### Requirement: Color de acento interpolado con el scroll
El color de acento activo SHALL interpolarse de forma continua entre los acentos de fase consecutivos según el progreso de scroll, nunca cambiar de golpe; el fondo MUST teñirse con el acento activo a una opacidad entre 4 % y 6 %. En DISPLAY el acento es el gradiente de todos los acentos. Los colores MUST provenir de los design tokens en ambos temas.

#### Scenario: Paso de PARSER a BYTECODE
- **WHEN** el usuario se encuentra a mitad de la transición entre PARSER y BYTECODE
- **THEN** el acento activo es un color intermedio entre violeta y lima

#### Scenario: Tema claro
- **WHEN** el tema "Datasheet" está activo
- **THEN** la interpolación usa los acentos oscurecidos del tema claro y el texto mantiene contraste AA

### Requirement: Selección de versión de cada transición
Cada transición entre fases del catálogo (T2, T3, T4, T5, T8, T9) SHALL tener una versión DOM/SVG que se usa cuando la versión en canvas no está disponible: tier gráfico bajo, ausencia de WebGL/WebGPU o canvas aún no cargado. Cuando el usuario prefiere movimiento reducido MUST usarse la variante reducida de la fila correspondiente de la tabla de especificación de movimiento. La versión DOM/SVG y la versión en canvas MUST mostrar el mismo contenido de partida y de llegada, y el cambio entre versiones (p. ej. al cargarse el canvas o al bajar de tier) MUST NOT producir saltos de contenido.

#### Scenario: Sin WebGL
- **WHEN** el navegador no ofrece WebGL ni WebGPU
- **THEN** todas las transiciones entre fases se reproducen en su versión DOM/SVG y el recorrido completo es continuo

#### Scenario: Canvas cargado a mitad de recorrido
- **WHEN** la escena 3D termina de cargar mientras el usuario está en LEXER
- **THEN** las transiciones siguientes usan la versión en canvas y la transición en curso termina sin saltos

#### Scenario: Movimiento reducido
- **WHEN** el usuario prefiere movimiento reducido
- **THEN** cada transición usa la variante reducida indicada en su fila de la tabla de movimiento (fundidos, sin profundidad ni desplazamientos amplios)

### Requirement: T2 SOURCE → LEXER (versión DOM)
Al hacer scroll desde el Hero, la línea `const dev = new Developer("…")` SHALL fragmentarse en sus tokens (`const`, `dev`, `=`, `new`, `Developer`, `(`, `"…"`, `)`), colorearse según su tipo y desplazarse con profundidad simulada por escala hacia los carriles de LEXER, sincronizado (scrubbed) con el scroll. Con movimiento reducido, los tokens MUST aparecer con un fundido escalonado.

#### Scenario: Scrub de fragmentación
- **WHEN** el usuario desplaza el 50 % de la transición
- **THEN** los tokens están separados, coloreados por tipo y a mitad de su trayectoria

### Requirement: T3 LEXER → PARSER (versión DOM/SVG)
Los tokens de la biografía SHALL volar desde sus carriles y acoplarse como nodos del árbol de habilidades mediante animación de posición basada en primera/última posición, de modo que el árbol crezca desde arriba; en esta versión las ramas MUST dibujarse como trazos SVG que crecen desde la raíz.

#### Scenario: Tokens se vuelven nodos
- **WHEN** termina la transición LEXER → PARSER
- **THEN** los elementos animados ocupan exactamente las posiciones de los nodos del árbol, las ramas están dibujadas y el árbol queda interactivo

### Requirement: T4 PARSER → BYTECODE (versión DOM)
El árbol SHALL aplanarse colapsando sus nodos en orden de recorrido post-order hasta formar una columna lineal que se convierte en la lista vertical de instrucciones de BYTECODE, cuyas funciones se revelan con el scroll. Con movimiento reducido MUST mostrarse solo el revelado de la lista.

#### Scenario: Orden de colapso
- **WHEN** se reproduce la transición
- **THEN** cada hoja colapsa antes que su rama padre y la raíz "Developer" colapsa la última

#### Scenario: Lista resultante
- **WHEN** termina la transición
- **THEN** las instrucciones forman una lista vertical que se revela función a función al hacer scroll

### Requirement: T5 BYTECODE → RUNTIME (versión DOM/SVG)
Un barrido teñido con el acento ámbar SHALL recorrer la pantalla siguiendo el scroll y, bajo él, las instrucciones MUST convertirse en los procesos de RUNTIME, cuyos núcleos/tarjetas se encienden uno a uno.

#### Scenario: Carga en núcleos
- **WHEN** el barrido completa su recorrido
- **THEN** todas las tarjetas de proyectos están visibles y se han encendido en orden

### Requirement: T8 RUNTIME → GPU (versión DOM/SVG)
La representación del chip SHALL pixelarse progresivamente con el scroll (celdas cada vez mayores) hasta convertirse en una malla de puntos unidos por triángulos que da paso a la sección GPU.

#### Scenario: Rasterización
- **WHEN** el usuario está al 50 % de la transición
- **THEN** el chip se muestra pixelado y empiezan a verse vértices y aristas

### Requirement: T9 GPU → DISPLAY (versión DOM/SVG)
Los píxeles de la sección GPU SHALL migrar con el scroll hasta formar la silueta del monitor de DISPLAY, y el gradiente espectral de todos los acentos MUST aparecer en el momento del ensamblaje.

#### Scenario: Convergencia
- **WHEN** termina la transición
- **THEN** los píxeles forman el marco del monitor que contiene el formulario de contacto y el acento activo es el gradiente espectral

### Requirement: Continuidad entre fases
Cada transición de fase SHALL ser continua en cualquiera de sus versiones: el elemento que sale de una fase MUST ser el que entra en la siguiente, sin cortes a negro ni saltos de contenido.

#### Scenario: Recorrido completo
- **WHEN** el usuario recorre el home de principio a fin
- **THEN** cada sección enlaza con la siguiente mediante un elemento visual compartido

### Requirement: T11 glitch del título de fase (versión DOM)
En cada cambio de fase, el título de la fase entrante SHALL sufrir un glitch de desplazamiento de canales de color de menos de 300 ms. El glitch MUST aparecer únicamente en cambios de fase (y en la página 404), no repetirse mientras la fase no cambie y no afectar a la legibilidad del título una vez terminado. Con movimiento reducido no se reproduce.

#### Scenario: Duración del glitch
- **WHEN** se cruza el umbral entre dos fases
- **THEN** el título de la nueva fase muestra un glitch < 300 ms que no se repite mientras la fase no cambie

#### Scenario: Movimiento reducido
- **WHEN** el usuario prefiere movimiento reducido y cruza un cambio de fase
- **THEN** no se reproduce ningún glitch
