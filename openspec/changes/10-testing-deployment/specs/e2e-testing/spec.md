## Purpose

Garantiza mediante pruebas automatizadas, en escritorio y móvil, y mediante una matriz de dispositivos reales, que el sitio cumple los criterios de aceptación del brief y del addendum en cada cambio.

## ADDED Requirements

### Requirement: Cobertura en escritorio y móvil
La suite end-to-end SHALL ejecutarse contra al menos un perfil de escritorio y un perfil móvil táctil, y MUST fallar si cualquier escenario falla en cualquiera de los perfiles.

#### Scenario: Ejecución en ambos perfiles
- **WHEN** se ejecuta la suite end-to-end
- **THEN** cada escenario se ejecuta en el perfil de escritorio y en el perfil móvil y el resultado global falla si alguno falla

### Requirement: Matriz de dispositivos reales
El proyecto SHALL mantener una matriz de pruebas documentada que incluya un Android de gama media, un iPhone con Safari 26, un escritorio con Chrome y un escritorio con Firefox, con un protocolo de recorrido y resultados registrados; las combinaciones emulables SHALL cubrirse además con perfiles automatizados equivalentes.

#### Scenario: Perfiles emulados en la suite
- **WHEN** se ejecuta la suite end-to-end
- **THEN** incluye perfiles de escritorio Chromium, Firefox y WebKit y perfiles móviles Android e iPhone emulados con entrada táctil

#### Scenario: Recorrido manual antes de un lanzamiento
- **WHEN** se prepara un despliegue a producción
- **THEN** existe un registro de la matriz con cada dispositivo recorrido, su backend gráfico, tier, fps mediana e incidencias, sin filas pendientes

### Requirement: Contenido esencial sin JavaScript ni animación
La suite SHALL verificar que nombre, rol, propuesta de valor, CTAs "Ver proyectos" y "Descargar CV" y las tarjetas de proyectos están presentes en el HTML servido con JavaScript deshabilitado.

#### Scenario: Página con JavaScript deshabilitado
- **WHEN** se carga la página de inicio con JavaScript deshabilitado
- **THEN** el nombre, el rol, la propuesta de valor, ambos CTAs y al menos una tarjeta de proyecto son visibles

### Requirement: CV y Vista Rápida a un clic
La suite SHALL verificar que el enlace al CV y el control de Vista Rápida son alcanzables con un solo clic desde cada fase de la página de inicio, desde un caso de estudio, desde `/heap`, desde `/motion` y desde la página 404.

#### Scenario: Acceso desde cualquier punto
- **WHEN** el test se desplaza a cada fase o abre un caso de estudio, `/heap`, `/motion` o la 404
- **THEN** el enlace al CV y el toggle de Vista Rápida están visibles y un clic sobre la Vista Rápida muestra el currículum de una página

### Requirement: Navegación completa por teclado
La suite SHALL recorrer el sitio solo con teclado y verificar el skip link, el orden de foco lógico, el foco visible y la operabilidad del árbol de habilidades, los filtros de proyectos, el formulario y la terminal.

#### Scenario: Recorrido con teclado
- **WHEN** el test navega usando únicamente Tab, Shift+Tab, Enter, Espacio, flechas y Escape
- **THEN** cada elemento interactivo recibe foco visible en orden lógico y puede activarse sin ratón

### Requirement: Modos reduced motion y sin WebGL
La suite SHALL verificar que con preferencia de movimiento reducido no hay parallax ni escenas 3D en movimiento y que Hold-to-Execute, `/heap` y `/motion` ofrecen su alternativa reducida, y que sin soporte WebGL se muestra el fallback 2D conservando todo el contenido.

#### Scenario: Movimiento reducido
- **WHEN** la página se carga con la preferencia de movimiento reducido activa
- **THEN** se muestran ilustraciones estáticas por fase y todo el contenido es legible

#### Scenario: Interacciones del addendum con movimiento reducido
- **WHEN** con movimiento reducido el usuario hace clic en un proyecto, visita `/heap` y visita `/motion`
- **THEN** el caso se abre con un clic y fundido, el Heap no tiene inercia ni lente y ninguna transición de `/motion` se reproduce automáticamente

