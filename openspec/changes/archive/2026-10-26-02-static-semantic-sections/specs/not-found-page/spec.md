## Purpose

Ofrecer una página 404 temática ("Segmentation fault") coherente con la narrativa que devuelva al visitante al inicio con un solo clic.

## ADDED Requirements

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
