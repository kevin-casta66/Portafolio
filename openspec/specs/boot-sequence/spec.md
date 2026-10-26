## Purpose

Puerta de arranque (T1) tipo POST/BIOS que muestra el progreso real de carga, deja elegir entre iniciar con o sin sonido y cede el paso al Hero con una salida tipo CRT, sin bloquear nunca el contenido esencial.

## Requirements

### Requirement: Progreso de carga real
La secuencia de arranque SHALL reflejar el progreso real de recursos (fuentes, assets críticos y, cuando exista, la escena 3D inicial) mediante líneas de estado tipo `[ OK ] Mounting /skills`, `[ OK ] Loading projects (N)` y `[ OK ] GPU detected: tier N`, donde los valores (número de proyectos, tier) proceden de los datos y la detección reales. El progreso MUST NOT simularse con un temporizador fijo.

#### Scenario: Líneas con datos reales
- **WHEN** el contenido define 6 proyectos
- **THEN** la línea de carga de proyectos muestra `Loading projects (6)`

#### Scenario: Progreso ligado a recursos
- **WHEN** un recurso rastreado termina de cargar
- **THEN** el indicador de progreso avanza y su línea de estado pasa a `[ OK ]`

### Requirement: Letras de COMPILE escalonadas
Durante el arranque, las letras de la palabra COMPILE SHALL entrar una a una, escalonadas, con animación de resorte. La palabra MUST estar expuesta a tecnologías de asistencia como un único texto, no letra a letra.

#### Scenario: Entrada de la marca
- **WHEN** comienza la secuencia de arranque
- **THEN** las 7 letras de COMPILE aparecen en orden con el stagger de caracteres y un rebote de resorte

#### Scenario: Lectura accesible
- **WHEN** un lector de pantalla recorre la puerta
- **THEN** anuncia "COMPILE" una sola vez

### Requirement: Duración máxima de los logs y salto
La fase de logs POST SHALL durar como máximo 2,5 s; si los recursos no han terminado en ese tiempo, los logs terminan igualmente y la carga continúa en segundo plano. Un botón "Saltar ⏎" MUST ser visible y operable con teclado (Enter) desde el primer frame; saltar equivale a elegir "Iniciar en silencio".

#### Scenario: Carga lenta
- **WHEN** los recursos tardan más de 2,5 s
- **THEN** los logs finalizan a los 2,5 s y se muestran las opciones de inicio

#### Scenario: Saltar con teclado
- **WHEN** el usuario pulsa Enter o activa "Saltar ⏎" en cualquier momento
- **THEN** la puerta termina inmediatamente en modo silencio y el foco pasa al contenido principal

### Requirement: Puerta con sonido / en silencio
Al terminar los logs, la puerta SHALL ofrecer dos opciones accionables con ratón, teclado y táctil: "▶ Iniciar con sonido" e "Iniciar en silencio". Elegir "con sonido" MUST habilitar la reproducción de audio en ese mismo gesto del usuario; elegir "en silencio" MUST dejar el audio desactivado. La elección MUST recordarse durante la sesión del navegador y quedar disponible para el sistema de sonido.

#### Scenario: Iniciar con sonido
- **WHEN** el usuario activa "▶ Iniciar con sonido"
- **THEN** el audio queda habilitado sin requerir otro gesto y la preferencia "sonido activado" queda guardada para la sesión

#### Scenario: Iniciar en silencio
- **WHEN** el usuario activa "Iniciar en silencio"
- **THEN** no se carga ni reproduce ningún audio y la preferencia "silencio" queda guardada para la sesión

### Requirement: La puerta nunca bloquea el contenido esencial
La puerta SHALL ser una capa visual superpuesta al contenido SSR del Hero; el nombre, rol, propuesta de valor y CTAs MUST existir en el DOM desde el primer render, ser accesibles para tecnologías de asistencia y para buscadores, y la puerta MUST NOT retrasar el LCP más allá de 2,5 s. Mientras la puerta está visible: el enlace de salto al contenido, el acceso a la Vista Rápida y la descarga del CV MUST seguir visibles y operables por encima de ella; hacer scroll, pulsar Escape o activar cualquiera de esos accesos MUST cerrar la puerta en modo silencio. La puerta MUST NOT mostrarse cuando JavaScript no está disponible, cuando la página se abre en Vista Rápida ni cuando se abre directamente en un ancla de sección o una ruta distinta del home.

#### Scenario: Lector de pantalla durante la puerta
- **WHEN** un lector de pantalla carga la página
- **THEN** los logs se anuncian como estado no interrumpible, las dos opciones son botones etiquetados y el contenido del Hero es alcanzable sin elegir

#### Scenario: Sin JavaScript
- **WHEN** JavaScript está desactivado
- **THEN** no se muestra ninguna puerta y el Hero es visible directamente

#### Scenario: Reclutador en Vista Rápida
- **WHEN** el usuario activa la Vista Rápida o el CV mientras la puerta está visible
- **THEN** la puerta se cierra en modo silencio y la acción elegida se ejecuta de inmediato

#### Scenario: Scroll sin elegir
- **WHEN** el usuario hace scroll sin haber elegido una opción
- **THEN** la puerta se cierra en modo silencio y el scroll se aplica sin bloqueo

#### Scenario: Enlace profundo
- **WHEN** la página se abre directamente en `#projects`
- **THEN** no se muestra la puerta y el audio queda en silencio

### Requirement: Versión corta en visitas posteriores de la sesión
La secuencia completa SHALL mostrarse solo en la primera visita de la sesión del navegador; en visitas posteriores dentro de la misma sesión MUST mostrarse una versión de 400 ms como máximo, sin opciones de inicio, que aplica la elección de sonido ya guardada.

#### Scenario: Recarga en la misma sesión
- **WHEN** el usuario recarga la página tras haber elegido "con sonido"
- **THEN** se muestra la versión corta de ≤ 400 ms sin opciones y el sonido sigue en la preferencia elegida (pendiente del primer gesto si el navegador lo exige)

#### Scenario: Almacenamiento de sesión no disponible
- **WHEN** el navegador bloquea el almacenamiento de sesión
- **THEN** se muestra la secuencia completa con opciones, la elección solo vale para la página actual y no se lanzan errores

### Requirement: Salida CRT hacia el cursor del Hero
Al elegir una opción (o saltar), la pantalla de arranque SHALL colapsar como un CRT (a una línea horizontal y luego a un punto) y ese punto MUST transformarse en el cursor de texto del editor del Hero, de forma continua.

#### Scenario: Transición de salida
- **WHEN** la puerta termina por elección o por salto
- **THEN** se reproduce el colapso línea → punto y el punto queda en la posición del cursor del Hero, donde comienza el tecleo

#### Scenario: Movimiento reducido
- **WHEN** el usuario prefiere movimiento reducido
- **THEN** las letras aparecen sin resorte y la salida es un fundido breve sin colapso CRT
