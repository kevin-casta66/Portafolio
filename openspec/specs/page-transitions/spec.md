## Purpose

Dar continuidad visual entre el home y los casos de estudio mediante una transición cinematográfica en el canvas persistente, y animar los cambios de UI (tema, filtros, menú), degradando a versiones 2D, fundidos o cambios instantáneos según soporte, tier gráfico y preferencia de movimiento.

## Requirements

### Requirement: Transición cinematográfica tarjeta → caso
Al abrir un caso desde una tarjeta de proyecto, el sistema SHALL animar en el canvas persistente el gemelo gráfico de la tarjeta expandiéndose desde el rectángulo exacto de la tarjeta hasta ocupar la pantalla, con distorsión de lente y aberración cromática limitadas a los bordes, mostrando el texto "Attaching debugger…", y esa superficie SHALL convertirse sin corte en la cabecera de la página del caso. La transición SHALL funcionar sin depender de APIs experimentales del navegador.

#### Scenario: Versión completa
- **WHEN** el visitante completa un Hold-to-Execute sobre una tarjeta en tier alto o medio
- **THEN** la tarjeta se expande a pantalla completa con "Attaching debugger…" y termina en la página del caso sin parpadeo, sin salto de layout y con la cabecera ocupando la posición final de la superficie expandida

#### Scenario: Versión corta
- **WHEN** el visitante activa la tarjeta con un clic normal o con Enter
- **THEN** se ejecuta una versión abreviada de la misma expansión que concluye en un máximo de 500 ms

#### Scenario: Duración acotada
- **WHEN** se ejecuta la versión completa de la transición tarjeta → caso
- **THEN** concluye en un máximo de 1200 ms y la página del caso es interactiva al terminar

#### Scenario: Navegador sin transiciones de vista
- **WHEN** el visitante abre un caso en un navegador sin soporte de transiciones de vista pero con WebGPU o WebGL2
- **THEN** la transición cinematográfica se ejecuta igual que en un navegador con soporte

### Requirement: Transición inversa al volver al home
Al volver del caso al home (enlace o botón atrás del navegador), el sistema SHALL invertir la transición en el canvas, contrayendo la cabecera hasta la tarjeta de origen, y SHALL restaurar la posición de scroll previa en la sección de proyectos.

#### Scenario: Botón atrás
- **WHEN** el visitante pulsa atrás del navegador desde un caso abierto desde una tarjeta
- **THEN** la cabecera se contrae hacia esa tarjeta y el home queda en la misma posición de scroll que antes de abrir el caso

#### Scenario: Entrada directa
- **WHEN** el visitante llegó al caso por URL directa y navega al home
- **THEN** el home se muestra en la sección de proyectos con un fundido simple

### Requirement: Transiciones de UI
El cambio de tema, el reordenado por filtros y la apertura/cierre del menú SHALL animarse con transiciones de vista cuando el navegador las soporte; el cambio de tema SHALL revelarse en un círculo creciente con origen en el botón. Sin soporte, el sistema SHALL usar una animación equivalente basada en posiciones medidas (técnica FLIP) sin pérdida de funcionalidad.

#### Scenario: Cambio de tema con soporte
- **WHEN** el visitante activa el toggle de tema en un navegador con soporte
- **THEN** el nuevo tema se revela en un círculo creciente con origen en el botón y la preferencia queda persistida

#### Scenario: Filtros sin soporte
- **WHEN** el visitante aplica un filtro de proyectos en un navegador sin transiciones de vista
- **THEN** las tarjetas se reordenan con animación FLIP y el resultado filtrado es idéntico al de un navegador con soporte

### Requirement: Degradación progresiva
Con tier gráfico bajo o sin WebGL, la transición de página SHALL degradar a una versión 2D (expansión de la tarjeta en el DOM) o a navegación instantánea; con `prefers-reduced-motion: reduce`, la navegación y los cambios de UI SHALL producirse con un fundido ≤ 200 ms o de forma instantánea. En ningún caso SHALL perderse funcionalidad ni aparecer errores.

#### Scenario: Tier bajo
- **WHEN** el visitante en tier bajo abre un caso
- **THEN** la tarjeta se expande en 2D o la página cambia instantáneamente, sin intentar renderizar la versión con lente y aberración

#### Scenario: Sin WebGL
- **WHEN** el visitante sin WebGPU ni WebGL abre un caso
- **THEN** la página del caso se carga normalmente sin errores en consola

#### Scenario: Movimiento reducido
- **WHEN** el visitante con reduced motion cambia de tema o abre un caso
- **THEN** no hay expansión, distorsión ni revelado circular; el cambio es instantáneo o un fundido ≤ 200 ms

### Requirement: Persistencia del canvas entre rutas
El canvas gráfico global SHALL persistir al navegar entre home y casos de estudio, sin recrear el contexto gráfico, y los recursos exclusivos de la transición SHALL liberarse al terminar.

#### Scenario: Ida y vuelta
- **WHEN** el visitante navega home → caso → home
- **THEN** se mantiene un único contexto gráfico durante toda la navegación

#### Scenario: Liberación de recursos
- **WHEN** termina una transición tarjeta → caso
- **THEN** las texturas y render targets creados solo para la transición se liberan y la memoria de GPU vuelve a su nivel previo en navegaciones repetidas

### Requirement: Accesibilidad de la navegación
Tras cada transición de página, el foco SHALL moverse al encabezado principal de la página destino y el cambio SHALL anunciarse a tecnologías de asistencia.

#### Scenario: Foco tras navegar
- **WHEN** termina la transición hacia un caso de estudio
- **THEN** el foco está en el `h1` del caso y un lector de pantalla anuncia el título de la nueva página
