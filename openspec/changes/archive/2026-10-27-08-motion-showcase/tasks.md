## 1. Contenido y contrato

- [x] 1.1 Crear `content/motion.ts` con las 11 entradas T1–T11 (campos de D4, textos es/en) a partir de docs/MOTION-SPEC.md y verificar con un test unitario que existen exactamente T1–T11 y que todo token referenciado existe en `motion/tokens.ts`
- [x] 1.2 Definir el tipo `TransitionDemo` (`mount`, `replay`, `setSpeed`, `setInternals`, `renderPoster`, `dispose`) en `motion/showcase.ts` y extraer el arnés de los prototipos (`app/[locale]/(dev)/prototypes/[transition]`, `components/dev/*`) a un módulo reutilizable fuera de `(dev)` que siga usando la ruta de prototipos; verificar que `tsc --noEmit` pasa y que los prototipos siguen funcionando en dev
- [x] 1.3 Añadir las claves de traducción es/en de la página y verificar que el chequeo de claves faltantes de i18n pasa

## 2. Adaptadores de los prototipos

- [x] 2.1 Implementar el adaptador para las transiciones DOM (T1, T7, T10, T11 versión DOM) sobre sus timelines existentes y verificar con un test de contrato que exponen todos los métodos y que `setSpeed(0.5)` duplica la duración medida
- [x] 2.2 Implementar el adaptador para las transiciones WebGL (T2, T3, T4, T5, T8, T9, T11 SDF) sobre `CANVAS_TRANSITIONS` de `webgl/transitions/registry.ts` y sus escenas `T*.scene.ts` (los mismos módulos que montan los prototipos), añadiendo a cada escena la salida de depuración de «Ver internos» según docs/MOTION-SPEC.md §3 (hoy solo existe la máscara de T6); verificar con el test de contrato, en Modo Debug (06) y con capturas que `setInternals(true)` muestra la máscara o el render target de cada una y que con el interruptor apagado el render del sitio no cambia
- [x] 2.3 Implementar el adaptador de T6 Hold-to-Execute sobre `motion/t6.ts` y su escena (reproducción automática del hold sin puntero, reutilizando la máscara de lente existente) y verificar que la demo completa la expansión sin navegar de página
- [x] 2.4 Verificar que cada adaptador WebGL incluye su variante 2D y que forzando la ausencia de WebGL el test de contrato sigue pasando

## 3. Página y componentes

- [x] 3.1 Crear `app/[locale]/motion/page.tsx` (SSG, metadatos, hreflang, OG) y añadir `/motion` al `app/sitemap.ts` existente (change 07); verificar que `/es/motion` y `/en/motion` responden 200 en el build y aparecen en `sitemap.xml`
- [x] 3.2 Implementar `EasingCurve` (SVG desde tokens, punto animado y previsualización en hover/foco) y verificar que cambiar un token en `motion/tokens.ts` cambia la curva tras rebuild
- [x] 3.3 Implementar `TransitionCard` con Replay, `SpeedControl` (0.25x/0.5x/1x, por defecto 1x) e `InternalsToggle` (`aria-pressed`) y verificar con un test de componente los estados y el anuncio en la región `aria-live`
- [x] 3.4 Generar los pósters de T1–T11 con un script de Playwright y verificar que la página sin JavaScript muestra las 11 imágenes y todo el texto

## 4. Gestión de recursos

- [x] 4.1 Implementar `showcaseStore` con `activeDemoId` y la regla de una sola demo 3D activa, y verificar con un test E2E que al pulsar Replay en una segunda demo 3D la primera vuelve a su póster
- [x] 4.2 Cargar adaptadores y motor 3D con `import()` al primer Replay y verificar en el informe del bundle y en la pestaña de red que la carga inicial de `/motion` no incluye el chunk 3D
- [x] 4.3 Pausar la demo activa al salir del viewport y verificar en Modo Debug que el contador de frames se detiene

## 5. Accesibilidad, reduced motion y fallback

- [x] 5.1 Desactivar hover-preview y autoplay con reduced motion y verificar con un E2E emulando `prefers-reduced-motion: reduce` que nada se anima hasta pulsar Replay y que tras reproducirse vuelve al póster
- [x] 5.2 Mostrar la etiqueta "Fallback 2D" cuando no hay WebGL y verificar con un E2E que anula `getContext` que T8 se reproduce en 2D con la etiqueta visible
- [x] 5.3 Verificar recorrido completo por teclado (Tab, Enter, Espacio) en una tarjeta y auditoría axe sin violaciones en `/motion`

## 6. Integración global

- [x] 6.1 Añadir el comando `motion` al registro de comandos de la terminal y verificar que navega a `/[locale]/motion` y aparece en `help` y en el autocompletado
- [x] 6.2 Añadir el enlace a `/motion` en el footer y verificar que está presente en todas las páginas
- [x] 6.3 Definir el logro `motion_inspector` con `defineAchievement` en `content/achievements.ts` (textos es/en) y desbloquearlo con `unlock()` en el primer Replay; verificar que se desbloquea una sola vez
- [ ] 6.4 Ejecutar Lighthouse móvil sobre `/es/motion` y verificar que cumple Perf ≥ 90 y A11y/BP/SEO = 100 (si Lighthouse no está disponible en este equipo, dejar la tarea sin marcar: la medición automatizada llega con LHCI en el change 10)
