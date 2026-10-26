## Why

Tras los changes 01 (fundación) y 02 (secciones estáticas) el sitio es funcional y accesible, pero aún no cuenta la historia «COMPILE»: la línea de código no viaja por el pipeline. Este change añade el sistema de movimiento, la puerta de arranque y la capa DOM/SVG de las transiciones entre fases que convierten el contenido estático en la narrativa token → nodo → instrucción → proceso → píxel (docs/BRIEF.md §1, §2.0–2.9 y §5; docs/ADDENDUM-v2.md §2, §4 y §7).

Con el addendum, la versión principal de las transiciones T2–T5, T8 y T9 vive en el canvas persistente (change 04). Este change entrega el reloj y la señal de scroll que ese canvas consumirá, y la versión DOM/SVG de cada transición, que actúa como fallback en tier bajo, sin WebGL o con movimiento reducido.

Depende de: `00-technique-teardown` (tabla de especificación de movimiento T1–T11 en `docs/MOTION-SPEC.md` y versiones verificadas), `01-foundation-design-system` y `02-static-semantic-sections` (orden de la sección 12, paso 3).

## What Changes

- Sistema de movimiento: tokens de easing, duraciones y stagger (§5) expuestos como design tokens; un único reloj de frame compartido por el scroll suave, las animaciones y el futuro render 3D; velocidad de scroll expuesta como señal global acotada; cero scroll-jacking (pinning permitido, el usuario controla velocidad y dirección); librerías de animación cargadas después del LCP; efectos ligeros solo-DOM con animaciones de scroll nativas de CSS cuando el navegador las soporta; reglas coreográficas verificables (solo transform/opacity/filter, máximo 3 focos, limpieza al desmontar).
- **T1 · Puerta de arranque (BOOT)**: logs POST con progreso real, letras de COMPILE escalonadas con resorte, dos opciones "▶ Iniciar con sonido" / "Iniciar en silencio" que desbloquean el audio y se recuerdan en la sesión, colapso CRT hacia el cursor del Hero, fallback con fundido. La puerta nunca bloquea a lectores de pantalla, a usuarios sin JS ni a la Vista Rápida.
- Transiciones de fase: fase activa derivada del scroll, color de acento interpolado y tinte de fondo al 4-6 %, versión DOM/SVG (fallback) de T2, T3, T4, T5, T8 y T9 y glitch DOM del título de fase (T11) < 300 ms solo en cambios de fase. Cada transición referencia su fila de `docs/MOTION-SPEC.md`.
- **T7 · Cambio de layout** en Proyectos: alternar Grid / Lista con reacomodo FLIP (la opción Heap la añade el change 07).
- Capas de animación progresiva en cada sección existente: tecleo/autocompletado del Hero, contadores del Lexer, ramas y trazas del AST, program counter del Bytecode, FLIP/tilt/video de Proyectos, flip de tarjetas del Laboratorio, paquete de red del Contacto y glitch del 404.
- Fuera de alcance: versión en canvas de T2–T5, T8, T9 y glitch SDF de T11 (change `04-webgl-scenes`); Hold-to-Execute y T10 (change 05); diseño sonoro (change 06, que consume la elección de la puerta); vista Heap (change 07); versión reduced-motion completa (change 09; aquí solo se garantiza que nada se rompe sin animación y que cada transición tiene su fallback).

## Capabilities

### New Capabilities
- `motion-system`: tokens de movimiento, reloj de frame único, scroll suave sin scroll-jacking, señal de velocidad de scroll, carga diferida, reglas coreográficas y ciclo de vida/limpieza de animaciones.
- `boot-sequence`: puerta de arranque T1 con progreso real, elección con/sin sonido recordada por sesión, versión corta, salida CRT hacia el Hero y garantías de no bloqueo.
- `phase-transitions`: detección de fase activa, interpolación de color por fase, versión DOM/SVG (fallback) de las transiciones entre fases y glitch del título de fase.

### Modified Capabilities
<!-- Se usan ADDED Requirements en estas rutas (capabilities introducidas por el change 02, aún no archivado). -->
- `hero-section`: tecleo con autocompletado tipo IDE como capa progresiva sobre el contenido SSR.
- `about-section`: contadores animados que arrancan al entrar en viewport.
- `skills-section`: ramas con trazo animado, nodos con resorte, drag en escritorio y trazas de luz hacia proyectos.
- `experience-section`: program counter que avanza con el scroll y registros que se actualizan por función.
- `projects-section`: reordenado FLIP al filtrar, cambio de layout Grid/Lista (T7), tilt 3D con reflejo especular y video solo en viewport.
- `lab-section`: giro 180° de la tarjeta al pulsar "</> Ver código".
- `contact-section`: animación de paquete de red con respuestas `200 OK` / `500`.
- `not-found-page`: glitch y volcado hexadecimal animados.

## Impact

- Código: nuevos módulos en `motion/` (tokens, reloj, señal de velocidad, timelines, transiciones fallback, hooks como `useScrollPhase`), componente de boot en `components/phases/Boot`, hooks de coreografía por fase en `components/phases/*`; `styles/tokens.css` amplía tokens de movimiento y de color de fase activa.
- Estado global: el store añade fase activa, estado de boot y elección de sonido de la puerta; la velocidad y el progreso de scroll se exponen fuera de React.
- Dependencias: GSAP 3 (ScrollTrigger, SplitText, Flip, DrawSVG, MorphSVG, CustomEase, Observer), Lenis, Motion, en las versiones exactas fijadas por el change 00.
- Contratos para otros changes: reloj único y señal de velocidad (04, 06), elección de sonido (06), fallbacks DOM/SVG por transición (04, 09), opción de layout Heap (07), registro de transiciones reproducibles (08).
- Rendimiento: el JS de animación se carga después del LCP y fuera del presupuesto inicial (< 180 KB gzip); no bloquea el contenido SSR ni las interacciones (INP < 200 ms).
