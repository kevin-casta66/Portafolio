## Purpose

Hace que el portafolio y cada caso de estudio sean indexables y se compartan correctamente en ambos idiomas, con metadatos, imágenes sociales y datos estructurados.

## ADDED Requirements

### Requirement: Metadatos por página y locale
Cada página SHALL tener título, descripción y URL canónica propios y traducidos según el locale, generados en servidor.

#### Scenario: Vistas /heap y /motion
- **WHEN** un rastreador solicita `/es/heap` o `/en/motion`
- **THEN** el HTML incluye título, descripción y canonical propios de esa vista en el locale correspondiente

#### Scenario: Caso de estudio en inglés
- **WHEN** un rastreador solicita `/en/projects/<slug>`
- **THEN** el HTML incluye título y descripción en inglés del proyecto y un canonical absoluto a esa URL

### Requirement: Hreflang
Cada página SHALL declarar sus alternativas `es` y `en` y un `x-default`.

#### Scenario: Alternativas de la home
- **WHEN** se inspecciona el `head` de `/es`
- **THEN** existen enlaces alternate a `/es`, `/en` y `x-default` con URLs absolutas

### Requirement: Open Graph dinámico
Cada página SHALL exponer una imagen Open Graph generada dinámicamente con el estilo visual de su fase (acento, tipografía y motivo de circuito), además de título, descripción y tipo; los casos de estudio SHALL usar el nombre y métrica principal del proyecto.

#### Scenario: Compartir un caso de estudio
- **WHEN** se solicita la imagen Open Graph de un caso de estudio
- **THEN** se devuelve una imagen de 1200×630 con el nombre del proyecto, su métrica principal y el acento de la fase RUNTIME

### Requirement: Datos estructurados
La home SHALL incluir datos estructurados `Person` con nombre, rol, URL, redes y conocimientos; cada caso de estudio SHALL incluir `CreativeWork` con nombre, descripción, autor, fecha y enlaces.

#### Scenario: Validación de datos estructurados
- **WHEN** se valida el HTML de la home y de un caso de estudio con un validador de datos estructurados
- **THEN** se detectan `Person` y `CreativeWork` sin errores

### Requirement: Sitemap y robots
El sitio SHALL publicar un sitemap con todas las páginas indexables en ambos locales (con sus alternativas) y un archivo robots que lo referencie; la página 404 SHALL no ser indexable.

#### Scenario: Nuevo caso de estudio
- **WHEN** se añade un caso de estudio al contenido y se genera la build
- **THEN** sus URLs `/es/...` y `/en/...` aparecen en el sitemap sin cambios manuales

#### Scenario: Rutas públicas adicionales
- **WHEN** se genera la build
- **THEN** el sitemap incluye `/heap` y `/motion` en ambos locales con sus alternativas

#### Scenario: Página 404
- **WHEN** se solicita una URL inexistente
- **THEN** la respuesta tiene estado 404 y la página declara `noindex`
