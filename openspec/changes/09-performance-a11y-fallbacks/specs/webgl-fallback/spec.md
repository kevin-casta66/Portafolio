## Purpose

Garantiza que la narrativa y el contenido de cada fase se conserven en una cadena de fallbacks gráficos (backend de nueva generación → WebGL2 → 2D sin WebGL), también ante pérdida de contexto o rendimiento insuficiente.

## ADDED Requirements

### Requirement: Cadena de fallbacks gráficos en tres niveles
El sitio SHALL usar el backend gráfico de nueva generación cuando el navegador lo soporte, SHALL pasar automáticamente a un backend WebGL2 cuando no esté disponible, y SHALL usar la experiencia 2D sin WebGL cuando ninguno de los dos esté disponible o la GPU esté por debajo del nivel mínimo. La detección SHALL ocurrir antes de descargar el código 3D.

#### Scenario: Navegador con backend de nueva generación
- **WHEN** el navegador soporta el backend gráfico de nueva generación
- **THEN** las escenas se renderizan con ese backend y el Modo Debug lo indica

#### Scenario: Navegador solo con WebGL2
- **WHEN** el navegador no soporta el backend de nueva generación pero sí WebGL2
- **THEN** las escenas se renderizan con WebGL2 sin errores visibles y el Modo Debug indica WebGL2

#### Scenario: Navegador sin WebGL
- **WHEN** el navegador no puede crear un contexto WebGL2
- **THEN** no se descarga el código 3D y todas las fases muestran su experiencia 2D

#### Scenario: GPU de nivel bajo
- **WHEN** la GPU se clasifica por debajo del nivel mínimo
- **THEN** el sitio usa la experiencia 2D sin intentar renderizar las escenas 3D

### Requirement: Contenido idéntico entre backends
El contenido presentado (textos, datos, enlaces, proyectos, experimentos y estados) SHALL ser idéntico con el backend de nueva generación, con WebGL2 y en la experiencia 2D; solo pueden variar los efectos visuales que dependan de capacidades del backend.

#### Scenario: Comparación de backends
- **WHEN** se recorre la home, un caso de estudio, `/heap` y `/motion` con cada uno de los tres niveles
- **THEN** el contenido DOM accesible es el mismo en los tres y ninguna sección queda vacía

#### Scenario: Efecto que requiere capacidades avanzadas
- **WHEN** un efecto depende de capacidades solo disponibles en el backend de nueva generación (por ejemplo, simulación de partículas o fluido en GPU)
- **THEN** en WebGL2 se muestra su variante de tier inferior y la transformación de datos de la narrativa sigue siendo reconocible

### Requirement: Fallback 2D que conserva la narrativa
Cada fase con escena 3D, y la vista `/heap`, SHALL tener un equivalente 2D en SVG/CSS que represente la misma transformación de datos (tokens, árbol, instrucciones, chip, pipeline gráfico, monitor, bloques de memoria), coherente con los tokens de diseño y ambos temas.

#### Scenario: Recorrido completo sin WebGL
- **WHEN** se recorre la home de principio a fin sin WebGL
- **THEN** cada fase muestra su representación 2D y la secuencia token → nodo → instrucción → proceso → vértice → píxel sigue siendo reconocible

#### Scenario: Interacciones sin WebGL
- **WHEN** el usuario pasa el cursor por una tarjeta de proyecto sin WebGL
- **THEN** el núcleo correspondiente se resalta en la representación 2D del chip

#### Scenario: Hold-to-Execute sin WebGL
- **WHEN** el usuario completa Hold-to-Execute sobre un proyecto sin WebGL
- **THEN** el caso de estudio se abre con una transición 2D y el mismo contenido

### Requirement: Recuperación ante pérdida de contexto
Si el contexto o dispositivo gráfico se pierde durante la sesión, el sitio SHALL mostrar el fallback 2D de las fases afectadas sin errores visibles ni pérdida de contenido, y SHALL intentar restaurar las escenas cuando el contexto se recupere.

#### Scenario: Contexto perdido
- **WHEN** el navegador emite una pérdida de contexto gráfico mientras el usuario está en la fase GPU
- **THEN** la fase muestra su fallback 2D en menos de 1 s y el resto de la página sigue operativa

#### Scenario: Contexto restaurado
- **WHEN** el navegador restaura el contexto gráfico
- **THEN** las escenas 3D vuelven a mostrarse en las fases visibles

### Requirement: Degradación por rendimiento sostenido
Si los fps se mantienen por debajo del umbral mínimo después de haber reducido la calidad al tier más bajo, el sitio SHALL cambiar al fallback 2D durante el resto de la sesión.

#### Scenario: Caída sostenida de fps
- **WHEN** los fps se mantienen por debajo de 30 durante más de 3 s en el tier más bajo
- **THEN** las escenas 3D se sustituyen por el fallback 2D sin recargar y la decisión persiste en la sesión
