## Purpose

Ofrece en la fase GPU entre 3 y 4 experimentos interactivos en vivo que demuestran habilidad técnica pura, con controles accesibles y acceso al fragmento de código clave de cada uno.

## ADDED Requirements

### Requirement: Catálogo de experimentos
El laboratorio SHALL presentar entre 3 y 4 experimentos en vivo definidos en los datos de contenido: un shader generativo controlable, una simulación física, una visualización de datos y, opcionalmente, una micro-interacción compleja.

#### Scenario: Visita al laboratorio
- **WHEN** el usuario llega a la fase GPU con capa 3D disponible
- **THEN** ve entre 3 y 4 experimentos en vivo con su título y descripción DOM

### Requirement: Simulación física
La simulación física SHALL usar un motor de física real (colisiones y gravedad) y MUST permitir al usuario interactuar con los cuerpos con puntero, táctil y teclado.

#### Scenario: Interacción con puntero
- **WHEN** el usuario arrastra un cuerpo de la simulación
- **THEN** el cuerpo responde con colisiones y gravedad físicamente plausibles

#### Scenario: Interacción por teclado
- **WHEN** el usuario enfoca la simulación y usa las teclas indicadas
- **THEN** puede aplicar impulsos o reiniciar la simulación

### Requirement: Postprocesado cinematográfico
Los experimentos SHALL poder aplicar postprocesado cinematográfico (profundidad de campo, bloom, grano) en tier alto, y MUST desactivarlo en tiers inferiores sin perder interactividad.

#### Scenario: Tier medio
- **WHEN** el laboratorio se abre en tier medio
- **THEN** los experimentos funcionan sin postprocesado cinematográfico

### Requirement: Controles accesibles
Cada experimento SHALL exponer sus parámetros mediante controles nativos con etiqueta visible, operables por teclado y con su valor actual anunciado a tecnologías de asistencia.

#### Scenario: Cambio de parámetro por teclado
- **WHEN** el usuario enfoca un control del shader generativo y pulsa las flechas
- **THEN** el parámetro cambia, el render se actualiza y el nuevo valor se anuncia

### Requirement: Vista de código
Cada experimento SHALL incluir el botón "</> Ver código" que gira la tarjeta y muestra el fragmento clave de código resaltado; el mismo botón MUST permitir volver al experimento y el foco MUST moverse al contenido visible.

#### Scenario: Ver código
- **WHEN** el usuario activa "</> Ver código"
- **THEN** la tarjeta gira y muestra el fragmento resaltado, con el foco en él

#### Scenario: Volver al experimento
- **WHEN** el usuario activa de nuevo el botón
- **THEN** la tarjeta vuelve a mostrar el experimento y el foco vuelve al botón

### Requirement: Experimentos sin capa 3D
Si la capa 3D no está disponible o el tier es bajo, cada experimento MUST mostrar una imagen estática representativa con su descripción y su vista de código.

#### Scenario: Sin backend 3D
- **WHEN** el laboratorio se abre sin backend 3D
- **THEN** cada experimento muestra su imagen estática y el botón "</> Ver código" sigue funcionando
