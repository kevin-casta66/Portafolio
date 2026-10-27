## Purpose

Recompensar la exploración del sitio con logros discretos con estética de log del sistema, que invitan a descubrir capacidades técnicas ocultas sin bloquear ni interrumpir nunca la navegación.

## Requirements

### Requirement: Catálogo inicial de logros
El sistema SHALL definir al menos los siguientes logros, cada uno desbloqueado una sola vez por el evento indicado: `root_access` (abrir la terminal), `process_executed` (completar el primer Hold-to-Execute), `heap_explorer` (entrar en la vista Memory Heap), `kernel_panic` (llegar a la página 404) y `debugger_attached` (activar el modo Debug).

#### Scenario: Abrir la terminal
- **WHEN** el visitante abre la terminal por primera vez
- **THEN** se desbloquea `root_access`

#### Scenario: Encontrar la 404
- **WHEN** el visitante llega a una URL inexistente
- **THEN** se desbloquea `kernel_panic`

#### Scenario: Logro ya desbloqueado
- **WHEN** el visitante abre la terminal por segunda vez
- **THEN** no se muestra ningún aviso nuevo y el contador no cambia

### Requirement: Registro extensible
El catálogo de logros SHALL ser extensible: otras funcionalidades SHALL poder registrar logros nuevos con identificador, título y descripción, sin modificar el sistema de logros. Un identificador duplicado SHALL rechazarse en tiempo de build o de pruebas.

#### Scenario: Nuevo logro registrado
- **WHEN** una funcionalidad posterior registra un logro nuevo
- **THEN** aparece en el total del contador y puede desbloquearse como los demás

#### Scenario: Identificador duplicado
- **WHEN** dos logros se registran con el mismo identificador
- **THEN** la validación del proyecto falla indicando el identificador repetido

### Requirement: Aviso discreto tipo log
Al desbloquear un logro el sistema SHALL mostrar un aviso breve con formato `ACHIEVEMENT_UNLOCKED: <id>` y una descripción legible, que desaparece solo tras unos segundos, no recibe el foco, no tapa los controles principales y puede descartarse.

#### Scenario: Aviso no bloqueante
- **WHEN** se desbloquea un logro mientras el visitante escribe en el formulario de contacto
- **THEN** el aviso aparece sin mover el foco ni interrumpir la escritura

#### Scenario: Varios logros seguidos
- **WHEN** se desbloquean dos logros en menos de un segundo
- **THEN** los avisos se muestran en cola, uno tras otro, sin superponerse

### Requirement: Anuncio accesible
Cada desbloqueo SHALL anunciarse a las tecnologías de asistencia mediante una región de anuncio educada (no interruptiva).

#### Scenario: Lector de pantalla
- **WHEN** se desbloquea `debugger_attached` con un lector de pantalla activo
- **THEN** el lector anuncia el logro después de terminar lo que estaba leyendo

### Requirement: Contador en el Call Stack
La navegación Call Stack SHALL mostrar un contador `desbloqueados/total` de logros, y SHALL permitir ver la lista de logros con su estado (los no desbloqueados muestran solo una pista).

#### Scenario: Contador actualizado
- **WHEN** el visitante desbloquea su primer logro de 5
- **THEN** el Call Stack muestra `1/5`

#### Scenario: Lista de logros
- **WHEN** el visitante activa el contador
- **THEN** se muestra la lista de logros con su estado, operable con teclado

### Requirement: Persistencia local
Los logros desbloqueados SHALL persistir en el navegador del visitante entre visitas, y SHALL funcionar sin errores aunque el almacenamiento local no esté disponible (en cuyo caso duran solo la visita).

#### Scenario: Visita posterior
- **WHEN** el visitante vuelve otro día
- **THEN** el contador conserva los logros desbloqueados

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador bloquea el almacenamiento local
- **THEN** los logros funcionan durante la visita y no se muestra ningún error

### Requirement: Movimiento reducido
Con movimiento reducido el aviso SHALL aparecer y desaparecer con un fundido, sin desplazamiento.

#### Scenario: Reduced motion
- **WHEN** la preferencia de movimiento reducido está activa y se desbloquea un logro
- **THEN** el aviso aparece con un fundido, sin animación de desplazamiento

### Requirement: Logro de ingeniero de sonido
El catálogo de logros SHALL incluir `sound_engineer` («ingeniero de sonido»), que se desbloquea la primera vez que el visitante abre el mezclador de capas, con textos en español e inglés, y que se comporta como el resto de logros (aviso discreto, anuncio accesible, contador y persistencia).

#### Scenario: Abrir el mezclador por primera vez
- **WHEN** el visitante abre el mezclador de capas por primera vez
- **THEN** se desbloquea el logro `sound_engineer` y aparece su aviso

#### Scenario: Volver a abrir el mezclador
- **WHEN** el visitante abre el mezclador en otra ocasión
- **THEN** el logro no vuelve a anunciarse
