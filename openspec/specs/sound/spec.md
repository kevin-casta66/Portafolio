## Purpose

Ofrecer un diseño sonoro opcional y sutil que refuerce la narrativa de máquina (ambiente por fase, sonidos de UI y respuesta a la velocidad del scroll), siempre bajo control explícito del visitante.

## Requirements

### Requirement: Preferencia inicial desde la puerta de arranque
El estado inicial del sonido SHALL ser el elegido por el visitante en la puerta de arranque ("▶ Iniciar con sonido · recomendado con audífonos" / "Iniciar en silencio") y SHALL registrarse tanto en el estado de la puerta como en las preferencias guardadas. Si el visitante no pasó por la puerta (visita posterior abreviada o puerta omitida), el sonido SHALL estar desactivado salvo que exista una preferencia guardada. Nunca SHALL sonar nada antes de esa elección.

#### Scenario: Iniciar con sonido
- **WHEN** el visitante elige "▶ Iniciar con sonido · recomendado con audífonos" en la puerta de arranque
- **THEN** el audio queda habilitado, la elección queda registrada en la puerta y en las preferencias, la música entra con un fundido de 3 s al 35 % de volumen y el botón de sonido indica el estado activado

#### Scenario: Iniciar en silencio
- **WHEN** el visitante elige "Iniciar en silencio"
- **THEN** no se reproduce ningún sonido, no se descarga ningún recurso de audio y el botón indica el estado desactivado

#### Scenario: Sin elección previa
- **WHEN** el visitante llega sin pasar por la puerta y sin preferencia guardada
- **THEN** el sonido está desactivado

#### Scenario: Antes de la puerta
- **WHEN** la puerta de arranque está visible y el visitante aún no ha elegido
- **THEN** no suena nada, aunque interactúe con la página

### Requirement: Botón de silencio siempre visible
El sistema SHALL mostrar en todas las páginas un botón de sonido claramente visible con su estado accesible (activado/desactivado) que silencia o reactiva todo el audio al instante, y la tecla M SHALL hacer lo mismo desde cualquier lugar salvo dentro de un campo de texto.

#### Scenario: Silenciar
- **WHEN** el sonido está activo y el visitante pulsa el botón de sonido o la tecla M
- **THEN** todo el audio (música y efectos) se detiene en menos de 150 ms y el botón indica el estado desactivado

#### Scenario: Visible en cualquier ruta
- **WHEN** el visitante está en el home, un caso de estudio, la 404 o una vista secundaria
- **THEN** el botón de sonido está visible y operable con teclado

### Requirement: Sonidos de interfaz
Con el sonido activo el sistema SHALL reproducir sonidos de interfaz sutiles y afinados en las interacciones (tecleo del hero y de la terminal, activación de controles, avisos de logros, cambio de tema), por el bus de efectos. El tecleo de la terminal SHALL sonar como teclas mecánicas suaves con una variación de altura de ±3 % y un límite de frecuencia de disparo para que escribir rápido no sature; un comando desconocido SHALL sonar como una nota grave suave. Cada logro SHALL sonar como una variación distinta de 3 notas del motivo, alineada a la corchea siguiente.

#### Scenario: Escritura en terminal
- **WHEN** el sonido está activo y el visitante escribe en la terminal
- **THEN** cada pulsación reproduce una tecla mecánica suave por el bus de efectos

#### Scenario: Escritura rápida en terminal
- **WHEN** el sonido está activo y el visitante escribe muy rápido en la terminal
- **THEN** las pulsaciones suenan como teclas suaves con pequeñas variaciones de altura y nunca se acumulan hasta saturar la mezcla

#### Scenario: Dos logros distintos
- **WHEN** el visitante desbloquea dos logros diferentes
- **THEN** cada uno suena con una variación distinta del motivo

### Requirement: Carga diferida y persistencia
El sistema SHALL no descargar código ni recursos de audio mientras el sonido esté desactivado y SHALL cargarlos solo tras elegir sonido, sin afectar a la respuesta de las interacciones. SHALL persistir entre visitas la preferencia de sonido, el volumen general y los interruptores de música y efectos. Al ocultarse la pestaña el audio SHALL desvanecerse y pausarse, y al volver SHALL reanudarse con un fundido.

