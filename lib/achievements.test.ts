import { beforeEach, describe, expect, it } from "vitest";
import "@/content/achievements";
import { appStore } from "@/lib/store";
import {
  achievementTotal,
  defineAchievement,
  getAchievement,
  getAchievements,
  resetAchievementsForTests,
  unlock,
} from "./achievements";

const catalog = getAchievements().map((a) => a.id);

describe("registro de logros", () => {
  it("el catálogo inicial tiene los 5 logros del spec con texto en ambos idiomas", () => {
    expect(catalog).toEqual(["root_access", "process_executed", "heap_explorer", "kernel_panic", "debugger_attached"]);
    for (const a of getAchievements()) {
      for (const field of [a.title, a.description, a.hint]) {
        expect(field.es.length).toBeGreaterThan(0);
        expect(field.en.length).toBeGreaterThan(0);
      }
    }
  });

  it("no hay identificadores duplicados en el catálogo", () => {
    expect(new Set(catalog).size).toBe(catalog.length);
  });

  it("un identificador duplicado hace fallar el registro indicando cuál", () => {
    const def = getAchievement("root_access");
    expect(def).toBeDefined();
    expect(() => defineAchievement(def!)).toThrow(/duplicado «root_access»/);
  });

  it("un logro registrado después entra en el total", () => {
    const before = achievementTotal();
    defineAchievement({
      id: "logro_de_prueba",
      title: { es: "a", en: "a" },
      description: { es: "b", en: "b" },
      hint: { es: "c", en: "c" },
    });
    expect(achievementTotal()).toBe(before + 1);
  });
});

describe("unlock", () => {
  beforeEach(() => {
    appStore.setState({ achievements: [], toastQueue: [] });
  });

  it("es idempotente: el segundo desbloqueo no cambia el estado ni encola otro aviso", () => {
    expect(unlock("root_access")).toBe(true);
    const snapshot = appStore.getState();
    expect(unlock("root_access")).toBe(false);
    expect(appStore.getState().achievements).toEqual(snapshot.achievements);
    expect(appStore.getState().toastQueue).toEqual(["root_access"]);
  });

  it("ignora un id que no está en el registro", () => {
    expect(unlock("no_existe")).toBe(false);
    expect(appStore.getState().achievements).toEqual([]);
  });
});

describe("aislamiento del registro", () => {
  it("se puede vaciar para pruebas", () => {
    resetAchievementsForTests();
    expect(achievementTotal()).toBe(0);
  });
});
