## 1. Modo de experiencia y backend

- [ ] 1.1 Crear `lib/experience.ts` que derive `full | reduced | fallback2d` (manual > sistema > capacidad > fps) y registre el backend activo (`webgpu | webgl2 | none`); verificar con tests unitarios que cubren las 4 prioridades y los 3 backends
- [ ] 1.2 Añadir script inline en `<head>` que fije `data-experience` en `<html>` antes del primer pintado; verificar en DevTools que no hay flash de animación con `prefers-reduced-motion` emulado
- [ ] 1.3 Añadir el control manual de movimiento reducido (header y comando de terminal) con persistencia en sessionStorage; verificar que el modo se mantiene al navegar a un caso, a `/heap` y a `/motion`

## 2. Movimiento reducido

- [ ] 2.1 Implementar en `motion/` la rama `reduced` del catálogo T1–T11 según la tabla de `00-technique-teardown` (fundidos ≤ 300 ms, sin glitch, sin tecleo, sin FLIP); verificar recorriendo la home con reduced emulado que el panel Performance no muestra transforms animados
- [ ] 2.2 Eliminar parallax, reacción a velocidad de scroll y fluido, y sustituir escenas 3D por `PhaseIllustration` en modo reducido; verificar que no se descarga el chunk 3D (pestaña Network)
- [ ] 2.3 Reducir el boot (puerta de arranque incluida) a ≤ 400 ms con fundido en modo reducido; verificar midiendo el tiempo hasta hero visible y que ambos botones de la puerta siguen operativos
- [ ] 2.4 Hold-to-Execute en modo reducido: clic normal abre el caso con fundido; verificar con ratón, teclado y táctil emulado
- [ ] 2.5 `/heap` en modo reducido sin inercia ni lente, con desplazamiento discreto y lista equivalente; avisos de logros sin desplazamiento; verificar manualmente con reduced emulado
- [ ] 2.6 `/motion` en modo reducido muestra fotogramas clave estáticos y el Replay completo solo bajo petición explícita; verificar manualmente
- [ ] 2.7 Verificar que filtros, AST, terminal, Vista Rápida, formulario, casos, `/heap`, `/motion` y logros funcionan en modo reducido recorriéndolos con checklist

## 3. Cadena de fallbacks gráficos

- [ ] 3.1 Crear un `PhaseIllustration` SVG/CSS por fase (SOURCE, LEXER, PARSER, BYTECODE, RUNTIME, GPU, DISPLAY) y para `/heap`, con tokens y ambos temas; verificar visualmente en tema claro y oscuro
- [ ] 3.2 Detectar disponibilidad del backend de nueva generación y de WebGL2 antes del import dinámico y cachear el resultado; verificar con WebGL desactivado que el chunk 3D no se solicita
- [ ] 3.3 Forzar el backend WebGL2 (flag de depuración) y comparar el contenido DOM y las escenas de cada fase con el backend de nueva generación; verificar que no hay diferencias de contenido y que el Modo Debug muestra el backend activo
- [ ] 3.4 Conectar hover de tarjetas de proyecto con el resaltado del núcleo en el chip 2D; verificar sin WebGL
- [ ] 3.5 Manejar la pérdida y restauración del contexto/dispositivo cambiando a fallback y restaurando; verificar forzando la pérdida (fallback < 1 s)
- [ ] 3.6 Pasar a `fallback2d` en sesión si fps < 30 durante 3 s en tier bajo; verificar con CPU throttling 6× y Modo Debug

## 4. Presupuestos de rendimiento

