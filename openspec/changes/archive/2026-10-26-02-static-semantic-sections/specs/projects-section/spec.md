## Purpose

Presentar los proyectos (etapa RUNTIME) como procesos en ejecución con métricas reales, media, enlaces y filtrado por tecnología; es la sección con mayor peso visual del sitio.

## ADDED Requirements

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
