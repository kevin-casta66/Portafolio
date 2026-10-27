import { describe, expect, it, vi } from "vitest";
import { rawContent } from "@/content";
import {
  COMMAND_IDS,
  COMMANDS,
  completeCommand,
  createHistory,
  levenshtein,
  runCommand,
  suggestCommand,
  type CommandActions,
  type CommandContext,
} from "./commands";

const actions = (): CommandActions => ({
  downloadCv: vi.fn(() => "cv-es.pdf"),
  toggleTheme: vi.fn(() => "light" as const),
  toggleDebug: vi.fn(() => true),
  goToContact: vi.fn(),
  goToHeap: vi.fn(),
  goToMotion: vi.fn(),
  openMixer: vi.fn(() => true),
});
const ctx = (locale: "es" | "en" = "es", a = actions()): CommandContext => ({
  locale,
  content: rawContent,
  actions: a,
});
const textOf = (input: string, locale: "es" | "en" = "es") =>
  runCommand(input, ctx(locale)).lines.map((l) => l.text).join("\n");

describe("registro de comandos", () => {
  it("define exactamente los comandos del spec", () => {
    expect([...COMMAND_IDS]).toEqual([
      "help",
      "about",
      "projects",
      "skills",
      "cv",
      "contact",
      "heap",
      "motion",
      "mixer",
      "theme",
      "debug",
      "clear",
    ]);
    expect(COMMANDS.map((c) => c.id)).toEqual([...COMMAND_IDS]);
  });

  it("help lista todos los comandos con una descripción breve", () => {
    const out = textOf("help");
    for (const id of COMMAND_IDS) expect(out).toContain(id);
    for (const c of COMMANDS) expect(out).toContain(c.description.es);
  });

  it("about sale del perfil de content/", () => {
    const { name, email, location } = rawContent.profile;
    const out = textOf("about");
    expect(out).toContain(name);
    expect(out).toContain(email);
    expect(out).toContain(location.es);
    expect(textOf("about", "en")).toContain(rawContent.profile.role.en);
  });

  it("projects lista TODOS los proyectos con nombre, estado y enlace al caso solo si lo tienen", () => {
    const { lines } = runCommand("projects", ctx());
    expect(lines).toHaveLength(rawContent.projects.length);
    for (const project of rawContent.projects) {
      const line = lines.find((l) => l.text.includes(project.name));
      expect(line, project.slug).toBeDefined();
      expect(line?.text).toContain(project.status);
      expect(line?.href).toBe(
        project.links.caseStudy ? `/projects/${project.links.caseStudy}` : undefined,
      );
    }
  });

  it("skills agrupa por categoría y no omite ninguna habilidad", () => {
    const out = textOf("skills");
    for (const skill of rawContent.skills) expect(out).toContain(skill.name);
    expect(out).toContain("IA y automatización");
  });

  it("cv inicia la descarga y lo confirma", () => {
    const a = actions();
    const result = runCommand("cv", ctx("es", a));
    expect(a.downloadCv).toHaveBeenCalledOnce();
    expect(result.lines[0]?.text).toContain("cv-es.pdf");
  });

  it("contact muestra los datos y salta al formulario", () => {
    const a = actions();
    const out = runCommand("contact", ctx("es", a)).lines.map((l) => l.text).join("\n");
    expect(a.goToContact).toHaveBeenCalledOnce();
    expect(out).toContain(rawContent.profile.email);
    expect(out).toContain("DISPLAY");
  });

  it("theme y debug alternan e informan del estado resultante", () => {
    const a = actions();
    expect(runCommand("theme", ctx("es", a)).lines[0]?.text).toContain("claro");
    expect(runCommand("debug", ctx("es", a)).lines[0]?.text).toContain("activado");
    expect(a.toggleTheme).toHaveBeenCalledOnce();
    expect(a.toggleDebug).toHaveBeenCalledOnce();
  });

  it("clear pide borrar la salida", () => {
    expect(runCommand("clear", ctx()).clear).toBe(true);
  });

  it("un comando desconocido sugiere el más parecido y recuerda help", () => {
    const result = runCommand("projetcs", ctx());
    expect(result.error).toBe(true);
    const out = result.lines.map((l) => l.text).join("\n");
    expect(out).toContain("command not found: projetcs");
    expect(out).toContain("projects");
    expect(out).toContain("help");
  });

  it("sin parecido no sugiere nada", () => {
    const out = textOf("zzzzzzzz");
    expect(out).toContain("command not found: zzzzzzzz");
    expect(out).not.toContain("Quisiste decir");
  });
});

