## Purpose

Ofrecer una vista de mundo «Memory Heap» donde todos los proyectos y experimentos se exploran como bloques de memoria en una cuadrícula infinita, con reorganización, lente de vidrio y equivalentes accesibles, reforzando la narrativa COMPILE.

## ADDED Requirements

### Requirement: Ruta Memory Heap por idioma
El sistema SHALL exponer la vista Memory Heap en `/<locale>/heap` para cada idioma soportado (es, en). La página MUST renderizarse en el servidor con todos los bloques presentes en el HTML inicial, antes de cargar cualquier capa animada o 3D.

#### Scenario: Acceso directo a la ruta
- **WHEN** un visitante abre `/es/heap` con JavaScript desactivado
- **THEN** la página muestra un encabezado, el número total de bloques y la lista completa de proyectos y experimentos con sus enlaces

#### Scenario: Idioma inglés
- **WHEN** un visitante abre `/en/heap`
- **THEN** todos los textos de interfaz de la vista aparecen en inglés y los enlaces de los bloques apuntan a rutas `/en/...`

### Requirement: Bloques de memoria derivados del contenido
Cada proyecto y cada experimento del contenido SHALL aparecer exactamente una vez como bloque de memoria. Cada bloque MUST mostrar una dirección hexadecimal, su tipo (proyecto o experimento), nombre, año y tecnologías. La dirección MUST derivarse de forma determinista del identificador del elemento, de modo que sea estable entre visitas, builds y layouts, y única dentro del heap.

#### Scenario: Cobertura completa
- **WHEN** el contenido contiene 6 proyectos y 4 experimentos
- **THEN** la vista muestra 10 bloques, uno por elemento, sin duplicados

#### Scenario: Dirección estable
- **WHEN** el visitante recarga la página o se reorganiza el heap
- **THEN** cada bloque conserva la misma dirección hexadecimal

#### Scenario: Contenido nuevo
- **WHEN** el autor añade un proyecto al contenido y vuelve a construir el sitio
- **THEN** aparece un bloque nuevo con una dirección distinta de todas las existentes, sin cambiar componentes

### Requirement: Cuadrícula infinita arrastrable con inercia
En la experiencia completa, los bloques SHALL presentarse en una cuadrícula que se repite sin bordes visibles en ambas direcciones. El visitante MUST poder desplazarla arrastrando con ratón o con el dedo, y con rueda o trackpad; al soltar, el movimiento MUST continuar con inercia y desacelerar hasta detenerse. El arrastre MUST NOT bloquear el scroll de la página fuera del área del heap ni impedir el uso de los controles.

#### Scenario: Arrastre con ratón
- **WHEN** el visitante arrastra la cuadrícula y suelta con velocidad
- **THEN** la cuadrícula sigue desplazándose y se detiene suavemente, y al seguir avanzando en la misma dirección vuelven a aparecer bloques sin huecos

#### Scenario: Arrastre táctil
- **WHEN** el visitante desliza el dedo sobre la cuadrícula en un móvil
- **THEN** la cuadrícula se desplaza con inercia y un toque breve sobre un bloque lo selecciona en lugar de arrastrar

#### Scenario: Clic frente a arrastre
- **WHEN** el visitante arrastra más de un umbral pequeño y suelta sobre un bloque
- **THEN** el bloque no se abre

### Requirement: Lente de vidrio sobre el heap
En tiers de calidad medio y alto, con puntero fino y sin reduced motion, SHALL mostrarse una lente de vidrio que sigue al cursor, amplía y refracta los bloques que tiene debajo. La lente MUST NOT ocultar texto esencial de forma permanente y MUST desaparecer en tier bajo, en dispositivos táctiles y con reduced motion. Cualquier texto sobre la lente MUST cumplir contraste AA en ambos temas.

#### Scenario: Lente en escritorio
- **WHEN** un visitante en escritorio con tier alto mueve el cursor sobre el heap
- **THEN** la lente sigue al cursor y los bloques bajo ella aparecen ampliados y refractados

#### Scenario: Tier bajo
- **WHEN** el dispositivo está en tier bajo o el tier baja en caliente por caída de FPS
- **THEN** la lente deja de mostrarse sin recargar la página

### Requirement: Reorganización «Run GC»
La vista SHALL ofrecer un control «Run GC» que reorganiza los bloques agrupándolos por tecnología o por año, a elección del visitante. La reorganización MUST animarse de forma continua (cada bloque viaja desde su posición anterior hasta la nueva), MUST indicar el criterio activo y MUST anunciar el resultado a tecnologías de asistencia. El orden elegido MUST reflejarse también en la lista accesible.

#### Scenario: Agrupar por tecnología
- **WHEN** el visitante elige «tecnología» y activa «Run GC»
- **THEN** los bloques se desplazan animadamente hasta quedar agrupados bajo etiquetas de tecnología y un mensaje anuncia, por ejemplo, «GC completado: 10 bloques agrupados por tecnología»

#### Scenario: Agrupar por año
- **WHEN** el visitante elige «año» y activa «Run GC»
- **THEN** los bloques se reorganizan en orden cronológico agrupados por año

#### Scenario: Estado compartible
- **WHEN** el visitante copia la URL tras reorganizar
- **THEN** al abrirla de nuevo la vista aparece con el mismo criterio de agrupación

