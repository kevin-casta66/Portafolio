## Context

El change 01 deja tokens, tipografías, `app-shell` (layout, landmarks, skip link, i18n `es`/`en`) y el modelo de contenido tipado con relaciones habilidad↔proyecto. Este change construye todas las secciones como HTML semántico sin animación (ver proposal.md › Why). Los changes 03–06 añadirán coreografía, WebGL, View Transitions y sistemas globales encima, por lo que la estructura del DOM, los anchors y los IDs definidos aquí son un contrato para ellos.

## Goals / Non-Goals

**Goals:**
- Todo el contenido renderizado en servidor; JS de cliente solo en islas pequeñas (tooltip, árbol, filtro, toggle de código, formulario, copiar email).
- Estructura de DOM estable y con `data-*` hooks para que la coreografía futura no tenga que reescribir componentes.
- Accesibilidad completa por teclado y lector de pantalla desde el primer día.

**Non-Goals:**
- Animaciones (tecleo, FLIP, contadores, trazas de luz, tilt), escenas WebGL, preloader BOOT, transición a caso de estudio: changes 03–05.
- Páginas de caso de estudio (change 05): el enlace "Caso de estudio" apunta ya a `/[locale]/projects/[slug]`, que puede responder 404 hasta entonces.
- Call Stack, terminal, Vista Rápida, cursor (change 06).

## Decisions

### D1. Server Components por defecto, islas cliente mínimas
Cada fase vive en `components/phases/<Fase>/` con un `<Fase>Section.tsx` servidor que recibe datos de `content/` y renderiza el HTML. La interactividad se aísla en componentes `"use client"` pequeños (`TokenTooltip`, `SkillTree`, `ProcessFilter`, `CodeFlipToggle`, `ContactForm`, `CopyEmailButton`).
*Alternativa*: secciones completas como cliente → descartada por coste en JS inicial (< 180 KB) y por perder contenido sin JS.

### D2. Contrato de anclas y hooks de animación
Cada sección es `<section id="source|lexer|parser|bytecode|runtime|gpu|display" aria-labelledby=… data-phase=…>`. Los elementos que se animarán después llevan `data-anim="<rol>"` (p. ej. `data-anim="token"`, `data-anim="ast-node"`, `data-anim="instruction"`, `data-anim="process-card"`). Las tarjetas de proyecto tienen `id="project-<slug>"`.
*Alternativa*: refs React expuestas → acopla coreografía a componentes, contra §8 del brief.

### D3. Tooltip accesible propio
Tooltip con `role="tooltip"` y `aria-describedby`, apertura por `pointerenter`/`focus`, cierre por `Escape`/`blur`/tap fuera. Posicionamiento CSS (anchor positioning con fallback a posición absoluta simple).
*Alternativa*: librería de popovers → dependencia extra para un caso simple.

### D4. Árbol de habilidades con patrón WAI-ARIA Tree View
`role="tree"`/`treeitem`/`group`, roving tabindex, `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`. Layout con CSS Grid/Flex: horizontal ≥ 768 px, vertical colapsable debajo. Las ramas se dibujan con SVG estático (que el change 03 animará con stroke-dashoffset). La selección guarda `selectedSkill` en estado local; la lista de proyectos relacionados se obtiene de la relación calculada en `content/` (change 01). Los conteos "N proyectos" también derivan de esa relación.
*Alternativa*: lista anidada `<ul>` sin roles de árbol → no cumple "árbol navegable por teclado" del brief §10.

### D5. Filtro de proyectos con estado en URL
`ProcessFilter` usa un `<select>` nativo (o radiogroup estilizado) cuyo valor se refleja en `?grep=<tech>` vía `useSearchParams`, permitiendo compartir el estado y que funcione con SSR (el servidor filtra si llega el parámetro). Recuento anunciado por `role="status"`. Sin FLIP (change 03).
*Alternativa*: estado solo local → no enlazable y se pierde al recargar.

### D6. Formulario: React Hook Form + Zod compartido + Server Action + Resend
Un único esquema Zod en `lib/contact/schema.ts` usado por el resolver del cliente y por la Server Action `sendContact` (`lib/contact/action.ts`). La acción: valida, comprueba honeypot, aplica rate limit simple en memoria por IP (suficiente para portafolio; documentado como limitación), llama a Resend con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` del entorno y devuelve `{ status: 200 } | { status: 400, fieldErrors } | { status: 500 }`. El estado se muestra en una región `aria-live="polite"`. El formulario funciona también con envío nativo (progressive enhancement de Server Actions).
*Alternativa*: API route REST → más código y sin progressive enhancement.

### D7. Media de proyectos
`next/image` para capturas (AVIF/WebP, `sizes` responsivos) y `<video muted playsInline loop preload="none" poster>` con `onError` → póster. El autoplay solo en viewport llega en change 03/07; aquí el video no hace autoplay si `prefers-reduced-motion`.

### D8. 404
`app/[locale]/not-found.tsx` + `notFound()`; el volcado hex se genera en build (determinista, `aria-hidden`), con `overflow:hidden` en su contenedor. El glitch llega en change 03.

### D9. Textos de UI en i18n
Todos los literales de interfaz ("Ver proyectos", "Copiado al portapapeles", "Reiniciar proceso"…) en los mensajes ES/EN; el contenido personal en `content/` con campos localizados según el modelo del change 01.

## Risks / Trade-offs

- [Rate limit en memoria no persiste entre instancias serverless] → Aceptable para portafolio; honeypot como primera barrera; documentado para migrar a un KV si hay abuso.
- [El contrato `data-anim` puede quedarse corto para el change 03] → Se amplía con ADDED en ese change; los IDs de sección no deben cambiar.
- [Enlace "Caso de estudio" 404 hasta el change 05] → Ocultarlo si el proyecto no tiene `caseStudy` en contenido o aceptar 404 temporal en desarrollo.
- [Árbol complejo en móvil] → Vertical colapsable con la primera rama abierta; probado en 360 px.

## Migration Plan

Greenfield: no hay migración. Despliegue normal tras el change 01; requiere definir `RESEND_API_KEY` y `CONTACT_TO_EMAIL` en el entorno (local `.env.local` sin commitear, Vercel en change 08).

## Open Questions

- Dominio verificado en Resend para el remitente: se puede usar el remitente de pruebas hasta el change 08.
