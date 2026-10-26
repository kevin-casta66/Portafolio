## 1. Infraestructura de tests

- [ ] 1.1 Instalar Playwright, @axe-core/playwright, Vitest y @lhci/cli como devDependencies con versiones exactas y añadir scripts `test:unit`, `test:e2e`, `lhci` en package.json; verificar que `pnpm test:unit --run` y `pnpm exec playwright --version` funcionan
- [ ] 1.2 Crear `playwright.config.ts` con proyectos desktop-chromium, desktop-firefox, desktop-webkit, mobile (Android táctil) y mobile-webkit (iPhone), `webServer` sobre la build de producción; verificar que un test vacío pasa en los cinco proyectos
- [ ] 1.3 Crear fixtures: contexto sin JS, contexto reduced motion, estado limpio (localStorage y sessionStorage), helper de auditoría axe (falla en serious/critical); verificar con un test de humo por fixture
- [ ] 1.4 Crear fixtures de backend gráfico: nueva generación (Chromium con flags; `skip` con motivo si no está disponible), WebGL2 (oculta la API de nueva generación) y sin WebGL (además anula `getContext`); verificar que el Modo Debug muestra `webgpu`, `webgl2` y `none` respectivamente
- [ ] 1.5 Añadir adaptador de envío `mock` para la Server Action de contacto activado por `CONTACT_TRANSPORT=mock`, con forzado de error por email de test; verificar que un envío local con el email de fallo devuelve error sin llamar al proveedor real

## 2. Pruebas unitarias

- [ ] 2.1 Test de integridad del contenido: toda habilidad enlaza ≥ 1 proyecto y toda tecnología de un proyecto existe como habilidad; verificar que falla al añadir una habilidad huérfana temporal
- [ ] 2.2 Script `check-placeholders` con test unitario: falla en producción y advierte en preview; verificar con fixtures de contenido con y sin placeholders
- [ ] 2.3 Tests de la lógica de logros (desbloqueo idempotente, persistencia, contador) y del modo de experiencia; verificar que pasan y cubren los cinco logros

## 3. Pruebas end-to-end del brief

- [ ] 3.1 Test de contenido esencial sin JS (nombre, rol, propuesta, CTAs, proyectos); verificar que pasa en desktop y mobile
- [ ] 3.2 Test de CV y Vista Rápida a un clic desde cada fase, un caso de estudio, `/heap`, `/motion` y la 404; verificar que pasa
- [ ] 3.3 Test de recorrido completo por teclado (skip link, foco visible, AST, filtros, formulario, terminal); verificar que pasa
- [ ] 3.4 Test de reduced motion (ilustraciones estáticas, Hold-to-Execute como clic, `/heap` sin inercia, `/motion` sin autoplay); verificar que pasa
- [ ] 3.5 Tests de filtro de proyectos y AST→proyectos comparando con los datos de `content/`; verificar que pasan
- [ ] 3.6 Test de terminal (`~`, `help`, `projects`, Tab, historial, aria-live); verificar que pasa
- [ ] 3.7 Tests del formulario: inválido, 200 OK y 500 con reintento y email alternativo usando el transporte mock; verificar que pasan
- [ ] 3.8 Tests de casos de estudio (Step over/back, volver al home) y de la 404 (estado HTTP 404 y "Reiniciar proceso"); verificar que pasan
- [ ] 3.9 Tests de i18n es/en (idioma del documento, textos, hreflang); verificar que pasan

## 4. Pruebas end-to-end del addendum

- [ ] 4.1 Test de Hold-to-Execute con ratón (hold completo abre con transición, soltar antes revierte sin navegar, clic abre versión corta), teclado (Enter abre, Espacio sostenido ejecuta) y táctil en el proyecto mobile; verificar que pasa y que el foco termina en el `h1` del caso
- [ ] 4.2 Test de Memory Heap: arrastre desplaza la vista, flechas mueven el foco entre bloques, la lista equivalente coincide con `content/`, "Run GC" reordena por tecnología y por año; verificar que pasa en desktop y mobile
- [ ] 4.3 Test de logros: desbloquear `root_access`, `process_executed`, `heap_explorer`, `kernel_panic` y `debugger_attached`, verificar aviso en región viva, contador en el Call Stack, persistencia tras recargar y que el foco no se mueve; verificar que pasa
- [ ] 4.4 Test de puerta de arranque: "Iniciar con sonido" y "Iniciar en silencio" fijan el estado de sonido, la elección persiste en la sesión (recarga → boot corto) y la puerta es operable con teclado; verificar que pasa
- [ ] 4.5 Test de `/motion`: Replay reproduce y vuelve a reposo, 0.25x tarda ≈ 4× que 1x con tolerancia, el interruptor muestra la máscara; verificar que pasa
- [ ] 4.6 Test de paridad gráfica: home, un caso, `/heap` y `/motion` con nueva generación, WebGL2 y sin WebGL producen el mismo snapshot del árbol de accesibilidad y sin errores en consola; verificar que pasa (nueva generación puede quedar `skip` con motivo)
- [ ] 4.7 Auditoría axe en inicio, caso, Vista Rápida abierta, terminal abierta, `/heap`, `/motion`, aviso de logro visible y 404 en tema oscuro y claro; verificar cero violaciones serious/critical