### Requirement: Navegación por teclado y equivalente accesible
La cuadrícula SHALL ser operable por completo con teclado: un único punto de tabulación da acceso a la cuadrícula, las flechas mueven el foco entre bloques adyacentes (desplazando la vista para que el bloque enfocado sea visible), Inicio/Fin van al primer y último bloque, y Enter abre el bloque. El foco MUST ser visible con el estilo global de foco. Además, MUST existir una lista accesible equivalente con el mismo contenido y orden, disponible para lectores de pantalla y visible mediante un conmutador «Ver como lista».

#### Scenario: Flechas del teclado
- **WHEN** el foco está en un bloque y el visitante pulsa flecha derecha
- **THEN** el foco pasa al bloque adyacente, la vista se desplaza si hace falta y el bloque enfocado muestra el foco visible

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre la página
- **THEN** encuentra una lista con todos los bloques, cada uno con dirección, tipo, nombre, año, tecnologías y enlace, sin depender del canvas

#### Scenario: Vista de lista
- **WHEN** el visitante activa «Ver como lista»
- **THEN** la cuadrícula se sustituye por la lista y la preferencia se mantiene durante la sesión

### Requirement: Abrir un bloque
Abrir un bloque de proyecto SHALL llevar a su caso de estudio usando las mismas interacciones que RUNTIME: clic o Enter abre con la transición corta y mantener pulsado (puntero, dedo o Espacio) ejecuta Hold-to-Execute completo. Un proyecto sin caso de estudio y los experimentos MUST abrir su destino propio (demo o experimento en la sección GPU) con un enlace válido.

#### Scenario: Hold-to-Execute en el heap
- **WHEN** el visitante mantiene pulsado un bloque de proyecto con caso de estudio durante el tiempo de ejecución
- **THEN** se completa el anillo de progreso y el bloque se expande hasta convertirse en la cabecera del caso de estudio

#### Scenario: Experimento
- **WHEN** el visitante abre un bloque de experimento
- **THEN** navega al experimento correspondiente del laboratorio

### Requirement: Modo Heap desde RUNTIME
El conmutador de layout de la sección RUNTIME (Grid / Lista / Heap) SHALL incluir la opción Heap. Al elegirla, las tarjetas de proyecto MUST transformarse en bloques de memoria de forma continua, sin cortes visibles, y la URL MUST pasar a la ruta `/heap` del idioma actual. Volver atrás en el historial MUST regresar a RUNTIME con el layout anterior y la posición de scroll restaurada.

#### Scenario: Entrar desde el home
- **WHEN** el visitante pulsa «Heap» en el conmutador de RUNTIME
- **THEN** cada tarjeta se convierte en su bloque sin desaparecer ni saltar, y la barra de direcciones muestra `/<locale>/heap`

#### Scenario: Volver
- **WHEN** el visitante usa el botón atrás del navegador desde `/heap` al que llegó desde RUNTIME
- **THEN** vuelve a la sección RUNTIME en la misma posición de scroll y con el layout previo

### Requirement: Logro heap_explorer
La primera vez que un visitante entra en la vista Memory Heap SHALL desbloquearse el logro `heap_explorer`, sin bloquear ni interrumpir la navegación. Visitas posteriores MUST NOT volver a notificarlo.

#### Scenario: Primera visita
- **WHEN** un visitante entra por primera vez en `/heap`
- **THEN** aparece el aviso discreto `ACHIEVEMENT_UNLOCKED: heap_explorer` y el contador de logros aumenta en uno

#### Scenario: Visita repetida
- **WHEN** el mismo visitante vuelve a entrar en `/heap`
- **THEN** no aparece ningún aviso nuevo

### Requirement: Alternativas sin movimiento y sin WebGL
Con preferencia de movimiento reducido, sin WebGL disponible o en tier bajo, la vista SHALL presentar los bloques como una cuadrícula 2D estática o lista con el mismo contenido, orden y controles. «Run GC» MUST reordenar con un fundido en lugar de trayectorias, y MUST NOT haber inercia, lente ni parallax.

#### Scenario: Reduced motion
- **WHEN** el visitante tiene activada la preferencia de movimiento reducido
- **THEN** ve una cuadrícula estática navegable con teclado y «Run GC» cambia el orden con un fundido

#### Scenario: Sin WebGL
- **WHEN** el navegador no ofrece contexto gráfico 3D
- **THEN** la vista muestra todos los bloques en 2D con sus direcciones y enlaces, sin mensajes de error visibles

### Requirement: Rendimiento de la vista
La vista Memory Heap SHALL respetar el presupuesto por escena activa (menos de 100 llamadas de dibujo) independientemente del número de bloques, y su código MUST cargarse solo al entrar en `/heap` o al elegir el modo Heap, sin aumentar el JS inicial del home. Arrastrar o reorganizar MUST NOT degradar la respuesta a interacciones por encima de 200 ms.

#### Scenario: Presupuesto de dibujo
- **WHEN** el Modo Debug está activo en `/heap` con todos los bloques visibles
- **THEN** el contador de llamadas de dibujo muestra menos de 100

#### Scenario: Carga diferida
- **WHEN** se carga el home sin visitar `/heap`
- **THEN** ningún recurso específico del heap se descarga

### Requirement: Metadatos de la ruta
La ruta `/heap` SHALL tener título, descripción, URL canónica, alternativas hreflang es/en e imagen Open Graph propias, y MUST figurar en el sitemap.

#### Scenario: Metadatos presentes
- **WHEN** un rastreador solicita `/es/heap`
- **THEN** el HTML incluye título y descripción propios, canonical a `/es/heap` y enlaces alternos a `/en/heap` y `/es/heap`
