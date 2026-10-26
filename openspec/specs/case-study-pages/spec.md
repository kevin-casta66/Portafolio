## Purpose

Presentar cada proyecto destacado como un caso de estudio profundo con estética de depurador, que explica contexto, problema, arquitectura, decisiones, código, resultados y aprendizajes.

## Requirements

### Requirement: Ruta de caso de estudio generada desde contenido
El sistema SHALL exponer una página por cada proyecto que tenga caso de estudio, en cada locale soportado (es, en), en la ruta `/<locale>/projects/<slug>`, generada estáticamente en build a partir de un archivo de contenido por caso y locale.

#### Scenario: Caso existente
- **WHEN** el visitante abre `/es/projects/<slug>` de un proyecto con caso de estudio
- **THEN** recibe una página HTML completa prerenderizada con el título del proyecto y todas las secciones del caso

#### Scenario: Slug inexistente
- **WHEN** el visitante abre `/es/projects/no-existe`
- **THEN** el sistema responde con estado 404 y muestra la página "Segmentation fault"

#### Scenario: Contenido sin caso de estudio
- **WHEN** un proyecto del modelo de contenido no tiene archivo de caso
- **THEN** su tarjeta no muestra el enlace "Caso de estudio" y no se genera ruta para él

### Requirement: Contenido completo sin JavaScript
Todo el contenido textual, código, diagrama y métricas de un caso SHALL ser legible con JavaScript deshabilitado; las animaciones son una mejora progresiva.

#### Scenario: JS deshabilitado
- **WHEN** el visitante abre un caso con JavaScript deshabilitado
- **THEN** ve todas las secciones, el código resaltado, el diagrama completo y los valores de las métricas

### Requirement: Panel de breakpoints
La página SHALL mostrar un panel de navegación con los breakpoints Contexto, Problema, Arquitectura, Decisiones, Código destacado, Resultados y Aprendizajes, que enlaza a cada sección y resalta la sección actualmente visible.

#### Scenario: Salto a una sección
- **WHEN** el visitante activa el breakpoint "Arquitectura" con ratón o teclado
- **THEN** la página se desplaza a la sección Arquitectura y el foco se mueve a su encabezado

#### Scenario: Resaltado de sección activa
- **WHEN** el visitante hace scroll hasta la sección Resultados
- **THEN** el breakpoint "Resultados" se marca como activo visualmente y con `aria-current`

#### Scenario: Móvil
- **WHEN** el viewport es menor que el breakpoint de escritorio
- **THEN** el panel se presenta como un índice compacto que no tapa el contenido

### Requirement: Diagrama de arquitectura por pasos
La sección Arquitectura SHALL incluir un diagrama que se construye por pasos a medida que el visitante hace scroll, con una descripción textual equivalente de cada paso.

#### Scenario: Construcción con scroll
- **WHEN** el visitante avanza por la sección Arquitectura
- **THEN** los nodos y conexiones del diagrama aparecen en el orden definido en el contenido, y retroceder el scroll los oculta en orden inverso

#### Scenario: Movimiento reducido
- **WHEN** el visitante tiene `prefers-reduced-motion: reduce`
- **THEN** el diagrama se muestra completo sin animación por pasos

### Requirement: Código destacado con anotaciones
Los bloques de código SHALL mostrarse con resaltado de sintaxis generado en build (sin coste de JS en cliente) y SHALL admitir anotaciones al margen asociadas a líneas concretas.

#### Scenario: Anotación de línea
- **WHEN** un bloque de código define una anotación para la línea 12
- **THEN** la anotación aparece al margen alineada con la línea 12 en escritorio, y debajo del bloque en móvil

#### Scenario: Colores por tema
- **WHEN** el visitante cambia entre tema oscuro y claro
- **THEN** el resaltado de código usa la paleta de tokens del tema activo con contraste AA

### Requirement: Métricas de resultados accesibles
Las métricas de resultados SHALL representarse como gráficos que se dibujan al entrar en viewport y SHALL tener un equivalente accesible (tabla o texto) con los mismos valores.

#### Scenario: Entrada en viewport
- **WHEN** un gráfico de métricas entra en viewport por primera vez
- **THEN** se dibuja animadamente hasta sus valores finales

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre la sección Resultados
- **THEN** accede a los valores de cada métrica como tabla o texto, sin depender del gráfico

### Requirement: Navegación entre casos
La página SHALL ofrecer "Step back ◀" (caso anterior) y "Step over ▶" (caso siguiente) siguiendo el orden de proyectos del modelo de contenido, y un enlace para volver al home.

#### Scenario: Siguiente caso
- **WHEN** el visitante activa "Step over ▶" en el caso N
- **THEN** navega al caso N+1 en el mismo locale

#### Scenario: Extremos
- **WHEN** el visitante está en el primer caso
- **THEN** "Step back ◀" no se muestra o está deshabilitado de forma accesible, y lo mismo aplica a "Step over ▶" en el último caso
