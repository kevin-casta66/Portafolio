## Purpose

Permitir operar los sistemas globales con atajos de teclado documentados en un panel de ayuda accesible, sin interferir con la escritura.

## Requirements

### Requirement: Panel de atajos
Al pulsar `?` fuera de un campo de texto el sistema SHALL abrir un diálogo accesible que liste todos los atajos disponibles con su descripción, y SHALL cerrarlo con Escape devolviendo el foco.

#### Scenario: Abrir panel
- **WHEN** el visitante pulsa `?`
- **THEN** se abre el panel con la lista de atajos (incluidos `~` terminal, `?` ayuda y los de Vista Rápida, Debug, tema y sonido)

#### Scenario: Cerrar panel
- **WHEN** el panel está abierto y el visitante pulsa Escape
- **THEN** el panel se cierra y el foco vuelve al elemento anterior

### Requirement: Sin interferencia al escribir
Los atajos globales SHALL ignorarse mientras el foco está en un campo editable (inputs, textareas, la línea de la terminal o contenido editable) y SHALL no sobrescribir atajos nativos del navegador ni de tecnologías de asistencia.

#### Scenario: Escribir en el formulario
- **WHEN** el visitante escribe `?` o `~` en el campo de mensaje del formulario de contacto
- **THEN** el carácter se escribe en el campo y no se abre ningún panel

### Requirement: Atajos coherentes con los controles
Cada atajo documentado SHALL producir el mismo efecto que su control equivalente en la interfaz.

#### Scenario: Atajo de Vista Rápida
- **WHEN** el visitante usa el atajo documentado de Vista Rápida
- **THEN** la Vista Rápida alterna igual que al usar el toggle del header