#### Scenario: Sin WebGL
- **WHEN** la página se carga en un entorno donde la creación de un contexto WebGL falla
- **THEN** se muestra el fallback 2D, no hay errores no controlados en consola y todo el contenido es accesible

### Requirement: Paridad entre backends gráficos
La suite SHALL ejecutar la home, un caso de estudio, `/heap` y `/motion` forzando el backend gráfico de nueva generación, el backend WebGL2 y la ausencia de WebGL, y MUST fallar si el contenido accesible difiere entre ellos o si el Modo Debug no indica el backend activo. Cuando el entorno de CI no disponga del backend de nueva generación, el caso SHALL marcarse como omitido con su motivo y quedar cubierto por la matriz de dispositivos reales.

#### Scenario: Mismo contenido en los tres niveles
- **WHEN** se captura el árbol de accesibilidad de cada página con cada backend
- **THEN** los tres árboles son idénticos y no hay errores no controlados en consola

#### Scenario: Backend indicado en Modo Debug
- **WHEN** se activa el Modo Debug con cada backend forzado
- **THEN** el indicador muestra el backend de nueva generación, WebGL2 o ninguno según corresponda

### Requirement: Hold-to-Execute verificado con todos los métodos de entrada
La suite SHALL verificar Hold-to-Execute con ratón, teclado y táctil: mantener pulsado completa la ejecución y abre el caso de estudio, soltar antes de tiempo revierte sin navegar, un clic o Enter abre la versión corta y mantener Espacio ejecuta la versión completa.

#### Scenario: Hold completo con ratón
- **WHEN** el usuario mantiene pulsado un proyecto el tiempo requerido
- **THEN** se abre el caso de estudio y el foco queda en su encabezado principal

#### Scenario: Soltar antes de tiempo
- **WHEN** el usuario suelta antes de completar el progreso
- **THEN** el progreso se revierte y la URL no cambia

#### Scenario: Teclado
- **WHEN** el usuario enfoca un proyecto y pulsa Enter, y en otro intento mantiene Espacio
- **THEN** Enter abre el caso con la transición corta y Espacio sostenido lo abre con la transición completa

#### Scenario: Táctil
- **WHEN** en el perfil móvil el usuario mantiene el dedo sobre un proyecto el tiempo requerido
- **THEN** se abre el caso de estudio

### Requirement: Memory Heap verificado
La suite SHALL verificar que la vista `/heap` se desplaza al arrastrar, que las flechas del teclado mueven el foco entre bloques, que la lista accesible equivalente contiene exactamente los proyectos y experimentos del contenido y que "Run GC" reordena los bloques por el criterio elegido.

#### Scenario: Run GC por año
- **WHEN** el usuario elige el criterio por año y pulsa "Run GC"
- **THEN** el orden de los bloques y de la lista equivalente coincide con el orden por año de los datos

#### Scenario: Lista equivalente
- **WHEN** se compara la lista accesible de `/heap` con el contenido
- **THEN** contiene exactamente los mismos proyectos y experimentos

### Requirement: Logros verificados
La suite SHALL verificar que abrir la terminal, completar un Hold-to-Execute, entrar en `/heap`, visitar una ruta inexistente y activar el Modo Debug desbloquean sus logros, que cada aviso se anuncia sin mover el foco ni interrumpir la navegación, que el contador del Call Stack se actualiza y que los logros persisten tras recargar.

#### Scenario: Desbloqueo y persistencia
- **WHEN** el usuario abre la terminal por primera vez y después recarga la página
- **THEN** aparece el aviso `ACHIEVEMENT_UNLOCKED: root_access`, el contador aumenta en uno y tras recargar el logro sigue desbloqueado sin volver a anunciarse

#### Scenario: El aviso no bloquea
- **WHEN** aparece un aviso de logro mientras el usuario navega con teclado
- **THEN** el foco permanece en el elemento activo y la siguiente interacción responde con normalidad

### Requirement: Puerta de arranque verificada
La suite SHALL verificar que en la primera visita de la sesión la puerta de arranque ofrece "Iniciar con sonido" e "Iniciar en silencio", que cada opción fija el estado de sonido correspondiente, que la elección se recuerda durante la sesión y que la puerta es operable con teclado.

