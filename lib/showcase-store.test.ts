import { beforeEach, describe, expect, it } from "vitest";
import { createShowcaseStore } from "./showcase-store";

describe("showcaseStore (una sola demo viva)", () => {
  let store: ReturnType<typeof createShowcaseStore>;
  beforeEach(() => {
    store = createShowcaseStore();
  });

  it("empieza sin ninguna demo activa", () => {
    expect(store.getState().activeDemoId).toBeNull();
  });

  it("activar una segunda demo desactiva la primera y la devuelve a `idle`", () => {
    const s = store.getState();
    expect(s.activate("T2")).toBeNull();
    s.setStatus("T2", "playing");
    expect(store.getState().activate("T8")).toBe("T2");
    expect(store.getState().activeDemoId).toBe("T8");
    expect(store.getState().status.T2).toBe("idle");
  });

  it("reactivar la misma demo no la desactiva", () => {
    store.getState().activate("T5");
    expect(store.getState().activate("T5")).toBeNull();
    expect(store.getState().activeDemoId).toBe("T5");
  });

  it("release solo libera si la demo era la activa", () => {
    store.getState().activate("T3");
    store.getState().release("T9");
    expect(store.getState().activeDemoId).toBe("T3");
    store.getState().release("T3");
    expect(store.getState().activeDemoId).toBeNull();
  });
});
