## Purpose

Exponer públicamente el sistema de movimiento de Portafolio como prueba de habilidad técnica: tokens de animación visualizados y cada transición del catálogo T1–T11 reproducible de forma aislada, con sus internos y una nota técnica, sin sacrificar accesibilidad ni rendimiento.

## ADDED Requirements

### Requirement: Página pública de movimiento
El sistema SHALL ofrecer una página pública `/motion` en cada locale soportado (es, en), generada estáticamente, con su contenido textual (títulos, descripciones de tokens y notas técnicas de T1–T11) presente en el HTML inicial sin depender de JavaScript.

#### Scenario: Acceso en español
- **WHEN** un visitante abre `/es/motion`
- **THEN** la página responde 200 y muestra en el HTML inicial la sección de tokens y las 11 tarjetas de transición con sus nombres y notas técnicas en español

#### Scenario: Acceso en inglés
- **WHEN** un visitante abre `/en/motion`
- **THEN** la página muestra el mismo contenido traducido al inglés y declara la versión alternativa en español

#### Scenario: Sin JavaScript
- **WHEN** la página se carga con JavaScript desactivado
- **THEN** todo el texto, las curvas de easing como imagen estática y un fotograma estático de cada transición son visibles

### Requirement: Visualización de tokens de movimiento
La página SHALL mostrar cada token de easing como una curva dibujada a partir de sus valores reales, junto con las duraciones, staggers y springs del sistema. Los valores mostrados MUST provenir de la misma fuente de tokens que usa el resto del sitio, de modo que un cambio en un token se refleje en la página sin editarla.

#### Scenario: Curva interactiva
- **WHEN** el usuario pasa el cursor o enfoca con teclado la curva de un easing
- **THEN** se reproduce una previsualización de un elemento que se mueve con ese easing y se muestran sus valores numéricos

#### Scenario: Coherencia con los tokens
- **WHEN** se modifica el valor de un token de easing o duración en la fuente de tokens y se reconstruye el sitio
- **THEN** la curva y los valores mostrados en `/motion` reflejan el nuevo valor

### Requirement: Catálogo de transiciones T1–T11 reproducibles
La página SHALL presentar una tarjeta por cada transición del catálogo (T1 a T11) con disparador, duración, easing, técnica, fallback de reduced motion y una nota técnica breve. Cada tarjeta MUST permitir reproducir la transición de forma aislada mediante un control "Replay".

#### Scenario: Reproducir una transición
- **WHEN** el usuario activa "Replay" en la tarjeta de T2
- **THEN** la transición T2 se reproduce completa dentro de su tarjeta, desde el estado inicial, sin afectar al resto de la página

#### Scenario: Catálogo completo
- **WHEN** se carga la página
- **THEN** existen exactamente 11 tarjetas, identificadas de T1 a T11, cada una con todos los campos descritos

### Requirement: Control de velocidad
Cada demo SHALL ofrecer un control de velocidad con las opciones 0.25x, 0.5x y 1x, siendo 1x el valor por defecto. El cambio de velocidad MUST aplicarse a la reproducción en curso y a las siguientes.

#### Scenario: Ralentizar una demo
- **WHEN** el usuario selecciona 0.25x y pulsa "Replay"
- **THEN** la transición tarda cuatro veces su duración nominal

#### Scenario: Cambio durante la reproducción
- **WHEN** el usuario cambia de 1x a 0.5x mientras la demo se reproduce
- **THEN** la reproducción continúa desde el punto actual a la mitad de velocidad, sin reiniciarse

### Requirement: Vista de internos
Cada demo SHALL ofrecer un interruptor "Ver internos" que muestre la máscara, el render target o el estado intermedio que la transición usa por dentro. Para las transiciones puramente DOM, MUST mostrar las cajas de los elementos animados y sus estados de inicio y fin.

#### Scenario: Internos de una transición con máscara
- **WHEN** el usuario activa "Ver internos" en T5
- **THEN** la demo muestra la máscara de barrido utilizada además del resultado final

