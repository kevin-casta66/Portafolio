## ADDED Requirements

### Requirement: Contadores numéricos al entrar en viewport
Los tokens de tipo `number` SHALL animarse como contadores desde 0 hasta su valor real solo cuando entran en el viewport, una única vez por carga. El valor final MUST estar presente en el DOM para tecnologías de asistencia desde el inicio.

#### Scenario: Entrada en viewport
- **WHEN** el token "años de experiencia" entra en el viewport
- **THEN** el contador anima hasta el valor del contenido en la duración de revelado

#### Scenario: Fuera de viewport
- **WHEN** la sección aún no es visible
- **THEN** ningún contador se ha iniciado

#### Scenario: Valor accesible
- **WHEN** un lector de pantalla lee el contador antes de que termine la animación
- **THEN** anuncia el valor final, no el intermedio

### Requirement: Clasificación de tokens en carriles
Los tokens de la biografía SHALL entrar con stagger de 60-80 ms y ordenarse en sus carriles por categoría (`keyword`, `identifier`, `string`, `number`) a medida que la sección se revela.

#### Scenario: Revelado de carriles
- **WHEN** la sección LEXER se revela
- **THEN** cada token se desplaza hasta el carril de su categoría y el texto queda legible en su posición final