#### Scenario: Sin descargas de audio
- **WHEN** el visitante navega con el sonido desactivado
- **THEN** no se solicita ningún código ni recurso de audio por red

#### Scenario: Preferencia recordada
- **WHEN** el visitante activó el sonido, ajustó el volumen y vuelve otro día
- **THEN** el control muestra su volumen y sus interruptores, y el audio se reproduce tras su siguiente interacción

#### Scenario: Pestaña oculta
- **WHEN** la pestaña pasa a segundo plano con el sonido activo
- **THEN** el audio se desvanece y se pausa, y al volver se reanuda con un fundido sin perder la posición en la pieza

### Requirement: Música adaptativa por capas de una sola pieza
Con el sonido activo el sistema SHALL reproducir una única pieza musical en Re mayor a 84 BPM en compás 4/4, sobre la progresión cíclica Bm7 – Gmaj7 – Dmaj7 – A6, compuesta por capas sincronizadas al mismo reloj (pad, teclas con el motivo, percusión, arpegio, bajo y textura brillante). El paso entre fases MUST sumar o quitar capas de esa misma pieza y MUST NOT cambiar de canción ni cortar la música. Cada capa SHALL entrar o salir con un fundido que empieza en el siguiente compás, nunca a mitad de frase.

#### Scenario: Paso de una fase a otra
- **WHEN** el sonido está activo y el visitante pasa de PARSER a BYTECODE
- **THEN** la música sigue sin interrupción y la capa de bajo entra con un fundido que comienza en el primer tiempo del compás siguiente

#### Scenario: Ida y vuelta rápida entre fases
- **WHEN** el visitante cruza varias fases en un solo gesto de scroll
- **THEN** solo se aplica el conjunto de capas de la fase en la que termina, en el siguiente compás, sin solapar fundidos ni producir cortes

