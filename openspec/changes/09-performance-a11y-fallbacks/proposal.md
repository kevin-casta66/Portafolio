## Why

Tras los changes 00–08 el sitio tiene todo el contenido, la coreografía, las escenas 3D con backend de nueva generación y fallback WebGL2, los casos de estudio con Hold-to-Execute, los sistemas globales (logros, sonido, liquid glass), el Memory Heap (`/heap`) y la vitrina `/motion`. Nada garantiza aún que todo eso cumpla los presupuestos de rendimiento, que funcione sin animaciones o sin WebGL, ni que sea accesible y encontrable. Este change convierte las secciones §9 (Rendimiento), §10 (Accesibilidad y fallbacks) y §11 (SEO) de `docs/BRIEF.md`, más los guardarraíles §7 y los criterios §9 de `docs/ADDENDUM-v2.md`, en contratos verificables, porque el propio sitio es la pieza principal del portafolio y debe demostrar rigor de ingeniería.

Depende de: `00-technique-teardown`, `01-foundation-design-system`, `02-static-semantic-sections`, `03-scroll-choreography`, `04-webgl-scenes`, `05-case-studies-view-transitions`, `06-global-systems`, `07-memory-heap` y `08-motion-showcase` (orden de docs/ROADMAP.md).

## What Changes

- Presupuestos de rendimiento obligatorios y medibles: Lighthouse móvil, Core Web Vitals con INP como prioridad (trabajo pesado en GPU o en workers, ninguna animación bloquea una interacción), JS inicial < 180 KB gzip con librerías de animación y 3D cargadas tras el LCP, fps en escritorio, < 100 draw calls por escena activa, partículas por tier (alto 200k, medio 50k, bajo 0), texturas comprimidas, formatos de imagen/vídeo y precarga de fuentes.
- Cero scroll-jacking: el scroll siempre es nativo; el suavizado y el pinning nunca quitan al usuario el control de velocidad ni de dirección.
- Versión alternativa completa para `prefers-reduced-motion`, también conmutable manualmente: fundidos en lugar de transformaciones, sin parallax, ilustraciones estáticas por fase, boot reducido, y alternativas para Hold-to-Execute, Memory Heap, logros y `/motion`.
- Cadena de fallbacks gráficos en tres niveles: backend de nueva generación → backend WebGL2 sin diferencias de contenido → experiencia 2D (SVG/CSS) sin WebGL que conserva la narrativa; incluye pérdida de contexto y degradación por fps.
- Pase de accesibilidad: landmarks, skip link, orden de foco, foco visible tipo caret, contraste AA en ambos temas (incluido el texto sobre liquid glass), equivalentes DOM de todo el contenido del canvas y del texto MSDF, navegación por teclado completa (AST, `/heap`, `/motion`, Hold-to-Execute), regiones `aria-live` y auditoría automatizada sin violaciones.
- SEO: metadatos por página y locale (incluidas `/heap` y `/motion`), Open Graph dinámico con estilo de fase, datos estructurados `Person` y `CreativeWork`, sitemap, robots, hreflang es/en y canonical.

## Capabilities

### New Capabilities
- `performance-budgets`: presupuestos de Lighthouse, Core Web Vitals (INP prioritario), peso y carga diferida de JS, scroll nativo, fps, draw calls, partículas por tier y optimización de medios y fuentes.
- `reduced-motion`: experiencia alternativa sin movimiento intenso, activada por preferencia del sistema o manualmente, que cubre todas las fases y las interacciones del addendum.
- `webgl-fallback`: cadena de fallbacks gráficos (nueva generación → WebGL2 → 2D) con contenido idéntico, recuperación ante pérdida de contexto y degradación por rendimiento.
- `accessibility`: requisitos de estructura semántica, foco, contraste (incluido liquid glass), teclado, equivalentes DOM, anuncios para lectores de pantalla y auditoría.
- `seo`: metadatos, Open Graph, datos estructurados, sitemap, robots, hreflang y canonical para todas las rutas públicas.

### Modified Capabilities
<!-- Ninguna: los requisitos nuevos se añaden como capabilities propias. -->

## Impact

- Código afectado: layout raíz, metadatos de `app/[locale]/` (home, casos, `/heap`, `/motion`), componentes de cada fase (estados reducido y fallback), runtime gráfico (detección de backend, pérdida de contexto, presupuestos por tier), `motion/` (rama reducida), store global (preferencia de movimiento y modo de experiencia), `components/systems/` (terminal, Vista Rápida, logros, liquid glass para `aria-live`, foco y contraste).
- Nuevas rutas generadas: sitemap, robots, imágenes Open Graph por página/fase.
- Assets: ilustraciones estáticas SVG por fase, pósters de vídeo, variantes AVIF/WebP, texturas comprimidas.
- Herramientas: análisis de bundle, contador de draw calls/partículas en modo debug y auditorías de accesibilidad/Lighthouse locales (la integración en CI llega en `10-testing-deployment`).
