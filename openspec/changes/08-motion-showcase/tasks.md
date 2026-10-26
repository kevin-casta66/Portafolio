## 1. Contenido y contrato

- [ ] 1.1 Crear `content/motion.ts` con las 11 entradas T1–T11 (campos de D4, textos es/en) a partir de docs/MOTION-SPEC.md y verificar con un test unitario que existen exactamente T1–T11 y que todo token referenciado existe en `motion/tokens.ts`
- [ ] 1.2 Definir el tipo `TransitionDemo` (`mount`, `replay`, `setSpeed`, `setInternals`, `renderPoster`, `dispose`) en `motion/showcase.ts` y verificar que `tsc --noEmit` pasa
- [ ] 1.3 Añadir las claves de traducción es/en de la página y verificar que el chequeo de claves faltantes de i18n pasa

## 2. Adaptadores de los prototipos

- [ ] 2.1 Implementar el adaptador para las transiciones DOM (T1, T7, T10, T11 versión DOM) sobre sus timelines existentes y verificar con un test de contrato que exponen todos los métodos y que `setSpeed(0.5)` duplica la duración medida
- [ ] 2.2 Implementar el adaptador para las transiciones WebGL (T2, T3, T4, T5, T8, T9, T11 SDF) sobre la variante `canvas` de `motion/transitions/registry.ts` (los mismos módulos que montan los prototipos de `app/[locale]/(dev)/prototypes/`) y verificar con el test de contrato y en Modo Debug que `setInternals(true)` muestra la máscara o el render target
- [ ] 2.3 Implementar el adaptador de T6 Hold-to-Execute (reproducción automática del hold sin puntero) y verificar que la demo completa la expansión sin navegar de página
- [ ] 2.4 Verificar que cada adaptador WebGL incluye su variante 2D y que forzando la ausencia de WebGL el test de contrato sigue pasando

## 3. Página y componentes

- [ ] 3.1 Crear `app/[locale]/motion/page.tsx` (SSG, metadatos, hreflang) y verificar que `/es/motion` y `/en/motion` responden 200 en el build y aparecen en el sitemap
- [ ] 3.2 Implementar `EasingCurve` (SVG desde tokens, punto animado y previsualización en hover/foco) y verificar que cambiar un token en `motion/tokens.ts` cambia la curva tras rebuild
- [ ] 3.3 Implementar `TransitionCard` con Replay, `SpeedControl` (0.25x/0.5x/1x, por defecto 1x) e `InternalsToggle` (`aria-pressed`) y verificar con un test de componente los estados y el anuncio en la región `aria-live`
- [ ] 3.4 Generar los pósters de T1–T11 con un script de Playwright y verificar que la página sin JavaScript muestra las 11 imágenes y todo el texto

## 4. Gestión de recursos

- [ ] 4.1 Implementar `showcaseStore` con `activeDemoId` y la regla de una sola demo 3D activa, y verificar con un test E2E que al pulsar Replay en una segunda demo 3D la primera vuelve a su póster
- [ ] 4.2 Cargar adaptadores y motor 3D con `import()` al primer Replay y verificar en el informe del bundle y en la pestaña de red que la carga inicial de `/motion` no incluye el chunk 3D
- [ ] 4.3 Pausar la demo activa al salir del viewport y verificar en Modo Debug que el contador de frames se detiene

## 5. Accesibilidad, reduced motion y fallback

- [ ] 5.1 Desactivar hover-preview y autoplay con reduced motion y verificar con un E2E emulando `prefers-reduced-motion: reduce` que nada se anima hasta pulsar Replay y que tras reproducirse vuelve al póster
- [ ] 5.2 Mostrar la etiqueta "Fallback 2D" cuando no hay WebGL y verificar con un E2E que anula `getContext` que T8 se reproduce en 2D con la etiqueta visible
- [ ] 5.3 Verificar recorrido completo por teclado (Tab, Enter, Espacio) en una tarjeta y auditoría axe sin violaciones en `/motion`

## 6. Integración global

- [ ] 6.1 Añadir el comando `motion` al registro de comandos de la terminal y verificar que navega a `/[locale]/motion` y aparece en `help` y en el autocompletado
- [ ] 6.2 Añadir el enlace a `/motion` en el footer y verificar que está presente en todas las páginas
- [ ] 6.3 Registrar el logro `motion_inspector` y verificar que se desbloquea en el primer Replay y no se repite
- [ ] 6.4 Ejecutar Lighthouse móvil sobre `/es/motion` y verificar que cumple Perf ≥ 90 y A11y/BP/SEO = 100
