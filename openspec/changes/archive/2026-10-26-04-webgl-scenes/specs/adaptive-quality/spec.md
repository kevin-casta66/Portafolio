## Purpose

Ajusta la riqueza visual de la capa 3D a la capacidad real de cada dispositivo, en tres niveles que pueden cambiar en caliente, para mantener la fluidez sin sacrificar contenido.

## ADDED Requirements

### Requirement: Tres tiers de calidad
El sistema SHALL ofrecer tres tiers con el siguiente contenido mínimo:
- Alto: simulaciones en GPU, fluido de silicio, bloom y hasta 200 000 partículas.
- Medio: hasta 50 000 partículas, sin fluido.
- Bajo: 0 partículas, planos con texturas y transiciones 2D.

Ningún tier MUST ocultar contenido; los tiers solo varían la riqueza visual.

#### Scenario: Tier alto
- **WHEN** el dispositivo queda clasificado en tier alto
- **THEN** el hero muestra el fluido de silicio y las transiciones usan partículas hasta 200 000

#### Scenario: Tier bajo
- **WHEN** el dispositivo queda clasificado en tier bajo
- **THEN** no se generan partículas, las transiciones son 2D y todo el contenido sigue disponible

### Requirement: Detección inicial del tier
Al arrancar, el sistema SHALL clasificar el dispositivo en un tier a partir de su GPU sin retrasar el contenido, con un tier por defecto si la detección no responde a tiempo. El tier detectado MUST reportarse a la secuencia de arranque.

#### Scenario: Detección correcta
- **WHEN** la detección termina durante el arranque
- **THEN** la secuencia de arranque muestra `GPU detected: tier N` con el tier asignado

#### Scenario: Detección lenta o fallida
- **WHEN** la detección no responde en el tiempo límite
- **THEN** se aplica el tier medio y el contenido no espera a la detección

### Requirement: Degradación en caliente por rendimiento medido
El sistema SHALL medir los FPS en tiempo real y MUST bajar un tier cuando la media se mantenga por debajo de 50 FPS durante 2 segundos, sin recargar la página ni perder el estado de scroll. El tier MUST NOT volver a subir durante la misma visita.

#### Scenario: Caída sostenida de FPS
- **WHEN** la media de FPS se mantiene por debajo de 50 durante 2 s en tier alto
- **THEN** el sistema pasa a tier medio sin recargar y la posición de scroll se conserva

#### Scenario: Pico puntual
- **WHEN** los FPS caen menos de 2 s y se recuperan
- **THEN** el tier no cambia

### Requirement: Presupuesto por escena activa
Cada escena activa MUST mantenerse por debajo de 100 draw calls y MUST usar texturas en formato comprimido para GPU.

#### Scenario: Medición de draw calls
- **WHEN** se mide cualquier fase con su escena activa en tier alto
- **THEN** el número de draw calls por frame es menor que 100

### Requirement: Reglas de móvil
En dispositivos móviles el sistema SHALL reducir el número de partículas al menos un 70% respecto al tier equivalente de escritorio y MUST sustituir las interacciones de hover por gestos táctiles.

#### Scenario: Móvil en tier medio
- **WHEN** un móvil queda en tier medio
- **THEN** las escenas usan como máximo el 30% de las partículas del tier medio de escritorio
