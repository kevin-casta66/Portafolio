## 1. Modo de experiencia y backend

- [x] 1.1 Crear `lib/experience.ts` que derive `full | reduced | fallback2d` (manual > sistema > capacidad > fps) y registre el backend activo (`webgpu | webgl2 | none`); verificar con tests unitarios que cubren las 4 prioridades y los 3 backends
- [x] 1.2 Añadir script inline en `<head>` que fije `data-experience` en `<html>` antes del primer pintado; verificar en DevTools que no hay flash de animación con `prefers-reduced-motion` emulado
- [x] 1.3 Añadir el control manual de movimiento reducido (header y comando de terminal) con persistencia en sessionStorage; verificar que el modo se mantiene al navegar a un caso, a `/heap` y a `/motion`

## 2. Movimiento reducido

- [x] 2.1 Implementar en `motion/` la rama `reduced` del catálogo T1–T11 según la tabla de `00-technique-teardown` (fundidos ≤ 300 ms, sin glitch, sin tecleo, sin FLIP); verificar recorriendo la home con reduced emulado que el panel Performance no muestra transforms animados
- [x] 2.2 Eliminar parallax, reacción a velocidad de scroll y fluido, y sustituir escenas 3D por `PhaseIllustration` en modo reducido; verificar que no se descarga el chunk 3D (pestaña Network)
- [x] 2.3 Reducir el boot (puerta de arranque incluida) a ≤ 400 ms con fundido en modo reducido; verificar midiendo el tiempo hasta hero visible y que ambos botones de la puerta siguen operativos
- [x] 2.4 Hold-to-Execute en modo reducido: clic normal abre el caso con fundido; verificar con ratón, teclado y táctil emulado
- [x] 2.5 `/heap` en modo reducido sin inercia ni lente, con desplazamiento discreto y lista equivalente; avisos de logros sin desplazamiento; verificar manualmente con reduced emulado
- [x] 2.6 `/motion` en modo reducido muestra fotogramas clave estáticos y el Replay completo solo bajo petición explícita; verificar manualmente
- [x] 2.7 Verificar que filtros, AST, terminal, Vista Rápida, formulario, casos, `/heap`, `/motion` y logros funcionan en modo reducido recorriéndolos con checklist

## 3. Cadena de fallbacks gráficos

- [x] 3.1 Crear un `PhaseIllustration` SVG/CSS por fase (SOURCE, LEXER, PARSER, BYTECODE, RUNTIME, GPU, DISPLAY) y para `/heap`, con tokens y ambos temas; verificar visualmente en tema claro y oscuro
- [x] 3.2 Detectar disponibilidad del backend de nueva generación y de WebGL2 antes del import dinámico y cachear el resultado; verificar con WebGL desactivado que el chunk 3D no se solicita; reutilizar `webgl/core/backend.ts` del change 04 en vez de duplicar la detección
- [x] 3.3 Forzar el backend WebGL2 (flag de depuración) y comparar el contenido DOM y las escenas de cada fase con el backend de nueva generación; verificar que no hay diferencias de contenido y que el Modo Debug muestra el backend activo
- [x] 3.4 Conectar hover de tarjetas de proyecto con el resaltado del núcleo en el chip 2D; verificar sin WebGL
- [x] 3.5 Manejar la pérdida y restauración del contexto/dispositivo cambiando a fallback y restaurando; verificar forzando la pérdida (fallback < 1 s); partir del reintento único con `await renderer.dispose()` del change 04 y verificar que nunca hay dos contextos vivos (`liveContexts()` de `webgl/dispose.ts`)
- [x] 3.6 Pasar a `fallback2d` en sesión si fps < 30 durante 3 s en tier bajo; verificar con CPU throttling 6× y Modo Debug
- [x] 3.7 Corregir la atenuación `near` del túnel T4 (usa `uniformZ.value` constante en lugar del nodo uniform); verificar con una comparativa A/B (`git show HEAD:` en solo lectura) que el túnel atenúa con la distancia sin otros cambios visuales

## 4. Presupuestos de rendimiento

