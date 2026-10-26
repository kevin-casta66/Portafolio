## Purpose

Define las escenas 3D de cada fase de «COMPILE» que convierten la narrativa token → nodo → instrucción → proceso → vértice → píxel en imagen, siempre como capa sobre contenido DOM autosuficiente.

## ADDED Requirements

### Requirement: Retícula de circuito del hero con fluido de silicio
La fase SOURCE SHALL mostrar de fondo una retícula de circuito con trazas iluminadas y parallax suave al mover el puntero. En tier alto, el puntero MUST dejar una estela de "calor" sobre la retícula producida por una simulación de fluido; en los demás tiers la estela MUST omitirse.

#### Scenario: Movimiento del puntero en tier alto
- **WHEN** el usuario mueve el puntero sobre el hero en tier alto
- **THEN** la retícula se desplaza con parallax y aparece una estela de calor que se disipa

#### Scenario: Tier medio
- **WHEN** el dispositivo está en tier medio
- **THEN** la retícula tiene parallax pero no hay estela de fluido

#### Scenario: Texto del hero
- **WHEN** la retícula está animándose
- **THEN** el nombre, rol, propuesta de valor y CTAs mantienen contraste AA sobre ella

### Requirement: Chip con núcleos y hotspots
La fase RUNTIME SHALL mostrar un die de procesador visto desde arriba en el que cada proyecto corresponde a un núcleo. Al pasar el puntero o enfocar una tarjeta, su núcleo MUST encenderse; cada núcleo SHALL tener un hotspot de partículas que reacciona al hover y muestra la ficha rápida del proyecto (nombre, estado, stack y una métrica), que también MUST ser alcanzable por teclado y táctil.

#### Scenario: Hover en tarjeta
- **WHEN** el usuario pasa el puntero o lleva el foco a una tarjeta de proyecto
- **THEN** el núcleo correspondiente del chip se ilumina

#### Scenario: Hotspot del núcleo
- **WHEN** el usuario pasa el puntero sobre un núcleo del chip
- **THEN** sus partículas reaccionan y aparece la ficha rápida del proyecto

#### Scenario: Acceso sin puntero
- **WHEN** el usuario navega por teclado o toca un núcleo en móvil
- **THEN** la misma ficha rápida se muestra y su contenido existe en el DOM

### Requirement: Pipeline GPU
La fase GPU SHALL representar el pipeline gráfico como vértices → triángulos → rasterización → píxeles, avanzando con el scroll y reversible al retroceder.

#### Scenario: Scroll por la fase GPU
- **WHEN** el usuario avanza por la fase GPU
- **THEN** la escena pasa de vértices a triángulos, a rasterización y a píxeles en ese orden

#### Scenario: Scroll hacia atrás
- **WHEN** el usuario retrocede por la fase GPU
- **THEN** la escena recorre las etapas en orden inverso sin saltos

### Requirement: Monitor final
La fase DISPLAY SHALL mostrar la silueta de un monitor formada por los píxeles de la fase anterior, con el gradiente espectral de todos los acentos, enmarcando el formulario de contacto DOM sin cubrir ni interceptar sus controles.

#### Scenario: Llegada a DISPLAY
- **WHEN** termina la convergencia de píxeles
- **THEN** el monitor enmarca el formulario y todos sus campos siguen siendo operables

### Requirement: Postprocesado controlado
El sistema SHALL aplicar bloom selectivo, aberración cromática, grano y dithering solo como capa visual. La aberración cromática intensa MUST limitarse a cambios de fase (menos de 300 ms) y a la señal de velocidad de scroll acotada; el bloom MUST desactivarse fuera del tier alto.

#### Scenario: Cambio de fase
- **WHEN** el scroll cruza el límite entre dos fases
- **THEN** la aberración cromática se intensifica durante menos de 300 ms y vuelve a reposo

#### Scenario: Tier medio o bajo
- **WHEN** el dispositivo no está en tier alto
- **THEN** no se aplica bloom

### Requirement: Assets 3D comprimidos
Los modelos y texturas de las escenas MUST servirse comprimidos, y el total de assets 3D descargados en el home MUST NOT superar 1,5 MB.

#### Scenario: Recorrido completo del home
- **WHEN** se recorre todo el home y se suman las descargas de assets 3D
- **THEN** el total es igual o inferior a 1,5 MB