## 5. Lighthouse CI y presupuestos

- [ ] 5.1 Crear `lighthouserc` con preset móvil, 3 ejecuciones, URLs inicio/caso/404/`/heap`/`/motion` sobre la build de producción con todas las capas activas y aserciones de categorías, LCP, CLS y TBT; verificar que `pnpm lhci autorun` pasa localmente
- [ ] 5.2 Añadir `budget.json` e integrar `scripts/check-bundle.ts` del change 09 (≤ 180 KB gzip por ruta) con mensaje de límite y valor medido; verificar que falla al importar temporalmente una dependencia pesada en la ruta inicial
- [ ] 5.3 Añadir paso Playwright que mide INP con `PerformanceObserver` en filtros, AST, Hold-to-Execute, Run GC y terminal sobre la build de producción; verificar que falla si alguna interacción supera 200 ms (probar con un bloqueo artificial temporal)

## 6. Matriz de dispositivos reales

- [ ] 6.1 Escribir `docs/DEVICE-MATRIX.md` con la matriz (Android gama media + Chrome, iPhone + Safari 26, escritorio Chrome, escritorio Firefox), protocolo de recorrido y campos de resultado (backend, tier, fps mediana, incidencias); verificar que cubre boot, 7 fases, Hold-to-Execute, `/heap`, `/motion`, tema claro y reduced motion
- [ ] 6.2 Ejecutar la matriz completa sobre un preview y registrar resultados; verificar que ninguna fila queda sin completar y que las incidencias bloqueantes tienen issue abierto

## 7. CI/CD y despliegue

- [ ] 7.1 Crear `.github/workflows/ci.yml` con jobs check (typecheck, lint, unit), e2e (matriz por proyecto) y lighthouse con caché; verificar que un PR de prueba muestra todos los checks en verde
- [ ] 7.2 Configurar branch protection en `main` exigiendo los checks; verificar que un PR con error de tipos no puede fusionarse
- [ ] 7.3 Enlazar el proyecto a Vercel (preview por PR, producción en `main`) y definir variables de Resend solo en servidor; añadir `.env.example` y revisar `.gitignore`; verificar que el PR muestra URL de preview y que el bundle del cliente no contiene la clave
- [ ] 7.4 Integrar @vercel/analytics y @vercel/speed-insights cargados tras la hidratación; verificar que el presupuesto de JS inicial sigue cumpliéndose
- [ ] 7.5 Ejecutar `check-placeholders` antes del build en Vercel; verificar que un build de producción con placeholders falla y uno de preview solo advierte

## 8. Documentación y lanzamiento

- [ ] 8.1 Escribir el README técnico (concepto, arquitectura de render con diagrama: canvas persistente, registro de escenas, gemelos DOM↔3D, render targets, tiers, TSL y reloj único; decisiones; presupuestos; scripts y tests; cómo editar `content/`; enlaces a `docs/TECHNIQUE-TEARDOWN.md`, `docs/MOTION-SPEC.md` y `docs/DEVICE-MATRIX.md`; badges de CI); verificar ejecutando el proyecto desde cero siguiendo solo el README y comprobando que todos los enlaces resuelven
- [ ] 8.2 Documentar la checklist de lanzamiento en `docs/LAUNCH.md` (datos personales, CV, dominio, metadatos, imágenes OG, matriz de dispositivos, informe Lighthouse, Instant Rollback y revisión "técnicas reinterpretadas, no copiadas" por cada fila del Technique Teardown); verificar que cada ítem está marcado antes del primer despliegue
- [ ] 8.3 Primer despliegue a producción tras reemplazar placeholders; verificar que producción pasa Lighthouse móvil con los presupuestos y que Speed Insights recibe datos
