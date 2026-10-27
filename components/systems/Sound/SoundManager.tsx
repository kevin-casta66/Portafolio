"use client";

import { useEffect } from "react";
import { armAudioUnlockOnFirstGesture, audioUnlock, getAudioContext } from "@/lib/audio";
import { on } from "@/lib/events";
import { appStore } from "@/lib/store";
import { PHASES, type PhaseId } from "@/motion/phase";
import { subscribeVelocity } from "@/motion/velocity";
import { ambienceLoop, phasesToPreload, toneFor, uiSound, type UiSoundName } from "./synth";

/** Fundido cruzado entre ambientes al cambiar de fase (s). */
const CROSSFADE_S = 1.2;
/** Constante de tiempo del silencio instantáneo: -60 dB en ~0,1 s, bien por debajo de los 150 ms exigidos. */
const MUTE_TAU_S = 0.012;
const BUS = { master: 0.9, ambience: 0.22, ui: 0.07, tone: 1 } as const;

/** Motor vigente: un motor viejo que se apaga no debe suspender el contexto que ya usa el nuevo. */
let liveEngine: object | null = null;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface TestHook {
  /** Ganancia actual del master (0 = silencio). */
  master(): number;
  state(): string;
  /** Fases cuyo ambiente se ha sintetizado (precarga). */
  generated(): string[];
  /** Fases con voz sonando (ganancia > 0). */
  playing(): string[];
  /** Nivel RMS de la salida (analizador), para medir el silencio. */
  rms(): number;
  tone(): { hz: number; gain: number };
}

declare global {
  interface Window {
    __portafolioSound?: TestHook;
  }
}

/**
 * Diseño sonoro (design D8) con la Web Audio API, TODO sintetizado en el cliente (`synth.ts`): no se
 * descarga ningún audio. Se monta cuando el sonido se activa por primera vez y gestiona su propio
 * encendido/apagado (el silencio es instantáneo, < 150 ms):
 *
 *  - Grafo: `master` ← buses `ambience`, `ui` y `tone`.
 *  - Ambiente distinto por fase, con fundido cruzado de ~1,2 s; solo se sintetizan la fase actual y la siguiente.
 *  - Tono continuo cuya altura sigue la velocidad de scroll (acotado), que vuelve suavemente al reposo.
 *  - Sonidos de UI (tecleo, controles, logros) con el bus `ui`, más bajo que el ambiente.
 *  - Pestaña oculta: el contexto se suspende; al volver se reanuda.
 *  - El `AudioContext` lo crea/reanuda el gesto del visitante (puerta de arranque o botón de sonido).
 */
export default function SoundManager() {
  useEffect(() => {
    let engine: ReturnType<typeof createEngine> | null = null;
    let disposed = false;
    let cancelGesture: (() => void) | null = null;

    /** Crea el grafo con el contexto del gesto (puerta o botón) y lo enciende. */
    const ensureEngine = (): boolean => {
      if (engine) return true;
      const ctx = getAudioContext();
      if (!ctx || disposed) return false;
      engine = createEngine(ctx);
      engine.setPhase(appStore.getState().phase);
      return true;
    };

    /** Con el sonido activado: enciende ya si hay contexto; si no (preferencia guardada), espera al primer gesto. */
    const turnOn = () => {
      if (ensureEngine()) {
        engine?.unmute();
        return;
      }
      if (cancelGesture) return;
      cancelGesture = armAudioUnlockOnFirstGesture();
      const onGesture = () => {
        cancelGesture = null;
        void audioUnlock().then(() => {
          if (appStore.getState().sound.enabled && ensureEngine()) engine?.unmute();
        });
      };
      for (const type of ["pointerdown", "keydown", "touchstart"] as const)
        window.addEventListener(type, onGesture, { capture: true, once: true, passive: true });
    };

    if (appStore.getState().sound.enabled) turnOn();

    const stopStore = appStore.subscribe((state, prev) => {
      if (state.sound.enabled !== prev.sound.enabled) {
        if (state.sound.enabled) turnOn();
        else engine?.mute();
      }
      if (state.phase !== prev.phase) engine?.setPhase(state.phase);
      if (state.toastQueue.length > prev.toastQueue.length) engine?.play("achievement");
    });
    const stopEvents = on("ui:sound", ({ name }) => engine?.play(name));
    const stopVelocity = subscribeVelocity((v) => engine?.setVelocity(v));
    const onVisibility = () => engine?.visibility(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stopStore();
      stopEvents();
      stopVelocity();
      cancelGesture?.();
      document.removeEventListener("visibilitychange", onVisibility);
      engine?.dispose();
      delete window.__portafolioSound;
    };
  }, []);

  return null;
}

