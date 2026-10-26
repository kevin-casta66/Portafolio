## Purpose

Define los presupuestos de rendimiento obligatorios del portafolio (Lighthouse, Core Web Vitals, peso de JavaScript, fps y medios) para que la experiencia visual nunca degrade la carga ni la interacción.

## ADDED Requirements

### Requirement: Puntuaciones Lighthouse en móvil
El sitio SHALL obtener en Lighthouse con perfil móvil una puntuación de Performance ≥ 90 y puntuaciones de Accessibility, Best Practices y SEO iguales a 100, en la home y en al menos una página de caso de estudio, en ambos locales.

#### Scenario: Auditoría móvil de la home
- **WHEN** se ejecuta una auditoría Lighthouse móvil sobre `/es` y `/en`
- **THEN** Performance es ≥ 90 y Accessibility, Best Practices y SEO son 100

#### Scenario: Auditoría móvil de un caso de estudio
- **WHEN** se ejecuta una auditoría Lighthouse móvil sobre una página `/[locale]/projects/[slug]`
- **THEN** Performance es ≥ 90 y Accessibility, Best Practices y SEO son 100

### Requirement: Core Web Vitals
El sitio SHALL cumplir LCP < 2,5 s, CLS < 0,05 e INP < 200 ms medidos en perfil móvil con red y CPU limitadas.

#### Scenario: LCP del hero
- **WHEN** se carga la home en perfil móvil limitado
- **THEN** el elemento LCP es contenido del hero renderizado en servidor y LCP es < 2,5 s

#### Scenario: Estabilidad del layout
- **WHEN** se carga la página y terminan de cargar fuentes, imágenes, el boot y las escenas diferidas
- **THEN** el CLS acumulado es < 0,05

#### Scenario: Respuesta a la interacción
- **WHEN** el usuario interactúa con filtros de proyectos, nodos del AST, Hold-to-Execute, la vista `/heap`, terminal o formulario
- **THEN** el INP medido es < 200 ms

### Requirement: Interacciones nunca bloqueadas
La respuesta a la interacción SHALL tener prioridad sobre cualquier animación: ninguna animación ni cálculo SHALL bloquear el hilo principal durante una interacción, y el trabajo pesado (simulaciones, reorganización de elementos, preparación de partículas) SHALL ejecutarse en la GPU o fuera del hilo principal. Toda interacción SHALL mostrar feedback visual en el siguiente fotograma.

#### Scenario: Reorganizar el Heap
- **WHEN** el usuario pulsa "Run GC" en `/heap` con todos los proyectos y experimentos cargados
- **THEN** el botón muestra feedback inmediato, no hay tareas largas (> 50 ms) en el hilo principal durante la interacción y el INP es < 200 ms

#### Scenario: Interacción durante una transición de fase
- **WHEN** el usuario pulsa un filtro o abre la terminal mientras se reproduce una transición de fase
- **THEN** la interacción responde en < 200 ms sin esperar a que termine la transición

### Requirement: Scroll nativo sin secuestro
El scroll SHALL ser siempre nativo: el suavizado y las secciones fijadas SHALL respetar la velocidad y la dirección que imprime el usuario, SHALL permitir retroceder en cualquier momento y SHALL no bloquear la rueda, el gesto táctil ni las teclas de desplazamiento.

#### Scenario: Retroceso durante una sección fijada
- **WHEN** el usuario hace scroll hacia arriba en mitad de una transición fijada por scroll
- **THEN** la transición retrocede al ritmo del usuario sin saltos ni bloqueo

#### Scenario: Navegación por teclado durante una sección fijada
- **WHEN** el usuario pulsa Re Pág, Av Pág, Inicio o Fin en una sección fijada
- **THEN** la página se desplaza en consecuencia sin quedar retenida

### Requirement: Presupuesto de JavaScript inicial
El JavaScript necesario para el primer render de cualquier página (home, casos de estudio, `/heap` y `/motion`) SHALL pesar menos de 180 KB comprimido con gzip, y el código de animación avanzada, de suavizado de scroll y de escenas 3D SHALL cargarse después del Largest Contentful Paint.

#### Scenario: Medición del bundle inicial
- **WHEN** se genera la build de producción y se analiza el JS cargado por cada página antes de cualquier interacción
- **THEN** la suma gzip es < 180 KB y no incluye el código de escenas 3D ni de animación diferible

#### Scenario: Carga diferida tras el LCP
- **WHEN** se inspecciona la línea de tiempo de red de la home
- **THEN** las peticiones del código de animación y 3D comienzan después del evento LCP y el contenido HTML ya está pintado

### Requirement: Fluidez de animación
Las animaciones y escenas SHALL mantener 60 fps estables en un escritorio de gama media, y el ratio de píxeles del dispositivo usado para renderizar SHALL limitarse a 2.

#### Scenario: Recorrido completo en escritorio
- **WHEN** se recorre la home de principio a fin con scroll continuo en un escritorio de gama media
- **THEN** la mediana de fps es ≥ 58 y ningún tramo de más de 1 s cae por debajo de 50 fps

#### Scenario: Pantalla de alta densidad
- **WHEN** el dispositivo reporta un ratio de píxeles de 3
- **THEN** las escenas se renderizan con ratio efectivo ≤ 2

### Requirement: Presupuesto por escena activa
Cada escena 3D activa SHALL usar menos de 100 llamadas de dibujo por fotograma, y el número de partículas simultáneas SHALL no superar 200 000 en tier alto, 50 000 en tier medio y 0 en tier bajo.

#### Scenario: Recorrido en tier alto
- **WHEN** se recorren todas las fases en tier alto con el Modo Debug activo
- **THEN** ninguna escena activa supera 100 llamadas de dibujo ni 200 000 partículas

#### Scenario: Tier bajo
- **WHEN** el sitio funciona en tier bajo
- **THEN** ninguna escena genera partículas y las transiciones usan planos con texturas

### Requirement: Medios optimizados
Las imágenes SHALL servirse en AVIF o WebP con tamaños responsivos y dimensiones reservadas; los vídeos SHALL servirse en WebM o MP4 con póster, silenciados y reproduciéndose solo en viewport; los modelos y texturas 3D, incluidos los atlas de texto, SHALL usar formatos comprimidos para GPU.

#### Scenario: Imagen de proyecto
- **WHEN** el navegador soporta AVIF y solicita la captura de un proyecto en un viewport de 390 px
- **THEN** recibe una variante AVIF de ancho adecuado al viewport y el espacio está reservado antes de la carga

#### Scenario: Texturas de escena
- **WHEN** se inspeccionan las texturas descargadas por las escenas 3D
- **THEN** todas usan un formato comprimido para GPU y ninguna es un PNG o JPEG sin comprimir de más de 256 px

#### Scenario: Vídeo fuera del viewport
- **WHEN** la tarjeta de un proyecto con vídeo no está en el viewport
- **THEN** el vídeo no se reproduce y se muestra su póster

### Requirement: Fuentes precargadas y autoalojadas
Las fuentes SHALL servirse desde el propio dominio, con subset, precarga de las usadas en el primer render y una estrategia de visualización que no bloquee el texto ni provoque saltos de layout.

#### Scenario: Primer render con fuentes
- **WHEN** se carga la home en frío
- **THEN** no hay peticiones a dominios de fuentes de terceros, las fuentes del hero se precargan y el texto es visible antes de que terminen de descargarse
