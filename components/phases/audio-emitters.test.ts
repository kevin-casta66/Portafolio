import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIO_EVENTS } from "@/audio";

/**
 * Contrato de emisores (change 08b, tareas 3.2–3.5): cada evento de sonido de las fases y los
 * componentes que NO son del motor, de los controles ni de los sistemas globales se emite en algún
 * archivo fuente. Si alguien borra una emisión (o renombra un evento del catálogo), falla aquí.
 */
const ROOTS = ["components", "motion", "app", "lib"];
const SKIP = new Set(["node_modules", ".next", "audio"]);

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const files = ROOTS.flatMap((root) => sources(join(process.cwd(), root))).map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

/** Eventos que emiten las fases y los componentes de esta tarea (el resto los emiten el motor y B). */
const PHASE_EVENTS = [
  "gate:sound", "gate:silent", "boot:line", "boot:done", "hero:key",
  "hover:token", "counter:tick", "counter:done", "hover:skill", "select:skill",
  "bytecode:instruction", "bytecode:function", "runtime:core-hover",
  "hold:start", "hold:progress", "hold:cancel", "hold:complete", "lab:modulate",
  "case:enter", "case:leave", "case:breakpoint",
  "contact:focus", "contact:send", "contact:ok", "contact:error",
  "notfound:enter", "notfound:restart", "media:play", "media:stop",
] as const;

describe("emisores de sonido de las fases", () => {
  it("todos los eventos pertenecen al catálogo", () => {
    for (const event of PHASE_EVENTS) expect(AUDIO_EVENTS).toContain(event);
  });

  it.each(PHASE_EVENTS)("«%s» se emite en algún componente", (event) => {
    const emitters = files.filter(
      (file) => file.text.includes(`"${event}"`) && /audio\.emit|emit:|emit\(/.test(file.text),
    );
    expect(emitters.map((file) => file.path.replace(process.cwd(), ""))).not.toEqual([]);
  });

  it("ningún componente emite eventos que no existen en el catálogo", () => {
    const known = new Set<string>(AUDIO_EVENTS);
    const unknown: string[] = [];
    for (const file of files) {
      for (const match of file.text.matchAll(/audio\.emit\(\s*"([^"]+)"/g)) {
        if (!known.has(match[1] as string)) unknown.push(`${file.path}: ${match[1]}`);
      }
    }
    expect(unknown).toEqual([]);
  });
});
