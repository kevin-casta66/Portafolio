## ADDED Requirements

### Requirement: Indicador now playing
Con el sonido activo, el Call Stack SHALL mostrar un indicador «now playing» con barras de ecualizador que reflejan el nivel real de la música, junto al nombre de la fase y la capa musical predominante. Al activarlo SHALL abrir el control de sonido. Con el sonido desactivado el indicador MUST NOT mostrarse, y con movimiento reducido las barras SHALL quedar estáticas. El indicador SHALL tener un nombre accesible y MUST NOT anunciarse de forma continua a los lectores de pantalla.

#### Scenario: Música sonando
- **WHEN** el sonido está activo y el visitante está en RUNTIME
- **THEN** el Call Stack muestra el indicador con barras animadas por la música y el nombre de la fase

#### Scenario: Abrir el control desde el indicador
- **WHEN** el visitante activa el indicador con el ratón o el teclado
- **THEN** se abre el control de sonido con el volumen y los interruptores de música y efectos
