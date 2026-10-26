## Context

Tras los changes 00–04 existen: tabla de movimiento T1–T11 y versiones fijadas (00), tokens y tema (`styles/tokens.css`, store de Zustand), app-shell con `app/[locale]/`, modelo de contenido tipado (`content/projects.ts`), tarjetas de proyecto estáticas en RUNTIME, `motion-system` (GSAP + ScrollTrigger + Lenis con un único rAF en `gsap.ticker`) y un canvas persistente único con `WebGPURenderer` (fallback WebGL2), registro de escenas, gemelos DOM↔WebGL, render targets y tiers de calidad (04). Ver proposal.md para la motivación; los requisitos están en `specs/case-study-pages`, `specs/page-transitions` y `specs/hold-to-execute`. docs/ADDENDUM-v2.md manda sobre el brief en transiciones e interacciones.

## Goals / Non-Goals

**Goals:**
- Casos de estudio 100 % estáticos (SSG) por locale, con cero JS obligatorio para leerlos.
- Resaltado de código sin coste en el bundle de cliente.
- Transición cinematográfica tarjeta ↔ caso independiente de APIs experimentales, construida sobre el canvas persistente.
- Hold-to-Execute con paridad de ratón, teclado, táctil y reduced motion.

**Non-Goals:**
- Open Graph dinámico y JSON-LD `CreativeWork` (change 09, `seo`).
- Tests E2E de las transiciones (change 10).
- Sistema de logros (change 06): aquí solo se emite el evento.
- Página /motion (change 08): este change expone la transición T6 de forma aislable para que 08 la reproduzca.
- CMS externo: el contenido sigue en archivos del repo.

## Decisions

### D1. MDX por caso y locale (`content/cases/<slug>.<locale>.mdx`)
MDX permite escribir prosa en Markdown e insertar componentes ricos (`<ArchitectureDiagram>`, `<AnnotatedCode>`, `<MetricChart>`, `<Breakpoint>`). Frontmatter tipado y validado con Zod en build (slug, título, resumen, orden de breakpoints, métricas). `generateStaticParams` cruza `content/projects.ts` con los archivos existentes; `dynamicParams = false` → slug desconocido = `notFound()`.
- Alternativa: contenido en `.ts` puro → incómodo para prosa larga.
- Alternativa: CMS headless → dependencia externa innecesaria para un portafolio.

### D2. Shiki en build (server components / rehype)
Se reutiliza lo que dejó el change 04: `shiki` 4.5.0 ya instalado y `lib/highlight.ts` (highlighter singleton con `createCssVariablesTheme`, variables `--shiki-*` definidas en `app/globals.css` desde los tokens). Para MDX se añade un plugin rehype que llama a ese mismo módulo; no se crea un segundo highlighter ni otro tema.
Shiki produce HTML con tokens coloreados en el servidor; no envía gramáticas ni runtime al cliente (protege el presupuesto de 180 KB). Tema basado en CSS variables para que los colores salgan de los design tokens y cambien con el tema sin re-render. Las anotaciones se declaran por meta del bloque (p. ej. ```ts {12: "nota"}```) y un transformer las convierte en `<aside>` alineadas por línea con CSS grid.
- Alternativa: Prism/highlight.js en cliente → JS extra y FOUC.

### D3. Transición tarjeta → caso en el canvas persistente (T6)
Un controlador `motion/pageTransition.ts` orquesta cuatro fases sobre el reloj único de `gsap.ticker`:
1. **Captura**: lee el rect de la tarjeta (ya seguido por su gemelo WebGL del change 04) y congela el gemelo como plano visible por encima del DOM; la tarjeta DOM pasa a `opacity: 0`.
2. **Expansión**: el plano se escala hasta el viewport; un nodo TSL aplica distorsión de lente (barrel) y aberración cromática ponderadas por la distancia al borde (centro limpio para que "Attaching debugger…" —texto DOM superpuesto— sea legible). Easing quart in-out de los tokens; 1200 ms completa / 450 ms corta (misma curva comprimida).
3. **Navegación**: a mitad de la expansión se llama `router.push`; la página destino se monta con la cabecera en `opacity: 0`. Se espera a que la cabecera tenga rect estable (doble rAF).
4. **Entrega**: el plano interpola sus uniforms a cero y su rect al de la cabecera; al terminar, cabecera DOM `opacity: 1`, plano oculto y recursos de transición liberados (`dispose` de render targets propios).