function createEngine(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const ambienceBus = ctx.createGain();
  ambienceBus.gain.value = BUS.ambience;
  const uiBus = ctx.createGain();
  uiBus.gain.value = BUS.ui;
  const toneBus = ctx.createGain();
  toneBus.gain.value = BUS.tone;
  ambienceBus.connect(master);
  uiBus.connect(master);
  toneBus.connect(master);
  master.connect(ctx.destination);

  // Tono continuo: seno con paso bajo, altura y volumen siguen la velocidad de scroll (acotados).
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const toneFilter = ctx.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.value = 900;
  const toneGain = ctx.createGain();
  const rest = toneFor(0);
  osc.frequency.value = rest.hz;
  toneGain.gain.value = rest.gain;
  osc.connect(toneFilter).connect(toneGain).connect(toneBus);
  osc.start();

  const buffers = new Map<PhaseId, AudioBuffer>();
  const voices = new Map<PhaseId, Voice>();
  /** Voces que ya se están apagando (fundido de salida): siguen sonando hasta que acaba el cruce. */
  const fading = new Set<Voice>();
  let current: PhaseId | null = null;
  let muted = true;
  let velocity = 0;

  const bufferFor = (phase: PhaseId): AudioBuffer => {
    let buffer = buffers.get(phase);
    if (!buffer) {
      const data = ambienceLoop(phase, ctx.sampleRate);
      buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buffer.copyToChannel(new Float32Array(data), 0);
      buffers.set(phase, buffer);
    }
    return buffer;
  };
  const uiBuffers = new Map<UiSoundName, AudioBuffer>();

  const fade = (gain: GainNode, to: number, seconds: number) => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  };

  const startVoice = (phase: PhaseId) => {
    if (voices.has(phase)) return voices.get(phase) as Voice;
    const source = ctx.createBufferSource();
    source.buffer = bufferFor(phase);
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(ambienceBus);
    source.start();
    const voice = { source, gain };
    voices.set(phase, voice);
    return voice;
  };

  const stopVoice = (phase: PhaseId) => {
    const voice = voices.get(phase);
    if (!voice) return;
    fade(voice.gain, 0, CROSSFADE_S);
    voices.delete(phase);
    fading.add(voice);
    // El nodo se libera cuando el fundido termina.
    window.setTimeout(() => {
      fading.delete(voice);
      try {
        voice.source.stop();
      } catch {
        /* ya detenido */
      }
      voice.source.disconnect();
      voice.gain.disconnect();
    }, (CROSSFADE_S + 0.2) * 1000);
  };

  // Medición para las pruebas (solo con `?motionTest`): analizador a la salida.
  let analyser: AnalyserNode | null = null;
  if (new URLSearchParams(window.location.search).has("motionTest")) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    master.connect(analyser);
    const bins = new Float32Array(analyser.fftSize);
    window.__portafolioSound = {
      master: () => master.gain.value,
      state: () => ctx.state,
      generated: () => [...buffers.keys()],
      playing: () => [
        ...[...voices.entries()].filter(([, v]) => v.gain.gain.value > 0.001).map(([p]) => p),
        ...[...fading].filter((v) => v.gain.gain.value > 0.001).map(() => "fading"),
      ],
      rms: () => {
        analyser?.getFloatTimeDomainData(bins);
        return Math.sqrt(bins.reduce((s, v) => s + v * v, 0) / bins.length);
      },
      tone: () => ({ hz: osc.frequency.value, gain: toneGain.gain.value }),
    };
  }

  const api = {
    setPhase(phase: PhaseId | "boot") {
      if (phase === "boot") return;
      // Precarga: solo la fase actual y la siguiente.
      for (const p of phasesToPreload(phase, PHASES)) bufferFor(p);
      if (phase === current) return;
      const previous = current;
      current = phase;
      if (previous) stopVoice(previous);
      const voice = startVoice(phase);
      fade(voice.gain, muted ? 0 : 1, CROSSFADE_S);
    },
    setVelocity(v: number) {
      velocity = v;
      const { hz, gain } = toneFor(velocity);
      const now = ctx.currentTime;
      // Suavizado exponencial: sube rápido con el scroll y vuelve despacio al reposo al detenerse.
      osc.frequency.setTargetAtTime(hz, now, 0.08);
      toneGain.gain.setTargetAtTime(gain, now, 0.12);
    },
    /** Silencio inmediato de TODO el audio (ambiente, UI y tono): master a 0 en ~0,1 s. */
    mute() {
      muted = true;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.setTargetAtTime(0, now, MUTE_TAU_S);
      // Con la salida a cero se suspende el contexto: no gasta CPU en silencio.
      window.setTimeout(() => {
        if (muted && ctx.state === "running" && (liveEngine === null || liveEngine === api)) void ctx.suspend();
      }, 160);
    },
    unmute() {
      muted = false;
      void ctx.resume().then(() => {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(BUS.master, now + 0.08);
        if (current) fade(startVoice(current).gain, 1, CROSSFADE_S);
      });
    },
    /** Pestaña oculta: se pausa el audio; al volver se reanuda (solo si el sonido sigue activo). */
    visibility(visible: boolean) {
      if (!visible) void ctx.suspend();
      else if (!muted) void ctx.resume();
    },
    play(name: UiSoundName) {
      if (muted || ctx.state !== "running") return;
      let buffer = uiBuffers.get(name);
      if (!buffer) {
        const data = uiSound(name, ctx.sampleRate);
        buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
        buffer.copyToChannel(new Float32Array(data), 0);
        uiBuffers.set(name, buffer);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(uiBus);
      source.start();
      source.onended = () => source.disconnect();
    },
    dispose() {
      api.mute();
      if (liveEngine === api) liveEngine = null;
      for (const phase of [...voices.keys()]) stopVoice(phase);
      window.setTimeout(() => {
        try {
          osc.stop();
        } catch {
          /* ya detenido */
        }
        master.disconnect();
      }, 400);
    },
  };
  liveEngine = api;
  return api;
}
