import { describe, expect, it } from "vitest";
import { experienceScript } from "./experience-script";
import { deriveExperience, experienceOf, type ExperienceInput } from "./experience";
import { createAppStore, STORAGE_KEYS, type StorageLike, type Storages } from "./store";

const base: ExperienceInput = {
  manual: null,
  system: false,
  contextLost: false,
  fpsDegraded: false,
  backend: "webgpu",
};

describe("deriveExperience: prioridad manual > sistema > capacidad > fps", () => {
  it("sin nada activo es full con cada backend", () => {
    for (const backend of ["webgpu", "webgl2", "pending"] as const) {
      expect(deriveExperience({ ...base, backend })).toBe("full");
    }
  });

  it("sin backend (none) cae a fallback2d", () => {
    expect(deriveExperience({ ...base, backend: "none" })).toBe("fallback2d");
  });

  it("1. manual gana al sistema en ambos sentidos", () => {
    expect(deriveExperience({ ...base, manual: "reduced", system: false })).toBe("reduced");
    expect(deriveExperience({ ...base, manual: "full", system: true })).toBe("full");
  });

  it("2. el sistema gana a la capacidad y a los fps", () => {
    expect(deriveExperience({ ...base, system: true, backend: "none", fpsDegraded: true })).toBe("reduced");
  });

  it("manual full no anula la falta de capacidad", () => {
    expect(deriveExperience({ ...base, manual: "full", system: true, backend: "none" })).toBe("fallback2d");
  });

  it("3. la capacidad (backend none o contexto perdido) gana a los fps", () => {
    expect(deriveExperience({ ...base, contextLost: true })).toBe("fallback2d");
    expect(deriveExperience({ ...base, backend: "webgl2", contextLost: true })).toBe("fallback2d");
  });

  it("4. fps degradados llevan a fallback2d", () => {
    expect(deriveExperience({ ...base, backend: "webgl2", fpsDegraded: true })).toBe("fallback2d");
  });
});

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (k: string): string | null => this.data.get(k) ?? null;
  setItem = (k: string, v: string): void => void this.data.set(k, v);
}

describe("estado en el store", () => {
  const make = () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    const storages: Storages = { local: () => local, session: () => session };
    return { session, store: createAppStore(storages), storages };
  };

  it("setMotionPref persiste en sessionStorage y se hidrata", () => {
    const { session, store, storages } = make();
    store.getState().setMotionPref("reduced");
    expect(session.data.get(STORAGE_KEYS.motion)).toBe("reduced");
    expect(experienceOf(store.getState())).toBe("reduced");
    const again = createAppStore(storages);
    again.getState().hydrate();
    expect(again.getState().experience.manual).toBe("reduced");
    again.getState().setMotionPref(null);
    expect(again.getState().experience.manual).toBeNull();
  });

  it("el backend publicado y los fps degradados alteran el modo", () => {
    const { store } = make();
    store.getState().setBackend("webgl2");
    expect(experienceOf(store.getState())).toBe("full");
    store.getState().setFpsDegraded(true);
    expect(experienceOf(store.getState())).toBe("fallback2d");
    store.getState().setFpsDegraded(false);
    store.getState().setBackend("none");
    expect(experienceOf(store.getState())).toBe("fallback2d");
  });
});

describe("experienceScript", () => {
  const run = (session: Record<string, string>, reducedSystem: boolean): string | null => {
    const attrs: Record<string, string> = {};
    const fakeDoc = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
    new Function("document", "sessionStorage", "matchMedia", experienceScript)(
      fakeDoc,
      { getItem: (k: string) => session[k] ?? null },
      () => ({ matches: reducedSystem }),
    );
    return attrs["data-experience"] ?? null;
  };

  it("usa el sistema sin elección manual", () => {
    expect(run({}, true)).toBe("reduced");
    expect(run({}, false)).toBe("full");
  });
  it("la elección manual manda", () => {
    expect(run({ [STORAGE_KEYS.motion]: "full" }, true)).toBe("full");
    expect(run({ [STORAGE_KEYS.motion]: "reduced" }, false)).toBe("reduced");
  });
  it("pesa menos de 1 KB", () => {
    expect(experienceScript.length).toBeLessThan(1024);
  });
});
