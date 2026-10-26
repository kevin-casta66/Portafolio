import { describe, expect, it } from "vitest";
import { CaseError, parseCase } from "./parse";

const valid = `---
slug: demo
title: Demo
summary: Resumen
breakpoints: [context, architecture, results]
metrics:
  - { id: latency, label: Latencia, unit: ms, before: 900, after: 300, better: lower }
diagram:
  nodes:
    - { id: web, label: Web, col: 0, row: 0 }
    - { id: api, label: API, col: 1, row: 0 }
  steps:
    - { title: Cliente, description: El cliente, nodes: [web] }
    - { title: Servidor, description: El servidor, nodes: [api], edges: [[web, api]] }
---

<Breakpoint id="context">Texto</Breakpoint>
<Breakpoint id="architecture"><ArchitectureDiagram /></Breakpoint>
<Breakpoint id="results"><MetricChart /></Breakpoint>
`;

const problemsOf = (source: string, file = "demo.es.mdx") => {
  try {
    parseCase(source, file);
  } catch (error) {
    if (error instanceof CaseError) return error.problems.join("\n");
    throw error;
  }
  return "";
};

describe("parseCase", () => {
  it("acepta un caso válido y separa el cuerpo", () => {
    const { frontmatter, body } = parseCase(valid, "demo.es.mdx");
    expect(frontmatter.slug).toBe("demo");
    expect(frontmatter.placeholder).toBe(false);
    expect(body.startsWith("\n<Breakpoint") || body.startsWith("<Breakpoint")).toBe(true);
  });

  it("rompe con un mensaje claro si falta el bloque de metadatos o un campo", () => {
    expect(problemsOf("# sin metadatos")).toMatch(/falta el bloque de metadatos/);
    expect(problemsOf(valid.replace("title: Demo\n", ""))).toMatch(/title:/);
  });

  it("detecta un slug que no coincide con el archivo", () => {
    expect(problemsOf(valid, "otro.es.mdx")).toMatch(/no coincide con el nombre del archivo/);
  });

  it("exige que los breakpoints de los metadatos y los del cuerpo coincidan", () => {
    expect(problemsOf(valid.replace('<Breakpoint id="context">Texto</Breakpoint>\n', ""))).toMatch(
      /falta <Breakpoint id="context">/,
    );
    expect(problemsOf(valid + '<Breakpoint id="learnings">x</Breakpoint>')).toMatch(
      /está en el cuerpo pero no en los metadatos/,
    );
  });

  it("valida el diagrama: nodos inexistentes y nodos sin paso", () => {
    expect(problemsOf(valid.replace("nodes: [api]", "nodes: [db]"))).toMatch(/nodo inexistente «db»/);
    expect(problemsOf(valid.replace("nodes: [api], edges: [[web, api]]", "nodes: [web]"))).toMatch(
      /«api» no aparece en ningún paso/,
    );
  });

  it("exige los componentes que consumen diagram y metrics", () => {
    expect(problemsOf(valid.replace("<ArchitectureDiagram />", ""))).toMatch(/ArchitectureDiagram/);
    expect(problemsOf(valid.replace("<MetricChart />", ""))).toMatch(/MetricChart/);
  });

  it("obliga al orden canónico de los breakpoints", () => {
    expect(problemsOf(valid.replace("[context, architecture, results]", "[results, context, architecture]"))).toMatch(
      /deben seguir el orden/,
    );
  });
});
