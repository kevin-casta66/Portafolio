## ADDED Requirements

### Requirement: Glitch y volcado de memoria animados
La página 404 SHALL reproducir al cargar un glitch de menos de 300 ms seguido de un volcado de memoria hexadecimal que se escribe progresivamente. El mensaje "Segmentation fault (core dumped)" y el botón "Reiniciar proceso" MUST ser visibles y operables desde el primer render, independientemente de la animación.

#### Scenario: Carga de la 404
- **WHEN** el usuario visita una ruta inexistente
- **THEN** se reproduce un glitch < 300 ms, el volcado hexadecimal se escribe y el botón "Reiniciar proceso" está disponible desde el inicio

#### Scenario: Volcado decorativo
- **WHEN** un lector de pantalla lee la página
- **THEN** el volcado hexadecimal se ignora como decorativo y se anuncian el mensaje y el botón
