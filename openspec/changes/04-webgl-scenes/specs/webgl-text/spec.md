## Purpose

Permite renderizar títulos de fase y la línea de código del hero como texto nítido dentro de la escena 3D, para que puedan disolverse, distorsionarse o hacer glitch, sin que el texto real deje de existir en el DOM.

## ADDED Requirements

### Requirement: Texto 3D de campo de distancia
El sistema SHALL renderizar los títulos de fase y la línea de código del hero como texto de campo de distancia multicanal, nítido a cualquier escala y densidad de píxeles, usando las mismas familias tipográficas del sistema de diseño.

#### Scenario: Zoom y alta densidad
- **WHEN** un título de fase se muestra a gran tamaño en una pantalla de densidad 2
- **THEN** sus bordes se ven nítidos, sin pixelado ni desenfoque

### Requirement: Texto real siempre en el DOM
Cada texto 3D MUST tener un gemelo DOM con el mismo contenido, que es el que leen buscadores y tecnologías de asistencia. El texto 3D MUST ser una capa visual sincronizada en posición, tamaño y contenido con su gemelo.

#### Scenario: Sin capa 3D
- **WHEN** la capa 3D no se carga
- **THEN** el título DOM es visible en su posición con el mismo contenido

#### Scenario: Capa 3D activa
- **WHEN** la capa 3D muestra un título
- **THEN** el gemelo DOM sigue presente y accesible, y solo se oculta visualmente si el 3D lo sustituye en la misma posición

#### Scenario: Cambio de idioma
- **WHEN** el usuario cambia entre español e inglés
- **THEN** el texto 3D muestra el mismo contenido que su gemelo DOM en el nuevo idioma

### Requirement: Cobertura de glifos
El atlas de glifos SHALL cubrir todos los caracteres usados en los textos 3D en ambos idiomas; si un glifo falta, el sistema MUST mostrar el gemelo DOM en lugar del texto 3D.

#### Scenario: Glifo ausente
- **WHEN** un texto 3D contiene un carácter que no está en el atlas
- **THEN** ese texto se muestra con su gemelo DOM y no aparecen cajas vacías