- [x] 4.1 Crear `scripts/check-bundle.ts` que sume el gzip del JS de primer render por ruta (home, caso, `/heap`, `/motion`) y falle si ≥ 180 KB o incluye librerías 3D/animación diferibles; verificar ejecutándolo sobre `next build`; usar el mismo criterio de medición que el change 04 (gzip nivel 9 de los scripts `/_next/static` del HTML) y anotar la línea base actual de 256,99 KB (histórico en design.md D9)
- [x] 4.2 Diferir la carga de GSAP, Lenis, el motor 3D y las escenas a después del LCP; verificar en la línea de tiempo de red que esas peticiones empiezan tras el evento LCP
- [ ] 4.3 Auditar handlers de interacción (filtros, AST, Hold-to-Execute, Run GC, drag del Heap, terminal, formulario) y mover a GPU o worker todo trabajo > 50 ms; verificar en el panel Performance que no quedan long tasks en esas interacciones
- [x] 4.4 Medir INP en filtros, AST, Hold-to-Execute, `/heap`, terminal y formulario con Web Vitals en consola; verificar < 200 ms en móvil emulado
- [x] 4.5 Revisar Lenis y pins: sin bloqueo de wheel/touch, retroceso libre, teclado (PageDown, Inicio/Fin) y Call Stack funcionando durante pins; verificar manualmente en escritorio y móvil
- [x] 4.6 Crear script local que recorra las fases en cada tier y lea draw calls y partículas del Modo Debug; verificar < 100 draw calls por escena activa y partículas ≤ 200k/50k/0
- [x] 4.7 Migrar imágenes a AVIF/WebP con `sizes` y dimensiones reservadas, vídeos a WebM/MP4 con póster y reproducción solo en viewport, y optimizar sin pérdida los atlas MSDF; verificar en Network con viewport de 390 px; la conversión KTX2 (pendiente 5.6 del change 04) queda diferida por decisión del usuario
- [x] 4.8 Configurar fuentes locales con subset, precarga y fallback ajustado; verificar cero peticiones a terceros y CLS de fuentes ≈ 0
- [x] 4.9 Comprobar que se mantiene el límite de DPR a 2 implementado en el change 04 (`dpr={[1, 2]}` en `webgl/WebglRoot.tsx`); verificar con emulación de DPR 3 en Modo Debug que `renderer.getPixelRatio()` devuelve 2
- [ ] 4.10 Instalar `lighthouse` como devDependency con versión exacta (solo el agente principal), crear `scripts/perf/lighthouse.mjs` y ejecutar Lighthouse móvil local en `/es`, `/en`, un caso, `/heap` y `/motion` con todas las capas activas; verificar Perf ≥ 90, A11y/BP/SEO = 100, LCP < 2,5 s, CLS < 0,05 y guardar los informes en `docs/perf/`
- [ ] 4.11 Medir fps en recorrido completo en escritorio de referencia con cada backend; verificar mediana ≥ 58 y documentar en `docs/perf/`
- [x] 4.12 Resolver los INP heredados (primera apertura de los ajustes de sonido, 216 ms; pasada táctil 3D del 07, 224 ms) difiriendo el trabajo tras el feedback inmediato; verificar < 200 ms con `scripts/audio/measure-inp.mjs` y en perfil móvil
- [x] 4.13 Reducir el JS propio de `/heap` (~494 KB) para que la lista y la cuadrícula DOM lleguen antes que la escena; verificar con `scripts/check-bundle.ts` y en Network

## 5. Accesibilidad

- [x] 5.1 Revisar landmarks, `h1` único, jerarquía de encabezados y `lang` por locale en todas las rutas; verificar con el árbol de accesibilidad de DevTools
- [x] 5.2 Revisar el skip link existente (`app/[locale]/layout.tsx`) e implementar el foco visible tipo caret con token `--focus-caret` en ambos temas; verificar contraste ≥ 3:1 del indicador
- [x] 5.3 Asegurar gestión de foco en terminal, ayuda de atajos y diálogos (atrapar, Escape, retorno de foco); verificar con teclado
- [ ] 5.4 Implementar patrón ARIA `tree` en el AST, cuadrícula navegable con flechas en `/heap` y controles operables por teclado en `/motion` (Replay, velocidad, interruptor de máscara); verificar con teclado y NVDA
- [ ] 5.5 Exponer el progreso de Hold-to-Execute de forma accesible (Enter abre, mantener Espacio ejecuta, anuncio al completar); verificar con NVDA
- [ ] 5.6 Marcar el canvas como `aria-hidden`, comprobar que todo dato de escena y todo texto MSDF tiene equivalente DOM; verificar con NVDA en RUNTIME, GPU y títulos de fase; cubre los pendientes 4.2 y 7.2 del change 04 (texto MSDF y controles del shader generativo con lector de pantalla real)
- [ ] 5.7 Añadir regiones vivas en terminal, resultado del formulario y avisos de logros (educadas, sin robar foco); verificar anuncios con NVDA
- [x] 5.8 Medir contraste de todos los tokens de texto, acentos y texto sobre liquid glass (Call Stack, terminal, lente del Heap) en ambos temas sobre el fondo más desfavorable y ajustar la opacidad de fondo donde falle; verificar con script de contraste
- [x] 5.9 Crear script local de auditoría axe sobre página (home, caso, 404, `/heap`, `/motion`) × tema × locale × modo; verificar cero violaciones
- [x] 5.10 Eliminar el desbordamiento horizontal a 375 px (toggle Grid/List/Heap, `PipelineStage`) y dejar la cabecera en 2 filas como máximo; verificar con Playwright a 375 px que `scrollWidth ≤ innerWidth` en home, caso, `/heap` y `/motion`

## 6. SEO

- [x] 6.1 Auditar y completar el `generateMetadata` existente por página y locale (home, casos, `/heap`, `/motion`), sustituyendo los textos genéricos de `Metadata.description` y `placeholderNotice`, con canonical y `alternates.languages` (es, en, x-default); verificar inspeccionando el `head`
- [x] 6.2 Añadir `opengraph-image` para home y casos reutilizando el generador existente de `/heap` y `/motion`, con estilo de fase y para cada caso con nombre y métrica principal; verificar que devuelve 1200×630
- [ ] 6.3 Añadir JSON-LD `Person` en home y `CreativeWork` por caso generados desde `content/`; verificar con el validador de Schema.org sin errores
- [x] 6.4 Generar `sitemap` y `robots` desde slugs y rutas públicas (incluidas `/heap` y `/motion`) y marcar la 404 como `noindex` con estado 404; verificar con `curl -I` y el XML del sitemap; `app/sitemap.ts` ya incluye home, casos, `/heap` y `/motion`: solo faltan `app/robots.ts`, el `noindex` y el estado 404
- [x] 6.5 Sustituir los textos de marcador restantes (`ph()` de los experimentos del laboratorio, README de `public/cv`) por contenido real o retirarlos; verificar con `grep` que no queda ningún `ph(` ni «Placeholder» en el contenido publicado

## 7. Verificación integral

- [x] 7.1 Recorrer la matriz completa (full con backend de nueva generación, full con WebGL2, reduced, fallback2d × tema claro/oscuro × es/en) comprobando que la narrativa y el contenido esencial son idénticos; verificar con checklist firmado en `docs/perf/README.md`
