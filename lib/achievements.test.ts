import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { audio, type AudioEvent } from "@/audio";
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
  it("el catálogo tiene los 7 logros (5 del change 06, motion_inspector del 08 y sound_engineer del 08b) con texto en ambos idiomas", () => {
    expect(catalog).toEqual([
      "root_access",
      "process_executed",
      "heap_explorer",
      "motion_inspector",
      "sound_engineer",
      "kernel_panic",
      "debugger_attached",
    ]);
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

  describe("sonido del logro (change 08b)", () => {
    const heard: { event: AudioEvent; payload: unknown }[] = [];
    beforeEach(() => {
      heard.length = 0;
      audio.registerEngine(
        { handle: (event, payload) => void heard.push({ event, payload }) },
        audio.controls,
      );
    });
    afterEach(() => audio.reset());

    it("suena una sola vez por logro, con su id (la variación del motivo es estable por id)", () => {
      unlock("heap_explorer");
      unlock("heap_explorer");
      unlock("sound_engineer");
      const sounds = heard.filter((h) => h.event === "achievement");
      expect(sounds.map((h) => (h.payload as { id: string }).id)).toEqual(["heap_explorer", "sound_engineer"]);
    });

    it("un id desconocido no suena", () => {
      unlock("no_existe");
      expect(heard.filter((h) => h.event === "achievement")).toEqual([]);
    });
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
