import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHoldMachine, type HoldCallbacks } from "./useHold";

/** Reloj simulado: `advance(ms)` mueve el tiempo y dispara los temporizadores vencidos. */
function fakeClock() {
  let t = 0;
  const timers: { at: number; fn: () => void; live: boolean }[] = [];
  return {
    now: () => t,
    schedule: (fn: () => void, ms: number) => {
      const timer = { at: t + ms, fn, live: true };
      timers.push(timer);
      return () => {
        timer.live = false;
      };
    },
    advance(ms: number) {
      const target = t + ms;
      for (;;) {
        const next = timers.filter((x) => x.live && x.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        t = next.at;
        next.live = false;
        next.fn();
      }
      t = target;
    },
  };
}

function setup(reduced = false) {
  const clock = fakeClock();
  const calls: string[] = [];
  const callbacks: HoldCallbacks<string> = {
    onStart: (target, at, kind) => calls.push(`start:${target}:${kind}@${at.x},${at.y}`),
    onComplete: (target, kind) => calls.push(`complete:${target}:${kind}`),
    onCancel: (target, reason, kind) => calls.push(`cancel:${reason}:${kind}`),
    onActivate: (target, how) => calls.push(`activate:${how}:${target}`),
  };
  const machine = createHoldMachine(callbacks, {
    now: clock.now,
    schedule: clock.schedule,
    reduced: () => reduced,
  });
  return { clock, calls, machine };
}

describe("Hold-to-Execute · máquina de estados", () => {
  it("hold completo: se mantiene 800 ms y completa una sola vez", () => {
    const { clock, calls, machine } = setup();
    machine.press("a", 10, 20, "pointer");
    clock.advance(799);
    expect(calls).toEqual(["start:a:pointer@10,20"]);
    clock.advance(1);
    expect(calls).toEqual(["start:a:pointer@10,20", "complete:a:pointer"]);
    machine.release(); // soltar tras completar no cancela ni activa nada
    clock.advance(2000);
    expect(calls).toHaveLength(2);
    expect(machine.active).toBe(false);
  });

  it("clic corto (< 200 ms sin desplazarse): cancela el anillo sin rebote y abre la versión corta", () => {
    const { clock, calls, machine } = setup();
    machine.press("a", 0, 0, "pointer");
    clock.advance(120);
    machine.release();
    expect(calls).toEqual(["start:a:pointer@0,0", "cancel:click:pointer", "activate:click:a"]);
    clock.advance(2000);
    expect(calls).toHaveLength(3); // el temporizador del hold se canceló
  });

  it("soltar entre 200 y 800 ms cancela con rebote y no navega", () => {
    const { clock, calls, machine } = setup();
    machine.press("a", 0, 0, "pointer");
    clock.advance(450);
    machine.release();
    clock.advance(2000);
    expect(calls).toEqual(["start:a:pointer@0,0", "cancel:release:pointer"]);
  });

  it("desplazarse más de 10 px cancela (el scroll táctil sigue); menos de 10 px no", () => {
    const { clock, calls, machine } = setup();
    machine.press("a", 100, 100, "pointer");
    machine.move(105, 104); // 6,4 px
    expect(machine.active).toBe(true);
    machine.move(100, 111); // 11 px
    expect(machine.active).toBe(false);
    clock.advance(2000);
    expect(calls).toEqual(["start:a:pointer@100,100", "cancel:move:pointer"]);
    // y tras cancelar, soltar no abre nada
    machine.release();
    expect(calls).toHaveLength(2);
  });

  it("teclado: Espacio mantenido completa; soltar antes cancela y nunca cuenta como clic", () => {
    const first = setup();
    first.machine.press("c", 50, 60, "keyboard");
    first.clock.advance(800);
    expect(first.calls).toEqual(["start:c:keyboard@50,60", "complete:c:keyboard"]);

    const second = setup();
    second.machine.press("c", 50, 60, "keyboard");
    second.clock.advance(50); // aunque sea muy breve
    second.machine.release();
    expect(second.calls).toEqual(["start:c:keyboard@50,60", "cancel:release:keyboard"]);
  });

  it("Enter abre la versión corta sin hold", () => {
    const { calls, machine } = setup();
    machine.activate("c", "enter");
    expect(calls).toEqual(["activate:enter:c"]);
  });

  it("ignora un segundo press mientras hay uno en curso", () => {
    const { calls, machine } = setup();
    machine.press("a", 0, 0, "pointer");
    machine.press("b", 0, 0, "pointer");
    expect(calls).toEqual(["start:a:pointer@0,0"]);
  });

  it("cancelar desde fuera (blur, pointercancel) revierte el hold en curso", () => {
    const { clock, calls, machine } = setup();
    machine.press("a", 0, 0, "keyboard");
    clock.advance(300);
    machine.cancel("blur");
    clock.advance(2000);
    expect(calls).toEqual(["start:a:keyboard@0,0", "cancel:blur:keyboard"]);
  });
});

describe("Hold-to-Execute · movimiento reducido", () => {
  it("no hay anillo: cualquier pulsación (corta o larga) abre con fundido al soltar", () => {
    const { clock, calls, machine } = setup(true);
    machine.press("a", 0, 0, "pointer");
    clock.advance(1500); // aunque se mantenga mucho
    expect(calls).toEqual([]);
    machine.release();
    expect(calls).toEqual(["activate:reduced:a"]);
  });

  it("Enter y Espacio también abren con fundido", () => {
    const { calls, machine } = setup(true);
    machine.activate("c", "enter");
    machine.press("c", 0, 0, "keyboard");
    machine.release();
    expect(calls).toEqual(["activate:reduced:c", "activate:reduced:c"]);
  });

  it("desplazarse sigue cancelando sin abrir nada", () => {
    const { calls, machine } = setup(true);
    machine.press("a", 0, 0, "pointer");
    machine.move(0, 30);
    machine.release();
    expect(calls).toEqual([]);
  });
});

describe("Hold-to-Execute · umbrales de los tokens", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("con la configuración por defecto completa a los 800 ms reales", () => {
    const calls: string[] = [];
    const machine = createHoldMachine<string>(
      {
        onStart: () => calls.push("start"),
        onComplete: () => calls.push("complete"),
        onCancel: () => calls.push("cancel"),
        onActivate: () => calls.push("activate"),
      },
      { reduced: () => false },
    );
    machine.press("a", 0, 0, "pointer");
    vi.advanceTimersByTime(799);
    expect(calls).toEqual(["start"]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual(["start", "complete"]);
  });
});
