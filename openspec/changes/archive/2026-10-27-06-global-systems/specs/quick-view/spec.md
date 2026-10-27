## Purpose

Garantizar la ruta del reclutador: un currículum limpio de una sola página, escaneable e imprimible, accesible en un clic desde cualquier punto del sitio.

## ADDED Requirements

### Requirement: Toggle siempre visible
El sistema SHALL mostrar en el header de todas las páginas un control "Vista Rápida ⚡" visible sin necesidad de scroll, junto a un acceso directo para descargar el CV.

#### Scenario: Visible en cualquier página
- **WHEN** el visitante está en el home, en un caso de estudio o en la página 404
- **THEN** el control de Vista Rápida y la descarga del CV están visibles en el header

#### Scenario: CV a un clic
- **WHEN** el visitante activa la descarga del CV desde el header
- **THEN** el CV se descarga sin pasos intermedios

### Requirement: Currículum de una página
Al activar la Vista Rápida el sistema SHALL presentar en una sola página nombre, rol, propuesta de valor, disponibilidad, proyectos destacados con métricas y enlaces, habilidades con su evidencia, experiencia con logros cuantificados y datos de contacto, con animaciones mínimas y sin escenas 3D.

#### Scenario: Contenido completo
- **WHEN** el visitante activa la Vista Rápida
- **THEN** ve todas las secciones de currículum en un layout escaneable sin animaciones de scroll ni escenas 3D

#### Scenario: Volver a la experiencia completa
- **WHEN** el visitante desactiva la Vista Rápida
- **THEN** vuelve a la experiencia completa en la fase equivalente a la sección que estaba viendo

### Requirement: Estado enlazable y persistente
El estado de Vista Rápida SHALL reflejarse en la URL para poder compartirse y SHALL conservarse durante la sesión al navegar entre páginas.

#### Scenario: Enlace compartido
- **WHEN** alguien abre un enlace del sitio con la Vista Rápida activada en la URL
- **THEN** el sitio se muestra directamente en Vista Rápida, renderizado en servidor

#### Scenario: Navegación con Vista Rápida
- **WHEN** la Vista Rápida está activa y el visitante abre un caso de estudio y vuelve
- **THEN** la Vista Rápida sigue activa

### Requirement: Impresión y PDF
La Vista Rápida SHALL incluir un botón de impresión/PDF y SHALL aplicar estilos de impresión que oculten navegación y controles, usen fondo claro y muestren las URLs de los enlaces.

#### Scenario: Imprimir
- **WHEN** el visitante pulsa el botón de impresión
- **THEN** se abre el diálogo de impresión del navegador con un documento sin controles de interfaz y legible en papel
