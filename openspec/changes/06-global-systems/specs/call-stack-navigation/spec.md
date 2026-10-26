## Purpose

Ofrecer una navegación global por las fases del pipeline presentada como una pila de llamadas, que indica en todo momento dónde está el visitante y permite saltar a cualquier fase.

## ADDED Requirements

### Requirement: Pila de frames de fases
El sistema SHALL mostrar en escritorio una barra lateral fija con las fases (SOURCE, LEXER, PARSER, BYTECODE, RUNTIME, GPU, DISPLAY) como frames apilados con notación de llamada (`main() › parser() › runtime()`), y SHALL resaltar la fase activa con el color de acento de esa fase.

#### Scenario: Fase activa resaltada
- **WHEN** el visitante hace scroll hasta la sección de proyectos
- **THEN** el frame `runtime()` se muestra activo con el acento ámbar y los frames anteriores aparecen como parte de la pila

#### Scenario: Cambio de fase al hacer scroll
- **WHEN** el visitante pasa de una sección a la siguiente
- **THEN** la barra actualiza el frame activo sin recargar la página ni mover el foco

### Requirement: Salto a una fase
El sistema SHALL permitir saltar a cualquier fase haciendo clic o activando con teclado su frame, desplazando hasta el inicio de la sección correspondiente y moviendo el foco a su encabezado.

#### Scenario: Salto con clic
- **WHEN** el visitante hace clic en el frame `parser()`
- **THEN** la página se desplaza hasta la sección de habilidades y el foco queda en su encabezado

#### Scenario: Salto con teclado
- **WHEN** el visitante enfoca el frame `display()` con Tab y pulsa Enter
- **THEN** la página se desplaza hasta la sección de contacto

### Requirement: Semántica accesible
La navegación SHALL exponerse como un landmark de navegación con nombre accesible, cada frame SHALL ser un enlace a su sección y el frame activo SHALL marcarse con `aria-current`.

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre la navegación estando en la sección de experiencia
- **THEN** anuncia el enlace `bytecode()` como elemento actual

### Requirement: Variante móvil compacta
En viewports móviles el sistema SHALL reemplazar la barra lateral por una barra inferior compacta que muestre la fase actual y un indicador de progreso del recorrido, sin cubrir contenido interactivo.

#### Scenario: Progreso en móvil
- **WHEN** el visitante en móvil ha recorrido la mitad de la página
- **THEN** la barra inferior muestra la fase actual y un indicador de progreso aproximadamente al 50%

#### Scenario: Abrir lista de fases en móvil
- **WHEN** el visitante toca la barra inferior
- **THEN** se despliega la lista de fases para saltar a cualquiera de ellas
