## 1. Verificación de versiones (docs/STACK-VERSIONS.md)

- [x] 1.1 Consultar documentación oficial y `npm view <pkg> version` de next, react, react-dom, typescript, tailwindcss v4, next-intl, zustand, zod, motion, gsap, lenis, three, @react-three/fiber, @react-three/drei, @dimforge/rapier3d-compat, stats-gl, tweakpane, detect-gpu, react-hook-form, resend, @next/mdx/MDX, shiki, playwright, @lhci/cli; verificar que cada fila tiene versión, enlace a la fuente y fecha
- [x] 1.2 Comprobar que la versión de three expone `three/webgpu` (WebGPURenderer con fallback WebGL2, PostProcessing, TSL y compute) y anotar las APIs exactas a usar; verificar con un enlace a la doc o al changelog que lo confirma
- [x] 1.3 Comprobar cómo la versión de R3F elegida acepta una fábrica asíncrona de `gl` que crea `WebGPURenderer` y espera `init()`; verificar con el fragmento de doc/issue oficial citado en el documento
- [x] 1.4 Comprobar el estado de React `<ViewTransition>` y su flag en la versión de Next.js elegida; verificar anotando si es estable o experimental y el nombre exacto del flag
- [x] 1.5 Redactar la matriz de compatibilidad (React↔Next, React↔R3F, three↔R3F↔Drei, Lenis↔GSAP, Tailwind v4↔Next, next-intl↔Next) y la lista final de versiones exactas; verificar que no hay conflictos de peer dependencies con un `npm install --dry-run` en una carpeta temporal del scratchpad

## 2. Technique Teardown (docs/TECHNIQUE-TEARDOWN.md)

- [x] 2.1 Redactar una entrada por técnica del Add. §1 (puerta con/sin sonido, letras escalonadas, Click & Hold, grid infinito arrastrable, filtros, hotspots de partículas, UI en WebGL con texto SDF/MSDF, glitch por shader, fluidos, TSL con WebGPU y fallback, logros, diseño sonoro, render selectivo por scroll, transiciones pantalla vs. superficie, física + postpro cinematográfico, transiciones persistentes con seguimiento del DOM, Gommage, liquid glass, tubos GPU, túnel infinito, dithering); verificar que cada entrada tiene «cómo funciona», «cómo lo haremos» y «fase»
- [x] 2.2 Añadir la sección «Reinterpretar, no copiar» con, por referente, qué se toma y la reinterpretación COMPILE; verificar que ningún asset, texto o fragmento de código de terceros aparece en el documento
- [ ] 2.3 Mantener el documento en una página (≈ 1 pantalla impresa A4 por cara, tablas compactas); verificar exportando a PDF desde el navegador que no supera 2 caras

## 3. Especificación de movimiento (docs/MOTION-SPEC.md)

- [x] 3.1 Redactar la tabla T1–T11 con columnas: disparador, duración, easing (token), técnica, fase/change que la implementa, fallback reduced motion, fallback tier bajo/WebGL2; verificar que las 11 filas tienen todas las columnas completas
- [x] 3.2 Añadir los tokens de movimiento base del Brief §5 (easings, duraciones, springs, staggers) como referencia y la regla «si cambias un valor en código, actualiza esta tabla»; verificar que todos los easings de la tabla existen en esa lista
- [x] 3.3 Añadir, por transición, la descripción de la máscara o render target que usa por dentro (la consumirá el interruptor de `/motion` en el change 08); verificar que T2, T5, T6, T8 y T9 la describen

## 4. Cierre

- [x] 4.1 Enlazar los tres documentos desde `docs/ROADMAP.md`; verificar que los enlaces relativos abren
- [x] 4.2 Revisar que el change 01 puede leer de `docs/STACK-VERSIONS.md` la lista de versiones exactas sin ambigüedad; verificar que no hay rangos (`^`, `~`) en la lista final
