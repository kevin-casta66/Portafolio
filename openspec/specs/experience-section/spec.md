## Purpose

Presentar la trayectoria profesional como funciones compiladas (etapa BYTECODE), donde cada logro es una instrucción con su traducción humana cuantificada.

## Requirements

### Requirement: Cada etapa como función
Cada empleo o etapa del contenido SHALL mostrarse como un bloque con firma de función (p. ej. `fn empresa_2023_2025()`), acompañado de empresa, rol y fechas legibles, en orden cronológico inverso.

#### Scenario: Orden cronológico
- **WHEN** el contenido define tres empleos
- **THEN** se muestran tres funciones, la más reciente primero, cada una con su empresa, rol y rango de fechas

### Requirement: Logros como instrucciones con texto humano
Cada logro SHALL mostrarse como una instrucción (`PUSH`, `CALL`, `OPTIMIZE`, `DEPLOY` u otra del contenido) junto a su descripción en lenguaje natural, y el contenido MUST incluir una métrica cuantificada por logro.

#### Scenario: Instrucción legible
- **WHEN** se renderiza un logro
- **THEN** se ven la instrucción en estilo código y a su lado la frase humana, p. ej. "Reduje el tiempo de carga un 48%"

#### Scenario: Logro sin métrica
- **WHEN** el contenido define un logro sin valor cuantificado
- **THEN** la validación del contenido en build reporta un error que identifica el logro

### Requirement: Columna de registros con el stack
Cada función SHALL mostrar una columna de "registros" con el stack tecnológico usado en ese empleo; en viewports estrechos la columna SHALL ubicarse bajo las instrucciones.

#### Scenario: Registros por empleo
- **WHEN** se observa la función de un empleo
- **THEN** su columna de registros lista las tecnologías de ese empleo y no las de otros

### Requirement: Estructura semántica de lista
Las funciones y sus instrucciones SHALL exponerse como listas ordenadas con encabezados por empleo, de modo que un lector de pantalla pueda navegar por empleo y por logro.

#### Scenario: Navegación por encabezados
- **WHEN** un lector de pantalla lista los encabezados de la página
- **THEN** aparece un encabezado por cada empleo bajo el encabezado de la sección de experiencia

### Requirement: Program counter ligado al scroll
Un indicador "program counter" SHALL avanzar con el scroll por la columna de instrucciones y resaltar la instrucción actual; retroceder el scroll MUST moverlo hacia atrás. El resaltado MUST NOT ser el único medio para leer las instrucciones.

#### Scenario: Avance
- **WHEN** el usuario desplaza la sección BYTECODE
- **THEN** el program counter se sitúa en la instrucción alineada con el centro del viewport y la resalta

#### Scenario: Retroceso
- **WHEN** el usuario hace scroll hacia arriba
- **THEN** el program counter retrocede a la instrucción anterior

### Requirement: Registros actualizados por función
La columna de registros SHALL actualizarse con una animación breve (duración UI) cada vez que el program counter entra en una función distinta, mostrando el stack usado en ese empleo.

#### Scenario: Cambio de empleo
- **WHEN** el program counter pasa de `fn empresa_a()` a `fn empresa_b()`
- **THEN** los registros se reemplazan por el stack de `empresa_b` con transición de opacidad/transform
