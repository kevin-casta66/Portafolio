## Context

Motivación en proposal.md. Este change se apoya en piezas que definen los changes 00–06 y no las reimplementa:

- **04**: canvas persistente único, registro de escenas con renderizado selectivo, gemelos DOM↔WebGL, tiers de calidad con cambio en caliente, `dispose` estricto.
- **05**: interacción Hold-to-Execute y transición al caso de estudio.
- **06**: material/capability `liquid-glass`, sistema de logros, cursor contextual, registro de comandos de la terminal, Modo Debug (stats-gl).
- **03**: tokens de movimiento, reloj único (ticker de GSAP), Flip.

Restricciones: shaders solo TSL/NodeMaterial; presupuesto < 100 draw calls por escena; JS inicial del home intacto; contenido completo en el DOM.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad (lista DOM SSR) de la que derivan la cuadrícula 3D, la cuadrícula 2D y la lista accesible.
- Coste de render constante respecto al número de bloques (instancing).
- Paridad de funcionalidad entre ratón, teclado, táctil, reduced motion y sin WebGL.

**Non-Goals:**
- Física real entre bloques (choques, apilamiento): solo inercia de cámara/desplazamiento.
- Edición de contenido o filtros más allá de los dos criterios de «Run GC».
- Persistir posición de arrastre entre visitas.

## Decisions

### D1. Ruta propia con lista SSR como fuente de verdad
`app/[locale]/heap/page.tsx` es un Server Component que genera una `<ul>` con todos los bloques (proyectos + experimentos) y sus enlaces. La capa 3D y la cuadrícula 2D se montan encima como islas cliente que leen los mismos datos serializados.
*Alternativa*: renderizar solo en canvas y generar un equivalente oculto. Descartada: duplica la fuente de verdad y empeora SEO y no-JS.

### D2. Direcciones hexadecimales deterministas
`lib/heap/address.ts` calcula `0x` + 8 dígitos a partir de un hash estable (FNV-1a 32 bits) del `id` del elemento, alineado a 16 bytes para que «parezca» una dirección real. Si hay colisión se aplica sondeo lineal en orden de `id`, y un test de integridad en build verifica unicidad.
*Alternativa*: índice incremental. Descartada: cambia al reordenar o añadir contenido.

### D3. Layout como función pura
`lib/heap/layout.ts` recibe bloques y criterio (`none | tech | year`) y devuelve posiciones de celda y etiquetas de grupo. La misma función alimenta la cuadrícula 3D, la 2D y el orden de la lista; por eso «Run GC» y la lista siempre coinciden. Para el criterio `tech`, un proyecto con varias tecnologías se coloca en el grupo de su tecnología principal (primera de su stack) para mantener «exactamente una vez».
*Alternativa*: duplicar bloques en cada grupo. Descartada: rompe el requisito de unicidad y confunde la navegación por teclado.

### D4. Cuadrícula infinita con instancing y envoltura modular
Los bloques se dibujan con un único `InstancedMesh` (o `instancedArray` TSL) más un segundo para etiquetas MSDF de dirección, total ≈ 3–6 draw calls. La «infinitud» se consigue envolviendo el offset de desplazamiento módulo el tamaño del tile de contenido en el vertex node (TSL), de forma que el número de instancias es `bloques × copias visibles` acotado y constante.
*Alternativa*: crear meshes por bloque y reciclarlos. Descartada: escala draw calls con el contenido.

### D5. Arrastre e inercia con Observer y el reloj único
Entrada vía GSAP Observer (pointer, touch, wheel) con umbral de 6 px para distinguir clic de arrastre. La velocidad se integra en el ticker de GSAP con fricción exponencial; el mismo ticker hace avanzar Lenis y R3F (sin rAF propio). `touch-action: none` solo dentro del área del heap.
*Alternativa*: Draggable + InertiaPlugin. Viable; se prefiere Observer para no añadir un plugin más al chunk y controlar la envoltura modular.

### D6. Lente de liquid glass reutilizando la capability de 06
La lente es un plano en espacio de pantalla con el nodo de refracción de `liquid-glass` (06) que muestrea el render target de la escena del heap y aplica magnificación radial. Se monta solo si `tier ∈ {medium, high}`, puntero `fine` y sin reduced motion; se suscribe al store de calidad para desmontarse en caliente.

### D7. «Run GC» con interpolación de instancias y Flip en DOM
El layout destino se calcula con D3; en 3D cada instancia interpola de su posición anterior a la nueva con un atributo `progress` animado por GSAP (stagger 60–80 ms, ease quart in-out). En 2D/lista se usa Flip; con reduced motion, fundido. El criterio se guarda en `?gc=tech|year`. Un `aria-live="polite"` anuncia el resultado.

### D8. Teclado: patrón grid con roving tabindex
La cuadrícula expone `role="grid"` con filas/celdas lógicas derivadas de D3 y roving tabindex. Flechas mueven el foco; el desplazamiento de la cámara se anima para centrar el bloque enfocado (instantáneo con reduced motion). Inicio/Fin, Enter, Espacio sostenido (Hold-to-Execute de 05). La lista accesible (D1) es siempre el contenido real; el conmutador «Ver como lista» la hace visible y oculta la cuadrícula con `hidden`, preferencia en `sessionStorage`.

### D9. Modo Heap desde RUNTIME (T7) con gemelos
El conmutador Grid / Lista / Heap de RUNTIME, al elegir Heap, ejecuta en el home la parte de la transición: los gemelos WebGL de las tarjetas (04) interpolan su rect DOM → posición de bloque calculada por D3 y, al terminar, se navega con `router.push('/<locale>/heap')`. Como el canvas persiste entre rutas, la escena del heap toma esas mismas instancias como estado inicial, de modo que no hay corte. `history` conserva el scroll del home (scroll restoration de 05).
*Alternativa*: View Transitions de documento. Descartada por el addendum: las transiciones cinematográficas viven en el canvas.

### D10. Carga diferida y registro de escena
`webgl/scenes/heap` se importa dinámicamente solo en `/heap` o al pulsar Heap; se registra en el registro de escenas con rango «ruta completa» y libera geometrías, texturas y render targets al salir. El logro `heap_explorer` se emite en el montaje de la página vía la API de logros de 06 (idempotente).

## Risks / Trade-offs

- [Cuadrícula infinita desorienta en teclado] → el foco está acotado a los bloques reales (no a copias), se muestra «bloque N de M» y Inicio/Fin.
- [Lente de vidrio cara en GPUs medias] → resolución del render target a 0,5× en tier medio; se desactiva al detectar caída de FPS.
- [Agrupar por tecnología oculta otras tecnologías del proyecto] → cada bloque sigue listando todo su stack; la etiqueta de grupo indica «principal».
- [Arrastre en móvil compite con el scroll de página] → el heap ocupa el viewport en su ruta y en el home solo se activa en modo Heap; fuera de su área el scroll es nativo.
- [Continuidad T7 falla si el chunk del heap aún no cargó] → precarga al hover/focus del botón Heap; si no está listo, la transición corta (fundido) sigue siendo continua visualmente.

## Migration Plan

Aditivo: ruta y escena nuevas. Rollback retirando la opción Heap del conmutador y la ruta del sitemap; no afecta al resto del sitio.

## Open Questions

- Número máximo de copias visibles de la cuadrícula por tier (afecta solo a ajuste fino del presupuesto, no a specs ni tareas).
