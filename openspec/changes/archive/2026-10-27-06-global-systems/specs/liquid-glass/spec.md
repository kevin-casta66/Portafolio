## Purpose

Definir un material de "vidrio líquido" refractivo usado con disciplina en superficies flotantes concretas, garantizando que el texto sobre él siempre sea legible con contraste AA en ambos temas.

## ADDED Requirements

### Requirement: Uso restringido
El material de vidrio líquido SHALL usarse solo en la navegación Call Stack, la terminal y la lente de la vista Memory Heap. Ninguna otra superficie SHALL usarlo.

#### Scenario: Superficies permitidas
- **WHEN** se revisan los componentes que aplican el material de vidrio líquido
- **THEN** solo aparecen el Call Stack, la terminal y la lente del Heap

### Requirement: Contraste AA garantizado
Todo texto sobre vidrio líquido SHALL cumplir contraste WCAG AA (4,5:1 texto normal, 3:1 texto grande) en el tema oscuro y en el claro, medido contra el peor caso del contenido que puede quedar detrás. Si no se cumple, el sistema SHALL aumentar la opacidad del fondo del vidrio hasta cumplirlo.

#### Scenario: Contenido brillante detrás
- **WHEN** la terminal abierta queda sobre una zona clara de la escena en el tema oscuro
- **THEN** el texto de la terminal mantiene contraste ≥ 4,5:1

#### Scenario: Tema claro
- **WHEN** el visitante cambia al tema claro con el Call Stack visible
- **THEN** los textos del Call Stack siguen cumpliendo AA

### Requirement: Degradación sin soporte de filtros
Si el navegador no soporta los filtros de fondo necesarios, o el visitante prefiere menos transparencia, el sistema SHALL sustituir el vidrio por una superficie opaca de los tokens del tema, sin perder legibilidad ni funcionalidad.

#### Scenario: Navegador sin soporte
- **WHEN** el navegador no soporta filtros de fondo
- **THEN** el Call Stack y la terminal se muestran con fondo de superficie elevada opaco

#### Scenario: Preferencia de transparencia reducida
- **WHEN** el sistema operativo indica preferencia de transparencia reducida
- **THEN** se usa la superficie opaca

### Requirement: Sin coste en la interacción
El vidrio líquido SHALL no degradar la respuesta a interacciones: abrir, cerrar o desplazar una superficie de vidrio SHALL mantener la respuesta por debajo del presupuesto de INP del sitio.

#### Scenario: Abrir la terminal
- **WHEN** el visitante abre la terminal sobre una escena 3D activa
- **THEN** la terminal responde a la pulsación en menos de 200 ms
