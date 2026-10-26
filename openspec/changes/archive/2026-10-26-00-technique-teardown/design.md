## Context

Proyecto greenfield: solo existen `docs/` y `openspec/`. Ver proposal.md - Why. El addendum fija el stack 3D (three/webgpu, TSL, compute, PostProcessing de three/webgpu, MSDF) pero no sus versiones, y algunas piezas (fábrica asíncrona de `gl` en R3F, `<ViewTransition>` experimental en Next.js) dependen mucho de la versión.

## Goals / Non-Goals

**Goals:**
- Que cada técnica del Add. §1 tenga una explicación interna, un plan de implementación con nuestro stack y una fase asignada antes de tocar código.
- Que T1–T11 tengan una especificación de movimiento única que los changes 03, 04, 05 y 08 citen en lugar de redefinirla.
- Que `package.json` del change 01 se escriba con versiones exactas verificadas, no supuestas.

**Non-Goals:**
- Prototipos de las transiciones (los hace el change 04, y el 08 los expone en `/motion`).
- Implementar o instalar dependencias.

## Decisions

1. **Tres documentos separados, no uno**: el teardown es narrativo (una página), la tabla de movimiento es una referencia tabular que se consulta durante la implementación, y las versiones cambian con más frecuencia que el resto. Separarlos evita reescribir todo al actualizar una versión. Alternativa: un único documento largo → difícil de mantener y de citar.
2. **Fuentes solo oficiales para versiones**: changelogs y docs de cada proyecto (threejs.org / releases de GitHub, docs de R3F, gsap.com, nextjs.org, tailwindcss.com, next-intl, rapier.rs, etc.) y `npm view <pkg> version` para confirmar. Cada fila registra la fecha de verificación y el enlace. Alternativa: tomar la última versión de npm sin leer notas → riesgo de incompatibilidades (p. ej. R3F vs React, three vs Drei).
3. **Matriz de compatibilidad explícita**: pares críticos (React ↔ Next, React ↔ R3F, three ↔ R3F ↔ Drei, Lenis ↔ GSAP ScrollTrigger, Tailwind v4 ↔ PostCSS/Next, next-intl ↔ Next). Si un par es incompatible, se documenta la versión anterior estable elegida y el motivo.
4. **Easing y duración de T1–T11 referenciados por token** (`--ease-out-expo`, `--dur-scene`…) en lugar de valores sueltos, para que la tabla siga siendo válida si se ajusta un token.
5. **Doble fallback por transición**: columna de reduced motion (sin transformaciones, fundidos) y columna de tier bajo / WebGL2 (sin compute ni bloom). Así el change 09 puede verificar ambos caminos por separado.
6. **Regla de originalidad** como sección fija del teardown: qué se toma de cada referente (la técnica) y qué no (diseño, assets, textos, código), con la reinterpretación COMPILE concreta.

## Risks / Trade-offs

- [Las versiones quedan obsoletas pronto] → el documento incluye fecha de verificación y el comando para revalidar; el change 10 vuelve a revisarlas antes del despliegue.
- [Una técnica de referencia no se puede inspeccionar a fondo] → describir el mecanismo general conocido y marcar la suposición; no copiar código de terceros para «verlo».
- [La tabla T1–T11 diverge de la implementación] → los changes 03/04/05 deben actualizar `MOTION-SPEC.md` si cambian un valor (regla anotada en el documento).

## Open Questions

- Si `<ViewTransition>` sigue tras flag experimental en la versión estable de Next.js vigente; la respuesta solo cambia la fila T10 (siempre hay fallback a Flip).
