## Purpose

Permitir "ejecutar" un proyecto manteniendo pulsado su proceso, como gesto que demuestra dominio de interacción y dispara la transición completa al caso de estudio, sin sustituir nunca la apertura con un clic, teclado o toque.

## Requirements

### Requirement: Mantener pulsado para ejecutar
Sobre cada proceso (tarjeta de proyecto con caso de estudio), mantener pulsado el puntero SHALL mostrar un anillo de progreso alrededor del cursor con el texto "Ejecutando…" que se completa en aproximadamente 800 ms; al completarse SHALL iniciarse la versión completa de la transición tarjeta → caso.

#### Scenario: Hold completo con ratón
- **WHEN** el visitante mantiene pulsado el botón principal del ratón sobre una tarjeta durante 800 ms
- **THEN** el anillo se completa, aparece "Ejecutando…" y se inicia la transición completa al caso

#### Scenario: Soltar antes de tiempo
- **WHEN** el visitante suelta el botón o saca el puntero de la tarjeta antes de completar el anillo
- **THEN** el anillo se revierte con un rebote elástico hasta desaparecer y no se navega

### Requirement: Clic normal sigue abriendo el proyecto
Un clic normal (pulsar y soltar sin mantener) SHALL abrir el caso de estudio con la versión corta de la transición; el hold nunca SHALL ser el único modo de abrir un proyecto.

#### Scenario: Clic corto
- **WHEN** el visitante hace clic y suelta en menos de 200 ms sobre la tarjeta
- **THEN** se abre el caso con la versión corta de la transición

### Requirement: Equivalente de teclado
Con el foco en la tarjeta, Enter SHALL abrir el caso con la versión corta y mantener Espacio SHALL ejecutar el hold con el mismo anillo y umbral; soltar Espacio antes de tiempo SHALL revertirlo. Espacio sobre la tarjeta no SHALL desplazar la página.

#### Scenario: Enter
- **WHEN** el visitante pulsa Enter con el foco en una tarjeta
- **THEN** se abre el caso con la versión corta

#### Scenario: Mantener Espacio
- **WHEN** el visitante mantiene Espacio 800 ms con el foco en una tarjeta
- **THEN** el anillo se dibuja alrededor de la tarjeta enfocada y se ejecuta la transición completa sin que la página haga scroll

### Requirement: Equivalente táctil
En dispositivos táctiles, mantener el dedo sobre la tarjeta SHALL ejecutar el hold sin abrir el menú contextual del sistema ni seleccionar texto; si el dedo se desplaza más allá de un umbral pequeño, el gesto SHALL cancelarse y el scroll SHALL continuar normalmente.

#### Scenario: Long-press
- **WHEN** el visitante mantiene el dedo 800 ms sobre una tarjeta sin moverlo
- **THEN** se ejecuta la transición completa y no aparece el menú contextual ni la selección de texto

#### Scenario: Scroll durante el gesto
- **WHEN** el visitante apoya el dedo en una tarjeta y lo arrastra para hacer scroll
- **THEN** el hold se cancela y la página se desplaza sin retraso perceptible

### Requirement: Reduced motion
Con `prefers-reduced-motion: reduce`, el hold no SHALL ser necesario ni animar el anillo: cualquier activación (clic, Enter, toque) SHALL abrir el caso con un fundido.

#### Scenario: Activación con movimiento reducido
- **WHEN** el visitante con reduced motion hace clic o mantiene pulsada una tarjeta
- **THEN** el caso se abre con un fundido ≤ 200 ms, sin anillo ni expansión

### Requirement: Anuncio accesible
La tarjeta SHALL exponer a tecnologías de asistencia que se puede abrir con Enter y ejecutar manteniendo Espacio, y el inicio, cancelación y finalización del hold SHALL anunciarse en una región en vivo de forma no intrusiva.

#### Scenario: Lector de pantalla
- **WHEN** un usuario de lector de pantalla enfoca una tarjeta y mantiene Espacio hasta completarlo
- **THEN** el lector anuncia la instrucción al enfocar, "Ejecutando…" al iniciar y el título del caso al navegar

### Requirement: Logro al primer hold
La primera ejecución completa de un hold en la sesión del visitante SHALL emitir el evento de logro `process_executed`; las ejecuciones posteriores no SHALL emitirlo de nuevo.

#### Scenario: Primer hold
- **WHEN** el visitante completa su primer Hold-to-Execute
- **THEN** se emite `process_executed` una sola vez y la navegación no se retrasa por ello
