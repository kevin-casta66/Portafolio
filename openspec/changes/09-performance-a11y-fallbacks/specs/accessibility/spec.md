## Purpose

Asegura que todo el portafolio sea perceptible, operable y comprensible con teclado, lectores de pantalla y en ambos temas, cumpliendo WCAG 2.2 AA.

## ADDED Requirements

### Requirement: Estructura semántica y landmarks
Cada página SHALL tener un único `main`, `header`, `nav` y `footer` identificables, un único `h1` y una jerarquía de encabezados sin saltos, y el atributo `lang` SHALL coincidir con el locale activo.

#### Scenario: Inspección de landmarks
- **WHEN** un lector de pantalla lista los landmarks de la home
- **THEN** aparecen banner, navegación, contenido principal y pie, y cada sección de fase tiene un encabezado accesible

### Requirement: Skip link
El primer elemento enfocable de cada página SHALL ser un enlace "Saltar al contenido" visible al recibir foco que mueve el foco al contenido principal.

#### Scenario: Primer Tab
- **WHEN** el usuario carga la página y pulsa Tab
- **THEN** el skip link se hace visible y al activarlo el foco pasa al contenido principal, saltándose el boot si sigue activo

### Requirement: Orden de foco y foco visible
El orden de foco SHALL seguir el orden visual y narrativo, y todo elemento enfocable SHALL mostrar un indicador de foco visible con estética de caret brillante y contraste ≥ 3:1 respecto al fondo adyacente en ambos temas.

#### Scenario: Recorrido con Tab
- **WHEN** el usuario recorre la home solo con Tab
- **THEN** el foco avanza por header, fases en orden y pie, nunca queda atrapado fuera de un diálogo y siempre es visible

#### Scenario: Diálogos
- **WHEN** se abre la terminal, la ayuda de atajos o un panel modal
- **THEN** el foco entra en el diálogo, queda contenido en él, Escape lo cierra y el foco vuelve al elemento que lo abrió

### Requirement: Contraste en ambos temas
Todo texto e icono informativo SHALL cumplir contraste WCAG AA (4,5:1 texto normal, 3:1 texto grande y componentes de UI) en el tema oscuro y en el tema claro, incluidos los acentos de cada fase.

#### Scenario: Acentos en tema claro
- **WHEN** se mide el contraste de los textos coloreados con acentos de fase en el tema claro
- **THEN** todos alcanzan al menos 4,5:1 (o 3:1 si son texto grande)

### Requirement: Equivalente DOM del contenido del canvas
Toda información presentada dentro de escenas gráficas SHALL existir también como contenido DOM accesible, todo texto renderizado en la escena gráfica (títulos de fase, línea de código del hero, etiquetas) SHALL ser una capa visual sincronizada de un texto DOM real, y los lienzos decorativos SHALL ocultarse a las tecnologías de asistencia.

#### Scenario: Título de fase renderizado en la escena
- **WHEN** un título de fase se muestra como texto dentro de la escena gráfica
- **THEN** el mismo texto existe en el DOM como encabezado, es accesible para lectores de pantalla e indexable, y se lee aunque la escena no cargue

#### Scenario: Lector de pantalla en RUNTIME
- **WHEN** un lector de pantalla recorre la sección de proyectos
- **THEN** anuncia nombre, estado, métricas y enlaces de cada proyecto sin depender del canvas

### Requirement: Navegación completa por teclado
Todas las interacciones SHALL ser operables con teclado, incluido el árbol de habilidades (moverse entre nodos con flechas, expandir/contraer, activar una tecnología para resaltar sus proyectos), filtros, cambio de layout de proyectos, tarjetas giratorias del laboratorio, puerta de arranque, terminal y formulario.

#### Scenario: Explorar el AST con teclado
- **WHEN** el usuario enfoca el árbol de habilidades y usa flechas, Enter y Escape
- **THEN** puede recorrer categorías y tecnologías, activar una tecnología para ver sus proyectos relacionados y salir del resaltado

#### Scenario: Ver código de un experimento
- **WHEN** el usuario enfoca "Ver código" de un experimento y pulsa Enter
- **THEN** se muestra el fragmento de código y el foco se mueve a él

### Requirement: Contraste sobre superficies translúcidas
El texto sobre superficies de vidrio translúcido (Call Stack, terminal y lente de `/heap`) SHALL cumplir contraste WCAG AA en ambos temas sobre el fondo más desfavorable que pueda quedar detrás; cuando no lo cumpla, la opacidad del fondo SHALL aumentarse hasta cumplirlo.

#### Scenario: Call Stack sobre una escena clara
- **WHEN** el Call Stack queda sobre la zona más luminosa de cualquier fase en ambos temas
- **THEN** su texto mantiene contraste ≥ 4,5:1

### Requirement: Accesibilidad de Hold-to-Execute
La interacción de mantener pulsado para ejecutar un proyecto SHALL tener alternativa de activación simple (clic, toque o Enter), SHALL ejecutarse con teclado manteniendo Espacio, SHALL exponer su progreso a tecnologías de asistencia y SHALL anunciar su resultado.

#### Scenario: Ejecutar con teclado
- **WHEN** el usuario enfoca un proyecto y mantiene Espacio hasta completar el progreso
- **THEN** el progreso se expone como valor accesible, se anuncia la apertura del caso y el foco pasa al encabezado del caso

### Requirement: Accesibilidad de /heap y /motion
La vista `/heap` SHALL ser navegable con flechas del teclado entre bloques y SHALL ofrecer una lista accesible equivalente con todos sus proyectos y experimentos; la página `/motion` SHALL permitir operar con teclado cada control (Replay, velocidad e interruptor de máscara) con nombres accesibles.

#### Scenario: Recorrer el Heap con teclado
- **WHEN** el usuario enfoca la cuadrícula de `/heap` y pulsa las flechas
- **THEN** el foco se mueve al bloque adyacente, el bloque enfocado se lleva al viewport y su nombre y dirección se anuncian

#### Scenario: Controles de /motion
- **WHEN** el usuario recorre `/motion` con Tab
- **THEN** cada transición expone Replay, selector de velocidad e interruptor de máscara con nombre y estado accesibles

### Requirement: Anuncios dinámicos
La salida de la terminal, el resultado del envío del formulario y los avisos de logros SHALL anunciarse mediante regiones vivas sin mover el foco, y los errores de validación SHALL asociarse a su campo y anunciarse.

#### Scenario: Envío del formulario
- **WHEN** el formulario se envía con éxito o falla
- **THEN** el lector de pantalla anuncia "200 OK — Mensaje recibido" o el error con la opción de reintento

#### Scenario: Comando en la terminal
- **WHEN** el usuario ejecuta un comando en la terminal
- **THEN** la salida se anuncia sin mover el foco del campo de entrada

### Requirement: Auditoría automatizada sin violaciones
Las páginas home, caso de estudio, 404, `/heap` y `/motion` SHALL pasar una auditoría automatizada de accesibilidad WCAG 2.2 AA sin violaciones en ambos temas, ambos locales, modo reducido y fallback sin WebGL.

#### Scenario: Auditoría de la matriz de estados
- **WHEN** se ejecuta la auditoría automatizada en cada combinación de página, tema, locale y modo
- **THEN** el informe muestra cero violaciones
