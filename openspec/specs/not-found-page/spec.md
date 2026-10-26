## Purpose

Ofrecer una página 404 temática ("Segmentation fault") coherente con la narrativa que devuelva al visitante al inicio con un solo clic.

## Requirements

### Requirement: Respuesta 404 temática
Cualquier ruta inexistente SHALL responder con estado HTTP 404 y mostrar el encabezado "Segmentation fault (core dumped)" en el idioma activo, dentro del layout base con sus landmarks.

#### Scenario: Ruta inexistente
- **WHEN** el visitante abre `/es/ruta-que-no-existe`
- **THEN** la respuesta tiene estado 404 y la página muestra "Segmentation fault (core dumped)"

#### Scenario: Ruta inexistente en inglés
- **WHEN** el visitante abre `/en/missing`
- **THEN** la página 404 se muestra con los textos en inglés

### Requirement: Volcado de memoria hexadecimal
La página SHALL mostrar un bloque estático de "volcado de memoria" en hexadecimal como elemento decorativo oculto a tecnologías de asistencia, sin desbordar horizontalmente la página.

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre la página 404
- **THEN** no lee el volcado hexadecimal y sí lee el encabezado y el botón

### Requirement: Reiniciar proceso
La página SHALL ofrecer un botón o enlace "Reiniciar proceso" que lleva a la página de inicio del idioma activo y recibe el foco visible por teclado.

#### Scenario: Volver al inicio
- **WHEN** el visitante activa "Reiniciar proceso"
- **THEN** navega a la página de inicio del idioma activo

### Requirement: Glitch y volcado de memoria animados
La página 404 SHALL reproducir al cargar un glitch de menos de 300 ms seguido de un volcado de memoria hexadecimal que se escribe progresivamente. El mensaje "Segmentation fault (core dumped)" y el botón "Reiniciar proceso" MUST ser visibles y operables desde el primer render, independientemente de la animación.

#### Scenario: Carga de la 404
- **WHEN** el usuario visita una ruta inexistente
- **THEN** se reproduce un glitch < 300 ms, el volcado hexadecimal se escribe y el botón "Reiniciar proceso" está disponible desde el inicio

#### Scenario: Volcado decorativo
- **WHEN** un lector de pantalla lee la página
- **THEN** el volcado hexadecimal se ignora como decorativo y se anuncian el mensaje y el botón
