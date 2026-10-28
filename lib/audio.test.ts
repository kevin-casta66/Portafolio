import { afterEach, describe, expect, it, vi } from "vitest";
import { onUnlockGesture } from "./audio";

/** `window` mínimo: registra oyentes y deja disparar eventos con un objetivo. */
function fakeWindow() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(handler);
    },
    removeEventListener: (type: string, handler: (event: unknown) => void) => listeners.get(type)?.delete(handler),
    dispatch: (type: string, target: unknown) => [...(listeners.get(type) ?? [])].forEach((h) => h({ type, target })),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

class FakeElement {
  constructor(private readonly insideNotice: boolean) {}
  closest(selector: string) {
    return selector === "[data-sound-unlock]" && this.insideNotice ? this : null;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("onUnlockGesture (desbloqueo del audio en visitas posteriores)", () => {
  it("solo reacciona a clic, toque o tecla: la rueda y el movimiento del cursor no cuentan", () => {
    const win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("Element", FakeElement);
    const callback = vi.fn();
    onUnlockGesture(callback);
    win.dispatch("wheel", new FakeElement(false));
    win.dispatch("pointermove", new FakeElement(false));
    win.dispatch("scroll", new FakeElement(false));
    expect(callback).not.toHaveBeenCalled();
    win.dispatch("keydown", new FakeElement(false));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("se dispara una sola vez y deja de escuchar", () => {
    const win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("Element", FakeElement);
    const callback = vi.fn();
    onUnlockGesture(callback);
    win.dispatch("pointerdown", new FakeElement(false));
    win.dispatch("pointerup", new FakeElement(false));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(win.count()).toBe(0);
  });

  it("ignora los gestos sobre el aviso «Activar sonido»: ese botón arranca el audio con su propio clic", () => {
    const win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("Element", FakeElement);
    const callback = vi.fn();
    onUnlockGesture(callback);
    win.dispatch("pointerdown", new FakeElement(true));
    win.dispatch("pointerup", new FakeElement(true));
    expect(callback).not.toHaveBeenCalled();
    win.dispatch("pointerdown", new FakeElement(false));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("la función devuelta cancela la espera", () => {
    const win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("Element", FakeElement);
    const callback = vi.fn();
    const cancel = onUnlockGesture(callback);
    cancel();
    win.dispatch("keydown", new FakeElement(false));
    expect(callback).not.toHaveBeenCalled();
    expect(win.count()).toBe(0);
  });
});