- [ ] 4.1 Crear `scripts/check-bundle.ts` que sume el gzip del JS de primer render por ruta (home, caso, `/heap`, `/motion`) y falle si ≥ 180 KB o incluye librerías 3D/animación diferibles; verificar ejecutándolo sobre `next build`
- [ ] 4.2 Diferir la carga de GSAP, Lenis, el motor 3D y las escenas a después del LCP; verificar en la línea de tiempo de red que esas peticiones empiezan tras el evento LCP
- [ ] 4.3 Auditar handlers de interacción (filtros, AST, Hold-to-Execute, Run GC, drag del Heap, terminal, formulario) y mover a GPU o worker todo trabajo > 50 ms; verificar en el panel Performance que no quedan long tasks en esas interacciones
- [ ] 4.4 Medir INP en filtros, AST, Hold-to-Execute, `/heap`, terminal y formulario con Web Vitals en consola; verificar < 200 ms en móvil emulado
- [ ] 4.5 Revisar Lenis y pins: sin bloqueo de wheel/touch, retroceso libre, teclado (PageDown, Inicio/Fin) y Call Stack funcionando durante pins; verificar manualmente en escritorio y móvil
- [ ] 4.6 Crear script local que recorra las fases en cada tier y lea draw calls y partículas del Modo Debug; verificar < 100 draw calls por escena activa y partículas ≤ 200k/50k/0
- [ ] 4.7 Migrar imágenes a AVIF/WebP con `sizes` y dimensiones reservadas, vídeos a WebM/MP4 con póster y reproducción solo en viewport, y texturas a formato comprimido; verificar en Network con viewport de 390 px
- [ ] 4.8 Configurar fuentes locales con subset, precarga y fallback ajustado; verificar cero peticiones a terceros y CLS de fuentes ≈ 0
- [ ] 4.9 Limitar DPR a 2 en el canvas; verificar con emulación de DPR 3 en Modo Debug
- [ ] 4.10 Ejecutar Lighthouse móvil local en `/es`, `/en`, un caso, `/heap` y `/motion` con todas las capas activas; verificar Perf ≥ 90, A11y/BP/SEO = 100, LCP < 2,5 s, CLS < 0,05 y guardar los informes en `docs/perf/`
- [ ] 4.11 Medir fps en recorrido completo en escritorio de referencia con cada backend; verificar mediana ≥ 58 y documentar en `docs/perf/`

## 5. Accesibilidad

- [ ] 5.1 Revisar landmarks, `h1` único, jerarquía de encabezados y `lang` por locale en todas las rutas; verificar con el árbol de accesibilidad de DevTools
- [ ] 5.2 Implementar skip link y foco visible tipo caret con token `--focus-caret` en ambos temas; verificar contraste ≥ 3:1 del indicador
- [ ] 5.3 Asegurar gestión de foco en terminal, ayuda de atajos y diálogos (atrapar, Escape, retorno de foco); verificar con teclado
- [ ] 5.4 Implementar patrón ARIA `tree` en el AST, cuadrícula navegable con flechas en `/heap` y controles operables por teclado en `/motion` (Replay, velocidad, interruptor de máscara); verificar con teclado y NVDA
- [ ] 5.5 Exponer el progreso de Hold-to-Execute de forma accesible (Enter abre, mantener Espacio ejecuta, anuncio al completar); verificar con NVDA
- [ ] 5.6 Marcar el canvas como `aria-hidden`, comprobar que todo dato de escena y todo texto MSDF tiene equivalente DOM; verificar con NVDA en RUNTIME, GPU y títulos de fase
- [ ] 5.7 Añadir regiones vivas en terminal, resultado del formulario y avisos de logros (educadas, sin robar foco); verificar anuncios con NVDA
- [ ] 5.8 Medir contraste de todos los tokens de texto, acentos y texto sobre liquid glass (Call Stack, terminal, lente del Heap) en ambos temas sobre el fondo más desfavorable y ajustar la opacidad de fondo donde falle; verificar con script de contraste
- [ ] 5.9 Crear script local de auditoría axe sobre página (home, caso, 404, `/heap`, `/motion`) × tema × locale × modo; verificar cero violaciones

## 6. SEO

- [ ] 6.1 Implementar `generateMetadata` por página y locale (home, casos, `/heap`, `/motion`) con canonical y `alternates.languages` (es, en, x-default); verificar inspeccionando el `head`
- [ ] 6.2 Crear `opengraph-image` dinámico por página con estilo de fase y para cada caso con nombre y métrica principal; verificar que devuelve 1200×630
- [ ] 6.3 Añadir JSON-LD `Person` en home y `CreativeWork` por caso generados desde `content/`; verificar con el validador de Schema.org sin errores
- [ ] 6.4 Generar `sitemap` y `robots` desde slugs y rutas públicas (incluidas `/heap` y `/motion`) y marcar la 404 como `noindex` con estado 404; verificar con `curl -I` y el XML del sitemap

## 7. Verificación integral

- [ ] 7.1 Recorrer la matriz completa (full con backend de nueva generación, full con WebGL2, reduced, fallback2d × tema claro/oscuro × es/en) comprobando que la narrativa y el contenido esencial son idénticos; verificar con checklist firmado en `docs/perf/README.md`
