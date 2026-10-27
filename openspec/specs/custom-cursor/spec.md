## Purpose

Comunicar el tipo de elemento bajo el puntero mediante un cursor contextual con forma de caret, sin perjudicar la usabilidad ni las preferencias del usuario.

## Requirements

### Requirement: Formas contextuales
En dispositivos con puntero fino el sistema SHALL mostrar un cursor con forma de caret de texto que cambie a mira sobre elementos interactivos, a "⟨/⟩" sobre bloques de código y a flecha de arrastre sobre el árbol de habilidades arrastrable.

#### Scenario: Sobre un enlace
- **WHEN** el puntero pasa sobre un botón o enlace
- **THEN** el cursor adopta la forma de mira

#### Scenario: Sobre código
- **WHEN** el puntero pasa sobre un bloque de código
- **THEN** el cursor muestra "⟨/⟩"

#### Scenario: Sobre el AST
- **WHEN** el puntero pasa sobre el área arrastrable del árbol de habilidades en escritorio
- **THEN** el cursor muestra la flecha de arrastre

### Requirement: Desactivación por dispositivo y preferencia
El sistema SHALL no mostrar el cursor personalizado en dispositivos táctiles o sin puntero fino, SHALL ofrecer una opción para usar el cursor del sistema que se persista, y SHALL mostrar el cursor sin animaciones de seguimiento cuando el usuario prefiera movimiento reducido.

#### Scenario: Dispositivo táctil
- **WHEN** el sitio se abre en un dispositivo táctil
- **THEN** no se renderiza el cursor personalizado

#### Scenario: Preferencia de cursor del sistema
- **WHEN** el visitante elige usar el cursor del sistema
- **THEN** se muestra el cursor nativo y la preferencia se mantiene en visitas posteriores

#### Scenario: Movimiento reducido
- **WHEN** el usuario tiene activada la preferencia de movimiento reducido
- **THEN** el cursor sigue al puntero sin inercia ni transiciones de forma animadas

### Requirement: Sin impacto en accesibilidad
El cursor personalizado SHALL ser invisible para tecnologías de asistencia y SHALL no interceptar eventos de puntero.

#### Scenario: Clic a través del cursor
- **WHEN** el visitante hace clic con el cursor personalizado sobre un elemento
- **THEN** el clic llega al elemento subyacente
