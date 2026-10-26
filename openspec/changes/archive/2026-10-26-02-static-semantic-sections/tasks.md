## 1. Página de inicio y contrato de secciones

- [x] 1.1 Componer `app/[locale]/page.tsx` con las siete secciones en orden (source, lexer, parser, bytecode, runtime, gpu, display), cada una con `id`, `aria-labelledby` y `data-phase`; verificar con `next build` y revisando que el HTML servido contiene los siete `<section>` con sus IDs
- [x] 1.2 Añadir a los mensajes ES/EN todos los literales de UI de este change y verificar que `/es` y `/en` renderizan sin claves faltantes (sin warnings de i18n en consola)

## 2. SOURCE — Hero

- [x] 2.1 Crear `components/phases/Source/SourceSection.tsx` (servidor) con `h1` del nombre, rol, propuesta de valor, bloque de código con números de línea y `const dev = new Developer("<nombre>")`; verificar con JS deshabilitado que todo es visible
- [x] 2.2 Implementar CTAs "Ver proyectos" (ancla a `#runtime` moviendo el foco al encabezado) y "Descargar CV" (CV por idioma con fallback); verificar navegando solo con teclado y comprobando la descarga
- [x] 2.3 Implementar indicador de disponibilidad con texto explícito según el contenido; verificar cambiando el valor en `content/` y viendo el texto correcto
- [x] 2.4 Verificar en viewport 360×640 que nombre, rol y ambos CTAs se ven sin scroll

## 3. LEXER — Sobre mí

- [x] 3.1 Crear `LexerSection` con carriles `keyword`, `identifier`, `string`, `number` desde el contenido, omitiendo carriles vacíos; verificar con un contenido de prueba sin tokens `string`
- [x] 3.2 Renderizar tokens `number` con valor final y etiqueta en el HTML del servidor; verificar inspeccionando el HTML servido
- [x] 3.3 Implementar `TokenTooltip` (cliente) con apertura por hover/foco/tap, cierre por Escape/blur/tap fuera y `aria-describedby`; verificar con teclado y con un lector de pantalla (NVDA o VoiceOver)

## 4. PARSER — Árbol de habilidades

- [x] 4.1 Crear `ParserSection` y `SkillTree` (cliente) con roles `tree`/`treeitem`/`group`, `aria-level`, `aria-expanded`, `aria-setsize`/`aria-posinset` y ramas SVG estáticas; verificar con el árbol de accesibilidad de las DevTools
- [x] 4.2 Implementar navegación por teclado (flechas, Home/End, Enter/Espacio, roving tabindex con un solo tab stop); verificar recorriendo el árbol completo sin ratón
- [x] 4.3 Mostrar en cada hoja años, conteo de proyectos derivado de la relación del change 01 y nivel cualitativo; verificar que el conteo cambia al añadir la tecnología a otro proyecto en `content/`
- [x] 4.4 Implementar selección: atenuar resto de nodos, listar proyectos relacionados con enlaces a `#project-<slug>`, deseleccionar con Escape o reselección; verificar seleccionando y deseleccionando con ratón y teclado
- [x] 4.5 Implementar layout horizontal ≥ 768 px y vertical colapsable < 768 px (primera rama abierta); verificar a 375 px que no hay scroll horizontal de página

## 5. BYTECODE — Experiencia

- [x] 5.1 Crear `BytecodeSection` con una función por empleo (firma `fn empresa_inicio_fin()`, empresa, rol, fechas) en orden cronológico inverso como lista ordenada con encabezados; verificar orden y encabezados con un lector de pantalla
- [x] 5.2 Renderizar logros como instrucción + texto humano y añadir validación de contenido que falle el build si un logro no tiene métrica; verificar quitando la métrica de un logro y viendo fallar el build
- [x] 5.3 Añadir columna de registros con el stack por empleo, apilada bajo las instrucciones en móvil; verificar a 375 px y 1280 px

## 6. RUNTIME — Proyectos

- [x] 6.1 Crear `RuntimeSection` y `ProcessCard` con PID, estado textual, métricas, rol, stack, problema y enlaces condicionales, con `id="project-<slug>"`; verificar con un proyecto sin URL de código que no aparece enlace vacío
- [x] 6.2 Implementar media: imágenes responsivas con dimensiones reservadas y video silenciado con póster, `onError` → póster y sin autoplay con movimiento reducido; verificar rompiendo la URL de un video y emulando `prefers-reduced-motion`
- [x] 6.3 Implementar `ProcessFilter` con opciones derivadas del stack, comando `ps aux | grep <tech>`, opción "todos", estado en `?grep=` filtrado también en servidor y recuento en `role="status"`; verificar filtrando por teclado y recargando con `?grep=react`
- [x] 6.4 Dar a la sección la mayor jerarquía visual y altura de la página; verificar midiendo alturas de secciones en 1280 px

## 7. GPU — Laboratorio

- [x] 7.1 Crear `GpuSection` con 3–4 tarjetas de experimento (título, descripción, imagen con dimensiones); verificar render con el contenido de ejemplo
- [x] 7.2 Implementar `CodeFlipToggle` "</> Ver código" con `aria-pressed`, cambio de etiqueta, foco conservado y fragmento monoespaciado con scroll interno; verificar con teclado y a 360 px sin scroll horizontal

## 8. DISPLAY — Contacto

- [x] 8.1 Crear esquema compartido `lib/contact/schema.ts` (nombre, email, mensaje con min/max, honeypot) y tests unitarios de casos válidos e inválidos; verificar que los tests pasan
- [ ] 8.2 Implementar Server Action `sendContact` con validación, honeypot, rate limit en memoria y envío vía Resend leyendo `RESEND_API_KEY` y `CONTACT_TO_EMAIL` del entorno; verificar con un envío real a la cuenta de pruebas y con un envío inválido forzado que devuelve errores por campo
- [x] 8.3 Implementar `ContactForm` con labels visibles, validación en vivo, errores asociados (`aria-invalid`, `aria-describedby`), estado de carga, `200 OK ✓ Mensaje recibido`, `500` con "Reintentar" que conserva datos y email alternativo, todo anunciado en `aria-live`; verificar simulando éxito y fallo (clave inválida)
- [x] 8.4 Implementar `CopyEmailButton` con feedback "Copiado al portapapeles" anunciado y fallback si el portapapeles falla, más redes, CV y "Programa finalizado con código de salida 0"; verificar copiando y denegando permisos de portapapeles
- [x] 8.5 Verificar que el bundle cliente no contiene la clave de Resend buscando el valor en `.next/static`

## 9. Página 404

- [x] 9.1 Crear `app/[locale]/not-found.tsx` con "Segmentation fault (core dumped)", volcado hex determinista `aria-hidden` y "Reiniciar proceso" al inicio del idioma; verificar que `/es/x` y `/en/x` devuelven 404 con textos en su idioma

## 10. Verificación integrada

- [x] 10.1 Recorrer toda la página solo con teclado (skip link, CTAs, tooltips, árbol, filtro, toggle de código, formulario) y confirmar orden de foco lógico y foco visible
- [x] 10.2 Ejecutar axe (extensión o `@axe-core/cli`) sobre `/es`, `/en` y la 404 y corregir hasta 0 violaciones
- [x] 10.3 Cargar `/es` con JS deshabilitado y confirmar que todo el contenido de las siete secciones es visible y que el formulario envía por progressive enhancement
