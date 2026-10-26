import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type Phase =
  "boot" | "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu" | "display";
export type Theme = "dark" | "light";
export type GateChoice = "sound" | "silent";
export type QualityTier = "auto" | "high" | "medium" | "low";
/** `pending` hasta que el motor 3D (change 04) determina el backend tras `init()`. */
export type GraphicsBackend = "pending" | "webgpu" | "webgl2" | "none";

export const STORAGE_KEYS = {
  theme: "compile:theme",
  gateChoice: "compile:gate",
  achievements: "compile:achievements",
} as const;

/** Subconjunto de la API Storage que usamos (facilita los tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Los accesores devuelven `null` si el almacenamiento no existe o está bloqueado. */
export interface Storages {
  local: () => StorageLike | null;
  session: () => StorageLike | null;
}

function guard<T>(fn: () => T): T | null {
  try {
    return typeof window === "undefined" ? null : fn();
  } catch {
    return null;
  }
}

export const browserStorages: Storages = {
  local: () => guard(() => window.localStorage),
  session: () => guard(() => window.sessionStorage),
};

function read(storage: StorageLike | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: StorageLike | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* almacenamiento lleno o bloqueado: el estado sigue funcionando en memoria */
  }
}

function parseAchievements(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export interface AppState {
  phase: Phase;
  theme: Theme;
  sound: { enabled: boolean; gateChoice: GateChoice | null };
  debug: boolean;
  quickView: boolean;
  graphics: { tier: QualityTier; backend: GraphicsBackend; ready: boolean };
  /** Escenas 3D renderizándose ahora mismo (las publica el motor del change 04). */
  scenes: { active: string[]; drawCalls: Record<string, number> };
  achievements: string[];
  /** `true` cuando la puerta de arranque (T1) terminó (o no se mostró): el hero puede empezar a teclear. */
  bootDone: boolean;

  setPhase: (phase: Phase) => void;
  setBootDone: (done: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setGateChoice: (choice: GateChoice) => void;
  setDebug: (debug: boolean) => void;
  setQuickView: (quickView: boolean) => void;
  setTier: (tier: QualityTier) => void;
  setBackend: (backend: GraphicsBackend) => void;
  /** `true` cuando el canvas 3D terminó de cargar y registró sus escenas. */
  setCanvasReady: (ready: boolean) => void;
  setActiveScenes: (active: string[]) => void;
  /** Draw calls por escena activa (los publica el motor 3D, como mucho cada 500 ms). */
  setDrawCalls: (drawCalls: Record<string, number>) => void;
  /** Devuelve `true` solo la primera vez que se desbloquea el logro. */
  unlockAchievement: (id: string) => boolean;
  /**
   * Lee las preferencias persistidas. Solo en cliente, tras la hidratación.
   * `domTheme` es el tema que el script de `<head>` ya aplicó (elección guardada o preferencia del sistema).
   */
  hydrate: (domTheme?: Theme) => void;
}

export const DEFAULT_STATE = {
  phase: "boot",
  theme: "dark",
  sound: { enabled: false, gateChoice: null },
  debug: false,
  quickView: false,
  graphics: { tier: "auto", backend: "pending", ready: false },
  achievements: [],
  bootDone: false,
} as const satisfies Partial<AppState>;

export function createAppStore(storages: Storages = browserStorages) {
  return createStore<AppState>()((set, get) => ({
    phase: DEFAULT_STATE.phase,
    theme: DEFAULT_STATE.theme,
    sound: { ...DEFAULT_STATE.sound },
    debug: DEFAULT_STATE.debug,
    quickView: DEFAULT_STATE.quickView,
    graphics: { ...DEFAULT_STATE.graphics },
    scenes: { active: [], drawCalls: {} },
    achievements: [],
    bootDone: DEFAULT_STATE.bootDone,

    setPhase: (phase) => set({ phase }),
    setBootDone: (bootDone) => set({ bootDone }),
    setTheme: (theme) => {
      write(storages.local(), STORAGE_KEYS.theme, theme);
      set({ theme });
    },
    setSoundEnabled: (enabled) => set((s) => ({ sound: { ...s.sound, enabled } })),
    setGateChoice: (gateChoice) => {
      write(storages.session(), STORAGE_KEYS.gateChoice, gateChoice);
      set({ sound: { enabled: gateChoice === "sound", gateChoice } });
    },
    setDebug: (debug) => set({ debug }),
    setQuickView: (quickView) => set({ quickView }),
    setTier: (tier) => set((s) => ({ graphics: { ...s.graphics, tier } })),
    setBackend: (backend) => set((s) => ({ graphics: { ...s.graphics, backend } })),
    setCanvasReady: (ready) => set((s) => ({ graphics: { ...s.graphics, ready } })),
    setActiveScenes: (active) =>
      set((s) =>
        s.scenes.active.length === active.length && s.scenes.active.every((id, i) => id === active[i])
          ? s
          : { scenes: { ...s.scenes, active } },
      ),
    setDrawCalls: (drawCalls) => set((s) => ({ scenes: { ...s.scenes, drawCalls } })),
    unlockAchievement: (id) => {
      if (get().achievements.includes(id)) return false;
      const achievements = [...get().achievements, id];
      write(storages.local(), STORAGE_KEYS.achievements, JSON.stringify(achievements));
      set({ achievements });
      return true;
    },
    hydrate: (domTheme) => {
      const gate = read(storages.session(), STORAGE_KEYS.gateChoice);
      const gateChoice: GateChoice | null = gate === "sound" || gate === "silent" ? gate : null;
      const savedTheme = read(storages.local(), STORAGE_KEYS.theme);
      set((s) => ({
        theme: savedTheme === "light" || savedTheme === "dark" ? savedTheme : (domTheme ?? s.theme),
        sound: { enabled: gateChoice === "sound", gateChoice },
        achievements: parseAchievements(read(storages.local(), STORAGE_KEYS.achievements)),
      }));
    },
  }));
}

/** Store único de la aplicación. Importar solo desde componentes de cliente. */
export const appStore = createAppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
