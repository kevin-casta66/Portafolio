import { describe, expect, it } from "vitest";
import { BOOT_MAX_MS, BOOT_SHORT_MS, createBootRegistry } from "./boot";

const deferred = () => {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("registro de arranque (progreso real)", () => {
  it("sin recursos el progreso es 1", () => {
    expect(createBootRegistry().progress()).toBe(1);
  });

  it("el progreso avanza solo cuando se resuelve un recurso rastreado", async () => {
    const registry = createBootRegistry();
    const a = deferred();
    const b = deferred();
    registry.track("fonts", a.promise);
    registry.track("projects", b.promise, 6);
    expect(registry.progress()).toBe(0);
    expect(registry.settled()).toBe(false);

    a.resolve();
    await tick();
    expect(registry.progress()).toBe(0.5);
    expect(registry.tracks().find((t) => t.id === "fonts")?.done).toBe(true);
    expect(registry.tracks().find((t) => t.id === "projects")?.done).toBe(false);

    b.resolve();
    await tick();
    expect(registry.progress()).toBe(1);
    expect(registry.settled()).toBe(true);
  });

  it("conserva el valor real de cada línea (p. ej. 6 proyectos)", () => {
    const registry = createBootRegistry();
    registry.track("projects", Promise.resolve(), 6);
    expect(registry.tracks()[0]?.value).toBe(6);
  });

  it("un recurso que falla también cuenta como terminado", async () => {
    const registry = createBootRegistry();
    const a = deferred();
    registry.track("img", a.promise);
    a.reject();
    await tick();
    expect(registry.settled()).toBe(true);
  });

  it("notifica a los suscriptores en cada cambio", async () => {
    const registry = createBootRegistry();
    let calls = 0;
    registry.subscribe(() => calls++);
    const a = deferred();
    registry.track("x", a.promise);
    a.resolve();
    await tick();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("las constantes cumplen el spec: logs ≤ 2,5 s y versión corta ≤ 400 ms", () => {
    expect(BOOT_MAX_MS).toBeLessThanOrEqual(2500);
    expect(BOOT_SHORT_MS).toBeLessThanOrEqual(400);
  });
});

describe("registro de arranque: idempotencia", () => {
  it("registrar dos veces el mismo id no duplica la línea (modo estricto de React)", () => {
    const registry = createBootRegistry();
    registry.track("skills", Promise.resolve());
    registry.track("skills", Promise.resolve());
    expect(registry.tracks().map((t) => t.id)).toEqual(["skills"]);
  });
});