Para mezclar escenas saliente/entrante se reutiliza la infraestructura de render targets + máscara TSL del change 04. Integración concreta con lo implementado en el 04:
- El gemelo de cada tarjeta ya existe: `data-twin="card:<slug>"` en `ProcessCard`, seguido por `webgl/core/twins.ts` (incluso durante Flip).
- El plano de T6 es una escena más del motor (`webgl/core/engine.ts`) que aporta su capa a la composición del `RenderPipeline` (`buildOutput` de `webgl/postfx.ts`); la lente y la aberración son nodos TSL en `webgl/nodes/`. No se crea otro renderer ni otro `RenderPipeline`.
- Cualquier render target propio se dimensiona con `rtSize()` (`webgl/rt-size.ts`, píxeles físicos: en three r186 los viewports de RT ya no se escalan por el pixel ratio) y se libera con `dispose()` al terminar; si la transición coincide con una pérdida de contexto, se respeta la cola de `webgl/dispose.ts` (`await renderer.dispose()`).
- Como manda MOTION-SPEC, T6 tiene prototipo aislado en la ruta de desarrollo del 04 (`/[locale]/prototypes/T6`, con control de progreso y selector de variante) antes de integrarse.
- Alternativa: View Transitions API (versión previa de este change) → descartada por el addendum: experimental en App Router, sin control de shader y sin soporte homogéneo.
- Alternativa: FLIP DOM entre rutas → no permite lente ni aberración; se conserva solo como degradación 2D (D6).

### D4. Restauración de scroll y transición inversa
Antes de navegar se guarda `{slug, scrollY}` en `sessionStorage`. Al volver, se restaura con Lenis (`lenis.scrollTo(y, {immediate: true})`) **antes** de mostrar el home, se espera a que el gemelo de la tarjeta destino tenga rect, y se reproduce D3 en sentido inverso partiendo del rect de la cabecera. El botón atrás se detecta vía `popstate` + registro en `sessionStorage`. Sin registro (entrada directa) → fundido simple y ancla a `#projects`.

### D5. Hold-to-Execute
`components/systems/HoldToExecute` + hook `motion/useHold.ts`, basado en Pointer Events unificados (ratón, lápiz, táctil) y teclado:
- **Umbral**: 800 ms (token `--hold-duration`). Clic < 200 ms sin desplazamiento = apertura corta. Entre 200 y 800 ms y soltar = cancelación con spring (stiffness 300, damping 30) que revierte el anillo.
- **Anillo**: SVG con `stroke-dashoffset` animado solo con transform/opacity del contenedor y el trazo (barato, fuera del canvas para que funcione también en tier bajo); posicionado en el cursor o, con teclado, alrededor de la tarjeta enfocada.
- **Táctil**: `touch-action: pan-y` en la tarjeta, `-webkit-touch-callout: none` y `user-select: none` durante el gesto; cancelación si el desplazamiento supera 10 px (deja pasar el scroll nativo, sin scroll-jacking).
- **Teclado**: `keydown` Enter → corta; `keydown` Space con `preventDefault` (evita scroll) inicia hold, `keyup` antes de tiempo cancela; `repeat` ignorado.
- **Accesibilidad**: `aria-describedby` con la instrucción; región `aria-live="polite"` para "Ejecutando…" / cancelado.
- **Reduced motion**: el hook omite el anillo y toda activación navega con fundido.
- **Logro**: al primer hold completo se despacha `achievement:unlock` con id `process_executed` sobre el bus de eventos global; el change 06 lo escucha y deduplica.
- Alternativa: long-press nativo / `contextmenu` → inconsistente entre plataformas y choca con el menú del sistema.

