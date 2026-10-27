## Purpose

Define la fuente única de verdad visual y de movimiento de «Portafolio» (color, acentos por fase, easing, duraciones, tipografía fluida, espaciado y grilla) para que toda la interfaz sea coherente y tematizable.

## Requirements

### Requirement: Paleta base como tokens
El sistema SHALL exponer la paleta base como variables CSS globales con, como mínimo, los roles: fondo base (#07080C), superficie (#0E1118), superficie elevada (#151A24), borde (#232A38), texto principal (#E8ECF4) y texto secundario (#8A93A6) en el tema oscuro.

#### Scenario: Tokens disponibles en el documento
- **WHEN** se carga cualquier página del sitio
- **THEN** el elemento raíz expone las variables de color base y sus valores computados coinciden con la paleta del tema activo

### Requirement: Acentos por fase
El sistema SHALL definir un token de acento por fase: SOURCE/LEXER cian (#22D3EE), PARSER violeta (#A78BFA), BYTECODE lima (#A3E635), RUNTIME ámbar (#FBBF24), GPU magenta (#F472B6) y DISPLAY un gradiente que combina todos los acentos. Cada fase SHALL tener además un token de tinte de fondo con su acento entre 4% y 6% de opacidad, y SHALL existir un token de "acento activo" que los componentes usen sin conocer la fase concreta.

#### Scenario: Acento de una fase
- **WHEN** una sección declara pertenecer a la fase PARSER
- **THEN** su acento activo resuelve al violeta del tema vigente y su tinte de fondo usa ese color con opacidad entre 4% y 6%

#### Scenario: Fase DISPLAY
- **WHEN** una sección declara pertenecer a la fase DISPLAY
- **THEN** su acento se representa como un gradiente que incluye los acentos de todas las fases

### Requirement: Sin colores literales fuera de los tokens
Los componentes MUST NOT contener valores de color literales (hexadecimales, rgb/hsl con valores fijos); todo color SHALL referenciar un token. El proyecto SHALL incluir una verificación automática que falle si encuentra colores literales fuera del archivo de tokens.

#### Scenario: Color literal en un componente
- **WHEN** un componente introduce un color hexadecimal literal y se ejecuta la verificación de lint
- **THEN** la verificación falla indicando el archivo y la línea

### Requirement: Tokens de movimiento
El sistema SHALL definir tokens de movimiento: easing de entrada `cubic-bezier(0.16, 1, 0.3, 1)`, easing de escena `cubic-bezier(0.76, 0, 0.24, 1)`, resorte de UI (rigidez ≈ 300, amortiguación ≈ 30), duraciones micro 150 ms, UI 300 ms y revelado 700 ms, y staggers de 30-40 ms (caracteres) y 60-80 ms (elementos de lista). Estos valores SHALL estar disponibles tanto en CSS como en código.

#### Scenario: Mismo valor en CSS y en código
- **WHEN** se consulta la duración "UI" desde una hoja de estilos y desde código
- **THEN** ambas devuelven 300 ms

### Requirement: Escala tipográfica fluida
El sistema SHALL definir una escala tipográfica fluida con pasos nombrados (al menos de `xs` a `display`) cuyo tamaño escala entre un mínimo y un máximo según el ancho del viewport, sin saltos bruscos.

#### Scenario: Escalado entre viewports
- **WHEN** el viewport cambia de 360 px a 1440 px de ancho
- **THEN** cada paso de la escala crece de forma continua entre su mínimo y su máximo declarados

### Requirement: Grilla de 12 columnas y espaciado
El sistema SHALL ofrecer una grilla de 12 columnas con márgenes laterales y separación definidos como tokens, y una escala de espaciado consistente. En móvil los márgenes laterales SHALL ser de al menos 16 px y no SHALL existir scroll horizontal.

#### Scenario: Sin desbordamiento en móvil
- **WHEN** la página se visualiza a 360 px de ancho
- **THEN** el contenido respeta márgenes de al menos 16 px y el documento no presenta scroll horizontal

### Requirement: Tokens de superficie translúcida
El sistema SHALL definir tokens para superficies translúcidas (color de fondo con transparencia, opacidad mínima del fondo y desenfoque) en ambos temas. La opacidad mínima SHALL garantizar que el texto principal sobre esa superficie cumple contraste WCAG AA contra el fondo más desfavorable posible; si no lo cumple, la verificación automática de contraste SHALL fallar.

#### Scenario: Contraste sobre vidrio
- **WHEN** se ejecuta la verificación de contraste con la superficie translúcida sobre el fondo más claro y el más oscuro de cada tema
- **THEN** el texto principal alcanza al menos 4,5:1 en todos los casos

#### Scenario: Opacidad insuficiente detectada
- **WHEN** alguien reduce la opacidad mínima por debajo del umbral que garantiza AA
- **THEN** la verificación de contraste falla e indica el token afectado
