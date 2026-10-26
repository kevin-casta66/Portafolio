## Purpose

Ofrece una versión alternativa completa del sitio para personas que prefieren reducir el movimiento, conservando toda la narrativa y el contenido sin transformaciones intensas.

## ADDED Requirements

### Requirement: Activación del modo de movimiento reducido
El sitio SHALL activar el modo de movimiento reducido cuando el sistema declara `prefers-reduced-motion: reduce`, y SHALL permitir al usuario activarlo o desactivarlo manualmente, recordando su elección durante la sesión por encima de la preferencia del sistema.

#### Scenario: Preferencia del sistema
- **WHEN** el visitante tiene `prefers-reduced-motion: reduce` y no ha elegido manualmente
- **THEN** el sitio se muestra en modo de movimiento reducido desde el primer render

#### Scenario: Conmutación manual
- **WHEN** el visitante activa el control de movimiento reducido (o lo desactiva)
- **THEN** el modo cambia sin recargar la página y la elección persiste al navegar a otra página de la sesión

### Requirement: Fundidos en lugar de transformaciones
En modo reducido, las entradas, revelados y transiciones entre fases SHALL usar únicamente fundidos de opacidad de corta duración, sin desplazamientos, escalados, rotaciones, glitch ni efectos de tecleo.

#### Scenario: Transición entre fases
- **WHEN** el usuario hace scroll de una fase a la siguiente en modo reducido
- **THEN** el contenido de la nueva fase aparece con un fundido y no hay movimiento de tokens, nodos ni píxeles

#### Scenario: Hero en modo reducido
- **WHEN** se carga la home en modo reducido
- **THEN** el nombre aparece completo sin animación de tecleo ni popup de autocompletado

### Requirement: Sin parallax ni escenas 3D en movimiento
En modo reducido el sitio SHALL eliminar el parallax, la reacción visual a la velocidad del scroll y la estela de fluido del cursor, y SHALL sustituir cada escena 3D en movimiento por una ilustración estática de la fase correspondiente.

#### Scenario: Movimiento del ratón
- **WHEN** el usuario mueve el ratón sobre el hero en modo reducido
- **THEN** el fondo no se desplaza

#### Scenario: Escena de la fase RUNTIME
- **WHEN** la sección RUNTIME entra en viewport en modo reducido
- **THEN** se muestra la ilustración estática del chip y no se ejecuta ninguna escena 3D animada

### Requirement: Boot reducido
En modo reducido la secuencia de arranque, incluida la puerta "con sonido / en silencio", SHALL mostrarse como una versión breve sin letras escalonadas ni efecto de apagado CRT y SHALL no retrasar el acceso al contenido.

#### Scenario: Primera visita con movimiento reducido
- **WHEN** se carga la home por primera vez en la sesión en modo reducido
- **THEN** el boot dura como máximo 400 ms, termina con un fundido y el hero queda visible

### Requirement: Hold-to-Execute en modo reducido
En modo reducido, abrir un caso de estudio desde un proyecto SHALL requerir solo un clic, toque o Enter, y la transición SHALL ser un fundido sin expansión, distorsión ni aberración.

#### Scenario: Abrir un caso en modo reducido
- **WHEN** el usuario hace clic en un proyecto en modo reducido
- **THEN** el caso de estudio se abre con un fundido sin necesidad de mantener pulsado

### Requirement: Memory Heap en modo reducido
En modo reducido la vista `/heap` SHALL desactivar la inercia del arrastre y la lente refractiva, SHALL desplazarse en pasos discretos y SHALL reorganizar los bloques con fundidos en lugar de movimiento.

#### Scenario: Run GC en modo reducido
- **WHEN** el usuario pulsa "Run GC" en `/heap` en modo reducido
- **THEN** los bloques aparecen en su nuevo orden con un fundido, sin desplazarse por la pantalla

### Requirement: Logros en modo reducido
En modo reducido los avisos de logros SHALL aparecer y desaparecer con fundido, sin desplazamiento ni efectos de glitch, y SHALL seguir siendo anunciados.

#### Scenario: Desbloquear un logro en modo reducido
- **WHEN** el usuario abre la terminal por primera vez en modo reducido
- **THEN** el aviso del logro aparece con fundido y no se mueve

### Requirement: Vitrina de movimiento en modo reducido
En modo reducido la página `/motion` SHALL mostrar cada transición como fotogramas clave estáticos con su nota técnica, y SHALL reproducir la animación completa solo cuando el usuario la solicite explícitamente con un aviso previo.

#### Scenario: Entrar en /motion con movimiento reducido
- **WHEN** el usuario visita `/motion` en modo reducido
- **THEN** ninguna transición se reproduce automáticamente y cada una muestra sus fotogramas clave estáticos

### Requirement: Funcionalidad intacta
El modo reducido SHALL conservar todo el contenido y toda la funcionalidad: filtros, árbol de habilidades, terminal, Vista Rápida, formulario, casos de estudio, `/heap`, `/motion`, logros y navegación.

#### Scenario: Filtrar proyectos en modo reducido
- **WHEN** el usuario filtra proyectos por tecnología en modo reducido
- **THEN** la lista se actualiza correctamente sin animación de reordenación
