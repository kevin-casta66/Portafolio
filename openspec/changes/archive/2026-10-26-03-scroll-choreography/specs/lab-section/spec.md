## ADDED Requirements

### Requirement: Giro de tarjeta para ver código
Al activar "</> Ver código", la tarjeta del experimento SHALL girar 180° en 3D mostrando en su reverso el fragmento de código clave; volver a activarlo MUST girarla de vuelta. El foco MUST moverse a la cara visible y la cara oculta MUST NOT ser alcanzable por teclado ni por lectores de pantalla.

#### Scenario: Ver código
- **WHEN** el usuario activa "</> Ver código"
- **THEN** la tarjeta gira 180° con el easing de transición y el reverso con el código queda visible y enfocable

#### Scenario: Cara oculta inaccesible
- **WHEN** el reverso está visible
- **THEN** los controles del anverso no reciben foco por tabulación
