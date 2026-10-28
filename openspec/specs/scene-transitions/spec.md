## Purpose

Define las transiciones 3D entre fases del catálogo de movimiento (T2, T3, T4, T5, T8, T9, T11), garantizando que el elemento que sale de una fase sea literalmente el que entra en la siguiente, que el usuario controle siempre la velocidad y que exista un fallback equivalente.

## Requirements

### Requirement: Transiciones controladas por scroll y reversibles
Toda transición de este catálogo disparada por scroll SHALL avanzar en proporción al scroll, MUST poder recorrerse hacia atrás con el mismo resultado y MUST NOT bloquear ni alterar la velocidad del scroll nativo.

#### Scenario: Retroceso a mitad de transición
- **WHEN** el usuario retrocede a mitad de una transición
- **THEN** la transición se deshace en proporción al scroll sin saltos

#### Scenario: Scroll muy rápido
- **WHEN** el usuario cruza una transición en un solo gesto rápido
- **THEN** la página no se detiene ni se bloquea y la transición queda en el estado correspondiente a la posición final

### Requirement: Mezcla de escenas saliente y entrante
Durante una transición entre fases, el sistema SHALL componer la escena saliente y la entrante mediante una máscara propia de la transición, de modo que ambas sean visibles en la zona de cruce y no haya cortes ni fotogramas en negro.

#### Scenario: Pantalla de alta densidad
- **WHEN** una transición se reproduce en una pantalla con densidad de píxeles 2
- **THEN** la composición cubre todo el viewport, alineada con el contenido DOM, sin quedar recortada ni desplazada

#### Scenario: Cruce entre fases
- **WHEN** el scroll está en mitad de la transición entre dos fases
- **THEN** se ven partes de ambas escenas separadas por la máscara de la transición

### Requirement: T2 Tokenización por disolución (SOURCE → LEXER)
La línea de código del hero SHALL disolverse de izquierda a derecha siguiendo un umbral de ruido animado; cada glifo MUST emitir partículas que se reagrupan formando los tokens coloreados del Lexer, con brillo solo en el borde de disolución.

#### Scenario: Scroll de SOURCE a LEXER en tier alto
- **WHEN** el usuario avanza de SOURCE a LEXER
- **THEN** la línea se disuelve de izquierda a derecha y sus partículas forman los tokens del Lexer

#### Scenario: Fallback
- **WHEN** el tier es bajo o reduced motion está activo
- **THEN** los tokens del Lexer aparecen con fundido escalonado (fallback del change 03)

### Requirement: T3 Ensamblaje del árbol con tubos iluminados (LEXER → PARSER)
Las ramas del árbol de habilidades SHALL dibujarse como tubos iluminados que crecen a lo largo de curvas, recorridos por un pulso de luz, mientras los tokens viajan a sus nodos. En escritorio los tubos MUST cubrir TODO el árbol: cada tubo va del borde derecho del nodo padre al izquierdo del hijo sin cruzar sus rótulos, crece con el scroll hasta llegar a su nodo cuando este aparece y MUST permanecer visible mientras el visitante está en PARSER. Plegar o desplegar una rama MUST recalcular los tubos, que nunca apuntan a nodos plegados u ocultos. En los escenarios de demostración (`/motion`, `/prototypes`) la transición se recorre con el tiempo y los tubos se desvanecen al final.

#### Scenario: Llegada a PARSER
- **WHEN** el usuario avanza de LEXER a PARSER
- **THEN** los tubos crecen hacia cada nodo y un pulso de luz los recorre

#### Scenario: Tubos persistentes
- **WHEN** el usuario sigue desplazándose por PARSER
- **THEN** cada categoría y tecnología que aparece recibe su tubo y los anteriores siguen visibles

#### Scenario: Rama plegada
- **WHEN** el usuario pliega una rama del árbol
- **THEN** desaparecen los tubos hacia sus hijos y los del resto del árbol se recolocan sobre sus nodos

#### Scenario: Fallback
- **WHEN** el tier es bajo o reduced motion está activo
- **THEN** las ramas se dibujan como trazos vectoriales (fallback del change 03)

### Requirement: T4 Aplanado al túnel (PARSER → BYTECODE)
El árbol SHALL colapsar en recorrido post-order y las instrucciones resultantes MUST formar un túnel por el que la cámara avanza con el scroll, donde cada empleo es un anillo del túnel.

#### Scenario: Avance por BYTECODE
- **WHEN** el usuario avanza por BYTECODE
- **THEN** la cámara recorre el túnel y cada anillo corresponde a un empleo en el mismo orden que el DOM

#### Scenario: Fallback
- **WHEN** el tier es bajo o reduced motion está activo
- **THEN** la experiencia se muestra como lista vertical con revelado por scroll

### Requirement: T5 Carga en núcleos con barrido de dithering (BYTECODE → RUNTIME)
La transición SHALL ser un barrido en espacio de pantalla con máscara de dithering ordenado teñida con el acento ámbar, bajo el cual aparece el die con sus núcleos encendiéndose uno a uno.

#### Scenario: Llegada a RUNTIME
- **WHEN** el usuario avanza de BYTECODE a RUNTIME
- **THEN** el barrido con patrón de dithering revela el chip y sus núcleos se encienden en secuencia

### Requirement: T8 Rasterización (RUNTIME → GPU)
La imagen del chip SHALL pixelarse progresivamente con el scroll hasta convertirse en una malla de vértices que se triangula en tiempo real.

#### Scenario: Avance a GPU
- **WHEN** el usuario avanza de RUNTIME a GPU
- **THEN** el tamaño de píxel del chip crece y la imagen se convierte en una malla triangulada

### Requirement: T9 Convergencia de píxeles (GPU → DISPLAY)
Los píxeles de la fase GPU SHALL migrar como partículas hacia la silueta del monitor, y el gradiente espectral de todos los acentos MUST aparecer en el momento del ensamblaje.

#### Scenario: Llegada a DISPLAY
- **WHEN** el usuario avanza de GPU a DISPLAY
- **THEN** los píxeles convergen en el monitor y aparece el gradiente espectral al completarse

### Requirement: T11 Glitch de títulos
En cada cambio de fase, el título de la fase entrante SHALL sufrir un glitch de desplazamiento de canales de color y salto de desplazamiento del glifo de duración menor a 300 ms; el mismo efecto MUST aplicarse en la página 404. Con reduced motion el glitch MUST omitirse.

#### Scenario: Cambio de fase
- **WHEN** el scroll entra en una nueva fase
- **THEN** su título hace glitch durante menos de 300 ms y queda legible al terminar

### Requirement: Prototipo aislado por transición
Cada transición de este catálogo SHALL tener un prototipo ejecutable de forma aislada, con un control de progreso manual, antes de integrarse en el flujo completo.

#### Scenario: Revisión de un prototipo
- **WHEN** se abre el prototipo de una transición en entorno de desarrollo
- **THEN** la transición se reproduce sola, sin el resto del sitio, y su progreso se puede mover manualmente de 0 a 1

### Requirement: Fallbacks de tier bajo y reduced motion
Toda transición de este catálogo MUST tener un fallback DOM/2D definido en la coreografía del change 03 que conserve la misma narrativa, y el sistema SHALL usarlo en tier bajo, sin backend 3D o con reduced motion.

#### Scenario: Sin backend 3D
- **WHEN** el lienzo 3D no está disponible
- **THEN** todas las fases se recorren con sus transiciones de fallback y sin huecos visuales