### Requirement: Afinación y cuantización de las interacciones
Todo sonido de interacción SHALL ser una nota (o un grupo de notas) de la escala pentatónica de Re mayor (Re, Mi, Fa#, La, Si) en dos octavas, o un acorde de la progresión, y SHALL sonar alineado al pulso de la pieza (al siguiente tiempo o corchea según el tipo de sonido), de modo que cualquier combinación de interacciones suene consonante y a tiempo.

#### Scenario: Interacciones simultáneas
- **WHEN** el visitante pasa el cursor por varios tokens y tecnologías seguidos mientras suena la música
- **THEN** todas las notas producidas pertenecen a la escala y comienzan en subdivisiones del pulso de la pieza

### Requirement: Firma sonora
El sistema SHALL tener un motivo de 4 notas que identifica a Kevin Castaño. El motivo SHALL sonar completo al terminar el arranque, en variaciones de 3 notas en los logros y completo, resolviendo en el acorde de tónica (Re mayor), al enviar con éxito el formulario de contacto.

#### Scenario: Fin del arranque
- **WHEN** el visitante eligió sonido y la secuencia de arranque llega al 100 %
- **THEN** la firma completa suena en el primer tiempo del compás

### Requirement: Mapa sonoro por fase
Con el sonido activo cada contexto SHALL activar sus capas y responder a sus interacciones así:
- BOOT: pad que entra en unos 4 s con el filtro cerrado; cada línea `[ OK ]` dispara una nota ascendente de la escala.
- SOURCE: pad y teclas; el tecleo del nombre suena como teclas mecánicas suaves y cada letra dispara una nota del motivo.
- LEXER: se suma percusión ligera; pasar sobre un token toca una nota según su tipo (keyword Re, identifier Mi, string Fa#, number La); los contadores suben con ticks suaves que terminan en una campanita.
- PARSER: se suma el arpegio, cuya densidad crece con el árbol; pasar sobre una tecnología toca una nota según su categoría; seleccionar una tecnología toca un acorde que se abre con un barrido brillante.
- BYTECODE: se suma el bajo en corcheas; cada instrucción resaltada suena como un pluck apagado; el cambio de empleo, como un platillo suave en crescendo.
- RUNTIME: mezcla completa con bombo contenido; pasar sobre un núcleo produce un destello panoramizado según la posición horizontal del cursor.
- Caso de estudio: la música baja 8 dB y queda solo pad y teclas; cambiar de breakpoint produce un tick suave.
- GPU: sin bombo, se suma la textura brillante y el arpegio con un leve efecto de rasterización (bitcrush); las demos interactivas MAY modular el filtro y la reverb de la música en vivo.
- DISPLAY: se retiran capas hasta pad y teclas; el foco en un campo toca una nota suave; enviar produce pulsos que viajan de izquierda a derecha en el panorama; el éxito toca la firma completa que resuelve en Re mayor; el error, dos notas descendentes suaves.
- 404: efecto de «cinta que se detiene» (bajada de altura) y silencio con un zumbido leve; «Reiniciar proceso» suena como una cinta que arranca.

#### Scenario: Envío correcto del contacto
- **WHEN** el visitante envía el formulario y el servidor responde con éxito
- **THEN** suenan los pulsos de envío y después la firma completa resuelve en el acorde de Re mayor

#### Scenario: Envío con error
- **WHEN** el envío del formulario falla
- **THEN** suenan dos notas descendentes suaves, sin ningún sonido áspero, y el error se muestra también en pantalla

#### Scenario: Lectura de un caso de estudio
- **WHEN** el visitante abre un caso de estudio con el sonido activo
- **THEN** la música baja 8 dB y solo quedan el pad y las teclas

### Requirement: Sonido del Hold-to-Execute
Mientras el visitante mantiene pulsado un proceso, el sistema SHALL reproducir un riser (ruido filtrado que se abre y un tono ascendente) sincronizado con el progreso del anillo. Si el visitante suelta antes de completar, el riser MUST caer y desvanecerse. Al completarse SHALL sonar un impacto suave y un acorde resuelto, cuantizados al siguiente tiempo, coincidiendo con la expansión visual.

#### Scenario: Hold completo
- **WHEN** el visitante mantiene pulsado hasta completar el anillo
- **THEN** el riser llega a su punto álgido con el anillo y suena el impacto con el acorde resuelto

#### Scenario: Hold cancelado
- **WHEN** el visitante suelta antes de completar el anillo
- **THEN** el riser cae y se desvanece sin impacto ni acorde

### Requirement: Respuesta a la velocidad del scroll
La velocidad del scroll SHALL modular de forma sutil la apertura del filtro y el envío de reverb de la música (scroll rápido abre la música), y tras 2 s sin scroll la música SHALL cerrarse y bajar 3 dB. El sistema MUST NOT producir ningún tono continuo que siga la velocidad del scroll.

#### Scenario: Pausa para leer
- **WHEN** el visitante deja de hacer scroll durante 2 s
- **THEN** el filtro de la música se cierra y su nivel baja 3 dB de forma gradual

### Requirement: Cadena de mezcla y niveles
El audio SHALL mezclarse en dos buses independientes (música y efectos) que pasan por una compresión suave y un limitador con techo de −1 dBTP, con un filtro pasa-altos en 60 Hz y una atenuación ligera de 2–5 kHz en la salida. Con el volumen general al 35 %, la música SHALL rondar −22 LUFS a corto plazo; los efectos MUST NOT superar en más de 6 dB a la música del momento y ningún efecto, salvo el riser, MUST durar más de 1,2 s. La salida MUST NOT saturar (clipping) en ningún escenario, y MUST NOT sonar más de 12 voces simultáneas. Ningún sonido SHALL ser una senoidal pura sin envolvente ni espacio acústico.

#### Scenario: Muchas interacciones seguidas
- **WHEN** el visitante dispara decenas de sonidos de interfaz en pocos segundos sobre la mezcla completa de RUNTIME
- **THEN** el nivel de pico de la salida no supera el techo del limitador y no suenan más de 12 voces a la vez

### Requirement: Sincronía audio-visual
Con el sonido activo, las transiciones de fase SHALL aterrizar en el primer tiempo del compás sin retrasar la respuesta visual más de 350 ms, y la energía de la música SHALL hacer respirar de forma muy sutil el brillo y las partículas de la capa 3D. Sin sonido activo, las transiciones no se retrasan.

#### Scenario: Cambio de fase con sonido
- **WHEN** el sonido está activo y el visitante llega a una nueva fase
- **THEN** la transición visual termina como máximo 350 ms después de lo que lo haría sin sonido, alineada con el primer tiempo del compás

### Requirement: Control de sonido para el visitante
El botón de sonido SHALL abrir un control con el volumen general y dos interruptores independientes, Música y Efectos, cuyos valores SHALL guardarse en las preferencias. El volumen general SHALL empezar al 35 % con un fundido de entrada de 3 s. La primera vez que suena algo SHALL mostrarse un aviso discreto «Pulsa M para silenciar». El tema claro SHALL ecualizar la música un poco más brillante y el oscuro, más cálida.

#### Scenario: Apagar solo la música
- **WHEN** el visitante desactiva el interruptor Música y deja Efectos activado
- **THEN** la música se desvanece, los sonidos de interacción siguen sonando y la elección se conserva al recargar

#### Scenario: Primer sonido
- **WHEN** suena el primer sonido de la visita
- **THEN** aparece una sola vez el aviso «Pulsa M para silenciar», que no roba el foco

### Requirement: Convivencia con otros contenidos
En la Vista Rápida la música SHALL pausarse con un fundido y solo SHALL quedar efectos mínimos o ninguno según la preferencia. Al reproducirse un vídeo de proyecto con audio la música SHALL bajar automáticamente (ducking) y recuperarse al terminar. Con movimiento reducido el sonido no se silencia, pero los risers y barridos SHALL sustituirse por notas cortas.

#### Scenario: Vídeo de proyecto con audio
- **WHEN** el visitante reproduce un vídeo de proyecto con audio
- **THEN** la música baja mientras dura el vídeo y vuelve a su nivel al pausarlo o terminar

#### Scenario: Movimiento reducido
- **WHEN** el visitante tiene activado reducir movimiento y hace un Hold-to-Execute
- **THEN** no suena el riser y solo suena una nota corta al completarse

### Requirement: Mezclador de capas
El sistema SHALL ofrecer un mini mezclador, accesible desde la terminal, con una fila por capa musical que permite silenciarla o dejarla sola y muestra su nivel en vivo, operable con teclado y con nombres accesibles.

#### Scenario: Solo de una capa
- **WHEN** el visitante activa «solo» en la capa de bajo
- **THEN** solo se oye el bajo y el resto de capas queda en silencio hasta desactivar el solo

### Requirement: Fuentes de audio y licencias
El sistema SHALL funcionar con capas sintetizadas por defecto, que deben sonar musicales y no como tonos de prueba, y SHALL poder usar, con la misma interfaz, archivos de capas producidos en bucle sin cortes (Opus en WebM con alternativa AAC en M4A, presupuesto total menor de 4 MB) descargados solo tras elegir sonido. Cualquier archivo de audio publicado MUST tener licencia CC0 o comercial verificada, documentada en `public/audio/CREDITS.md`, y los créditos de música producida SHALL mostrarse en el pie y en el README.

#### Scenario: Sin archivos de capas
- **WHEN** no existe ningún archivo de capas producido
- **THEN** la música se genera en el navegador con la misma estructura de capas y fases

### Requirement: Gancho de pruebas del sonido
Solo con el parámetro de pruebas activado, el sistema SHALL exponer el estado del sonido para pruebas automatizadas: capas activas, fase, tempo, nivel RMS por bus y estado de la puerta. Sin ese parámetro el gancho MUST NOT existir.

#### Scenario: Página normal
- **WHEN** el visitante abre el sitio sin el parámetro de pruebas
- **THEN** no existe ningún objeto global de pruebas del sonido