### D6. Degradación por tier, soporte y reduced motion
Una función `resolveTransitionMode()` consulta el modo de experiencia y el tier (change 04/09):
- `full` (tier alto/medio) → D3 completa.
- `2d` (tier bajo) → expansión FLIP de la tarjeta DOM con GSAP Flip hasta la cabecera, sin shader.
- `instant` (sin WebGL o error de contexto) → navegación normal.
- `fade` (reduced motion) → fundido ≤ 200 ms.

### D7. Transiciones de UI (T10) con `<ViewTransition>` y fallback Flip
`<ViewTransition>` se importa de `react` (estable en React 19.3.1 instalado) y funciona en el App Router de Next 16.4.3 sin configuración: la opción `experimental.viewTransition` ya no existe en esa versión (ver `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). Se envuelven el toggle de tema, la rejilla filtrada y el menú en `<ViewTransition>`; como solo animan con Transitions (`startTransition`), el cambio de tema y el filtrado se disparan dentro de una. `supportsViewTransitions = typeof document.startViewTransition === 'function'`; sin soporte, `motion/uiTransition.ts` usa GSAP Flip (captura estado → aplica cambio → anima). El revelado circular del tema anima `clip-path: circle()` sobre `::view-transition-new(root)` desde las coordenadas del botón (radio con `Math.hypot` hasta la esquina más lejana); sin soporte → fundido cruzado con overlay. Reduced motion → cambio directo.
- Alternativa: solo Flip para todo → se pierde el revelado circular nativo del tema.
- Riesgo acotado a UI no crítica: el soporte del navegador (tipos de transición y `view-transition-class`) aún no es homogéneo.

### D8. Breakpoints, diagrama y gráficos
- Sección activa: `IntersectionObserver` (no ScrollTrigger) para que funcione aunque se desactive el motion-system; `aria-current="location"`.
- Diagrama: SVG inline renderizado completo en SSR; con JS, una timeline scrubbed de ScrollTrigger revela pasos (DrawSVG para conexiones). Reduced motion → no se crea la timeline.
- Gráficos: SVG con `<table>` hermana como fuente de verdad accesible; animación al entrar en viewport.

### D9. Canvas persistente
El canvas vive en `app/[locale]/layout.tsx`, fuera del segmento de página, por lo que no se desmonta. El caso de estudio no registra escenas 3D propias en este change, salvo el plano de transición; al terminar la transición, el registro de escenas no tiene escenas activas y el render queda bajo demanda.

## Risks / Trade-offs

- [Desfase entre el rect del gemelo y la cabecera tras `router.push`] → esperar doble rAF y fuentes cargadas antes de la fase de entrega; si el rect no se estabiliza en 300 ms, fundido de rescate.
- [Restaurar scroll antes de la transición inversa puede causar parpadeo] → el home se monta oculto bajo el plano a pantalla completa; se restaura scroll y luego se contrae.
- [Hold en táctil compite con el scroll] → `touch-action: pan-y` + umbral de 10 px; probado en Android de gama media y Safari iOS.
- [Espacio dentro de la tarjeta podría romper el scroll esperado por teclado] → solo se intercepta cuando el foco está en la propia tarjeta; fuera de ella, comportamiento nativo.
- [Soporte desigual de View Transitions entre navegadores (Safari se comporta distinto)] → aislado en `motion/uiTransition.ts`; fallback Flip siempre probado.
- [Shiki aumenta el tiempo de build] → el highlighter singleton de `lib/highlight.ts` (change 04) y solo los lenguajes usados.
- [Fugas de GPU por transiciones repetidas] → `dispose` explícito y verificación de memoria en Modo Debug.

## Migration Plan

Aditivo: no altera rutas existentes. Rollback = forzar `resolveTransitionMode()` a `instant`, desactivar el flag de `<ViewTransition>` y, si hace falta, eliminar la ruta `projects/[slug]` y ocultar el enlace "Caso de estudio" (flag en el modelo de contenido).

## Open Questions

- Número inicial de casos de estudio con contenido real (placeholder hasta que el autor lo rellene; no cambia la estructura).
