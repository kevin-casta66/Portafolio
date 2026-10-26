## ADDED Requirements

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
