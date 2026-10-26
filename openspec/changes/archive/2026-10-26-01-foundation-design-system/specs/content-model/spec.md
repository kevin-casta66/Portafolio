## Purpose

Centraliza todo el contenido del portafolio (perfil, proyectos, habilidades, experiencia y experimentos) en datos tipados y editables, y garantiza que cada habilidad esté respaldada por proyectos reales.

## ADDED Requirements

### Requirement: Contenido en datos tipados y editables
Todo el contenido del portafolio SHALL definirse en archivos de datos del directorio de contenido, separados de los componentes, con tipos estrictos para: perfil (nombre, rol, propuesta de valor, disponibilidad, email, redes, CV por idioma, bio por categorías de token), proyectos, habilidades, experiencia y experimentos. Los textos visibles SHALL admitir versión en español e inglés.

#### Scenario: Editar un proyecto
- **WHEN** el autor cambia el título de un proyecto en el archivo de datos
- **THEN** el nuevo título aparece en el sitio sin modificar ningún componente

#### Scenario: Traducción faltante
- **WHEN** un texto visible no tiene versión en uno de los idiomas
- **THEN** la verificación de tipos o de contenido falla indicando el campo

### Requirement: Esquema de proyecto
Cada proyecto SHALL tener: identificador único (slug), nombre, PID, estado (`running`, `deployed` u `open-source`), problema resuelto en una línea, rol, stack (referencias a habilidades), métricas con valor y etiqueta, medios (imagen y video opcional con póster), enlaces opcionales (demo, código, caso de estudio) y un indicador de destacado.

#### Scenario: Estado inválido
- **WHEN** un proyecto declara un estado distinto de `running`, `deployed` u `open-source`
- **THEN** la validación de contenido falla

### Requirement: Esquema de habilidad y experiencia
Cada habilidad SHALL tener identificador, nombre, categoría (Frontend, Backend, Cloud/DevOps, Datos, Diseño, Soft skills), años de uso y nivel cualitativo (Uso diario, Producción, Exploración); no SHALL existir porcentajes. Cada experiencia SHALL tener empresa, fechas, nombre de función tipo `fn empresa_inicio_fin()`, stack y logros, cada logro con una instrucción (`PUSH`, `CALL`, `OPTIMIZE`, `DEPLOY`, …) y un texto humano que incluya una cifra cuantificada.

#### Scenario: Logro sin cuantificar
- **WHEN** un logro de experiencia no contiene ninguna cifra
- **THEN** la validación de contenido falla indicando el logro

### Requirement: Relaciones habilidad↔proyecto derivadas
Las relaciones entre habilidades y proyectos SHALL calcularse automáticamente a partir del stack de cada proyecto; el autor MUST NOT mantener esa relación a mano. Para cada habilidad SHALL poder obtenerse la lista de proyectos que la usan y su recuento.

#### Scenario: Recuento de proyectos por habilidad
- **WHEN** dos proyectos incluyen la habilidad "react" en su stack
- **THEN** la habilidad "react" informa 2 proyectos y lista ambos

### Requirement: Integridad del contenido
La compilación del sitio MUST fallar con un mensaje descriptivo si: una habilidad no está respaldada por al menos un proyecto, un proyecto referencia una habilidad inexistente, hay identificadores duplicados o un proyecto enlaza a un caso de estudio inexistente.

#### Scenario: Habilidad huérfana
- **WHEN** se añade una habilidad que ningún proyecto usa y se compila el sitio
- **THEN** la compilación falla indicando el identificador de la habilidad

#### Scenario: Referencia rota
- **WHEN** un proyecto incluye en su stack una habilidad que no existe
- **THEN** la compilación falla indicando el proyecto y la referencia

### Requirement: Placeholders explícitos
Mientras el autor no aporte sus datos reales, el contenido SHALL usar datos de ejemplo marcados como placeholder, y SHALL existir una comprobación que liste los placeholders pendientes.

#### Scenario: Listar placeholders
- **WHEN** el autor ejecuta la comprobación de contenido pendiente
- **THEN** obtiene la lista de campos que siguen siendo placeholder
