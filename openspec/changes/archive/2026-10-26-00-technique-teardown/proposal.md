## Why

El ADDENDUM v2 (`docs/ADDENDUM-v2.md` §1 y §8.1–8.2) cambia el motor 3D (WebGPU + TSL), introduce un catálogo de transiciones T1–T11 inspirado en referentes externos y exige verificar versiones antes de escribir código. Sin un análisis previo, los changes 01–10 se implementarían sobre suposiciones sobre cómo funcionan esas técnicas, qué versiones son compatibles entre sí y qué fallback tiene cada transición. Este change produce esa base documental y es el «primer entregable» que pide el addendum.

## What Changes

- Nuevo `docs/TECHNIQUE-TEARDOWN.md` (una página): para cada técnica de la tabla del Add. §1, cómo funciona por dentro, cómo se implementa con nuestro stack y en qué fase de COMPILE vive, con la regla explícita de reinterpretar sin copiar diseño, assets, textos ni código.
- Nuevo `docs/MOTION-SPEC.md`: tabla completa T1–T11 con disparador, duración, easing (token), técnica, fallback para reduced motion y fallback para tier bajo / backend WebGL2.
- Nuevo `docs/STACK-VERSIONS.md`: versiones vigentes verificadas en documentación oficial, matriz de compatibilidad y versiones exactas a fijar en `package.json` (las consume el change 01).
- Enlaces a los tres documentos desde `docs/ROADMAP.md`.

## Capabilities

### New Capabilities
<!-- Ninguna: este change solo produce documentación de planificación técnica. -->

### Modified Capabilities
<!-- Ninguna. El change declara `skip_specs: true` porque no modifica comportamiento observable del sitio. -->

## Impact

- Depende de: ninguno (fuente: `docs/ADDENDUM-v2.md` §0, §1, §2, §4, §8.1–8.2). Es prerrequisito de `01-foundation-design-system` (versiones exactas) y de `03`, `04`, `05`, `08` (catálogo T1–T11).
- Solo crea archivos en `docs/`; no hay código, dependencias ni despliegue.
