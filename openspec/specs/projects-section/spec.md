## Purpose

Presentar los proyectos (etapa RUNTIME) como procesos en ejecución con métricas reales, media, enlaces y filtrado por tecnología; es la sección con mayor peso visual del sitio.

## Requirements

### Requirement: Tarjeta de proceso por proyecto
Cada proyecto SHALL mostrarse como una tarjeta con PID, estado (`running`, `deployed` u `open-source`), métricas reales definidas en el contenido, rol, stack, problema resuelto en una línea y enlaces "Demo en vivo", "Código" y "Caso de estudio" cuando existan.

#### Scenario: Enlace ausente
- **WHEN** un proyecto no define URL de código
- **THEN** su tarjeta no muestra el enlace "Código" y no hay enlaces vacíos ni rotos

#### Scenario: Estado no solo por color
- **WHEN** se renderiza una tarjeta
- **THEN** su estado aparece como texto además de cualquier indicador de color

### Requirement: Media con póster y fallback
Cada tarjeta SHALL mostrar una imagen o video corto con dimensiones reservadas para evitar desplazamientos de layout; los videos SHALL ser silenciados, sin controles de audio, con póster, y si el video no carga SHALL mostrarse el póster.

#### Scenario: Video que falla
- **WHEN** el archivo de video de un proyecto no puede cargarse
- **THEN** la tarjeta muestra el póster y el resto de la tarjeta permanece intacto

#### Scenario: Preferencia de movimiento reducido
- **WHEN** el visitante tiene activa la preferencia de movimiento reducido
- **THEN** los videos no se reproducen automáticamente y se muestra el póster

### Requirement: Filtro por tecnología como comando
La sección SHALL ofrecer un filtro presentado como el comando `ps aux | grep <tech>`, con opciones derivadas de las tecnologías presentes en los proyectos, que muestra solo los proyectos que usan la tecnología elegida, incluye una opción para mostrar todos y anuncia el número de resultados.

#### Scenario: Filtrar
- **WHEN** el visitante elige "react" en el filtro
- **THEN** solo quedan visibles los proyectos cuyo stack incluye React, el comando muestra `ps aux | grep react` y se anuncia el número de procesos encontrados

#### Scenario: Restablecer filtro
- **WHEN** el visitante elige la opción de mostrar todos
- **THEN** vuelven a mostrarse todos los proyectos

#### Scenario: Filtro operable por teclado
- **WHEN** el visitante usa solo el teclado
- **THEN** puede enfocar el filtro, cambiar la tecnología y ver el resultado sin usar el ratón

### Requirement: Enlace profundo desde habilidades
Cada tarjeta SHALL tener un identificador estable que permita enlazarla directamente (desde la sección de habilidades o por URL con ancla).

#### Scenario: Navegar a una tarjeta
- **WHEN** el visitante abre la URL con el ancla de un proyecto
- **THEN** la página se desplaza a esa tarjeta

### Requirement: Jerarquía visual dominante
La sección de proyectos SHALL ocupar más espacio vertical y mayor jerarquía tipográfica que cualquier otra sección de la página de inicio.

#### Scenario: Comparación de secciones
- **WHEN** se mide la altura renderizada de las secciones en escritorio
- **THEN** la sección de proyectos es la más alta de la página de inicio

### Requirement: Reordenado animado al filtrar
Al aplicar un filtro `ps aux | grep <tecnología>`, las tarjetas SHALL reordenarse animando su cambio de posición desde la posición anterior a la nueva; las tarjetas excluidas salen con fundido y las incluidas entran con fundido. El foco MUST conservarse en el control de filtro.

#### Scenario: Filtrar por tecnología
- **WHEN** el usuario aplica el filtro "react"
- **THEN** las tarjetas que no usan React salen, las restantes se desplazan animadamente a sus nuevas posiciones y el foco permanece en el filtro

### Requirement: T7 cambio de layout Grid / Lista
La sección de proyectos SHALL ofrecer un control de layout con las opciones Grid y Lista, operable con ratón, teclado y táctil, que indica la opción activa a tecnologías de asistencia. Al cambiar de layout, las tarjetas MUST reacomodarse animando su cambio de posición y tamaño desde el layout anterior al nuevo, sin saltos de contenido ni pérdida de foco, y el filtro activo MUST conservarse. El control MUST admitir opciones adicionales de layout añadidas por otros changes (vista Heap). Con movimiento reducido el cambio es un fundido.

#### Scenario: Pasar de Grid a Lista
- **WHEN** el usuario activa la opción Lista con el filtro "react" aplicado
- **THEN** las tarjetas filtradas se desplazan animadamente a su posición en la lista, el filtro sigue aplicado y el foco permanece en el control de layout

#### Scenario: Teclado y lector de pantalla
- **WHEN** el usuario navega el control de layout con teclado
- **THEN** puede elegir Grid o Lista y el lector anuncia la opción seleccionada

### Requirement: Inclinación 3D con reflejo especular
En dispositivos con puntero fino, al pasar el cursor sobre una tarjeta esta SHALL inclinarse sutilmente en 3D siguiendo el cursor y mostrar un reflejo especular que sigue su posición; al salir MUST volver a reposo con el spring de UI. En dispositivos táctiles no se aplica inclinación.

#### Scenario: Hover
- **WHEN** el cursor se mueve sobre la esquina superior derecha de una tarjeta
- **THEN** la tarjeta se inclina hacia esa esquina y el reflejo se desplaza a esa zona

#### Scenario: Táctil
- **WHEN** el dispositivo no tiene hover
- **THEN** la tarjeta no se inclina y el contenido no se altera

### Requirement: Video solo en viewport
Los videos de las tarjetas SHALL reproducirse en bucle, silenciados, solo mientras la tarjeta está en el viewport, y pausarse al salir. Si el video no carga MUST mostrarse su póster.

#### Scenario: Salida de viewport
- **WHEN** una tarjeta con video sale del viewport
- **THEN** el video se pausa

#### Scenario: Error de video
- **WHEN** el video falla al cargar
- **THEN** se muestra el póster sin espacio vacío ni error visible
