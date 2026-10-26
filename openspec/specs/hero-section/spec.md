## Purpose

Presentar en el primer render la identidad del desarrollador (nombre, rol, propuesta de valor), los CTAs principales y su disponibilidad, como etapa SOURCE de la narrativa.

## Requirements

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

### Requirement: Tecleo con autocompletado como capa progresiva
El editor del Hero SHALL reproducir el tecleo de `const dev = new Developer("<nombre>")` con un stagger de 30-40 ms por carácter, mostrando un popup de sugerencias tipo IDE que aparece y selecciona `Developer`. Esta animación MUST ser una capa sobre el texto ya presente en el DOM desde SSR: el texto accesible no cambia y su ausencia o fallo no oculta contenido.

#### Scenario: Tecleo tras el boot
- **WHEN** termina la secuencia de boot
- **THEN** el cursor inicia el tecleo, aparece el popup de sugerencias y se completa `Developer`

#### Scenario: JS tardío
- **WHEN** el script de animación carga 3 s después del HTML
- **THEN** el nombre, rol, propuesta de valor y CTAs son visibles desde el primer render y la animación no los oculta al iniciarse

#### Scenario: Accesibilidad del tecleo
- **WHEN** un lector de pantalla lee el Hero
- **THEN** lee el nombre y el rol una sola vez, sin anunciar cada carácter tecleado
