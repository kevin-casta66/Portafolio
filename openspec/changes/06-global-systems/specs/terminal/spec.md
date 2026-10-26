## Purpose

Proporcionar una terminal interactiva oculta que permite explorar el portafolio mediante comandos, demostrando dominio de interfaces de línea de comandos accesibles.

## ADDED Requirements

### Requirement: Apertura y cierre
El sistema SHALL abrir la terminal al pulsar `~` (fuera de campos de texto) o al activar su botón en el menú, SHALL mover el foco a la línea de entrada al abrir, SHALL cerrarla con Escape o con su botón de cierre, y SHALL devolver el foco al elemento que la abrió.

#### Scenario: Abrir con teclado
- **WHEN** el visitante pulsa `~` con el foco fuera de un campo de texto
- **THEN** la terminal se abre y el foco queda en la línea de entrada

#### Scenario: Cerrar con Escape
- **WHEN** la terminal está abierta y el visitante pulsa Escape
- **THEN** la terminal se cierra y el foco vuelve al elemento que tenía antes de abrirla

#### Scenario: Foco contenido
- **WHEN** la terminal está abierta y el visitante pulsa Tab repetidamente fuera de la línea de entrada
- **THEN** el foco permanece dentro de la terminal

### Requirement: Comandos soportados
La terminal SHALL soportar los comandos `help`, `about`, `projects`, `skills`, `cv`, `contact`, `theme`, `debug` y `clear`, generando su salida a partir del contenido tipado del sitio.

#### Scenario: help
- **WHEN** el visitante ejecuta `help`
- **THEN** la terminal lista todos los comandos con una descripción breve

#### Scenario: projects
- **WHEN** el visitante ejecuta `projects`
- **THEN** la terminal lista los proyectos con nombre, estado y enlace a su caso de estudio

#### Scenario: cv
- **WHEN** el visitante ejecuta `cv`
- **THEN** se inicia la descarga del CV y la terminal confirma la acción

#### Scenario: theme
- **WHEN** el visitante ejecuta `theme`
- **THEN** el tema alterna entre oscuro y claro y la terminal informa el tema activo

#### Scenario: debug
- **WHEN** el visitante ejecuta `debug`
- **THEN** el modo Debug alterna su estado y la terminal informa si está activo

#### Scenario: clear
- **WHEN** el visitante ejecuta `clear`
- **THEN** se borra la salida acumulada de la terminal

### Requirement: Comando desconocido
La terminal SHALL responder a un comando no reconocido con un mensaje de error que sugiera el comando más parecido, si existe, y recuerde `help`.

#### Scenario: Error tipográfico
- **WHEN** el visitante ejecuta `projetcs`
- **THEN** la terminal muestra `command not found: projetcs` y sugiere `projects`

### Requirement: Autocompletado e historial
La terminal SHALL autocompletar el comando con Tab cuando el prefijo sea único y mostrar las opciones cuando sea ambiguo, y SHALL permitir recorrer los comandos ejecutados con las flechas arriba y abajo.

#### Scenario: Autocompletar
- **WHEN** el visitante escribe `sk` y pulsa Tab
- **THEN** la entrada se completa a `skills`

#### Scenario: Prefijo ambiguo
- **WHEN** el visitante escribe `c` y pulsa Tab
- **THEN** la terminal muestra `clear`, `contact` y `cv` como opciones

#### Scenario: Historial
- **WHEN** el visitante ha ejecutado `about` y luego `skills` y pulsa flecha arriba dos veces
- **THEN** la entrada muestra `about`

### Requirement: Anuncios accesibles
La salida de cada comando SHALL anunciarse a tecnologías de asistencia mediante una región viva educada, y la terminal SHALL exponerse como diálogo con nombre accesible.

#### Scenario: Salida anunciada
- **WHEN** el visitante ejecuta `about` con un lector de pantalla activo
- **THEN** el lector anuncia la salida del comando sin que el foco abandone la entrada

### Requirement: Logro de acceso root
La primera apertura de la terminal SHALL desbloquear el logro `root_access`.

#### Scenario: Primera apertura
- **WHEN** el visitante abre la terminal por primera vez
- **THEN** se desbloquea `root_access` sin mover el foco fuera de la línea de entrada
