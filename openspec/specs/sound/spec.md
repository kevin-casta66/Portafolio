## Purpose

Ofrecer un diseño sonoro opcional y sutil que refuerce la narrativa de máquina (ambiente por fase, sonidos de UI y respuesta a la velocidad del scroll), siempre bajo control explícito del visitante.

## Requirements

### Requirement: Preferencia inicial desde la puerta de arranque
El estado inicial del sonido SHALL ser el elegido por el visitante en la puerta de arranque ("Iniciar con sonido" / "Iniciar en silencio") y SHALL recordarse durante la sesión. Si el visitante no pasó por la puerta (visita posterior abreviada o puerta omitida), el sonido SHALL estar desactivado salvo que exista una preferencia guardada.

#### Scenario: Iniciar con sonido
- **WHEN** el visitante elige "▶ Iniciar con sonido" en la puerta de arranque
- **THEN** el audio queda habilitado de inmediato y el botón de sonido indica el estado activado

#### Scenario: Iniciar en silencio
- **WHEN** el visitante elige "Iniciar en silencio"
- **THEN** no se reproduce ningún sonido y el botón indica el estado desactivado

#### Scenario: Sin elección previa
- **WHEN** el visitante llega sin pasar por la puerta y sin preferencia guardada
- **THEN** el sonido está desactivado

### Requirement: Botón de silencio siempre visible
El sistema SHALL mostrar en todas las páginas un botón de sonido claramente visible con su estado accesible (activado/desactivado) que silencia o reactiva todo el audio al instante.

#### Scenario: Silenciar
- **WHEN** el sonido está activo y el visitante pulsa el botón de sonido
- **THEN** todo el audio (ambiente, UI y tono) se detiene en menos de 150 ms y el botón indica el estado desactivado

#### Scenario: Visible en cualquier ruta
- **WHEN** el visitante está en el home, un caso de estudio, la 404 o una vista secundaria
- **THEN** el botón de sonido está visible y operable con teclado

### Requirement: Ambiente por fase
Con el sonido activo el sistema SHALL reproducir un ambiente distinto por fase (por ejemplo, zumbido eléctrico en fases de CPU, clics de reloj en BYTECODE, ventiladores en GPU) y SHALL mezclar suavemente de un ambiente al siguiente al cambiar de fase, sin cortes audibles.

#### Scenario: Cambio de fase
- **WHEN** el sonido está activo y el visitante pasa de RUNTIME a GPU
- **THEN** el ambiente de RUNTIME se desvanece y el de GPU entra con un fundido cruzado

#### Scenario: Pestaña oculta
- **WHEN** la pestaña pasa a segundo plano
- **THEN** el audio se pausa y se reanuda al volver

### Requirement: Sonidos de interfaz
Con el sonido activo el sistema SHALL reproducir sonidos de UI sutiles en interacciones (tecleo del hero y de la terminal, activación de controles, avisos de logros), con un volumen inferior al del ambiente.

#### Scenario: Escritura en terminal
- **WHEN** el sonido está activo y el visitante escribe en la terminal
- **THEN** cada pulsación reproduce un clic sutil

### Requirement: Tono según velocidad del scroll
Con el sonido activo el sistema SHALL modular la altura de un tono continuo según la velocidad del scroll, con límites de altura y volumen, y SHALL volver suavemente al reposo cuando el scroll se detiene.

#### Scenario: Scroll rápido
- **WHEN** el visitante hace scroll rápido
- **THEN** la altura del tono sube de forma proporcional sin superar el límite configurado

#### Scenario: Reposo
- **WHEN** el scroll se detiene
- **THEN** el tono vuelve a su altura de reposo de forma suave

### Requirement: Carga diferida y persistencia
El sistema SHALL no descargar recursos de audio mientras el sonido esté desactivado y SHALL persistir la preferencia entre visitas.

#### Scenario: Sin descargas de audio
- **WHEN** el visitante navega con el sonido desactivado
- **THEN** no se solicita ningún recurso de audio por red

#### Scenario: Preferencia recordada
- **WHEN** el visitante activó el sonido y vuelve otro día
- **THEN** el botón muestra el sonido activado y el audio se reproduce tras su siguiente interacción
