import { describe, expect, it } from "vitest";
import { disposeRenderer, liveContexts, trackContext, whenDisposed } from "./dispose";

describe("disposeRenderer", () => {
  it("espera al dispose asíncrono antes de dar el contexto por liberado", async () => {
    const order: string[] = [];
    const slow = {
      dispose: () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            order.push("slow");
            resolve();
          }, 20),
        ),
    };
    trackContext();
    expect(liveContexts()).toBe(1);
    void disposeRenderer(slow);
    expect(liveContexts()).toBe(1); // todavía no terminó
    await whenDisposed();
    order.push("después");
    expect(order).toEqual(["slow", "después"]);
    expect(liveContexts()).toBe(0);
  });

  it("encadena desmontajes: nunca solapa dos", async () => {
    const log: string[] = [];
    const make = (name: string) => ({
      dispose: async () => {
        log.push(`${name}:inicio`);
        await new Promise((r) => setTimeout(r, 5));
        log.push(`${name}:fin`);
      },
    });
    trackContext();
    trackContext();
    void disposeRenderer(make("a"));
    void disposeRenderer(make("b"));
    await whenDisposed();
    expect(log).toEqual(["a:inicio", "a:fin", "b:inicio", "b:fin"]);
    expect(liveContexts()).toBe(0);
  });

  it("un dispose que falla igualmente libera el contexto", async () => {
    trackContext();
    await disposeRenderer({
      dispose: () => {
        throw new Error("perdido");
      },
    });
    expect(liveContexts()).toBe(0);
  });
});
