# Roadmap OpenSpec — «Portafolio»

Fuentes: [BRIEF.md](./BRIEF.md) y [ADDENDUM-v2.md](./ADDENDUM-v2.md) (el addendum manda en motor 3D,
shaders, postprocesado, transiciones e interacciones). Implementa y archiva **en orden**: cada change
asume que los anteriores ya están aplicados.

Documentos de referencia (change 00): [TECHNIQUE-TEARDOWN.md](./TECHNIQUE-TEARDOWN.md) · [MOTION-SPEC.md](./MOTION-SPEC.md) (T1–T11) · [STACK-VERSIONS.md](./STACK-VERSIONS.md) (versiones exactas).

| # | Change | Fuente | Capabilities (specs) |
|---|--------|--------|----------------------|
| 0 | `00-technique-teardown` | Add. §1, §2, §4, §8.1–8.2 | — (solo documentación: Technique Teardown, tabla T1–T11, versiones verificadas) |
| 1 | `01-foundation-design-system` | Brief §4, §7, §8, §11 · Add. §0, §2 | `design-tokens`, `typography`, `theming`, `app-shell`, `content-model` |
| 2 | `02-static-semantic-sections` | Brief §2.1–2.5, §2.7–2.9, §6 | `hero-section`, `about-section`, `skills-section`, `experience-section`, `projects-section`, `lab-section`, `contact-section`, `not-found-page` |
| 3 | `03-scroll-choreography` | Brief §2.0, §5 · Add. §2, §4 (T1, T7 DOM, T11 DOM), §7 | `motion-system`, `boot-sequence`, `phase-transitions` (+ ADDED en secciones) |
| 4 | `04-webgl-scenes` | Brief §8, §9 · Add. §2, §3, §4 (T2–T5, T8, T9, T11), §5 | `webgl-runtime`, `adaptive-quality`, `webgl-scenes`, `lab-experiments`, `scene-transitions`, `webgl-text` |
| 5 | `05-case-studies-view-transitions` | Brief §2.6 · Add. §2, §4 (T6, T10), §5 Hold-to-Execute | `case-study-pages`, `page-transitions`, `hold-to-execute` |
| 6 | `06-global-systems` | Brief §3 · Add. §2 (debug), §5 (logros, sonido, liquid glass) | `call-stack-navigation`, `terminal`, `debug-mode`, `quick-view`, `custom-cursor`, `magnetic-buttons`, `sound`, `keyboard-shortcuts`, `achievements`, `liquid-glass` |
| 7 | `07-memory-heap` | Add. §4 (T7), §5 Memory Heap | `memory-heap` |
| 8 | `08-motion-showcase` | Add. §6, §8.3–8.4 | `motion-showcase` |
| 8b | `08b-adaptive-sound` | ADDENDUM-v3 (sonido adaptativo) | `sound` (modifica), `achievements`, `terminal`, `call-stack-navigation` |
| 9 | `09-performance-a11y-fallbacks` | Brief §9–§11 · Add. §7, §9 | `performance-budgets`, `reduced-motion`, `webgl-fallback`, `accessibility`, `seo` |
| 10 | `10-testing-deployment` | Brief §7, §13 · Add. §7 (dispositivos), §8.5, §9 | `e2e-testing`, `lighthouse-ci`, `deployment` |

## Flujo de trabajo

1. Revisa el change (`openspec show <change>`).
2. Impleméntalo: `/opsx:apply <change>`.
3. Al terminar, archívalo: `/opsx:archive <change>` (sincroniza sus specs a `openspec/specs/`).
4. Pasa al siguiente.

## Datos personales

`BRIEF.md › Mis datos` está vacío. Los changes usan contenido de ejemplo marcado como placeholder en
`content/`; reemplázalo antes del change 10 (despliegue).
