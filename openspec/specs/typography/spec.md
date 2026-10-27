## Purpose

Garantiza que las tres familias tipográficas de «Portafolio» (display, texto y código) se sirvan desde el propio dominio, rápido, sin saltos de layout y con roles claros.

## Requirements

### Requirement: Roles tipográficos
El sistema SHALL usar tres familias con roles fijos: Unbounded (variable) para display/títulos, Geist para texto corrido y JetBrains Mono para código y datos. Cada rol SHALL exponerse como token y los componentes SHALL usar el token, no el nombre de la familia.

#### Scenario: Título y bloque de código
- **WHEN** se renderiza un título de sección y un fragmento de código
- **THEN** el título usa la familia display y el fragmento usa la familia monoespaciada

### Requirement: Fuentes autoalojadas y con subset
Las fuentes MUST servirse desde el mismo origen del sitio, sin peticiones a servicios de terceros, en formato WOFF2 y con subset limitado a los caracteres necesarios para español e inglés (latin y latin-ext).

#### Scenario: Sin peticiones externas de fuentes
- **WHEN** se carga la página de inicio y se inspeccionan las peticiones de red
- **THEN** todas las fuentes provienen del mismo origen y ninguna proviene de un dominio externo

### Requirement: Precarga y estabilidad del layout
Las fuentes críticas del primer render (display y texto) SHALL precargarse, SHALL usar una estrategia de visualización que muestre texto de inmediato y SHALL tener métricas de respaldo ajustadas para que el cambio de fuente no provoque desplazamientos de layout perceptibles.

#### Scenario: Texto visible durante la carga
- **WHEN** la página se carga en una red lenta
- **THEN** el texto del hero es legible con una fuente de respaldo antes de que la fuente final termine de descargarse

#### Scenario: Sin saltos al cambiar de fuente
- **WHEN** la fuente final reemplaza a la de respaldo
- **THEN** el desplazamiento acumulado de layout atribuible al cambio de fuente es inferior a 0,01

### Requirement: Eje de peso variable disponible
La familia display SHALL cargarse como fuente variable con su eje de peso completo disponible, de modo que el peso pueda interpolarse de forma continua.

#### Scenario: Peso intermedio
- **WHEN** un título se renderiza con un peso intermedio no estándar (p. ej. 550)
- **THEN** se muestra con ese peso exacto sin sintetizar negrita