#### Scenario: Iniciar en silencio
- **WHEN** el usuario elige "Iniciar en silencio" y luego recarga la página
- **THEN** el sonido queda desactivado, el hero es visible y tras recargar se muestra el boot breve sin la puerta

#### Scenario: Iniciar con sonido
- **WHEN** el usuario elige "Iniciar con sonido" con el teclado
- **THEN** el control de sonido indica que está activado

### Requirement: Vitrina /motion verificada
La suite SHALL verificar en `/motion` que el botón Replay reproduce cada transición y la devuelve al reposo, que el selector de velocidad (0.25x, 0.5x, 1x) cambia la duración de forma proporcional y que el interruptor de máscara muestra la capa interna.

#### Scenario: Velocidad
- **WHEN** se reproduce una transición a 1x y luego a 0.25x
- **THEN** la reproducción a 0.25x dura aproximadamente cuatro veces más, dentro de la tolerancia definida

### Requirement: Interacciones clave verificadas
La suite SHALL verificar el filtro de proyectos por tecnología, el enlace desde una hoja del AST a los proyectos que la usan, los comandos de la terminal, la navegación entre casos de estudio con Step over/Step back y la página 404.

#### Scenario: Filtro de proyectos
- **WHEN** el usuario aplica el filtro de una tecnología
- **THEN** solo quedan visibles los proyectos que usan esa tecnología

#### Scenario: AST a proyectos
- **WHEN** el usuario selecciona una tecnología en el árbol de habilidades
- **THEN** se resaltan exactamente los proyectos que la usan

#### Scenario: Terminal
- **WHEN** el usuario abre la terminal con `~` y ejecuta `help` y `projects`
- **THEN** la terminal lista los comandos disponibles y los proyectos, y anuncia la salida en una región aria-live

#### Scenario: Step over y Step back
- **WHEN** el usuario pulsa "Step over ▶" y luego "Step back ◀" en un caso de estudio
- **THEN** navega al caso siguiente y regresa al caso original

#### Scenario: Ruta inexistente
- **WHEN** se solicita una URL inexistente
- **THEN** la respuesta tiene estado 404, muestra "Segmentation fault (core dumped)" y "Reiniciar proceso" lleva al inicio

### Requirement: Formulario de contacto con envío simulado
La suite SHALL probar el formulario contra un servicio de email simulado, sin enviar correos reales, cubriendo validación, respuesta exitosa y fallo.

#### Scenario: Envío exitoso
- **WHEN** el usuario envía datos válidos y el servicio simulado responde con éxito
- **THEN** se muestra `200 OK ✓ Mensaje recibido` anunciado en una región aria-live

#### Scenario: Envío fallido
- **WHEN** el servicio simulado devuelve un error
- **THEN** se muestra el estado `500`, un botón de reintento y el email alternativo

#### Scenario: Datos inválidos
- **WHEN** el usuario envía un email con formato inválido
- **THEN** se muestra un mensaje de error asociado al campo y no se realiza el envío

### Requirement: Internacionalización
La suite SHALL verificar que las rutas en español e inglés renderizan el contenido en su idioma, declaran el atributo de idioma correcto y enlazan su alternativa.

#### Scenario: Cambio de idioma
- **WHEN** se cargan las versiones `es` y `en` de la página de inicio
- **THEN** cada una muestra textos en su idioma, el documento declara su idioma y existe enlace a la otra versión

### Requirement: Auditoría de accesibilidad automatizada
La suite SHALL ejecutar una auditoría automática de accesibilidad en la página de inicio, un caso de estudio, la Vista Rápida, la terminal abierta, `/heap`, `/motion`, un aviso de logro visible y la 404, en ambos temas, y MUST fallar ante cualquier violación de nivel serio o crítico.

#### Scenario: Página sin violaciones
- **WHEN** se audita cada página en tema oscuro y claro
- **THEN** no se reportan violaciones serias ni críticas

### Requirement: Integridad del modelo de contenido
Una prueba unitaria SHALL verificar que toda habilidad declarada en el contenido está vinculada con al menos un proyecto y que toda tecnología referida por un proyecto existe como habilidad.

#### Scenario: Habilidad huérfana
- **WHEN** se añade al contenido una habilidad que ningún proyecto usa
- **THEN** la prueba unitaria falla indicando el nombre de la habilidad
