## 1. Contenido y modelo

- [x] 1.1 Instalar y configurar MDX en Next (plugins remark/rehype) con la versión fijada en el change 00 y verificar que `next build` compila un `.mdx` de prueba
- [x] 1.2 Definir el esquema Zod del frontmatter de caso (slug, título, resumen, métricas, pasos de diagrama) y verificar que un frontmatter inválido rompe el build con mensaje claro
- [x] 1.3 Crear 2 casos placeholder `content/cases/<slug>.es.mdx` y `.en.mdx` marcados como contenido de ejemplo y verificar que se listan en build
- [x] 1.4 Añadir al modelo de contenido el cálculo de caso anterior/siguiente y `hasCaseStudy` por proyecto, con test unitario de orden y extremos

## 2. Ruta y layout Debugger

- [x] 2.1 Crear `app/[locale]/projects/[slug]/page.tsx` con `generateStaticParams`, `dynamicParams = false` y `generateMetadata`; verificar que `/es/projects/no-existe` devuelve 404
- [x] 2.2 Implementar el layout Debugger (cabecera, panel de breakpoints, columna de contenido) con landmarks; verificar con JS deshabilitado que todo el contenido es legible
- [x] 2.3 Implementar el resaltado de breakpoint activo con IntersectionObserver y `aria-current`, y salto con foco al encabezado; verificar con teclado
- [x] 2.4 Adaptar el panel a índice compacto en móvil y verificar a 375 px que no tapa contenido
- [x] 2.5 Ocultar el enlace "Caso de estudio" en tarjetas sin caso y verificarlo en el home

## 3. Componentes del caso

- [x] 3.1 Integrar en MDX el Shiki que ya instaló el change 04 (`lib/highlight.ts`, tema por variables CSS enlazado a tokens) mediante un plugin rehype, sin segundo highlighter; verificar que no hay código de Shiki en el bundle de cliente (analizador de bundle)
- [x] 3.2 Implementar el transformer de anotaciones por línea y su layout (margen en escritorio, debajo en móvil); verificar con un bloque anotado
- [x] 3.3 Implementar `ArchitectureDiagram` SVG completo en SSR y la timeline scrubbed por pasos (reversible); verificar ida/vuelta de scroll y reduced motion
- [x] 3.4 Implementar `MetricChart` con tabla accesible equivalente y dibujo al entrar en viewport; verificar con lector de pantalla/axe
- [x] 3.5 Implementar `StepNav` (Step back ◀ / Step over ▶ / volver al home) con estados de extremos; verificar navegación en ambos locales

## 4. Hold-to-Execute

- [x] 4.1 Implementar `motion/useHold` con Pointer Events (umbral 800 ms, clic < 200 ms, cancelación por desplazamiento > 10 px) y tests unitarios con temporizadores simulados para hold completo, clic corto, cancelación y desplazamiento
- [x] 4.2 Implementar el anillo SVG con "Ejecutando…" posicionado en el cursor y su reversión con spring al soltar; verificar visualmente en escritorio que solo anima transform/opacity/stroke (Performance panel sin layout)
- [x] 4.3 Añadir equivalente de teclado (Enter corto, mantener Espacio completo sin scroll, `repeat` ignorado) y verificar con teclado que la página no se desplaza y el anillo rodea la tarjeta enfocada
- [ ] 4.4 Añadir soporte táctil (`touch-action: pan-y`, sin callout ni selección) y verificar en Android de gama media y Safari iOS que el long-press ejecuta y que arrastrar hace scroll sin abrir el caso
- [ ] 4.5 Añadir `aria-describedby` con la instrucción y región `aria-live` para inicio/cancelación; verificar con lector de pantalla los anuncios
- [x] 4.6 Implementar la rama reduced motion (sin anillo, apertura con fundido) y verificar emulando `prefers-reduced-motion: reduce`
- [x] 4.7 Emitir `achievement:unlock` con `process_executed` solo en el primer hold completo de la sesión y verificar con un test unitario del bus de eventos

## 5. Transición de página en el canvas (T6)

- [x] 5.1 Implementar `motion/pageTransition` (captura → expansión → navegación → entrega) usando el gemelo WebGL de la tarjeta y el reloj único; verificar en Chrome (WebGPU) que la tarjeta se expande con "Attaching debugger…" y termina en la cabecera sin salto (CLS 0 en la traza)
- [x] 5.2 Implementar el nodo TSL de distorsión de lente + aberración cromática ponderadas al borde en `webgl/nodes/` y el prototipo aislado `/[locale]/prototypes/T6` (ruta de desarrollo del change 04) antes de integrarlo; verificar en el prototipo, con su vista de máscara, que el centro queda sin distorsión (el interruptor del Modo Debug llega con el change 06)
- [x] 5.3 Implementar la versión corta (≤ 500 ms) para clic/Enter y la completa (≤ 1200 ms) para hold; verificar duraciones en el Performance panel
- [ ] 5.4 Verificar la misma transición forzando el backend WebGL2 y en Firefox sin soporte de transiciones de vista
- [x] 5.5 Guardar y restaurar scroll del home (sessionStorage + Lenis) e implementar la transición inversa desde el rect de la cabecera; verificar con el botón atrás que la tarjeta y el scroll coinciden
- [x] 5.6 Implementar `resolveTransitionMode()` (full / 2d / instant / fade) con FLIP 2D para tier bajo; verificar forzando cada tier y desactivando WebGL que no hay errores en consola
- [x] 5.7 Liberar render targets (dimensionados con `rtSize()`) y texturas propias al terminar cada transición; verificar con el gancho de pruebas del change 04 (`?motionTest=1`, `renderer.info.memory` y `liveContexts()`) que la memoria de GPU no crece tras 10 idas y vueltas y que nunca hay dos contextos
- [x] 5.8 Exponer la transición T6 como función aislada reproducible (para la página /motion del change 08) y verificar que se puede invocar sin navegar
- [ ] 5.9 Mover el foco al `h1` y anunciar el título tras cada transición; verificar con lector de pantalla

## 6. Transiciones de UI (T10)

- [x] 6.1 Crear `motion/uiTransition` con `<ViewTransition>` de React (sin flag: en Next 16.4.3 no existe `experimental.viewTransition`), detección de soporte y fallback GSAP Flip; verificar con un test que sin `document.startViewTransition` se usa Flip y que `pnpm build` no emite avisos de configuración
- [ ] 6.2 Implementar el revelado circular del toggle de tema desde el botón y su fallback (fundido cruzado) y rama reduced motion; verificar en ambos temas en Chrome y Firefox
- [x] 6.3 Envolver el reordenado de filtros de proyectos y el menú en `uiTransition`; verificar que el resultado filtrado es idéntico con y sin soporte

## 7. Verificación de integración

- [x] 7.1 Verificar que se mantiene un único contexto gráfico al navegar home → caso → home (contador de contextos en DevTools / Modo Debug)
- [x] 7.2 Verificar CLS < 0,05 en la página de caso e INP < 200 ms al iniciar y cancelar un hold (Performance panel / Web Vitals)
