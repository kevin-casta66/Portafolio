## Why

El sitio es el proyecto principal del portafolio (docs/BRIEF.md §0 y §13): sus criterios de aceptación y presupuestos de rendimiento (§9) solo son creíbles si se verifican automáticamente en cada cambio y el despliegue es reproducible (§7: Vercel, Playwright, Lighthouse CI). El ADDENDUM v2 (docs/ADDENDUM-v2.md §7, §8.5 y §9) añade criterios que también deben probarse: paridad entre el backend gráfico de nueva generación y WebGL2, Hold-to-Execute, Memory Heap, logros, puerta de arranque, `/motion`, pruebas en dispositivos reales y un README técnico de la arquitectura de render. Este change cierra el roadmap y depende de que los changes 00 a 09 estén aplicados.

## What Changes

- Suite end-to-end en escritorio y móvil que verifica los criterios de aceptación del brief §13 y del addendum §9: contenido esencial sin JS ni animación, CV y Vista Rápida a un clic, navegación completa por teclado, reduced motion, filtro de proyectos, enlace AST→proyectos, terminal, formulario (200 y 500 con servicio de email simulado), casos de estudio con Step over/back, 404, i18n es/en y auditoría de accesibilidad.
- E2E de las interacciones del addendum: Hold-to-Execute (ratón, teclado Enter/Espacio, táctil), Memory Heap (arrastre, flechas, lista equivalente, Run GC), logros (desbloqueo, persistencia, no bloquean), puerta de arranque con sonido/en silencio y `/motion` (Replay y velocidades).
- E2E de paridad gráfica forzando backend de nueva generación, WebGL2 y sin WebGL: mismo contenido y Modo Debug indicando el backend activo.
- Prueba unitaria del modelo de contenido: toda habilidad enlaza con al menos un proyecto.
- Matriz de pruebas en dispositivos reales (Android de gama media, iPhone con Safari 26, escritorio Chrome y Firefox): emulación automatizada donde aplique y protocolo manual documentado antes de cada lanzamiento.
- Auditoría de rendimiento en cada PR con perfil móvil, con todas las capas nuevas activas, y aserciones que bloquean el PR si se incumplen los presupuestos del change 09 (incluido el tamaño del JS inicial).
- Pipeline de integración continua (typecheck, lint, unit, e2e, auditoría de rendimiento), previews por PR y producción automática desde la rama principal.
- Gestión de secretos del servicio de email solo en servidor; analítica y métricas reales de rendimiento.
- README técnico público con la arquitectura de render (canvas persistente, registro de escenas, gemelos DOM↔3D, render targets, tiers, shaders en TSL), decisiones, guía de edición de contenido y enlaces a `docs/TECHNIQUE-TEARDOWN.md` y `docs/MOTION-SPEC.md`.
- Checklist previa al lanzamiento que bloquea producción mientras queden placeholders en `content/` e incluye la verificación "técnicas reinterpretadas, no copiadas".

## Capabilities

### New Capabilities
- `e2e-testing`: suite automatizada (end-to-end y unitaria) que verifica los criterios de aceptación del brief y del addendum en escritorio y móvil, incluida la paridad entre backends gráficos y la matriz de dispositivos reales.
- `lighthouse-ci`: auditoría de rendimiento, accesibilidad, buenas prácticas y SEO en cada PR, con todas las capas activas y presupuestos bloqueantes.
- `deployment`: pipeline de CI/CD, entornos de preview y producción, secretos, observabilidad, README técnico y checklist de lanzamiento.

### Modified Capabilities
<!-- Ninguna -->

## Impact

- Nuevos directorios/archivos: `tests/e2e/`, `tests/unit/`, configuración de Playwright, `lighthouserc`, workflows de GitHub Actions en `.github/workflows/`, `README.md`, `.env.example`, `docs/LAUNCH.md`, `docs/DEVICE-MATRIX.md`.
- Dependencias de desarrollo: Playwright, @axe-core/playwright, @lhci/cli, runner de tests unitarios (Vitest).
- Dependencias de runtime: @vercel/analytics y @vercel/speed-insights.
- Requiere un modo de prueba del servidor de contacto (simulación del proveedor de email) y hooks de test para forzar reduced motion, el backend gráfico (nueva generación / WebGL2 / ninguno) y estado limpio de logros y sesión.
- Depende de: 00-technique-teardown … 09-performance-a11y-fallbacks.
