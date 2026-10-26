## ADDED Requirements

### Requirement: Ramas dibujadas y nodos con resorte
Al revelarse el árbol, las ramas SHALL dibujarse progresivamente animando su trazo y los nodos MUST aparecer con una animación de resorte usando el spring de UI, en orden de profundidad desde la raíz.

#### Scenario: Revelado del árbol
- **WHEN** la sección PARSER entra en viewport
- **THEN** las ramas se dibujan desde la raíz hacia las hojas y cada nodo aparece al completarse su rama

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
