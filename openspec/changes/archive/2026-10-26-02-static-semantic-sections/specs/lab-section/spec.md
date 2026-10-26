## Purpose

Presentar los experimentos técnicos del laboratorio (etapa GPU) con su descripción y acceso al fragmento de código clave, como base estática para las demos interactivas posteriores.

## ADDED Requirements

### Requirement: Tarjetas de experimentos
La sección de laboratorio SHALL mostrar entre 3 y 4 tarjetas de experimento tomadas del contenido, cada una con título, descripción breve de la capacidad técnica que demuestra e imagen estática representativa con dimensiones reservadas.

#### Scenario: Render de experimentos
- **WHEN** el contenido define cuatro experimentos
- **THEN** se muestran cuatro tarjetas con título, descripción e imagen

### Requirement: Ver código del experimento
Cada tarjeta SHALL incluir un botón "</> Ver código" que alterna entre la vista del experimento y un fragmento de código estático del contenido, actualizando su estado accesible (presionado/no presionado) y conservando el foco en el botón.

#### Scenario: Mostrar código
- **WHEN** el visitante activa "</> Ver código"
- **THEN** la tarjeta muestra el fragmento de código, el botón refleja estado presionado y su etiqueta cambia para indicar que puede volver a la vista del experimento

#### Scenario: Volver a la vista
- **WHEN** el fragmento está visible y el visitante activa de nuevo el botón
- **THEN** la tarjeta vuelve a la vista del experimento

### Requirement: Código legible y seleccionable
El fragmento de código SHALL mostrarse como texto monoespaciado seleccionable, con desplazamiento interno si excede el área y sin desbordar la página.

#### Scenario: Fragmento largo en móvil
- **WHEN** un fragmento con líneas largas se muestra en un viewport de 360 px
- **THEN** el fragmento se desplaza dentro de su contenedor y la página no tiene scroll horizontal
