## Purpose

Presentar la biografía del desarrollador como un flujo de tokens clasificados por categoría léxica (etapa LEXER), legible y explorable sin animación.

## Requirements

### Requirement: Tokens agrupados en carriles por categoría
La sección "Sobre mí" SHALL mostrar la biografía como tokens agrupados en cuatro carriles etiquetados: `keyword` (quién soy), `identifier` (nombre/ubicación), `string` (motivaciones) y `number` (datos cuantitativos), con los tokens tomados del contenido editable.

#### Scenario: Render de carriles
- **WHEN** se carga la sección "Sobre mí"
- **THEN** se ven los cuatro carriles con su etiqueta visible y cada token aparece en el carril de su categoría

#### Scenario: Categoría sin tokens
- **WHEN** el contenido no define tokens para una categoría
- **THEN** ese carril no se renderiza y el resto de carriles se mantiene sin huecos vacíos

### Requirement: Datos numéricos legibles sin animación
Los tokens `number` SHALL mostrar su valor final (p. ej. años de experiencia, proyectos entregados, clientes) junto a una etiqueta descriptiva en el HTML inicial.

#### Scenario: Valor final presente
- **WHEN** la página se renderiza en servidor
- **THEN** cada token `number` contiene su valor final y su etiqueta en el HTML

### Requirement: Tooltip tipo IDE accesible
Cada token SHALL exponer un tooltip con su "tipo inferido" y una frase adicional, que aparece tanto con hover como con foco de teclado, se cierra con Escape y está asociado al token para tecnologías de asistencia.

#### Scenario: Apertura por teclado
- **WHEN** el visitante enfoca un token con Tab
- **THEN** aparece su tooltip y un lector de pantalla anuncia el tipo inferido y la frase

#### Scenario: Cierre con Escape
- **WHEN** un tooltip está visible y el visitante pulsa Escape
- **THEN** el tooltip se oculta y el foco permanece en el token

#### Scenario: Dispositivo táctil
- **WHEN** el visitante toca un token en un dispositivo táctil
- **THEN** el tooltip se muestra y se oculta al tocar fuera de él

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
