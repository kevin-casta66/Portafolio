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

describe("slices de preferencias, sesión y UI (change 06)", () => {
  it("las preferencias (sonido y cursor) sobreviven a una recarga", () => {
    const { storages } = mem();
    const first = createAppStore(storages);
    first.getState().setSoundEnabled(true);
    first.getState().setCursorPref("system");

    const reloaded = createAppStore(storages);
    reloaded.getState().hydrate();
    expect(reloaded.getState().sound).toEqual({ enabled: true, gateChoice: null });
    expect(reloaded.getState().prefs.cursor).toBe("system");
  });

  it("la elección de la puerta de esta sesión manda sobre la preferencia guardada", () => {
    const { storages, session } = mem();
    const first = createAppStore(storages);
    first.getState().setSoundEnabled(true);
    session.setItem(STORAGE_KEYS.gateChoice, "silent");
    const next = createAppStore(storages);
    next.getState().hydrate();
    expect(next.getState().sound.enabled).toBe(false);
  });

  it("sin puerta ni preferencia guardada el sonido está desactivado", () => {
    const store = createAppStore(mem().storages);
    store.getState().hydrate();
    expect(store.getState().sound.enabled).toBe(false);
  });

  it("el modo Debug dura la sesión: sobrevive a la recarga de la pestaña pero no a una sesión nueva", () => {
    const { storages, local } = mem();
    const first = createAppStore(storages);
    first.getState().setDebug(true);
    const sameSession = createAppStore(storages);
    sameSession.getState().hydrate();
    expect(sameSession.getState().debug).toBe(true);
    expect(local.getItem(STORAGE_KEYS.debug)).toBeNull();

    const newSession = createAppStore({ local: () => local, session: () => new MemoryStorage() });
    newSession.getState().hydrate();
    expect(newSession.getState().debug).toBe(false);
  });

  it("la Vista Rápida se recuerda en la sesión", () => {
    const { storages } = mem();
    createAppStore(storages).getState().setQuickView(true);
    const next = createAppStore(storages);
    next.getState().hydrate();
    expect(next.getState().quickView).toBe(true);
  });

  it("un storage que lanza excepciones no rompe ninguna de las slices nuevas", () => {
    const store = createAppStore({ local: () => throwing, session: () => throwing });
    expect(() => {
      store.getState().hydrate();
      store.getState().setSoundEnabled(true);
      store.getState().setCursorPref("system");
      store.getState().setDebug(true);
      store.getState().setQuickView(true);
      store.getState().setUi({ terminalOpen: true });
    }).not.toThrow();
    expect(store.getState().debug).toBe(true);
    expect(store.getState().sound.enabled).toBe(true);
    expect(store.getState().ui.terminalOpen).toBe(true);
  });

  it("cada logro nuevo entra una vez en la cola de avisos y se saca en orden", () => {
    const store = createAppStore(mem().storages);
    store.getState().unlockAchievement("a");
    store.getState().unlockAchievement("a");
    store.getState().unlockAchievement("b");
    expect(store.getState().toastQueue).toEqual(["a", "b"]);
    store.getState().shiftToast();
    expect(store.getState().toastQueue).toEqual(["b"]);
  });

  it("ignora preferencias corruptas", () => {
    const { local, storages } = mem();
    local.setItem(STORAGE_KEYS.prefs, "{roto");
    const store = createAppStore(storages);
    store.getState().hydrate();
    expect(store.getState().prefs.cursor).toBe("custom");
  });
});
