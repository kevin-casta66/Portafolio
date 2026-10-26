import { describe, expect, it, vi } from "vitest";
import { createClock, type Ticker } from "./clock";

function fakeTicker() {
  const callbacks = new Set<(time: number, delta: number, frame: number) => void>();
  const ticker: Ticker = {
    add: (cb) => void callbacks.add(cb),
    remove: (cb) => void callbacks.delete(cb),
  };
  const frame = (time = 0, delta = 16, n = 0) => callbacks.forEach((cb) => cb(time, delta, n));
  return { ticker, frame, size: () => callbacks.size };
}

describe("reloj único", () => {
  it("usa un solo callback del ticker aunque haya muchos suscriptores", () => {
    const { ticker, size } = fakeTicker();
    const clock = createClock(ticker);
    clock.subscribe(() => {});
    clock.subscribe(() => {});
    clock.subscribe(() => {});
    expect(size()).toBe(1);
    expect(clock.subscriberCount()).toBe(3);
  });

  it("ejecuta los suscriptores por prioridad: scroll → señales → animación → 3D", () => {
    const { ticker, frame } = fakeTicker();
    const clock = createClock(ticker);
    const order: string[] = [];
    clock.subscribe(() => order.push("render3d"), 100);
    clock.subscribe(() => order.push("scroll"), 0);
    clock.subscribe(() => order.push("anim"));
    clock.subscribe(() => order.push("signals"), 10);
    frame();
    expect(order).toEqual(["scroll", "signals", "anim", "render3d"]);
  });

  it("todos reciben el mismo tiempo en el mismo frame", () => {
    const { ticker, frame } = fakeTicker();
    const clock = createClock(ticker);
    const seen: number[] = [];
    clock.subscribe((t) => seen.push(t), 0);
    clock.subscribe((t) => seen.push(t), 100);
    frame(1.234);
    expect(seen).toEqual([1.234, 1.234]);
  });

  it("al darse de baja el último, se desengancha del ticker (sin fugas)", () => {
    const { ticker, size } = fakeTicker();
    const clock = createClock(ticker);
    const off1 = clock.subscribe(() => {});
    const off2 = clock.subscribe(() => {});
    off1();
    expect(size()).toBe(1);
    off2();
    expect(size()).toBe(0);
    expect(clock.subscriberCount()).toBe(0);
  });

  it("darse de baja durante un frame no rompe el bucle", () => {
    const { ticker, frame } = fakeTicker();
    const clock = createClock(ticker);
    const spy = vi.fn();
    const off = clock.subscribe(() => off(), 0);
    clock.subscribe(spy, 10);
    expect(() => frame()).not.toThrow();
    expect(spy).toHaveBeenCalledOnce();
  });
});
