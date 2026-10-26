## Purpose

Audita automáticamente rendimiento, accesibilidad, buenas prácticas y SEO en cada PR y bloquea los cambios que rompen los presupuestos del portafolio.

## ADDED Requirements

### Requirement: Auditoría en cada PR con perfil móvil
El sistema SHALL ejecutar una auditoría de calidad con emulación móvil sobre una build de producción en cada PR, cubriendo al menos la página de inicio, un caso de estudio, `/heap`, `/motion` y la 404, con todas las capas visuales e interactivas activas (escenas 3D, sonido, logros, superficies translúcidas) y varias ejecuciones por URL para reducir la variabilidad.

#### Scenario: PR abierto
- **WHEN** se abre o actualiza un PR
- **THEN** se audita cada URL configurada con perfil móvil y el resultado aparece como check del PR

### Requirement: Presupuestos bloqueantes
La auditoría MUST fallar el PR si se incumple cualquiera de los presupuestos: Performance ≥ 90, Accesibilidad = 100, Buenas prácticas = 100, SEO = 100, LCP < 2,5 s, CLS < 0,05, TBT como proxy de INP dentro del umbral definido en el change 09, y JS inicial < 180 KB gzip por página.

#### Scenario: Presupuesto incumplido
- **WHEN** un PR hace que la puntuación de Performance móvil baje de 90
- **THEN** el check de auditoría falla e indica la métrica y el valor medido

#### Scenario: JS inicial excedido
- **WHEN** un PR hace que el JavaScript inicial supere 180 KB gzip
- **THEN** el check falla indicando el tamaño medido y el límite

### Requirement: INP medido en interacciones clave
El sistema SHALL medir en cada PR, sobre la build de producción, la latencia de interacción de los filtros de proyectos, el árbol de habilidades, Hold-to-Execute, "Run GC" en `/heap` y la terminal, y MUST fallar si alguna supera 200 ms.

#### Scenario: Interacción lenta
- **WHEN** un PR introduce trabajo bloqueante en el manejador de "Run GC"
- **THEN** el check falla indicando la interacción y la latencia medida

### Requirement: Informes consultables
El sistema SHALL publicar el informe completo de cada auditoría y enlazarlo desde el PR.

#### Scenario: Revisión del informe
- **WHEN** termina la auditoría de un PR
- **THEN** el PR contiene un enlace al informe completo de cada URL auditada
