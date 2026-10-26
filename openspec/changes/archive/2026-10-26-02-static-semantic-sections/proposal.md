## Why

El brief (docs/BRIEF.md §12, paso 2; §2.1–2.5, §2.7–2.9 y §6) exige que todo el contenido del portafolio exista como HTML semántico, funcional y accesible antes de añadir cualquier coreografía o escena WebGL. Así la capa espectacular será siempre una mejora progresiva: un reclutador con 30 segundos ve nombre, rol, propuesta de valor, proyectos y CV sin esperar animaciones, y el sitio funciona sin JS pesado, sin WebGL y con teclado.

Depende de `01-foundation-design-system` (tokens, tipografías, layout base, i18n y modelo de contenido tipado con relaciones habilidad↔proyecto).

## What Changes

- Sección SOURCE (hero) renderizada en servidor con nombre, rol, propuesta de valor, CTAs "Ver proyectos" y "Descargar CV", indicador de disponibilidad y la línea `const dev = new Developer("<nombre>")` como texto estático.
- Sección LEXER (sobre mí) con la biografía como tokens agrupados en carriles `keyword`, `identifier`, `string`, `number`, y tooltips tipo IDE accesibles por hover y foco.
- Sección PARSER (habilidades) como árbol navegable por teclado (horizontal en escritorio, vertical colapsable en móvil), hojas con evidencia (años, nº de proyectos, nivel cualitativo) y selección de tecnología que resalta los proyectos relacionados.
- Sección BYTECODE (experiencia) con cada empleo como función, logros como instrucciones con texto humano cuantificado y una columna de registros con el stack.
- Sección RUNTIME (proyectos) con tarjetas de "procesos" (PID, estado, métricas, media con póster, rol, stack, problema, enlaces), filtro por tecnología `ps aux | grep <tech>` funcional y el mayor peso visual de la página.
- Sección GPU (laboratorio) con tarjetas de experimentos y un botón "</> Ver código" que muestra un fragmento estático.
- Sección DISPLAY (contacto) con formulario validado en cliente y servidor, envío por acción de servidor a un proveedor de email, estados `200 OK` / `500` con reintento y email alternativo, anuncio `aria-live`, email copiable con feedback, redes, CV y cierre "Programa finalizado con código de salida 0".
- Página 404 "Segmentation fault (core dumped)" con volcado hexadecimal estático y botón "Reiniciar proceso".
- Sin animaciones, sin WebGL: solo estados visuales de interacción (hover, focus, active, loading, success, error).

## Capabilities

### New Capabilities
- `hero-section`: contenido esencial del hero (SOURCE) disponible en el primer render, CTAs y disponibilidad.
- `about-section`: biografía como flujo de tokens clasificados en carriles con tooltips accesibles (LEXER).
- `skills-section`: árbol de habilidades navegable con evidencia y vínculo a proyectos (PARSER/AST).
- `experience-section`: trayectoria como funciones compiladas con instrucciones y registros (BYTECODE).
- `projects-section`: proyectos como procesos con métricas, media, enlaces y filtro por tecnología (RUNTIME).
- `lab-section`: tarjetas de experimentos con acceso al fragmento de código clave (GPU).
- `contact-section`: formulario de contacto validado, estados de envío, email copiable y enlaces de cierre (DISPLAY).
- `not-found-page`: página 404 temática con salida clara al inicio.

### Modified Capabilities
<!-- Ninguna: las capabilities del change 01 se consumen, no cambian. -->

## Impact

- Código nuevo en `components/phases/{Source,Lexer,Parser,Bytecode,Runtime,Gpu,Display}/`, `components/ui/`, `app/[locale]/page.tsx`, `app/[locale]/not-found.tsx` y una Server Action de contacto en `app/[locale]/` o `lib/`.
- Consume `content/*.ts` y las relaciones habilidad↔proyecto del change 01; añade textos ES/EN a los mensajes de i18n.
- Dependencias nuevas: React Hook Form, Zod, Resend (variable de entorno `RESEND_API_KEY` y email destino, nunca en el repositorio).
- Base para los changes 03 (coreografía), 04 (WebGL), 05 (casos de estudio) y 06 (sistemas globales), que se apoyarán en los anchors e IDs definidos aquí.
