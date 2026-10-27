import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type Phase =
  "boot" | "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu" | "display";
export type Theme = "dark" | "light";
export type GateChoice = "sound" | "silent";
export type QualityTier = "auto" | "high" | "medium" | "low";
/** `pending` hasta que el motor 3D (change 04) determina el backend tras `init()`. */
export type GraphicsBackend = "pending" | "webgpu" | "webgl2" | "none";

export type CursorPref = "custom" | "system";

export const STORAGE_KEYS = {
  theme: "portafolio:theme",
  gateChoice: "portafolio:gate",
  achievements: "portafolio:achievements",
  /** localStorage: preferencias del visitante (`{ sound, cursor, volume, music, sfx, hintShown }`). */
  prefs: "portafolio:prefs",
  /** sessionStorage: el modo Debug dura la sesión del navegador. */
  debug: "portafolio:debug",
  /** sessionStorage: la Vista Rápida se conserva al navegar (la URL es la fuente compartible). */
  quickView: "portafolio:quick",
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

/** Preferencias persistidas entre visitas (slice `prefs`, localStorage). */
interface StoredPrefs {
  sound: boolean;
  cursor: CursorPref;
  /** Volumen general (0–1), interruptores de música y efectos, y si ya se mostró el aviso «Pulsa M». */
  volume: number;
  music: boolean;
  sfx: boolean;
  hintShown: boolean;
}

/** Volumen inicial del master (docs/ADDENDUM-v3.md §7). */
export const DEFAULT_VOLUME = 0.35;
const clampVolume = (v: number): number => Math.min(1, Math.max(0, v));

function parsePrefs(raw: string | null): Partial<StoredPrefs> {
  if (raw === null) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object") return {};
    const { sound, cursor, volume, music, sfx, hintShown } = value as Record<string, unknown>;
    return {
      ...(typeof sound === "boolean" ? { sound } : {}),
      ...(cursor === "custom" || cursor === "system" ? { cursor } : {}),
      ...(typeof volume === "number" && Number.isFinite(volume) ? { volume: clampVolume(volume) } : {}),
      ...(typeof music === "boolean" ? { music } : {}),
      ...(typeof sfx === "boolean" ? { sfx } : {}),
      ...(typeof hintShown === "boolean" ? { hintShown } : {}),
    };
  } catch {
    return {};
  }
}

function writePrefs(storages: Storages, patch: Partial<StoredPrefs>): void {
  const current = parsePrefs(read(storages.local(), STORAGE_KEYS.prefs));
  write(storages.local(), STORAGE_KEYS.prefs, JSON.stringify({ ...current, ...patch }));
}

export interface AppState {
  phase: Phase;
  theme: Theme;
  sound: {
    enabled: boolean;
    gateChoice: GateChoice | null;
    /** Volumen general 0–1 (0,35 por defecto). */
    volume: number;
    /** Interruptores independientes del bus de música y del de efectos. */
    music: boolean;
    sfx: boolean;
    /** El aviso «Pulsa M para silenciar» ya se mostró (se persiste: una sola vez). */
    hintShown: boolean;
  };
  /** Preferencias del visitante que persisten entre visitas. */
  prefs: { cursor: CursorPref };
  /** Modo Debug (sesión). */
  debug: boolean;
  /** Qué muestra el modo Debug (no se persiste). */
  debugTools: { wireframe: boolean; boxes: boolean };
  quickView: boolean;
  /** Superficies abiertas (terminal, panel de atajos, lista de logros): no se persisten. */
  ui: { terminalOpen: boolean; shortcutsOpen: boolean; achievementsOpen: boolean; mixerOpen: boolean };
  /** Logros recién desbloqueados que aún no se han mostrado como aviso (cola FIFO). */
  toastQueue: string[];
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
  setVolume: (volume: number) => void;
  setMusic: (music: boolean) => void;
  setSfx: (sfx: boolean) => void;
  /** Marca como mostrado el aviso «Pulsa M para silenciar». */
  markHintShown: () => void;
  setGateChoice: (choice: GateChoice) => void;
  setCursorPref: (cursor: CursorPref) => void;
  setDebug: (debug: boolean) => void;
  setDebugTool: (tool: "wireframe" | "boxes", value: boolean) => void;
  setQuickView: (quickView: boolean) => void;
  setUi: (ui: Partial<AppState["ui"]>) => void;
  /** Saca de la cola el aviso que ya se mostró (o se descartó). */
  shiftToast: () => void;
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
  sound: { enabled: false, gateChoice: null, volume: DEFAULT_VOLUME, music: true, sfx: true, hintShown: false },
  prefs: { cursor: "custom" },
  debug: false,
  debugTools: { wireframe: true, boxes: true },
  quickView: false,
  ui: { terminalOpen: false, shortcutsOpen: false, achievementsOpen: false, mixerOpen: false },
  graphics: { tier: "auto", backend: "pending", ready: false },
  achievements: [],
  toastQueue: [],
  bootDone: false,
} as const satisfies Partial<AppState>;

