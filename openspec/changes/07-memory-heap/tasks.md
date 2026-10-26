## 1. Modelo y utilidades del heap

- [ ] 1.1 Crear `lib/heap/address.ts` (hash FNV-1a del `id`, alineado a 16 bytes, sondeo ante colisiones) y verificar con test unitario que las direcciones son estables entre ejecuciones y únicas para todo el contenido actual
- [ ] 1.2 Crear `lib/heap/blocks.ts` que une proyectos y experimentos en una lista de bloques tipados y verificar con test que cada elemento aparece exactamente una vez
- [ ] 1.3 Crear `lib/heap/layout.ts` (función pura `none | tech | year` → celdas y etiquetas de grupo) y verificar con tests que ambos criterios cubren todos los bloques sin duplicarlos
- [ ] 1.4 Añadir al chequeo de integridad de contenido (change 01) la validación de unicidad de direcciones y verificar que el build falla con una colisión forzada en un fixture

## 2. Ruta y contenido SSR

- [ ] 2.1 Crear `app/[locale]/heap/page.tsx` como Server Component con encabezado, total de bloques y `<ul>` accesible con dirección, tipo, nombre, año, tecnologías y enlace; verificar con JS desactivado en `/es/heap` y `/en/heap`
- [ ] 2.2 Añadir textos de interfaz del heap a los mensajes i18n es/en y verificar que no quedan cadenas sin traducir en `/en/heap`
- [ ] 2.3 Definir metadatos (título, descripción, canonical, hreflang, OG) y añadir la ruta al sitemap; verificar inspeccionando el `<head>` y `sitemap.xml`
- [ ] 2.4 Resolver destinos de apertura (caso de estudio, demo o experimento del laboratorio) y verificar que ningún enlace del heap devuelve 404

## 3. Cuadrícula 2D, teclado y Run GC (sin WebGL)

- [ ] 3.1 Implementar la cuadrícula 2D (`components/heap/HeapGrid`) con `role="grid"`, roving tabindex, flechas, Inicio/Fin y Enter; verificar navegando solo con teclado y con foco visible
- [ ] 3.2 Implementar el conmutador «Ver como lista» con preferencia en `sessionStorage`; verificar que sobrevive a recarga en la misma sesión
- [ ] 3.3 Implementar «Run GC» (criterio tecnología/año, estado en `?gc=`, Flip en DOM, fundido con reduced motion, anuncio `aria-live`); verificar el orden resultante en lista y cuadrícula y el anuncio con un lector de pantalla
- [ ] 3.4 Integrar Hold-to-Execute y clic/Enter del change 05 en los bloques 2D; verificar apertura corta, hold completo con puntero y con Espacio, y cancelación al soltar antes

## 4. Escena 3D del heap

- [ ] 4.1 Crear `webgl/scenes/heap` con carga dinámica y registro en el registro de escenas; verificar en la pestaña de red que el home no descarga el chunk
- [ ] 4.2 Dibujar los bloques con instancing y etiquetas de dirección MSDF (material TSL) con envoltura modular infinita; verificar en Modo Debug < 100 draw calls con todos los bloques
- [ ] 4.3 Implementar arrastre e inercia con Observer sobre el ticker único (umbral clic/arrastre 6 px, `touch-action` acotado); verificar con ratón, trackpad y táctil (emulación y dispositivo real) que no bloquea el scroll fuera del heap
- [ ] 4.4 Sincronizar foco de teclado ↔ cámara (centrar bloque enfocado, instantáneo con reduced motion) y verificar que el bloque enfocado siempre es visible
- [ ] 4.5 Animar «Run GC» en 3D interpolando instancias (stagger 60–80 ms, quart in-out) desde el layout de 1.3; verificar que coincide con el orden de la lista
- [ ] 4.6 Implementar `dispose` al salir de la ruta y verificar en Modo Debug que geometrías, texturas y render targets vuelven a su conteo previo

## 5. Lente de liquid glass

- [ ] 5.1 Montar la lente con el nodo de refracción de `liquid-glass` (06) sobre el render target del heap, solo en tier medio/alto, puntero fino y sin reduced motion; verificar visualmente ampliación y refracción
- [ ] 5.2 Suscribir la lente al store de calidad para desmontarla en caliente; verificar forzando tier bajo desde Modo Debug sin recargar
- [ ] 5.3 Verificar contraste AA del texto sobre la lente en ambos temas con la herramienta de contraste del change 01

## 6. Integración con RUNTIME, logros y sistemas globales

- [ ] 6.1 Añadir la opción Heap al conmutador Grid / Lista / Heap de RUNTIME con transición de gemelos tarjeta → bloque y navegación a `/<locale>/heap`; verificar grabando la transición que no hay cortes ni saltos
- [ ] 6.2 Precargar el chunk del heap al hover/focus del botón Heap y verificar en red que se solicita antes del clic
- [ ] 6.3 Verificar que el botón atrás vuelve a RUNTIME con layout y scroll restaurados
- [ ] 6.4 Emitir el logro `heap_explorer` al entrar por primera vez y verificar que no se repite en visitas posteriores
- [ ] 6.5 Registrar el comando `heap` en la terminal y la entrada en el Call Stack (cuando la ruta está activa); verificar que `heap` navega a la ruta

## 7. Fallbacks y verificación integral

- [ ] 7.1 Verificar con reduced motion: cuadrícula estática, sin inercia ni lente, «Run GC» con fundido
- [ ] 7.2 Verificar sin WebGL (getContext anulado) que se muestra la cuadrícula 2D completa sin errores visibles en consola
- [ ] 7.3 Ejecutar auditoría a11y automatizada sobre `/es/heap` y `/en/heap` y verificar cero violaciones
- [ ] 7.4 Medir INP durante arrastre y «Run GC» en perfil móvil y verificar < 200 ms
