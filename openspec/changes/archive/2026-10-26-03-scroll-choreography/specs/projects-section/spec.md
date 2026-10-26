## ADDED Requirements

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