#### Scenario: Estado del interruptor
- **WHEN** el usuario activa el interruptor
- **THEN** el control expone su estado activado a tecnologías de asistencia

### Requirement: Una sola demo 3D activa
La página SHALL mantener como máximo una demo que use renderizado 3D activa simultáneamente. Las demos inactivas MUST mostrar un fotograma estático y no consumir tiempo de render.

#### Scenario: Cambiar de demo activa
- **WHEN** hay una demo 3D reproduciéndose y el usuario pulsa "Replay" en otra demo 3D
- **THEN** la primera se detiene y vuelve a su fotograma estático antes de que la segunda empiece

#### Scenario: Demo fuera de viewport
- **WHEN** la demo activa sale por completo del viewport
- **THEN** su renderizado se pausa

### Requirement: Carga diferida del motor 3D
La página SHALL mostrar su contenido principal sin cargar el motor 3D; este MUST cargarse solo cuando el usuario active por primera vez una demo que lo necesite.

#### Scenario: Primera carga
- **WHEN** se carga `/motion` y el usuario no interactúa con ninguna demo 3D
- **THEN** no se descarga el código del motor 3D

#### Scenario: Activación de demo 3D
- **WHEN** el usuario activa por primera vez una demo 3D
- **THEN** la demo muestra un estado de carga hasta que el motor está listo y después se reproduce

### Requirement: Accesibilidad por teclado
Todos los controles de la página (curvas, Replay, velocidad, internos) SHALL ser operables con teclado, con orden de foco lógico y foco visible, y el resultado de cada acción MUST anunciarse a tecnologías de asistencia.

#### Scenario: Recorrido con teclado
- **WHEN** el usuario navega con Tab por una tarjeta
- **THEN** alcanza en orden Replay, el control de velocidad y el interruptor de internos, y puede activarlos con Enter o Espacio

#### Scenario: Anuncio de reproducción
- **WHEN** el usuario activa Replay con teclado
- **THEN** se anuncia que la transición se está reproduciendo y cuándo termina

### Requirement: Comportamiento con reduced motion
Con la preferencia de movimiento reducido activa, la página SHALL mostrar fotogramas estáticos de cada transición por defecto, sin reproducción automática de ninguna previsualización. Las demos MUST reproducirse solo cuando el usuario lo pida explícitamente.

#### Scenario: Carga con reduced motion
- **WHEN** un usuario con movimiento reducido abre `/motion`
- **THEN** ninguna curva ni demo se anima al pasar el cursor, enfocar o desplazarse, y cada tarjeta muestra su fotograma estático

#### Scenario: Reproducción explícita
- **WHEN** ese usuario pulsa "Replay" en una tarjeta
- **THEN** la transición se reproduce una vez y vuelve al fotograma estático

### Requirement: Fallback sin WebGL
Cuando el dispositivo no disponga de renderizado acelerado, cada demo que lo requiera SHALL reproducir su versión 2D de respaldo y MUST indicar visiblemente que se está mostrando el fallback.

#### Scenario: Navegador sin aceleración 3D
- **WHEN** se abre `/motion` en un navegador sin capacidad de renderizado acelerado y se pulsa Replay en T8
- **THEN** se reproduce la versión 2D de T8 y la tarjeta muestra la etiqueta de fallback

### Requirement: Descubrimiento de la página
La página SHALL ser accesible desde el footer del sitio y desde un comando `motion` de la terminal, y su visita con reproducción de una transición MUST desbloquear el logro `motion_inspector`.

#### Scenario: Comando de terminal
- **WHEN** el usuario escribe `motion` en la terminal
- **THEN** el sitio navega a `/motion` en el locale actual

#### Scenario: Logro
- **WHEN** el usuario reproduce por primera vez cualquier transición en `/motion`
- **THEN** aparece el aviso `ACHIEVEMENT_UNLOCKED: motion_inspector` sin interrumpir la navegación, y no se repite en reproducciones posteriores
