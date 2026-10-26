## Purpose

Presentar la biografía del desarrollador como un flujo de tokens clasificados por categoría léxica (etapa LEXER), legible y explorable sin animación.

## ADDED Requirements

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
