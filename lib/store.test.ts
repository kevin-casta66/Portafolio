import { describe, expect, it } from "vitest";
import {
  createAppStore,
  DEFAULT_STATE,
  STORAGE_KEYS,
  type StorageLike,
  type Storages,
} from "./store";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (k: string): string | null => this.data.get(k) ?? null;
  setItem = (k: string, v: string): void => void this.data.set(k, v);
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

const mem = (): { local: MemoryStorage; session: MemoryStorage; storages: Storages } => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  return { local, session, storages: { local: () => local, session: () => session } };
};

describe("store global", () => {
  it("arranca con los valores por defecto del spec", () => {
    const s = createAppStore(mem().storages).getState();
    expect(s.phase).toBe(DEFAULT_STATE.phase);
    expect(s.sound).toEqual({ enabled: false, gateChoice: null });
    expect(s.debug).toBe(false);
    expect(s.quickView).toBe(false);
    expect(s.graphics).toEqual({ tier: "auto", backend: "pending", ready: false });
    expect(s.achievements).toEqual([]);
  });

  it("recuerda la elección de la puerta durante la sesión", () => {
    const { storages } = mem();
    createAppStore(storages).getState().setGateChoice("silent");
    const next = createAppStore(storages);
    next.getState().hydrate();
    expect(next.getState().sound).toEqual({ enabled: false, gateChoice: "silent" });
  });

  it("«con sonido» activa el sonido", () => {
    const store = createAppStore(mem().storages);
    store.getState().setGateChoice("sound");
    expect(store.getState().sound).toEqual({ enabled: true, gateChoice: "sound" });
  });

  it("los logros persisten entre visitas y no se duplican", () => {
    const { storages } = mem();
    const first = createAppStore(storages);
    expect(first.getState().unlockAchievement("root_access")).toBe(true);
    expect(first.getState().unlockAchievement("root_access")).toBe(false);

    const second = createAppStore(storages);
    second.getState().hydrate();
    expect(second.getState().achievements).toEqual(["root_access"]);
  });

  it("ignora datos corruptos en el almacenamiento", () => {
    const { local, storages } = mem();
    local.setItem(STORAGE_KEYS.achievements, "{no es json");
    local.setItem(STORAGE_KEYS.theme, "morado");
    const store = createAppStore(storages);
    store.getState().hydrate();
    expect(store.getState().achievements).toEqual([]);
    expect(store.getState().theme).toBe("dark");
  });

  it("un almacenamiento que lanza errores no rompe la carga ni las acciones", () => {
    const store = createAppStore({ local: () => throwing, session: () => throwing });
    expect(() => store.getState().hydrate()).not.toThrow();
    expect(() => store.getState().setGateChoice("sound")).not.toThrow();
    expect(() => store.getState().unlockAchievement("kernel_panic")).not.toThrow();
    expect(store.getState().achievements).toEqual(["kernel_panic"]);
  });

  it("sin almacenamiento disponible (null) usa los valores por defecto", () => {
    const store = createAppStore({ local: () => null, session: () => null });
    store.getState().hydrate();
    expect(store.getState().sound.gateChoice).toBeNull();
  });

  it("usa el tema que el script de <head> ya aplicó cuando no hay elección guardada", () => {
    const store = createAppStore(mem().storages);
    store.getState().hydrate("light");
    expect(store.getState().theme).toBe("light");
  });

  it("una elección explícita prevalece sobre el tema del sistema", () => {
    const { local, storages } = mem();
    local.setItem(STORAGE_KEYS.theme, "dark");
    const store = createAppStore(storages);
    store.getState().hydrate("light");
    expect(store.getState().theme).toBe("dark");
  });
});