describe("autocompletado y sugerencias", () => {
  it("sk → skills", () => {
    expect(completeCommand("sk")).toEqual({ kind: "unique", value: "skills" });
  });

  it("c es ambiguo y muestra clear, contact y cv", () => {
    expect(completeCommand("c")).toEqual({
      kind: "ambiguous",
      options: ["clear", "contact", "cv"],
    });
  });

  it("un prefijo que no existe no completa nada", () => {
    expect(completeCommand("xyz")).toEqual({ kind: "none" });
    expect(completeCommand("")).toEqual({ kind: "none" });
  });

  it("projetcs → sugiere projects (distancia ≤ 2)", () => {
    expect(suggestCommand("projetcs")).toBe("projects");
    expect(suggestCommand("hepl")).toBe("help");
    expect(suggestCommand("qwertyuiop")).toBeNull();
  });

  it("calcula la distancia de edición", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("igual", "igual")).toBe(0);
  });
});

describe("historial", () => {
  it("about, luego skills, flecha arriba dos veces → about", () => {
    const h = createHistory();
    h.push("about");
    h.push("skills");
    expect(h.previous()).toBe("skills");
    expect(h.previous()).toBe("about");
  });

  it("flecha abajo vuelve hacia lo reciente y termina en línea vacía", () => {
    const h = createHistory();
    h.push("about");
    h.push("skills");
    h.previous();
    h.previous();
    expect(h.next()).toBe("skills");
    expect(h.next()).toBe("");
  });

  it("no guarda líneas vacías ni repeticiones consecutivas", () => {
    const h = createHistory();
    h.push("  ");
    h.push("help");
    h.push("help");
    expect(h.entries()).toEqual(["help"]);
  });
});

describe("comando motion (change 08)", () => {
  it("navega a la vitrina /motion y enlaza a ella", () => {
    const a = actions();
    const result = runCommand("motion", ctx("es", a));
    expect(a.goToMotion).toHaveBeenCalledTimes(1);
    expect(result.lines[0]?.href).toBe("/motion");
    expect(runCommand("motion", ctx("en")).lines[0]?.text).toContain("motion showcase");
  });

  it("aparece en help y en el autocompletado", () => {
    expect(textOf("help")).toContain("motion");
    expect([...COMMAND_IDS]).toContain("motion");
  });
});

describe("comando heap (change 07)", () => {
  it("navega a la vista Memory Heap y enlaza a /heap", () => {
    const a = actions();
    const result = runCommand("heap", ctx("es", a));
    expect(a.goToHeap).toHaveBeenCalledTimes(1);
    expect(result.lines[0]?.href).toBe("/heap");
    expect(runCommand("heap", ctx("en")).lines[0]?.text).toContain("Memory Heap");
  });
});

describe("comando mixer (change 08b)", () => {
  it("abre el mezclador con el sonido activo y lo confirma en la salida", () => {
    const a = actions();
    const result = runCommand("mixer", ctx("es", a));
    expect(a.openMixer).toHaveBeenCalledTimes(1);
    expect(result.lines[0]?.text).toContain("mezclador");
    expect(runCommand("mixer", ctx("en")).lines[0]?.text).toContain("mixer");
  });

  it("con el sonido apagado lo explica y no reproduce nada", () => {
    const a = { ...actions(), openMixer: vi.fn(() => false) };
    const result = runCommand("mixer", ctx("es", a));
    expect(a.openMixer).toHaveBeenCalledTimes(1);
    expect(result.lines[0]?.text).toContain("desactivado");
    expect(result.error).toBeUndefined();
  });

  it("aparece en help y se autocompleta", () => {
    expect(textOf("help")).toContain("mixer");
    expect(completeCommand("mix")).toEqual({ kind: "unique", value: "mixer" });
  });
});
