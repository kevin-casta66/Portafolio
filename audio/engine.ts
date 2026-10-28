/**
 * Motor de audio en vivo (change 08b, design D1–D11). Se importa de forma DINÁMICA solo tras elegir
 * sonido en la puerta (o con una preferencia guardada, ya resuelta la puerta): aquí vive `tone`, así que
 * nada de esto entra en el JS inicial.
 *
 * Une la mezcla (`mix.ts`, solo Tone) con el mundo: el contexto de audio que el gesto del visitante
 * desbloqueó, el store (volumen, música, efectos, silencio), el scroll (velocidad), la pestaña oculta,
 * `prefers-reduced-motion`, el tema, los vídeos con audio y la Vista Rápida. Se registra en la fachada
 * (`audio.registerEngine`) para recibir los eventos de `audio.emit`.
 */
import * as Tone from "tone";
import { achievements } from "@/content/achievements";
import { appStore } from "@/lib/store";
import { onReducedMotionChange, prefersReducedMotion } from "@/motion/reduced";
import { subscribeVelocity } from "@/motion/velocity";
import { audio, setSoundProbe, type AudioEvent, type AudioEventMap, type AudioSink } from "./index";
import { createMix, type Mix } from "./mix";
import { loadStems, type LoadedStems } from "./sources";
import { SFX } from "./sfx";

/** Segundos sin scroll tras los que la música se recoge (−3 dB y filtro cerrado). */
const QUIET_AFTER_MS = 2000;
/** Fundido a silencio de la pestaña oculta y espera antes de suspender el contexto. */
const HIDE_SUSPEND_MS = 480;
/** Si la puerta nunca avisa del fin del arranque, la mezcla sale de BOOT pasado este tiempo. */
const BOOT_FALLBACK_MS = 14000;
/** Efectos que siguen sonando en la Vista Rápida (efectos mínimos). */
const QUICK_VIEW_SFX: ReadonlySet<AudioEvent> = new Set<AudioEvent>(["ui:toggle", "ui:enter", "ui:open"]);

export interface EngineHandle {
  readonly mix: Mix;
  /** Silencio inmediato (< 150 ms) y suspensión del contexto. */
  mute(): void;
  unmute(): void;
  dispose(): void;
}

let live: EngineHandle | null = null;

export function currentEngine(): EngineHandle | null {
  return live;
}

/** Modo de movimiento reducido (sistema o control manual, change 09): una sola fuente, `lib/experience.ts`. */
const reducedMotion = (): boolean => prefersReducedMotion();

/** Solo con `?motionTest`: el motor registra los efectos reproducidos/descartados y mide picos. */
const testMode = (): boolean => typeof window !== "undefined" && window.location.search.includes("motionTest");

const currentTheme = (): "light" | "dark" =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

/**
 * Arranca el motor con el `AudioContext` que desbloqueó el gesto del visitante. Devuelve el mando del
 * motor (silenciar, reanudar, liberar). Un segundo arranque reutiliza el motor vivo. Si el build declara
 * stems (`NEXT_PUBLIC_AUDIO_STEMS=1`) y existen, se descargan antes de empezar; si no, la música se genera.
 */
export function startEngine(ctx: AudioContext): Promise<EngineHandle> {
  if (live) return Promise.resolve(live);
  starting ??= loadStems()
    .then((stems) => createEngine(ctx, stems))
    .finally(() => {
      starting = null;
    });
  return starting;
}

let starting: Promise<EngineHandle> | null = null;

