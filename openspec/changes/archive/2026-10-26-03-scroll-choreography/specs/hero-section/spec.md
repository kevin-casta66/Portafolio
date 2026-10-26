## ADDED Requirements

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
