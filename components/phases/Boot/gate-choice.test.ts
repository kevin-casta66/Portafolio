import { describe, expect, it } from "vitest";
import { createAppStore, STORAGE_KEYS, type StorageLike, type Storages } from "@/lib/store";
import { applyGateChoice } from "./gate-choice";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (k: string): string | null => this.data.get(k) ?? null;
  setItem = (k: string, v: string): void => void this.data.set(k, v);
}

function setup() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const storages: Storages = { local: () => local, session: () => session };
  const store = createAppStore(storages);
  const emitted: string[] = [];
  const apply = (choice: "sound" | "silent") =>
    applyGateChoice(choice, { setGateChoice: store.getState().setGateChoice, emit: (e) => emitted.push(e) });
  return { local, session, store, emitted, apply };
}

describe("elección de la puerta de arranque", () => {
  it("«Iniciar con sonido» queda registrada en la puerta, en las preferencias y avisa al audio", () => {
    const { local, session, store, emitted, apply } = setup();
    expect(store.getState().sound).toMatchObject({ enabled: false, gateChoice: null });
    apply("sound");
    expect(store.getState().sound).toMatchObject({ enabled: true, gateChoice: "sound" });
    expect(session.getItem(STORAGE_KEYS.gateChoice)).toBe("sound");
    expect(JSON.parse(local.getItem(STORAGE_KEYS.prefs) ?? "{}")).toMatchObject({ sound: true });
    expect(emitted).toEqual(["gate:sound"]);
  });

  it("«Iniciar en silencio» deja el sonido apagado y lo recuerda", () => {
    const { local, session, store, emitted, apply } = setup();
    apply("silent");
    expect(store.getState().sound).toMatchObject({ enabled: false, gateChoice: "silent" });
    expect(session.getItem(STORAGE_KEYS.gateChoice)).toBe("silent");
    expect(JSON.parse(local.getItem(STORAGE_KEYS.prefs) ?? "{}")).toMatchObject({ sound: false });
    expect(emitted).toEqual(["gate:silent"]);
  });

  it("no avisa al audio antes de elegir", () => {
    const { emitted } = setup();
    expect(emitted).toEqual([]);
  });
});