export function createAppStore(storages: Storages = browserStorages) {
  return createStore<AppState>()((set, get) => ({
    phase: DEFAULT_STATE.phase,
    theme: DEFAULT_STATE.theme,
    sound: { ...DEFAULT_STATE.sound },
    prefs: { ...DEFAULT_STATE.prefs },
    debug: DEFAULT_STATE.debug,
    debugTools: { ...DEFAULT_STATE.debugTools },
    quickView: DEFAULT_STATE.quickView,
    ui: { ...DEFAULT_STATE.ui },
    toastQueue: [],
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
    setSoundEnabled: (enabled) => {
      writePrefs(storages, { sound: enabled });
      set((s) => ({ sound: { ...s.sound, enabled } }));
    },
    setVolume: (volume) => {
      const v = clampVolume(volume);
      writePrefs(storages, { volume: v });
      set((s) => ({ sound: { ...s.sound, volume: v } }));
    },
    setMusic: (music) => {
      writePrefs(storages, { music });
      set((s) => ({ sound: { ...s.sound, music } }));
    },
    setSfx: (sfx) => {
      writePrefs(storages, { sfx });
      set((s) => ({ sound: { ...s.sound, sfx } }));
    },
    markHintShown: () => {
      writePrefs(storages, { hintShown: true });
      set((s) => (s.sound.hintShown ? s : { sound: { ...s.sound, hintShown: true } }));
    },
    setGateChoice: (gateChoice) => {
      write(storages.session(), STORAGE_KEYS.gateChoice, gateChoice);
      writePrefs(storages, { sound: gateChoice === "sound" });
      set((s) => ({ sound: { ...s.sound, enabled: gateChoice === "sound", gateChoice } }));
    },
    setCursorPref: (cursor) => {
      writePrefs(storages, { cursor });
      set({ prefs: { cursor } });
    },
    setDebug: (debug) => {
      write(storages.session(), STORAGE_KEYS.debug, debug ? "1" : "0");
      set({ debug });
    },
    setDebugTool: (tool, value) => set((s) => ({ debugTools: { ...s.debugTools, [tool]: value } })),
    setQuickView: (quickView) => {
      write(storages.session(), STORAGE_KEYS.quickView, quickView ? "1" : "0");
      set({ quickView });
    },
    setUi: (ui) => set((s) => ({ ui: { ...s.ui, ...ui } })),
    shiftToast: () => set((s) => (s.toastQueue.length === 0 ? s : { toastQueue: s.toastQueue.slice(1) })),
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
      set((s) => ({ achievements, toastQueue: [...s.toastQueue, id] }));
      return true;
    },
    hydrate: (domTheme) => {
      const gate = read(storages.session(), STORAGE_KEYS.gateChoice);
      const gateChoice: GateChoice | null = gate === "sound" || gate === "silent" ? gate : null;
      const savedTheme = read(storages.local(), STORAGE_KEYS.theme);
      const prefs = parsePrefs(read(storages.local(), STORAGE_KEYS.prefs));
      set((s) => ({
        theme: savedTheme === "light" || savedTheme === "dark" ? savedTheme : (domTheme ?? s.theme),
        // La elección de la puerta (sesión) manda; sin ella, la preferencia guardada; sin ninguna, silencio.
        sound: {
          enabled: gateChoice !== null ? gateChoice === "sound" : (prefs.sound ?? false),
          gateChoice,
          volume: prefs.volume ?? s.sound.volume,
          music: prefs.music ?? s.sound.music,
          sfx: prefs.sfx ?? s.sound.sfx,
          hintShown: prefs.hintShown ?? s.sound.hintShown,
        },
        prefs: { cursor: prefs.cursor ?? s.prefs.cursor },
        debug: read(storages.session(), STORAGE_KEYS.debug) === "1",
        quickView: read(storages.session(), STORAGE_KEYS.quickView) === "1" || s.quickView,
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