function createEngine(ctx: AudioContext, stems: LoadedStems | null): EngineHandle {
  if (live) return live;

  // Tone crea un contexto propio al importarse: se libera para quedarnos solo con el que desbloqueó el gesto.
  Tone.setContext(ctx, true);
  const state = appStore.getState();
  const mix = createMix({
    volume: state.sound.volume,
    music: state.sound.music,
    sfx: state.sound.sfx,
    reducedMotion: reducedMotion(),
    theme: currentTheme(),
    achievementIds: achievements.map((a) => a.id),
    reverb: state.graphics.tier === "low" ? "low" : "high",
    bootDone: audio.gate.bootDone,
    trace: testMode(),
    ...(stems ? { stems } : {}),
  });

  let muted = !state.sound.enabled;
  let hidden = false;
  let mediaPlaying = 0;
  let quickView = false;
  let suspendTimer: number | null = null;
  let bootTimer: number | null = null;

  const cancelSuspend = () => {
    if (suspendTimer !== null) window.clearTimeout(suspendTimer);
    suspendTimer = null;
  };
  /** Con la salida en silencio se suspende el contexto: no gasta CPU. */
  const suspendLater = (ms: number) => {
    cancelSuspend();
    suspendTimer = window.setTimeout(() => {
      if ((muted || hidden) && ctx.state === "running") void ctx.suspend();
    }, ms);
  };
  const wake = async () => {
    cancelSuspend();
    if (ctx.state !== "running") await ctx.resume();
  };

  // ── Eventos del catálogo ──
  const sink: AudioSink = {
    handle<K extends AudioEvent>(event: K, payload: AudioEventMap[K]) {
      if (muted || hidden) {
        // Los eventos de contexto sí actualizan la mezcla (al volver a sonar está en la fase correcta);
        // los efectos no suenan en silencio.
        if (!event.startsWith("phase:") && event !== "case:enter" && event !== "case:leave" && event !== "notfound:enter" && event !== "notfound:restart" && event !== "boot:done") {
          if (SFX[event]) mix.traceDrop(event, "silence");
          return;
        }
      }
      switch (event) {
        case "theme":
          mix.setTheme((payload as AudioEventMap["theme"]).theme);
          return;
        case "media:play":
          mediaPlaying++;
          mix.setDuck(mediaPlaying);
          return;
        case "media:stop":
          mediaPlaying = Math.max(0, mediaPlaying - 1);
          mix.setDuck(mediaPlaying);
          return;
        case "quickview:on":
          quickView = true;
          mix.setQuick(true);
          return;
        case "quickview:off":
          quickView = false;
          mix.setQuick(false);
          return;
        case "boot:done":
          if (bootTimer !== null) window.clearTimeout(bootTimer);
          bootTimer = null;
          break;
        default:
          break;
      }
      if (quickView && SFX[event] && !QUICK_VIEW_SFX.has(event)) {
        mix.traceDrop(event, "quickview");
        return;
      }
      mix.handle(event, payload);
    },
  };

  const unregister = audio.registerEngine(sink, mix.controls);
  // Gancho de pruebas: foto del motor, registro de efectos y picos medidos (pico del bus de efectos y de la salida).
  let stopPeaks = () => {};
  const peaks = { sfx: 0, master: 0 };
  if (testMode()) {
    const timer = window.setInterval(() => {
      const w = mix.waves();
      for (const ch of w.sfx) for (let i = 0; i < ch.length; i++) peaks.sfx = Math.max(peaks.sfx, Math.abs(ch[i] as number));
      for (const ch of w.master) for (let i = 0; i < ch.length; i++) peaks.master = Math.max(peaks.master, Math.abs(ch[i] as number));
    }, 12);
    stopPeaks = () => window.clearInterval(timer);
  }
  const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-6));
  setSoundProbe({
    snapshot: () => ({ ...mix.snapshot(), enabled: !muted, hidden, media: mediaPlaying, quickView }),
    sfxLog: () => [...mix.sfxLog()],
    clearSfxLog: () => mix.clearSfxLog(),
    levels: (reset = true) => {
      const out = { sfxPeakDb: toDb(peaks.sfx), masterPeakDb: toDb(peaks.master), musicDb: mix.musicLevelDb() };
      if (reset) {
        peaks.sfx = 0;
        peaks.master = 0;
      }
      return out;
    },
  });

  // La puerta ya mostró líneas [ OK ] antes de que hubiese motor: suenan como una escalera rápida.
  if (!audio.gate.bootDone) {
    mix.bootRun(audio.gate.lines);
    bootTimer = window.setTimeout(() => mix.handle("boot:done", undefined as never), BOOT_FALLBACK_MS);
  }

  // ── Store: volumen, música, efectos y silencio ──
  const stopStore = appStore.subscribe((next, prev) => {
    if (next.sound.volume !== prev.sound.volume) mix.setVolume(next.sound.volume);
    if (next.sound.music !== prev.sound.music) mix.setMusic(next.sound.music);
    if (next.sound.sfx !== prev.sound.sfx) mix.setSfx(next.sound.sfx);
    if (next.sound.enabled !== prev.sound.enabled) {
      if (next.sound.enabled) handle.unmute();
      else handle.mute();
    }
  });

  // ── Scroll: la música se abre con la velocidad y se recoge tras 2 s de quietud ──
  let hasScrolled = false;
  let quietTimer: number | null = null;
  let lastScrollPush = 0;
  const stopVelocity = subscribeVelocity((v) => {
    const magnitude = Math.abs(v);
    const now = performance.now();
    if (magnitude >= 0.03) {
      hasScrolled = true;
      if (quietTimer !== null) window.clearTimeout(quietTimer);
      quietTimer = null;
      mix.setQuiet(false);
    } else if (hasScrolled && quietTimer === null) {
      quietTimer = window.setTimeout(() => {
        quietTimer = null;
        mix.setQuiet(true);
      }, QUIET_AFTER_MS);
    }
    if (now - lastScrollPush > 70 || magnitude < 0.03) {
      lastScrollPush = now;
      mix.setScroll(magnitude);
    }
  });

  // ── Pestaña oculta: fundido a silencio y pausa del Transport; al volver, reanudación con fundido ──
  const onVisibility = () => {
    if (document.hidden) {
      hidden = true;
      mix.pause();
      suspendLater(HIDE_SUSPEND_MS);
    } else {
      hidden = false;
      if (!muted) void wake().then(() => mix.resume());
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // ── Movimiento reducido ──
  const stopMotion = onReducedMotionChange((reduced) => mix.setReduced(reduced));

  const handle: EngineHandle = {
    mix,
    mute() {
      muted = true;
      mix.mute();
      suspendLater(170);
    },
    unmute() {
      muted = false;
      void wake().then(() => {
        if (hidden) return;
        mix.unmute();
        if (Tone.getTransport().state !== "started") Tone.getTransport().start();
      });
    },
    dispose() {
      cancelSuspend();
      if (quietTimer !== null) window.clearTimeout(quietTimer);
      if (bootTimer !== null) window.clearTimeout(bootTimer);
      stopStore();
      stopVelocity();
      document.removeEventListener("visibilitychange", onVisibility);
      stopMotion();
      stopPeaks();
      setSoundProbe(null);
      unregister();
      mix.mute();
      window.setTimeout(() => mix.dispose(), 400);
      if (live === handle) live = null;
    },
  };

  live = handle;
  mix.start();
  if (muted) {
    // Preferencia guardada con el sonido desactivado: el motor queda cargado pero en silencio.
    mix.mute();
    suspendLater(170);
  }
  return handle;
}
