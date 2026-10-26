import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBootRegistry } from "@/motion/boot";
import { createBootController, decideMode, type BootEnv } from "./boot-controller";

const home: BootEnv = { pathname: "/", search: "", hash: "", visitedThisSession: false };

describe("decideMode", () => {
  it("primera visita en el home: puerta completa", () => {
    expect(decideMode(home)).toBe("full");
  });
  it("visita posterior de la sesión: versión corta", () => {
    expect(decideMode({ ...home, visitedThisSession: true })).toBe("short");
  });
  it("nunca fuera del home", () => {
    expect(decideMode({ ...home, pathname: "/projects/atlas" })).toBe("off");
  });
  it("nunca en Vista Rápida", () => {
    expect(decideMode({ ...home, search: "?view=quick" })).toBe("off");
    expect(decideMode({ ...home, search: "?a=1&view=quick" })).toBe("off");
  });
  it("nunca con un ancla de sección (enlace profundo)", () => {
    expect(decideMode({ ...home, hash: "#runtime" })).toBe("off");
    expect(decideMode({ ...home, hash: "#projects" })).toBe("off");
  });
  it("el ancla #content (skip link) no cuenta como enlace profundo", () => {
    expect(decideMode({ ...home, hash: "#content" })).toBe("full");
  });
});

describe("controlador de arranque", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = () => {
    const registry = createBootRegistry();
    const onChoice = vi.fn();
    const onBooted = vi.fn();
    const onDone = vi.fn();
    const controller = createBootController({ registry, onChoice, onBooted, onDone });
    return { registry, controller, onChoice, onBooted, onDone };
  };

  it("modo off: queda finalizado sin pasar por los logs", () => {
    const { controller } = make();
    controller.start({ ...home, hash: "#runtime" });
    expect(controller.getSnapshot().stage).toBe("done");
    expect(controller.getSnapshot().mode).toBe("off");
  });

  it("pasa de los logs a la elección solo con el arranque real terminado y la marca visible", async () => {
    const { controller, registry } = make();
    let resolve!: () => void;
    registry.track("fonts", new Promise<void>((r) => (resolve = r)));
    controller.start(home);
    expect(controller.getSnapshot().stage).toBe("logs");

    controller.lettersFinished();
    expect(controller.getSnapshot().stage).toBe("logs"); // recurso pendiente
    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getSnapshot().stage).toBe("choose");
  });

  it("los logs terminan a los 2,5 s aunque un recurso siga pendiente", async () => {
    const { controller, registry } = make();
    registry.track("slow", new Promise(() => {}));
    controller.start(home);
    controller.lettersFinished();
    await vi.advanceTimersByTimeAsync(2499);
    expect(controller.getSnapshot().stage).toBe("logs");
    await vi.advanceTimersByTimeAsync(2);
    expect(controller.getSnapshot().stage).toBe("choose");
  });

  it("«con sonido» guarda la elección y sale", async () => {
    const { controller, onChoice, onBooted } = make();
    controller.start(home);
    controller.lettersFinished();
    await vi.advanceTimersByTimeAsync(0);
    controller.choose("sound");
    expect(onChoice).toHaveBeenCalledWith("sound");
    expect(onBooted).toHaveBeenCalled();
    expect(controller.getSnapshot().stage).toBe("exit");
    controller.exitFinished();
    expect(controller.getSnapshot().stage).toBe("done");
  });

  it("saltar (Enter, scroll, Escape, acceso superior) equivale a «en silencio», incluso durante los logs", () => {
    const { controller, onChoice } = make();
    controller.registry.track("slow", new Promise(() => {}));
    controller.start(home);
    controller.skip();
    expect(onChoice).toHaveBeenCalledWith("silent");
    expect(controller.getSnapshot().stage).toBe("exit");
  });

  it("no actúa dos veces: una segunda elección tras la salida se ignora", () => {
    const { controller, onChoice } = make();
    controller.start(home);
    controller.skip();
    controller.choose("sound");
    expect(onChoice).toHaveBeenCalledTimes(1);
  });

  it("versión corta: sin opciones, directa a la salida", () => {
    const { controller } = make();
    expect(controller.start({ ...home, visitedThisSession: true })).toBe("short");
    expect(controller.getSnapshot().stage).toBe("exit");
    controller.exitFinished();
    expect(controller.getSnapshot().stage).toBe("done");
  });

  it("las líneas reflejan los recursos reales y su valor", async () => {
    const { controller, registry } = make();
    registry.track("projects", Promise.resolve(), 6);
    controller.start(home);
    await vi.advanceTimersByTimeAsync(0);
    const line = controller.getSnapshot().lines.find((l) => l.id === "projects");
    expect(line).toMatchObject({ value: 6, done: true });
  });
});
