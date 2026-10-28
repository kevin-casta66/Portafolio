## Purpose

Presentar las habilidades como un Árbol de Sintaxis Abstracta (etapa PARSER) con evidencia verificable por tecnología y un vínculo explícito con los proyectos que la demuestran.

## Requirements

### Requirement: Estructura de árbol semántica
La sección de habilidades SHALL representar un árbol con raíz "Developer", ramas por categoría (Frontend, Backend, Cloud/DevOps, Datos, Diseño, Soft skills o las definidas en el contenido) y hojas por tecnología, expuesto a tecnologías de asistencia como un árbol jerárquico con niveles, posición y estado expandido.

#### Scenario: Lectura con lector de pantalla
- **WHEN** un lector de pantalla recorre la sección
- **THEN** anuncia la estructura jerárquica, el nivel de cada nodo y si una rama está expandida o colapsada

### Requirement: Evidencia en lugar de porcentajes
Cada hoja SHALL mostrar años de uso, número de proyectos donde se usó (calculado desde el contenido) y un nivel cualitativo de entre "Uso diario", "Producción" o "Exploración", y MUST NOT mostrar barras ni porcentajes de dominio.

#### Scenario: Conteo de proyectos derivado
- **WHEN** una tecnología aparece en el stack de tres proyectos del contenido
- **THEN** su hoja muestra "3 proyectos" sin que el número se haya escrito a mano

### Requirement: Navegación completa por teclado
El árbol SHALL ser navegable con teclado: flechas arriba/abajo para moverse entre nodos visibles, derecha/izquierda para expandir/colapsar o ir a hijo/padre, Home/End para primer/último nodo y Enter/Espacio para seleccionar una hoja, con un único punto de tabulación para todo el árbol.

#### Scenario: Expandir rama con teclado
- **WHEN** el foco está en una rama colapsada y el visitante pulsa flecha derecha
- **THEN** la rama se expande y su estado expandido se anuncia

#### Scenario: Salir del árbol
- **WHEN** el foco está dentro del árbol y el visitante pulsa Tab
- **THEN** el foco sale del árbol hacia el siguiente elemento enfocable de la página

### Requirement: Selección que resalta proyectos relacionados
Al seleccionar una tecnología, la sección SHALL atenuar visualmente los demás nodos, mostrar la lista de proyectos que la usan con enlaces a sus tarjetas en la sección de proyectos, y permitir deseleccionar para volver al estado inicial.

#### Scenario: Seleccionar tecnología
- **WHEN** el visitante selecciona la hoja "React"
- **THEN** los demás nodos se atenúan y aparece la lista de proyectos que usan React con enlaces a sus tarjetas

#### Scenario: Deseleccionar
- **WHEN** hay una tecnología seleccionada y el visitante pulsa Escape o la selecciona de nuevo
- **THEN** se restaura la opacidad de todos los nodos y desaparece la lista de proyectos relacionados

### Requirement: Layout adaptado al dispositivo
En escritorio el árbol SHALL disponerse horizontalmente y en viewports estrechos (< 768 px) SHALL disponerse verticalmente con ramas colapsables, sin desbordamiento horizontal de la página.

#### Scenario: Móvil
- **WHEN** la sección se muestra en un viewport de 375 px de ancho
- **THEN** el árbol es vertical, las ramas inician colapsadas salvo la primera y no aparece scroll horizontal en la página

### Requirement: Ramas dibujadas y nodos con resorte
En escritorio el árbol SHALL crecer atado al scroll: cada nodo MUST aparecer con una animación de resorte usando el spring de UI cuando su fila llega aproximadamente al 85 % de la altura de la ventana, su conector MUST dibujarse animando el trazo y la línea vertical de cada grupo de hijos MUST crecer desde su padre al mismo ritmo. Desplazarse hacia arriba MUST rebobinar el crecimiento en orden inverso. El revelado MUST NOT alterar la opacidad de atenuado de la selección. En viewports estrechos y con movimiento reducido el árbol aparece con un fundido.

#### Scenario: Crecimiento con el scroll
- **WHEN** el visitante desplaza la página por la sección PARSER en escritorio
- **THEN** los nodos que ya pasaron el 85 % de la ventana están visibles, los que están por debajo aún no, y las líneas verticales llegan hasta el último nodo visible

#### Scenario: Rebobinado
- **WHEN** el visitante vuelve a desplazarse hacia arriba
- **THEN** los nodos que quedan por debajo del 85 % de la ventana desaparecen en orden inverso

#### Scenario: Atenuado tras el revelado
- **WHEN** el árbol ya creció y el visitante selecciona una tecnología
- **THEN** los nodos no relacionados se atenúan aunque el revelado haya fijado su estado final

### Requirement: Exploración por arrastre en escritorio
En escritorio el árbol horizontal SHALL poder desplazarse arrastrando con el puntero, con inercia, y MUST seguir siendo navegable por teclado sin necesidad de arrastre. En móvil el árbol vertical colapsable expande/colapsa ramas con animación de altura basada en transform.

#### Scenario: Arrastre
- **WHEN** el usuario arrastra el árbol horizontalmente en escritorio
- **THEN** el árbol se desplaza siguiendo el puntero y se detiene con inercia

#### Scenario: Teclado
- **WHEN** el usuario navega el árbol con flechas
- **THEN** el árbol se desplaza para mantener visible el nodo enfocado

### Requirement: Trazas de luz hacia proyectos
Al seleccionar una tecnología, el árbol SHALL atenuar los nodos no relacionados y dibujar trazas de luz animadas desde la hoja hacia las vistas previas de los proyectos que la usan. Deseleccionar MUST revertir la animación.

#### Scenario: Selección de tecnología
- **WHEN** el usuario selecciona la hoja "React"
- **THEN** el resto del árbol se atenúa y se dibujan trazas hacia cada proyecto que usa React

#### Scenario: Deselección
- **WHEN** el usuario pulsa Escape o vuelve a seleccionar la hoja
- **THEN** las trazas se retraen y el árbol recupera su opacidad normal
