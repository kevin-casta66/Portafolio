## 1. Infraestructura de movimiento

- [x] 1.1 Instalar `gsap`, `@gsap/react`, `lenis` y `motion` con las versiones exactas fijadas por el change 00 (sin rangos `^`/`~`); verificar que `npm run build` compila y que `package.json` fija versiones exactas
- [x] 1.2 Crear `motion/tokens.ts` (easings, duraciones, stagger, spring) y generar las custom properties de movimiento en `styles/tokens.css`; verificar con un test unitario que los valores TS y CSS coinciden
- [x] 1.3 Registrar plugins GSAP (ScrollTrigger, SplitText, Flip, DrawSVG, MorphSVG, CustomEase, Observer) y crear los `CustomEase` con los nombres de los tokens en `motion/gsap.ts`; verificar en un componente de prueba que `ease: "inExpo"` resuelve
- [x] 1.4 Añadir regla de lint que prohíba literales `cubic-bezier` y duraciones numéricas de animación fuera de `motion/`; verificar que `npm run lint` falla con un caso de prueba y pasa sin él
- [x] 1.5 Crear `motion/clock.ts` sobre `gsap.ticker` (con `subscribe(cb, priority)` y `lagSmoothing(0)`) y `SmoothScrollProvider` con Lenis `autoRaf: false` avanzado desde el reloj y `ScrollTrigger.update` en scroll; verificar en un perfil de Performance que hay una sola cadena rAF por frame
- [x] 1.6 Verificar cero scroll-jacking: anclas, teclado (Espacio/AvPág/flechas), find-in-page y gesto táctil nativo funcionan; un pin de prueba se detiene al soltar el scroll
- [x] 1.7 Crear `motion/velocity.ts` (velocidad normalizada, acotada a [-1, 1], amortiguada, 0 con reduced motion, fuera de React); verificar con test unitario de la función de normalización/amortiguación y con un overlay temporal que vuelve a 0 en reposo
- [ ] 1.8 Montar `MotionProvider` con import dinámico tras el LCP (`requestIdleCallback` después de LCP); verificar en Lighthouse móvil que los chunks de animación se solicitan después del LCP y que el JS inicial sigue < 180 KB gzip
- [x] 1.9 Implementar efectos ligeros (barra de progreso de lectura y revelados sutiles) con `animation-timeline` dentro de `@supports`; verificar en un navegador sin soporte que se ven en estado final
- [x] 1.10 Añadir script inline que pone `js-motion` en `<html>` y documentar la convención de estados iniciales solo vía JS; verificar con JS desactivado que todo el contenido es visible

## 2. Fase activa y color

- [x] 2.1 Ampliar el store con `phase`, `bootDone`, `soundChoice` y crear `useScrollPhase` (un ScrollTrigger por sección, progreso fuera de React); verificar con test de componente que la fase cambia al hacer scroll y que cargar con `#projects` arranca en RUNTIME
- [x] 2.2 Implementar interpolación OKLCH del acento y tinte de fondo (alfa 4-6 %) escribiendo `--accent-active`/`--accent-tint` con `quickSetter`; verificar visualmente en ambos temas y que React no re-renderiza durante el scroll (React Profiler)
- [x] 2.3 Implementar el gradiente espectral de DISPLAY como acento final; verificar visualmente al llegar a Contacto

## 3. Puerta de arranque (T1)

- [x] 3.1 Crear `bootRegistry` (track de promesas con etiqueta) y registrar fuentes, imágenes críticas y conteo de proyectos; verificar con test unitario el cálculo de progreso
- [x] 3.2 Construir el overlay `BootGate` con líneas `[ OK ]`, letras de COMPILE escalonadas con resorte (`aria-label` único) y "Saltar ⏎" visible en el primer frame; verificar con throttling de red que los logs terminan a ≤ 2,5 s y que Enter cierra en silencio al instante
- [x] 3.3 Añadir las opciones "▶ Iniciar con sonido" / "Iniciar en silencio" con `audioUnlock()` en el gesto, guardando `soundChoice` en store y `sessionStorage` (try/catch); verificar que "con sonido" deja el `AudioContext` en estado `running` y "en silencio" no crea ninguno
- [x] 3.4 Implementar las garantías de no bloqueo: skip link, Vista Rápida y CV operables por encima, cierre en silencio con scroll/Escape, sin puerta con `?view=quick`, hash de sección, otras rutas o sin JS; verificar cada caso manualmente y con un lector de pantalla (NVDA/VoiceOver) que el Hero es alcanzable sin elegir
- [x] 3.5 Implementar la versión corta de 400 ms sin opciones en visitas posteriores de la sesión; verificar recargando en la misma sesión y en modo privado con almacenamiento bloqueado (puerta completa sin errores)
- [x] 3.6 Implementar la salida CRT (línea → punto) que se convierte en el cursor del Hero y la variante reducida (sin resorte, fundido); verificar visualmente ambas
- [ ] 3.7 Verificar que el LCP no empeora respecto al change 02 (Lighthouse móvil) y que la fila T1 de `docs/MOTION-SPEC.md` coincide con lo implementado

