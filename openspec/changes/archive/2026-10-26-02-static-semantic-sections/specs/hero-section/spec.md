## Purpose

Presentar en el primer render la identidad del desarrollador (nombre, rol, propuesta de valor), los CTAs principales y su disponibilidad, como etapa SOURCE de la narrativa.

## ADDED Requirements

### Requirement: Contenido esencial en el primer render
La sección hero SHALL entregar en el HTML inicial del servidor el nombre, el rol, la propuesta de valor en una frase, el CTA "Ver proyectos", el CTA "Descargar CV" y el indicador de disponibilidad, sin depender de JavaScript del cliente para ser visibles ni legibles.

#### Scenario: Página cargada sin JavaScript
- **WHEN** un visitante solicita la página de inicio con JavaScript deshabilitado
- **THEN** el HTML recibido contiene el nombre dentro del encabezado principal `h1`, el rol, la propuesta de valor, ambos CTAs y el indicador de disponibilidad, todos visibles

#### Scenario: Primer viewport en móvil
- **WHEN** la página se carga en un viewport de 360×640 px
- **THEN** el nombre, el rol y ambos CTAs son visibles sin hacer scroll

### Requirement: Línea de código como texto real
La sección hero SHALL mostrar la línea `const dev = new Developer("<nombre>")` dentro de un bloque de código con números de línea, como texto seleccionable y accesible, con el nombre tomado del contenido editable.

#### Scenario: Nombre editable desde el contenido
- **WHEN** el autor cambia el nombre en el archivo de contenido y reconstruye el sitio
- **THEN** tanto el `h1` como la línea de código muestran el nuevo nombre sin cambiar componentes

### Requirement: CTAs funcionales
El CTA "Ver proyectos" SHALL llevar al ancla de la sección de proyectos y el CTA "Descargar CV" SHALL descargar o abrir el archivo de CV configurado en el contenido.

#### Scenario: Ir a proyectos
- **WHEN** el visitante activa "Ver proyectos" con ratón o con la tecla Enter
- **THEN** la página se desplaza a la sección de proyectos y el foco se mueve a su encabezado

#### Scenario: Descargar CV
- **WHEN** el visitante activa "Descargar CV"
- **THEN** el navegador descarga o abre el CV en el idioma activo si existe, o el CV por defecto en caso contrario

### Requirement: Indicador de disponibilidad
El hero SHALL mostrar el estado de disponibilidad definido en el contenido con un texto explícito (p. ej. "Disponible para proyectos"), sin transmitir el estado solo mediante color.

#### Scenario: Estado no disponible
- **WHEN** el contenido marca la disponibilidad como no disponible
- **THEN** el indicador muestra el texto correspondiente al estado no disponible y no el de disponible
