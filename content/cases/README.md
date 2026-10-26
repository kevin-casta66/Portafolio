# content/cases

Casos de estudio «Debugger» (change 05): un archivo MDX por proyecto **y por idioma**,
`<slug>.es.mdx` y `<slug>.en.mdx`. El `slug` es el de `links.caseStudy` en `content/projects.ts`; esa
propiedad es lo que genera la ruta `/<locale>/projects/<slug>` y el enlace «Caso de estudio» de la
tarjeta. Los casos de ejemplo llevan `placeholder: true` (la página lo avisa).

## Estructura de un caso

```mdx
---
slug: mi-proyecto            # igual que el nombre del archivo
title: "Título del caso"
summary: "Una frase."
placeholder: false           # true mientras el texto sea de ejemplo
breakpoints: [context, problem, architecture, decisions, code, results, learnings]
metrics:                     # requeridas si hay «results»
  - { id: carga, label: "Carga", unit: "ms", before: 4200, after: 1100, better: lower }
diagram:                     # requerido si hay «architecture»
  nodes:
    - { id: web, label: "Web", col: 0, row: 0 }     # posición en una rejilla (col 0-5, row 0-3)
    - { id: api, label: "API", col: 1, row: 0 }
  steps:                     # cada nodo debe aparecer en algún paso
    - { title: "Cliente", description: "Texto del paso.", nodes: [web] }
    - { title: "Servidor", description: "Texto del paso.", nodes: [api], edges: [[web, api]] }
---

<Breakpoint id="context"> … Markdown … </Breakpoint>
<Breakpoint id="architecture"> <ArchitectureDiagram /> </Breakpoint>
<Breakpoint id="results"> <MetricChart /> </Breakpoint>
```

- Los `<Breakpoint id="…">` del cuerpo deben ser los de `breakpoints`, en el orden canónico:
  `context, problem, architecture, decisions, code, results, learnings`.
- Código: ```` ```ts ```` normal, o `<AnnotatedCode lang="ts" title="archivo.ts" notes={{ 3: "nota" }}>{`código`}</AnnotatedCode>`
  para anotar líneas (la nota aparece al margen en escritorio y debajo en móvil). Lenguajes:
  `ts, tsx, js, json, sql, bash, css, yaml, diff, csharp`.
- No uses `<h1>`/`<h2>` (los pone `Breakpoint`); usa `###` para subtítulos.
- Un metadato inválido **rompe el build** con el archivo y el campo (`pnpm content:check`).
