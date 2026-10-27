## MODIFIED Requirements

### Requirement: Carga diferida y persistencia
El sistema SHALL no descargar código ni recursos de audio mientras el sonido esté desactivado y SHALL cargarlos solo tras elegir sonido, sin afectar a la respuesta de las interacciones. SHALL persistir entre visitas la preferencia de sonido, el volumen general y los interruptores de música y efectos. En una visita posterior con el sonido elegido, el motor SHALL arrancar con la primera activación de usuario que el navegador acepte (clic, toque o tecla) y, mientras no haya ocurrido, SHALL mostrar un aviso discreto y accesible «Activar sonido» que no roba el foco y que arranca el audio al activarlo; el aviso MUST desaparecer en cuanto el audio esté en marcha o el visitante silencie. Al ocultarse la pestaña el audio SHALL desvanecerse y pausarse, y al volver SHALL reanudarse con un fundido.

#### Scenario: Sin descargas de audio
- **WHEN** el visitante navega con el sonido desactivado
- **THEN** no se solicita ningún código ni recurso de audio por red

#### Scenario: Preferencia recordada
- **WHEN** el visitante activó el sonido, ajustó el volumen y vuelve otro día
- **THEN** el control muestra su volumen y sus interruptores, y el audio se reproduce tras su siguiente interacción

#### Scenario: Visita posterior solo con scroll y hover
- **WHEN** el visitante recarga con el sonido elegido y solo hace scroll y pasa el cursor, sin hacer clic
- **THEN** se muestra el aviso «Activar sonido» y, al activarlo, el motor arranca y los siguientes hovers suenan

#### Scenario: Pestaña oculta
- **WHEN** la pestaña pasa a segundo plano con el sonido activo
- **THEN** el audio se desvanece y se pausa, y al volver se reanuda con un fundido sin perder la posición en la pieza

### Requirement: Cadena de mezcla y niveles
El audio SHALL mezclarse en dos buses independientes (música y efectos) que pasan por una compresión suave y un limitador con techo de −1 dBTP, con un filtro pasa-altos en 60 Hz y una atenuación ligera de 2–5 kHz en la salida. Con el volumen general al 35 %, la música SHALL rondar −22 LUFS a corto plazo; cada efecto de interacción SHALL sonar entre 0 y +6 dB sobre la música del momento (los ticks de contadores y las teclas de la terminal MAY quedar hasta 3 dB por debajo) y, mientras suena un efecto, la música SHALL atenuarse unos 3 dB y recuperarse en 300 ms o menos. Ningún efecto, salvo el riser, MUST durar más de 1,2 s. La salida MUST NOT saturar (clipping) en ningún escenario, y MUST NOT sonar más de 12 voces simultáneas; dentro de ese límite ningún sintetizador MUST descartar notas por falta de polifonía (los de efectos admiten al menos 8 voces). Ningún sonido SHALL ser una senoidal pura sin envolvente ni espacio acústico.

#### Scenario: Muchas interacciones seguidas
- **WHEN** el visitante dispara decenas de sonidos de interfaz en pocos segundos sobre la mezcla completa de RUNTIME
- **THEN** el nivel de pico de la salida no supera el techo del limitador y no suenan más de 12 voces a la vez

#### Scenario: Efecto sobre la mezcla completa
- **WHEN** el visitante pasa el cursor por un núcleo del chip o una instrucción de BYTECODE con la música sonando
- **THEN** el pico del bus de efectos queda entre 0 y +6 dB sobre el nivel de la música y la música se atenúa brevemente

#### Scenario: Hover rápido por varios elementos
- **WHEN** el visitante recorre rápidamente varios tokens o tecnologías
- **THEN** la consola no registra notas descartadas por polifonía y cada hover que supera el límite de frecuencia suena

### Requirement: Mapa sonoro por fase
Con el sonido activo cada contexto SHALL activar sus capas y responder a sus interacciones así:
- BOOT: pad que entra en unos 4 s con el filtro cerrado; cada línea `[ OK ]` dispara una nota ascendente de la escala.
- SOURCE: pad y teclas; el tecleo del nombre suena como teclas mecánicas suaves y un arpegio del motivo con una nota cada 2–3 letras, alineado al pulso.
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

#### Scenario: Tecleo del nombre
- **WHEN** el hero escribe el nombre con el sonido activo
- **THEN** suena un arpegio audible del motivo, con al menos una nota por cada 3 letras y sin notas descartadas

### Requirement: Gancho de pruebas del sonido
Solo con el parámetro de pruebas activado, el sistema SHALL exponer el estado del sonido para pruebas automatizadas: capas activas, fase, tempo, nivel RMS por bus, estado de la puerta y un registro de efectos reproducidos y descartados con su motivo (límite de frecuencia, voces, silencio, Vista Rápida, movimiento reducido). Sin ese parámetro el gancho MUST NOT existir.

#### Scenario: Página normal
- **WHEN** el visitante abre el sitio sin el parámetro de pruebas
- **THEN** no existe ningún objeto global de pruebas del sonido

#### Scenario: Efecto descartado
- **WHEN** una prueba dispara un efecto que el motor no reproduce
- **THEN** el gancho registra el evento como descartado e indica el motivo