## 4. Coreografías por sección

- [ ] 4.1 Hero: tecleo con SplitText (30-40 ms/carácter) y popup de autocompletado que elige `Developer`, con `aria-label` y fragmentos `aria-hidden`; verificar con lector de pantalla que se lee una sola vez y con JS retrasado que el texto está desde el inicio
- [x] 4.2 Lexer: entrada de tokens a carriles con stagger 60-80 ms y contadores `number` al entrar en viewport con valor final en el DOM; verificar que no arrancan fuera de viewport
- [x] 4.3 Parser: ramas con DrawSVG, nodos con spring, drag con inercia en escritorio (Observer) y expansión animada en móvil; verificar navegación por flechas manteniendo el nodo visible
- [x] 4.4 Parser: trazas de luz hacia proyectos al seleccionar una hoja y reversión con Escape; verificar con la hoja "React" de los datos de ejemplo
- [x] 4.5 Bytecode: program counter scrubbed y registros que cambian por función; verificar avance y retroceso
- [x] 4.6 Runtime: Flip al filtrar con foco conservado, tilt 3D + reflejo especular solo con puntero fino, video play/pause por viewport con póster de error; verificar los tres comportamientos y el CLS
- [x] 4.7 Runtime (T7): control de layout Grid/Lista accesible (grupo de radio) con reacomodo Flip que conserva filtro y foco, extensible a nuevas opciones; verificar con teclado, lector de pantalla y CLS < 0,05
- [x] 4.8 Lab: flip 180° de "</> Ver código" con gestión de foco e `inert` en la cara oculta; verificar con teclado
- [x] 4.9 Display: animación de paquete de red ligada al resultado real (200/500, mínimo de recorrido ≤ 700 ms de retraso) con `aria-live`; verificar simulando éxito y error del Server Action
- [x] 4.10 404: glitch < 300 ms y volcado hexadecimal progresivo `aria-hidden`; verificar que el botón "Reiniciar proceso" funciona desde el primer render

## 5. Transiciones entre fases (versión DOM/SVG y reducida)

- [x] 5.1 Crear `motion/transitions/catalog.ts` a partir de `docs/MOTION-SPEC.md`, el contrato `{ id, dom, reduced }`, el selector de variante y el registro `replay(progress)`; verificar con tests unitarios la selección según tier, soporte gráfico y reduced motion
- [x] 5.2 T2 SOURCE → LEXER: fragmentación en tokens coloreados con profundidad por escala, scrubbed; variante reducida con fundido escalonado; verificar al 50 % y al retroceder
- [x] 5.3 T3 LEXER → PARSER: Flip de tokens a nodos y ramas SVG con trazo; verificar que al terminar los nodos coinciden con el árbol interactivo
- [x] 5.4 T4 PARSER → BYTECODE: colapso post-order hasta la lista vertical con revelado por función; verificar el orden con un test unitario del recorrido y visualmente
- [x] 5.5 T5 BYTECODE → RUNTIME: barrido con máscara de dithering Bayer (SVG) teñida de ámbar y tarjetas encendiéndose en orden; verificar recorrido y retroceso
- [x] 5.6 T8 RUNTIME → GPU: pixelado progresivo del chip por rejilla SVG hasta malla de vértices y aristas; verificar al 50 % de la transición
- [x] 5.7 T9 GPU → DISPLAY: celdas que convergen al marco del monitor con aparición del gradiente espectral; verificar el estado final
- [x] 5.8 T11 glitch DOM del título de fase (< 300 ms, sin repetición por fase, desactivado con reduced motion); verificar con medición en el panel de rendimiento
- [x] 5.9 Verificar cambio de variante a mitad de recorrido simulando que la escena "queda lista" en LEXER (flag de prueba): la transición en curso termina sin saltos
- [x] 5.10 Variantes móviles simplificadas vía `matchMedia`; verificar en viewport 375 px

## 6. Verificación transversal

- [x] 6.1 Escribir `motion/README.md` con el inventario coreográfico (id T1–T11, dato transformado, propiedades, foco); verificar que ninguna entrada supera 3 focos simultáneos y que todas las filas de la tabla de movimiento asignadas a este change tienen implementación
- [x] 6.2 Auditar que solo se animan transform/opacity/filter/trazo SVG/máscara; verificar con el panel Performance (sin layout forzado) y CLS < 0,05 en Lighthouse
- [x] 6.3 Verificar INP < 200 ms haciendo clic en CTAs y filtros durante transiciones (Web Vitals en consola, CPU 4x throttling)
- [x] 6.4 Verificar limpieza: navegar home ↔ caso de estudio 10 veces y comprobar `ScrollTrigger.getAll().length` estable, un único listener del ticker por suscriptor y consola sin errores
- [x] 6.5 Verificar con el bundle de animación bloqueado (DevTools request blocking) que todo el contenido es legible y operable y que no aparece la puerta
