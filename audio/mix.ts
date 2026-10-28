/**
 * Mezcla y partitura de la pieza (ADDENDUM-v3 §2–§5, §8). Construye el grafo de audio (capas → buses
 * MÚSICA/EFECTOS → compresor → limitador −1 dBFS → master), programa las capas en el Transport
 * (84 BPM, 4/4, progresión de 4 compases) y reproduce los sonidos de interacción cuantizados al pulso.
 *
 * NO toca el DOM, el store ni `window`: solo Tone. Así el mismo código sirve para el contexto en vivo
 * (`engine.ts`) y para `Tone.Offline` (las muestras de escucha y las medidas de nivel de los tests).
 */
import * as Tone from "tone";
import {
  KEYS_PATTERN,
  LAYER_TRIM_DB,
  MIX,
  PERC_STEPS,
  arpActiveSteps,
  arpNote,
  changedLayers,
  dominantOf,
  effectiveGain,
  mulberry32,
  shimmerSteps,
  BASS_VELOCITY,
  type MixSpec,
} from "./layers";
import { Arp, Bass, Keys, Pad, Perc, SfxKit, Shimmer, makeImpulse } from "./patches";
import { createStemPlayers, type LoadedStems, type MusicSource } from "./sources";
import {
  BAR_S,
  BEAT_S,
  BPM,
  MOTIF,
  PENTATONIC,
  PROGRESSION,
  SKILL_NOTE,
  TOKEN_NOTE,
  dbToGain,
  pentatonicAt,
  skillChord,
  variationFor,
  type Subdivision,
} from "./scale";
import { SFX, SFX_MAX_S, type SfxDef } from "./sfx";
import { RateLimiter, VoiceBudget } from "./voices";
import {
  HERO_NOTE_EVERY,
  LAYER_IDS,
  type AudioControls,
  type AudioEvent,
  type AudioEventMap,
  type LayerId,
  type LayerState,
  type MixContext,
} from "./types";

/** Ganancia de calibración del master: con el volumen al 35 % la música queda ≈ −22 LUFS (se mide en los tests). */
const MASTER_CAL = 1;
/** Techo del limitador (dBFS) y ganancia previa del bus de suma (calibración de nivel: con el master al 35 % la música queda ≈ −22 LUFS). */
const LIMITER_DB = -1.5;
/** Techo absoluto de la salida (dBFS): el recorte suave final no deja pasar nada por encima. */
const CEILING_DBFS = -1;
/** Curva del recorte suave: lineal hasta ~80 % del techo y tanh por encima; |y| < techo siempre. */
function softClip(ceilingDb: number): (x: number) => number {
  const c = 10 ** (ceilingDb / 20);
  return (x) => c * Math.tanh(x / c);
}
const PRE_GAIN_DB = 6;
/** Ducking de la música mientras suena un efecto (dB). */
const DUCK_DB = -3;
/** Nivel del clic mecánico que acompaña a cada letra del nombre del hero (dB sobre la referencia de la tecla). */
const HERO_CLICK_DB = -8;
/** Ajuste del nivel de los efectos según lo fuerte que suena la música de cada fase (dB medidos, para que sigan 0…+6 dB sobre ella). */
const SFX_PHASE_DB: Partial<Record<MixContext, number>> = { bytecode: 1, runtime: 2, gpu: 0.5 };
/** Compás de entrada del pad (s) y duración de los fundidos de capa. */
const LAYER_FADE_S = 1.6;
const FADE_IN_S = 3;

/** `Tone.Part` con eventos `[tiempo, valor]` (los tipos de Tone para `events` son demasiado laxos). */
function makePart<T>(callback: (time: number, value: T) => void, events: [string, T][]): Tone.Part<T> {
  const part = new Tone.Part<T>(callback as never, events as never);
  part.loop = true;
  part.loopEnd = "4m";
  return part;
}

export interface MixOptions {
  /** Volumen general inicial 0..1. */
  volume?: number;
  music?: boolean;
  sfx?: boolean;
  reducedMotion?: boolean;
  theme?: "light" | "dark";
  /** Ids de logros conocidos en orden (para que cada uno suene distinto). */
  achievementIds?: readonly string[];
  /** Semilla de la humanización (determinista en los tests). */
  seed?: number;
  /** Calidad de la reverb de convolución: `low` usa respuestas más cortas (menos CPU). */
  reverb?: "high" | "low" | "off";
  /** La puerta de arranque ya terminó: la pieza empieza directamente en la fase actual (sin contexto BOOT). */
  bootDone?: boolean;
  /** Archivos de capas producidos: sustituyen a los patches generativos (misma lógica de capas y mezcla). */
  stems?: LoadedStems;
  /** Registra cada efecto reproducido o descartado (con motivo) y mantiene un analizador del bus de efectos (solo pruebas). */
  trace?: boolean;
}

/** Motivo por el que un efecto no suena (gancho de pruebas, change 08c). */
export type SfxDropReason = "rate" | "voices" | "silence" | "quickview" | "reduced";

export interface SfxLogEntry {
  event: string;
  status: "played" | "dropped";
  reason?: SfxDropReason;
  /** Instante del reloj de audio (ms). */
  at: number;
  /** Retraso (ms) entre el evento y el instante en que empieza a sonar (cuantización incluida, sin el adelanto de Tone). */
  delayMs?: number;
}

export interface MixSnapshot {
  context: MixContext;
  bpm: number;
  running: boolean;
  layers: { id: LayerId; gain: number; target: number; muted: boolean; solo: boolean }[];
  /** Niveles en dB (RMS suavizado) por bus. */
  rms: { music: number; sfx: number; master: number };
  /** Pico en dBFS de la salida (ventana reciente). */
  peak: number;
  voices: number;
  voicePeak: number;
  voicesRejected: number;
  /** De dónde sale la música: patches generativos o archivos de capas. */
  source: MusicSource;
  /** Notas disparadas por capa desde el arranque. */
  triggered: Record<LayerId, number>;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  trimDb: number;
  cutoff: number;
  reverb: number;
  reduced: boolean;
  tape: boolean;
  /** El riser del Hold-to-Execute está sonando. */
  riser: boolean;
  /** Milisegundos hasta el siguiente compás (null si el transport no corre). */
  nextBarMs: number | null;
  /** Ganancia actual del master (0 = silencio). */
  masterGain: number;
  /** Atenuación actual del ducking de la música por efectos (dB, ≤ 0). */
  duckDb: number;
  /** Adelanto del planificador de Tone (ms): los efectos suenan como pronto tras este tiempo. */
  lookAheadMs: number;
  /** Recorte actual de los efectos (dB): acompaña al de la música en casos de estudio y en la quietud. */
  sfxTrimDb: number;
}

export class Mix {
  readonly controls: AudioControls;

  private readonly transport = Tone.getTransport();
  private readonly budget = new VoiceBudget({ max: 12, sfxReserve: 3 });
  private readonly limiter = new RateLimiter();
  private readonly rnd: () => number;
  private readonly achievementIds: readonly string[];

  // Buses y cadena maestra
  private readonly sumBus = new Tone.Gain(dbToGain(PRE_GAIN_DB));
  private readonly highpass = new Tone.Filter({ type: "highpass", frequency: 60, rolloff: -12 });
  private readonly presence = new Tone.Filter({ type: "peaking", frequency: 3300, Q: 0.7, gain: -2 });
  private readonly shelf = new Tone.Filter({ type: "highshelf", frequency: 5200, gain: -1.5 });
  private readonly compressor = new Tone.Compressor({ threshold: -14, ratio: 2, attack: 0.03, release: 0.25, knee: 12 });
  /** Atrapa-picos rápido (ratio alto, ataque de 1 ms) delante del limitador: el limitador de Tone solo tiene ataque de 3 ms. */
  private readonly peakGuard = new Tone.Compressor({ threshold: -6, ratio: 14, attack: 0.001, release: 0.08, knee: 0 });
  private readonly ceiling = new Tone.Limiter(LIMITER_DB);
  /** Última red de seguridad: recorte suave que NUNCA pasa de −1 dBFS (|y| < 0,891), aunque un pico se cuele. */
  private readonly clipper = new Tone.WaveShaper(softClip(CEILING_DBFS), 4096);
  private readonly master = new Tone.Gain(0);

  // Música
  private readonly musicIn = new Tone.Gain(1);
  private readonly musicRevSend = new Tone.Gain(0.3);
  private readonly musicConv: Tone.Convolver;
  private readonly musicRevReturn = new Tone.Gain(1);
  private readonly musicFilter = new Tone.Filter({ type: "lowpass", frequency: 700, rolloff: -12, Q: 0.4 });
  private readonly musicTrim = new Tone.Gain(1);
  private readonly musicSwitch = new Tone.Gain(1);
  /** Ducking: el reproductor de efectos baja la música ~3 dB mientras suena (ataque ~20 ms, liberación ~250 ms). */
  private readonly musicDuck = new Tone.Gain(1);

  // Efectos
  private readonly kit = new SfxKit();
  /** Los efectos acompañan a la música en el recorte de caso de estudio y en la quietud (siempre 0…+6 dB sobre ella). */
  private readonly sfxTrim = new Tone.Gain(1);
  private readonly sfxRevSend = new Tone.Gain(0.22);
  private readonly sfxConv: Tone.Convolver;
  private readonly sfxRevReturn = new Tone.Gain(1);
  private readonly sfxSwitch = new Tone.Gain(1);

  // Instrumentos
  private readonly pad = new Pad();
  private readonly keys = new Keys();
  private readonly arp = new Arp();
  private readonly bass = new Bass();
  private readonly perc = new Perc();
  private readonly shimmer = new Shimmer();
  private readonly layerGain = {} as Record<LayerId, Tone.Gain>;
  private readonly layerMeter = {} as Record<LayerId, Tone.Meter>;
  private readonly parts: Tone.Part[] = [];
  private readonly stemPlayers: Record<LayerId, Tone.Player> | null;
  readonly source: MusicSource;

  // Medidores
  private readonly musicMeter = new Tone.Meter({ smoothing: 0.85 });
  private readonly sfxMeter = new Tone.Meter({ smoothing: 0.85 });
  private readonly masterMeter = new Tone.Meter({ smoothing: 0.85 });
  private readonly waveform = new Tone.Analyser("waveform", 1024);
  private readonly fft = new Tone.Analyser("fft", 64);
  /** Solo con `trace`: formas de onda crudas ESTÉREO del bus de efectos y de la salida (para medir picos de ambos canales). */
  private readonly sfxWave: Tone.Analyser | null;
  private readonly masterWave: Tone.Analyser | null;
  /** Solo con `trace`: medidores sin suavizado antes y después del ducking (su diferencia es la atenuación real en dB). */
  private readonly duckProbe: { pre: Tone.Meter; post: Tone.Meter } | null;
  private readonly trace: boolean;
  private sfxLogItems: SfxLogEntry[] = [];

  // Estado
  private context: MixContext = "boot";
  private spec: MixSpec = MIX.boot;
  /** Fase pedida por el scroll, capas que mandan sobre ella (caso, 404) y estado del arranque. */
  private basePhase: MixContext = "source";
  private overlay: "case" | "notfound" | null = null;
  private bootActive: boolean;
  private pendingEvent: number | null = null;
  private readonly muted = new Set<LayerId>();
  private readonly solo = new Set<LayerId>();
  private readonly listeners = new Set<() => void>();
  private readonly firstSoundListeners = new Set<() => void>();
  private firstSoundFired = false;
  private running = false;
  private musicOn: boolean;
  private sfxOn: boolean;
  private volume: number;
  private reduced: boolean;
  private caseTrimDb = 0;
  private quietDb = 0;
  private duck = 0;
  private quick = false;
  private scroll = 0;
  private quiet = false;
  private labCutoff = 0;
  private labReverb = 0;
  private tape = false;
  private hum: { noise: Tone.Noise; filter: Tone.Filter; gain: Tone.Gain } | null = null;
  private kickPulse = 0;
  private energySmooth = 0;
  /** Notas realmente disparadas por capa (para las pruebas: «cada fase activa sus capas»). */
  private readonly triggered: Record<LayerId, number> = { pad: 0, keys: 0, perc: 0, arp: 0, bass: 0, shimmer: 0 };

  constructor(options: MixOptions = {}) {
    this.rnd = mulberry32(options.seed ?? 0xa11ce);
    this.achievementIds = options.achievementIds ?? [];
    this.musicOn = options.music ?? true;
    this.sfxOn = options.sfx ?? true;
    this.volume = options.volume ?? 0.35;
    this.reduced = options.reducedMotion ?? false;
    this.bootActive = !(options.bootDone ?? false);
    this.trace = options.trace ?? false;
    const stereo = () => new Tone.Analyser({ type: "waveform", size: 1024, channels: 2 });
    this.sfxWave = this.trace ? stereo() : null;
    this.masterWave = this.trace ? stereo() : null;
    this.duckProbe = this.trace ? { pre: new Tone.Meter({ smoothing: 0 }), post: new Tone.Meter({ smoothing: 0 }) } : null;

    const quality = options.reverb ?? "high";
    const irScale = quality === "low" ? 0.45 : quality === "off" ? 0.05 : 1;
    this.musicConv = new Tone.Convolver({ url: makeImpulse(1.9 * irScale, 0.55, 11), normalize: true });
    this.sfxConv = new Tone.Convolver({ url: makeImpulse(0.9 * irScale, 0.65, 23), normalize: true });
    this.transport.bpm.value = BPM;
    this.transport.timeSignature = 4;
    this.transport.loop = false;

    // Capas → bus de música (seco) y envío a la reverb de música. Cada capa suena desde un patch
    // generativo o, si hay stems, desde un reproductor en bucle: la mezcla no distingue.
    this.stemPlayers = options.stems ? createStemPlayers(options.stems) : null;
    this.source = this.stemPlayers ? "stems" : "generative";
    const out = (node: { output: Tone.ToneAudioNode }) => ({ connect: (to: Tone.ToneAudioNode) => node.output.connect(to) });
    const layers: Record<LayerId, { connect(to: Tone.ToneAudioNode): unknown }> = this.stemPlayers
      ? { ...this.stemPlayers }
      : { pad: out(this.pad), keys: out(this.keys), arp: out(this.arp), bass: out(this.bass), perc: out(this.perc), shimmer: out(this.shimmer) };
    for (const id of LAYER_IDS) {
      const gain = new Tone.Gain(0);
      layers[id].connect(gain);
      gain.connect(this.musicIn);
      const meter = new Tone.Meter({ smoothing: 0.8 });
      gain.connect(meter);
      this.layerGain[id] = gain;
      this.layerMeter[id] = meter;
    }
    this.musicIn.connect(this.musicFilter);
    this.musicIn.connect(this.musicRevSend);
    this.musicRevSend.chain(this.musicConv, this.musicRevReturn, this.musicFilter);
    this.musicFilter.chain(this.musicTrim, this.musicSwitch, this.musicDuck, this.sumBus);

    // Efectos → bus de efectos y envío a su reverb corta.
    this.kit.output.connect(this.sfxTrim);
    this.sfxTrim.connect(this.sfxSwitch);
    this.sfxTrim.connect(this.sfxRevSend);
    this.sfxRevSend.chain(this.sfxConv, this.sfxRevReturn, this.sfxSwitch);
    this.sfxSwitch.connect(this.sumBus);

    // Cadena maestra: pasa-altos 60 Hz → atenuación 2–5 kHz → tema → compresor suave → limitador → volumen.
    this.sumBus.chain(this.highpass, this.presence, this.shelf, this.compressor, this.peakGuard, this.ceiling, this.clipper, this.master);
    this.master.toDestination();

    this.musicSwitch.connect(this.musicMeter);
    this.musicSwitch.connect(this.fft);
    this.sfxSwitch.connect(this.sfxMeter);
    if (this.sfxWave) this.sfxSwitch.connect(this.sfxWave);
    if (this.masterWave) this.master.connect(this.masterWave);
    if (this.duckProbe) {
      this.musicSwitch.connect(this.duckProbe.pre);
      this.musicDuck.connect(this.duckProbe.post);
    }
    this.master.connect(this.masterMeter);
    this.master.connect(this.waveform);

    this.budget.reserve(3);
    this.setTheme(options.theme ?? "dark", 0);
    this.musicSwitch.gain.value = this.musicOn ? 1 : 0;
    this.sfxSwitch.gain.value = this.sfxOn ? 1 : 0;
    this.context = this.bootActive ? "boot" : "source";
    this.spec = MIX[this.context];
    this.applyMix(this.spec, this.nowT(), 0.01);
    if (!this.stemPlayers) this.schedulePatterns();

    this.controls = this.makeControls();
  }

  // ───────────────────────────── Reloj ─────────────────────────────

  /** Instante «ahora» del reloj de audio; dentro de `runAt` es el del evento que se está simulando (Tone.Offline). */
  private fixedNow: number | null = null;
  private nowT(): number {
    return this.fixedNow ?? Tone.now();
  }

  /** Ejecuta `fn` como si «ahora» fuera `time` (las muestras de escucha y los tests de `Tone.Offline`). */
  runAt(time: number, fn: () => void): void {
    this.fixedNow = time;
    try {
      fn();
    } finally {
      this.fixedNow = null;
    }
  }

  // ───────────────────────────── Arranque, parada y volumen ─────────────────────────────

  /** Arranca el Transport y el pad; el master sube de 0 al volumen elegido con un fundido de 3 s. */
  start(fadeInS = FADE_IN_S): void {
    if (this.running) return;
    this.running = true;
    const now = this.nowT() + 0.05;
    this.transport.start(now);
    if (!this.stemPlayers) this.pad.start(PROGRESSION[0]!, now);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this.volume * MASTER_CAL, now + fadeInS);
    this.musicFilter.frequency.cancelScheduledValues(now);
    this.musicFilter.frequency.setValueAtTime(500, now);
    this.musicFilter.frequency.exponentialRampToValueAtTime(this.spec.cutoff, now + 4);
    this.fireFirstSound();
    this.notify();
  }

  /** Silencio inmediato (< 150 ms) sin parar el reloj (la tecla M / el botón). */
  mute(): void {
    const now = this.nowT();
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.setTargetAtTime(0, now, 0.012);
  }

  unmute(fadeS = 0.4): void {
    const now = this.nowT();
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.volume * MASTER_CAL, now + fadeS);
  }

  /** Pestaña oculta: fundido a silencio y pausa del Transport; al volver, reanudación con fundido. */
  pause(fadeS = 0.35): void {
    const now = this.nowT();
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + fadeS);
    this.transport.pause(now + fadeS);
  }

  resume(fadeS = 0.6): void {
    const now = this.nowT() + 0.02;
    if (this.transport.state === "paused") this.transport.start(now);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this.volume * MASTER_CAL, now + fadeS);
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.master.gain.rampTo(this.volume * MASTER_CAL, 0.12);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    this.musicSwitch.gain.rampTo(on ? 1 : 0, 0.8);
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    this.sfxSwitch.gain.rampTo(on ? 1 : 0, 0.15);
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    if (reduced) this.kit.riserCancel(this.nowT());
  }

  /** Tema claro: ecualización un poco más brillante; tema oscuro: más cálida. */
  setTheme(theme: "light" | "dark", rampS = 0.35): void {
    this.shelf.gain.rampTo(theme === "light" ? 1.5 : -1.5, rampS);
  }

  // ───────────────────────────── Contexto de mezcla (cuantizado al compás) ─────────────────────────────

  /** Cambia el contexto de mezcla; con el Transport en marcha entra en el siguiente compás. */
  setContext(next: MixContext, immediate = false): void {
    if (this.pendingEvent !== null) {
      this.transport.clear(this.pendingEvent);
      this.pendingEvent = null;
    }
    const apply = (time: number) => {
      this.pendingEvent = null;
      this.commitContext(next, time);
    };
    if (immediate || !this.running || this.transport.state !== "started") apply(this.nowT() + 0.01);
    else this.pendingEvent = this.transport.scheduleOnce(apply, this.nextBoundary("1m"));
  }

  /** Contexto que corresponde ahora: el arranque manda, luego caso/404 y, por último, la fase del scroll. */
  private requestContext(): void {
    const target: MixContext = this.bootActive ? "boot" : (this.overlay ?? this.basePhase);
    if (target === this.context && this.pendingEvent === null) return;
    // La 404 (y volver de ella) responde al instante: a 27 BPM un compás tardaría ~9 s en llegar.
    this.setContext(target, target === "notfound" || this.context === "notfound");
  }

  /** Las líneas [ OK ] que ya se mostraron en la puerta antes de elegir: una escalera rápida de notas ascendentes. */
  bootRun(lines: number): void {
    const n = Math.min(6, Math.max(0, lines));
    const start = this.nowT() + 0.08;
    for (let i = 0; i < n; i++) {
      if (!this.budget.acquire("sfx", start + i * 0.17, 0.9, 0)) continue;
      this.kit.note(pentatonicAt(i), start + i * 0.17, 0.2, 0.55);
    }
  }

  private commitContext(next: MixContext, time: number): void {
    const prev = this.spec;
    const wasTape = this.tape;
    this.context = next;
    this.spec = MIX[next];
    changedLayers(prev, this.spec); // las capas que cambian se funden en applyMix
    this.applyMix(this.spec, time, LAYER_FADE_S);
    this.setTape(next === "notfound", time);
    if (wasTape !== this.tape) this.notify();
    this.notify();
  }

  /** Ganancias de capa, recorte, filtro y reverb de una mezcla (fundidos que empiezan en `time`). */
  private applyMix(spec: MixSpec, time: number, rampS: number): void {
    for (const id of LAYER_IDS) {
      const target = effectiveGain(id, spec, { muted: this.muted, solo: this.solo }) * dbToGain(LAYER_TRIM_DB[id]);
      this.layerGain[id].gain.rampTo(target, rampS, time);
    }
    this.caseTrimDb = spec.trimDb;
    // `time` SIEMPRE explícito: esto se ejecuta dentro de callbacks del Transport (Tone avisa si no se usa el tiempo recibido).
    this.updateTrim(rampS, time);
    this.arp.setCrush(spec.crush, rampS, time);
    this.updateFilter(rampS, time);
    this.updateReverb(rampS, time);
  }

  /** Ganancia efectiva de una capa ahora (sin esperar al fundido), para decidir si dispara notas. */
  private layerTarget(id: LayerId): number {
    return effectiveGain(id, this.spec, { muted: this.muted, solo: this.solo });
  }

  private updateTrim(rampS = 1.2, at?: number): void {
    const gain = this.quick ? 0 : dbToGain(this.caseTrimDb + this.quietDb - this.duck);
    this.musicTrim.gain.rampTo(gain, rampS, at);
    this.sfxTrim.gain.rampTo(dbToGain(Math.min(0, this.caseTrimDb + this.quietDb) + (SFX_PHASE_DB[this.context] ?? 0)), rampS, at);
  }

  private updateFilter(rampS = 0.15, at?: number): void {
    const base = this.spec.cutoff * (this.quiet ? 0.78 : 1);
    const open = Math.min(9000, base * (1 + 2.4 * this.scroll) + this.labCutoff * 4000);
    this.musicFilter.frequency.rampTo(open, rampS, at);
  }

  private updateReverb(rampS = 0.25, at?: number): void {
    const send = Math.min(0.7, this.spec.reverb + 0.16 * this.scroll + this.labReverb * 0.3 + (this.quiet ? -0.04 : 0));
    this.musicRevSend.gain.rampTo(send, rampS, at);
  }

  /** Velocidad de scroll normalizada 0..1: abre el filtro y sube la reverb de la música (scroll rápido = la música se abre). */
  setScroll(v01: number): void {
    this.scroll = Math.min(1, Math.max(0, v01));
    this.updateFilter(0.18);
    this.updateReverb(0.3);
  }

  /** Tras 2 s sin scroll la música se recoge: filtro más cerrado y −3 dB. */
  setQuiet(quiet: boolean): void {
    if (quiet === this.quiet) return;
    this.quiet = quiet;
    this.quietDb = quiet ? -3 : 0;
    this.updateTrim(1.5);
    this.updateFilter(1.5);
    this.updateReverb(1.5);
  }

  /** Ducking: cada vídeo con audio baja la música (−12 dB); 0 vídeos la devuelve. */
  setDuck(activeMedia: number): void {
    this.duck = activeMedia > 0 ? 12 : 0;
    this.updateTrim(0.6);
  }

  /** Vista Rápida: la música se pausa con un fundido (los efectos quedan mínimos). */
  setQuick(on: boolean): void {
    this.quick = on;
    this.updateTrim(1.2);
  }

  /** Modulación de la música desde una demo del laboratorio (0..1). */
  setLab(cutoff: number, reverb: number): void {
    this.labCutoff = Math.min(1, Math.max(0, cutoff));
    this.labReverb = Math.min(1, Math.max(0, reverb));
    this.updateFilter(0.2);
    this.updateReverb(0.3);
  }

  /** 404: «cinta que se detiene» (tempo y altura caen, zumbido leve) y cinta que arranca de nuevo. */
  private setTape(on: boolean, time: number): void {
    if (on === this.tape) return;
    this.tape = on;
    if (on) {
      this.transport.bpm.rampTo(BPM * 0.32, 2.4, time);
      this.pad.detuneTo(-1200, 2.6, time);
      this.ensureHum();
      this.hum?.gain.gain.rampTo(0.05, 1.2, time);
    } else {
      this.transport.bpm.rampTo(BPM, 1.2, time);
      this.pad.detuneTo(0, 1.4, time);
      this.hum?.gain.gain.rampTo(0, 0.6, time);
    }
  }

  private ensureHum(): void {
    if (this.hum) return;
    const noise = new Tone.Noise("brown");
    const filter = new Tone.Filter({ type: "bandpass", frequency: 110, Q: 6 });
    const gain = new Tone.Gain(0);
    noise.chain(filter, gain, this.sfxSwitch);
    noise.start(this.nowT()); // arranca una sola vez; la ganancia decide si se oye
    this.hum = { noise, filter, gain };
  }

  // ───────────────────────────── Partitura (capas en el Transport) ─────────────────────────────

  private schedulePatterns(): void {
    const bar = (b: number, step: number) => `${b}:${Math.floor(step / 4)}:${step % 4}`;
    const sixteenth = BEAT_S / 4;
    const humanize = () => this.rnd() * 0.012;
    const audible = (id: LayerId) => this.layerTarget(id) > 0.02 && this.musicOn;
    const take = (time: number, dur: number, release: number, priority = 0) => this.budget.acquire("music", time, dur, release, priority);

    // PAD: los acordes se deslizan en el compás.
    const padPart = makePart<number>(
      (time, index) => {
        this.triggered.pad++;
        this.pad.setChord(PROGRESSION[index]!, time);
      },
      PROGRESSION.map((_, i) => [`${i}:0:0`, i] as [string, number]),
    );

    // KEYS: el motivo, lento.
    const keysPart = makePart<(typeof KEYS_PATTERN)[number]>(
      (time, ev) => {
        if (!audible("keys")) return;
        const dur = ev.dur * sixteenth;
        if (!take(time, dur, 0.9, 2)) return;
        this.triggered.keys++;
        this.keys.play(ev.note, dur, time + humanize(), ev.vel * (0.9 + this.rnd() * 0.15));
      },
      KEYS_PATTERN.map((ev) => [bar(ev.bar, ev.step), ev] as [string, (typeof KEYS_PATTERN)[number]]),
    );

    // ARP: corcheas; la densidad de la mezcla decide cuáles suenan.
    const arpEvents: [string, { barIndex: number; eighth: number }][] = [];
    for (let b = 0; b < 4; b++) for (let e = 0; e < 8; e++) arpEvents.push([bar(b, e * 2), { barIndex: b, eighth: e }]);
    const arpPart = makePart<{ barIndex: number; eighth: number }>((time, ev) => {
      if (!audible("arp")) return;
      if (!arpActiveSteps(this.spec.arpDensity).includes(ev.eighth)) return;
      if (!take(time, 0.12, 0.4)) return;
      this.triggered.arp++;
      this.arp.play(arpNote(ev.barIndex, ev.eighth), 0.12, time + humanize(), 0.5 + this.rnd() * 0.15);
    }, arpEvents);

    // BASS: corcheas rectas sobre la raíz (el program counter).
    const bassEvents: [string, { barIndex: number; eighth: number }][] = [];
    for (let b = 0; b < 4; b++) for (let e = 0; e < 8; e++) bassEvents.push([bar(b, e * 2), { barIndex: b, eighth: e }]);
    const bassPart = makePart<{ barIndex: number; eighth: number }>((time, ev) => {
      if (!audible("bass")) return;
      if (!take(time, 0.18, 0.3, 2)) return;
      const note = PROGRESSION[ev.barIndex]!.bass;
      this.triggered.bass++;
      this.bass.play(note, 0.18, time, BASS_VELOCITY[ev.eighth] as number);
    }, bassEvents);

    // PERC: hat/rim/ghost (LEXER+), bombo solo en RUNTIME.
    type PercEv = { kind: "hat" | "ghost" | "rim" | "kick" | "kickGhost" };
    const percEvents: [string, PercEv][] = [];
    for (let b = 0; b < 4; b++) {
      for (const s of PERC_STEPS.hat) percEvents.push([bar(b, s), { kind: "hat" }]);
      for (const s of PERC_STEPS.ghost) percEvents.push([bar(b, s), { kind: "ghost" }]);
      for (const s of PERC_STEPS.rim) percEvents.push([bar(b, s), { kind: "rim" }]);
      for (const s of PERC_STEPS.kick) percEvents.push([bar(b, s), { kind: "kick" }]);
      for (const s of PERC_STEPS.kickGhost) percEvents.push([bar(b, s), { kind: "kickGhost" }]);
    }
    const percPart = makePart<PercEv>((time, ev) => {
      if (!audible("perc")) return;
      const isKick = ev.kind === "kick" || ev.kind === "kickGhost";
      if (isKick && !this.spec.kick) return;
      if (!take(time, 0.05, isKick ? 0.25 : 0.03, isKick ? 2 : 0)) return;
      this.triggered.perc++;
      const t = time + (ev.kind === "hat" || ev.kind === "ghost" ? humanize() : 0);
      if (ev.kind === "hat") this.perc.hatHit(t, 0.55 + this.rnd() * 0.2);
      else if (ev.kind === "ghost") this.perc.hatHit(t, 0.3);
      else if (ev.kind === "rim") this.perc.rimHit(t, 0.5);
      else {
        this.perc.kickHit(t, ev.kind === "kick" ? 0.8 : 0.45);
        this.kickPulse = 1;
      }
    }, percEvents);

    // SHIMMER: ráfagas altas pseudoaleatorias (deterministas) de la pentatónica.
    const shimmerEvents: [string, { note: string }][] = [];
    for (let b = 0; b < 4; b++) for (const e of shimmerSteps(b)) shimmerEvents.push([bar(b, e.step), { note: e.note }]);
    const shimmerPart = makePart<{ note: string }>((time, ev) => {
      if (!audible("shimmer")) return;
      if (!take(time, 0.3, 2)) return;
      this.triggered.shimmer++;
      this.shimmer.play(ev.note, 0.3, time + humanize(), 0.45 + this.rnd() * 0.2);
    }, shimmerEvents);

    this.parts.push(padPart, keysPart, arpPart, bassPart, percPart, shimmerPart);
    for (const part of this.parts) part.start(0);
  }

  // ───────────────────────────── Eventos ─────────────────────────────

  /** Punto de entrada de los eventos del catálogo (`audio.emit`). */
  handle<K extends AudioEvent>(event: K, payload: AudioEventMap[K]): void {
    if (event.startsWith("phase:")) {
      this.basePhase = event.slice(6) as MixContext;
      this.requestContext();
      return;
    }
    switch (event) {
      case "case:enter":
        this.overlay = "case";
        this.requestContext();
        return;
      case "case:leave":
        if (this.overlay === "case") this.overlay = null;
        this.requestContext();
        return;
      case "notfound:enter":
        this.overlay = "notfound";
        this.requestContext();
        return;
      case "notfound:restart":
        if (this.overlay === "notfound") this.overlay = null;
        this.requestContext();
        break; // además suena el tick de «cinta que arranca»
      case "boot:done":
        // La firma y la entrada de las capas de la fase caen en el mismo compás (ambas se cuantizan a @1m).
        this.bootActive = false;
        this.requestContext();
        break;
      case "hold:cancel":
        this.kit.riserCancel(this.nowT());
        return;
      case "hold:progress":
      case "gate:sound":
      case "gate:silent":
      case "theme":
      case "media:play":
      case "media:stop":
      case "quickview:on":
      case "quickview:off":
        return; // los atiende el motor (DOM/store) o no cambian la mezcla por sí solos
      case "lab:modulate": {
        const p = payload as AudioEventMap["lab:modulate"];
        this.setLab(p.cutoff ?? 0, p.reverb ?? 0);
        return;
      }
      default:
        break;
    }
    // Letra del nombre del hero SIN altura: solo el clic mecánico suave (la nota del motivo llega cada 3 letras).
    const unpitchedKey = event === "hero:key" && (payload as AudioEventMap["hero:key"] | undefined)?.pitched === false;
    const def = unpitchedKey ? ({ ...SFX["terminal:key"], db: HERO_CLICK_DB } as SfxDef) : SFX[event];
    if (!def) return;
    const tag = unpitchedKey ? "hero:click" : event;
    const emitted = this.nowT();
    if (!this.sfxOn) return this.logSfx(tag, "dropped", "silence");
    if (this.reduced && (def.reduced === "skip" || unpitchedKey)) return this.logSfx(tag, "dropped", "reduced");
    if (!this.limiter.allow(tag, this.nowT() * 1000, unpitchedKey ? 28 : def.gapMs)) return this.logSfx(tag, "dropped", "rate");
    if (def.kind === "riser") {
      this.kit.riserStart(this.nowT() + 0.01, 0.8, Math.min(1, dbToGain(def.db)));
      this.logSfx(event, "played");
      // Red de seguridad: si por algún motivo nunca llega hold:cancel ni hold:complete, el riser no se queda sonando.
      if (this.running && this.transport.state === "started") this.transport.scheduleOnce((time) => this.kit.riserCancel(time), this.transport.seconds + 1.8);
      return;
    }
    this.when(def.quant, (time) => this.playSfx(event, def, payload, time, tag, emitted));
  }

  /** Anota un efecto reproducido o descartado (solo con `trace`: gancho de pruebas). */
  private logSfx(event: string, status: "played" | "dropped", reason?: SfxDropReason, delayMs?: number): void {
    if (!this.trace) return;
    this.sfxLogItems.push({ event, status, ...(reason ? { reason } : {}), at: Math.round(this.nowT() * 1000), ...(delayMs !== undefined ? { delayMs: Math.round(delayMs) } : {}) });
    if (this.sfxLogItems.length > 3000) this.sfxLogItems.splice(0, 500);
  }

  /** Para el motor: registra un efecto que NO llegó a la mezcla (silencio, Vista Rápida…). */
  traceDrop(event: AudioEvent, reason: SfxDropReason): void {
    this.logSfx(event, "dropped", reason);
  }

  sfxLog(): readonly SfxLogEntry[] {
    return this.sfxLogItems;
  }

  clearSfxLog(): void {
    this.sfxLogItems = [];
  }

  /** Formas de onda crudas (últimas 1024 muestras, canales L y R) del bus de efectos y de la salida, para medir picos. */
  waves(): { sfx: Float32Array[]; master: Float32Array[] } {
    return {
      sfx: this.sfxWave ? (this.sfxWave.getValue() as Float32Array[]) : [],
      master: this.masterWave ? (this.masterWave.getValue() as Float32Array[]) : [],
    };
  }

  /** Nivel RMS (dB, suavizado) de la música ANTES del ducking: la referencia de los efectos. */
  musicLevelDb(): number {
    return this.musicMeter.getValue() as number;
  }

  /** Ducking de la música: −3 dB con ataque de ~20 ms y liberación de ~250 ms, mientras suena el efecto. */
  private duckMusic(time: number, holdS: number): void {
    // AudioParam nativo: el modelo de eventos de Tone no encadena bien varios `setTargetAtTime` seguidos.
    // `cancelScheduledValues` retira la liberación del efecto anterior y el nuevo ataque parte del valor actual.
    const p = this.musicDuck.gain.input as AudioParam;
    p.cancelScheduledValues(time);
    p.setTargetAtTime(dbToGain(DUCK_DB), time, 0.007);
    p.setTargetAtTime(1, time + holdS, 0.08);
  }

  /** Ejecuta `fn` ahora o en el siguiente límite de la subdivisión (con el Transport en marcha). */
  private when(sub: Subdivision | "now", fn: (time: number) => void): void {
    if (sub === "now" || !this.running || this.transport.state !== "started") fn(this.nowT() + 0.005);
    else this.transport.scheduleOnce(fn, this.nextBoundary(sub));
  }

  /**
   * Siguiente límite de `sub` como tiempo del Transport (en ticks). NO se usa la forma «@16n» de Tone: devuelve
   * un instante del contexto de audio que `scheduleOnce` interpreta como tiempo del Transport, con lo que el
   * efecto llegaba tarde justo el tiempo que tardó el Transport en arrancar (medio segundo o más).
   */
  private nextBoundary(sub: Subdivision): string {
    const at = this.transport.nextSubdivision(sub);
    return `${Math.round(this.transport.getTicksAtTime(at))}i`;
  }

  /** Voces que se piden para un efecto (por diseño: 1–5) y las concedidas. */
  private take(time: number, def: SfxDef, count: number): number {
    let granted = 0;
    for (let i = 0; i < count; i++) if (this.budget.acquire("sfx", time, Math.min(def.maxS, SFX_MAX_S), 0)) granted++;
    return granted;
  }

  private playSfx(event: AudioEvent, def: SfxDef, payload: unknown, time: number, tag: string = event, emitted: number = time): void {
    // `db` es el nivel del efecto respecto a la referencia de su instrumento (≤ 0 dB): la calibración está en `sfx.ts`.
    const g = Math.min(1, dbToGain(def.db));
    const kit = this.kit;
    // El riser SIEMPRE termina con el impacto, aunque no quede ninguna voz libre para el impacto en sí.
    if (def.kind === "impact") kit.riserFinish(time);
    const short = this.reduced && def.reduced === "short";
    const need = def.kind === "chord" ? 3 : def.kind === "motif" || def.kind === "impact" ? 4 : def.kind === "packet" ? 3 : 1;
    if (this.take(time, def, short ? 1 : need) === 0) return this.logSfx(tag, "dropped", "voices");
    this.logSfx(tag, "played", undefined, (time - emitted) * 1000);
    this.fireFirstSound();
    if (def.duck !== false) this.duckMusic(time, Math.min(0.35, Math.max(0.06, def.maxS * 0.4)));

    if (short) {
      kit.note("D5", time, 0.12, g);
      return;
    }
    switch (def.kind) {
      case "note": {
        const note = this.noteFor(event, payload);
        // Tecla del nombre: el clic mecánico acompaña a la nota del motivo.
        if (event === "hero:key") kit.key(time, dbToGain(HERO_CLICK_DB));
        // «Pluck apagado» de las instrucciones de BYTECODE: nota grave muy corta.
        kit.note(note, time, event === "bytecode:instruction" ? 0.06 : 0.2, g);
        return;
      }
      case "bell":
        kit.bellNote(event === "ui:open" ? "A4" : "A5", time, 0.08, g);
        return;
      case "key":
        kit.key(time, g);
        return;
      case "tick":
        kit.tick(time, g);
        return;
      case "low":
        kit.lowNote("D3", time, 0.3, g);
        return;
      case "chord": {
        const notes =
          event === "select:skill"
            ? skillChord((payload as AudioEventMap["select:skill"]).category)
            : (["D4", "A4", "D5"] as const);
        kit.chord(notes, time, 0.45, g);
        if (event === "select:skill") kit.swish(time + 0.02, g * 0.8);
        return;
      }
      case "motif": {
        const gap = 0.115;
        MOTIF.forEach((m, i) => {
          kit.note(m.note, time + i * gap, 0.14, g);
          kit.bellNote(m.note, time + i * gap, 0.1, g * 0.6);
        });
        if (event === "contact:ok") kit.chord(["D3", "A3", "D4", "F#4", "A4"], time + 3 * gap, 0.5, g * 0.8);
        return;
      }
      case "variation": {
        const id = (payload as AudioEventMap["achievement"] | undefined)?.id ?? "achievement";
        const notes = variationFor(id, this.achievementIds);
        notes.forEach((n, i) => {
          kit.note(n, time + i * 0.11, 0.14, g);
          kit.bellNote(n, time + i * 0.11, 0.1, g * 0.6);
        });
        return;
      }
      case "cymbal":
        kit.cymbalHit(time, g);
        return;
      case "packet": {
        const notes = ["D5", "E5", "F#5", "A5", "B5"];
        notes.forEach((n, i) => kit.packet(n, -0.9 + (1.8 * i) / (notes.length - 1), time + i * 0.1, g));
        return;
      }
      case "descend":
        kit.note("A4", time, 0.18, g);
        kit.note("F#4", time + 0.2, 0.22, g * 0.9);
        return;
      case "flash": {
        const x = Math.min(1, Math.max(0, (payload as AudioEventMap["runtime:core-hover"]).x));
        const note = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.floor(x * PENTATONIC.length))] as string;
        kit.flash(note, x * 2 - 1, time, g);
        return;
      }
      case "impact":
        kit.riserFinish(time);
        kit.impact(time, g);
        kit.chord(["D3", "A3", "D4", "F#4"], time, 0.55, g * 0.9);
        return;
      default:
        return;
    }
  }

  private noteFor(event: AudioEvent, payload: unknown): string {
    switch (event) {
      case "boot:line":
        return pentatonicAt((payload as AudioEventMap["boot:line"]).index);
      case "hero:key":
        return (MOTIF[Math.floor((payload as AudioEventMap["hero:key"]).index / HERO_NOTE_EVERY) % MOTIF.length] as (typeof MOTIF)[number]).note;
      case "hover:token":
        return TOKEN_NOTE[(payload as AudioEventMap["hover:token"]).kind];
      case "hover:skill":
        return SKILL_NOTE[(payload as AudioEventMap["hover:skill"]).category] ?? "D5";
      case "bytecode:instruction": {
        const index = Math.floor(this.transport.seconds / BAR_S) % PROGRESSION.length;
        const root = PROGRESSION[index]!.bass;
        return root.replace(/(\d)$/, (d) => String(Number(d) + 1));
      }
      case "contact:focus":
        return "E4";
      case "ui:toggle":
        return "D4";
      case "ui:enter":
        return "E4";
      default:
        return "D5";
    }
  }

  // ───────────────────────────── Observación (mezclador, now playing, pruebas) ─────────────────────────────

  private fireFirstSound(): void {
    if (this.firstSoundFired) return;
    this.firstSoundFired = true;
    for (const cb of [...this.firstSoundListeners]) cb();
  }

  private notify(): void {
    for (const l of [...this.listeners]) l();
  }

  /** Milisegundos hasta el siguiente compás (o `null` si el Transport no corre). */
  timeToNextBar(): number | null {
    if (!this.running || this.transport.state !== "started") return null;
    // `nextSubdivision` devuelve el instante del siguiente compás en tiempo del CONTEXTO de audio (no del
    // Transport): se compara con el reloj real del contexto, sin el adelanto del planificador.
    const next = this.transport.nextSubdivision("1m");
    // Acotado a un compás: el desfase del adelanto del planificador nunca debe superarlo.
    return Math.min(BAR_S * 1000, Math.max(0, (next - Tone.immediate()) * 1000));
  }

  /** Energía 0..1 de la música (pad+bombo) para `uAudioEnergy`, suavizada y con el pulso del bombo. */
  energy(): number {
    const db = this.musicMeter.getValue() as number;
    const level = Math.min(1, Math.max(0, (db + 48) / 30));
    this.kickPulse *= 0.82;
    const raw = Math.max(level * 0.7, this.kickPulse * 0.8);
    this.energySmooth += (raw - this.energySmooth) * 0.25;
    return this.energySmooth * (this.musicOn && !this.quick ? 1 : 0);
  }

  spectrum(out: Float32Array): void {
    const bins = this.fft.getValue() as Float32Array;
    const n = out.length;
    const usable = Math.min(bins.length, 40);
    for (let i = 0; i < n; i++) {
      const from = Math.floor(1 + (usable - 1) * (i / n) ** 1.6);
      const to = Math.max(from + 1, Math.floor(1 + (usable - 1) * ((i + 1) / n) ** 1.6));
      let peak = -120;
      for (let k = from; k < to && k < bins.length; k++) peak = Math.max(peak, bins[k] as number);
      out[i] = Math.min(1, Math.max(0, (peak + 85) / 55));
    }
  }

  /** Foto del estado para el gancho de pruebas y el mezclador. */
  snapshot(): MixSnapshot {
    const wave = this.waveform.getValue() as Float32Array;
    let peak = 0;
    for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i] as number));
    const db = (m: Tone.Meter) => m.getValue() as number;
    return {
      context: this.context,
      bpm: Math.round(this.transport.bpm.value * 100) / 100,
      running: this.running && this.transport.state === "started",
      layers: LAYER_IDS.map((id) => ({
        id,
        gain: this.layerGain[id].gain.value,
        target: this.layerTarget(id),
        muted: this.muted.has(id),
        solo: this.solo.has(id),
      })),
      rms: { music: db(this.musicMeter), sfx: db(this.sfxMeter), master: db(this.masterMeter) },
      peak: 20 * Math.log10(Math.max(peak, 1e-6)),
      voices: this.budget.count(this.nowT()),
      voicePeak: this.budget.peak,
      voicesRejected: this.budget.rejected,
      source: this.source,
      triggered: { ...this.triggered },
      musicEnabled: this.musicOn,
      sfxEnabled: this.sfxOn,
      volume: this.volume,
      trimDb: this.caseTrimDb + this.quietDb - this.duck,
      cutoff: this.musicFilter.frequency.value as number,
      reverb: this.musicRevSend.gain.value,
      reduced: this.reduced,
      tape: this.tape,
      riser: this.kit.riserActive,
      nextBarMs: this.timeToNextBar(),
      masterGain: this.master.gain.value as number,
      duckDb: this.duckDb(),
      lookAheadMs: Math.round(Tone.getContext().lookAhead * 1000),
      sfxTrimDb: 20 * Math.log10(Math.max((this.sfxTrim.gain.input as AudioParam).value, 1e-4)),
    };
  }

  /** Atenuación real del ducking (dB, ≤ 0): con `trace`, la diferencia de dos medidores; si no, la ganancia programada. */
  private duckDb(): number {
    if (this.duckProbe) {
      const pre = this.duckProbe.pre.getValue() as number;
      const post = this.duckProbe.post.getValue() as number;
      return pre > -80 ? Math.min(0, post - pre) : 0;
    }
    return 20 * Math.log10(Math.max((this.musicDuck.gain.input as AudioParam).value, 1e-4));
  }

  private makeControls(): AudioControls {
    // El objeto devuelto usa getters/métodos propios, así que `this` no se puede reutilizar dentro de ellos.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get ready() {
        return self.running;
      },
      subscribe(listener) {
        self.listeners.add(listener);
        return () => self.listeners.delete(listener);
      },
      layers(): readonly LayerState[] {
        return LAYER_IDS.map((id) => ({
          id,
          gain: effectiveGain(id, self.spec, { muted: new Set(), solo: new Set() }),
          muted: self.muted.has(id),
          solo: self.solo.has(id),
        }));
      },
      setLayerMuted(id, muted) {
        if (muted) self.muted.add(id);
        else self.muted.delete(id);
        self.applyMix(self.spec, self.nowT(), 0.25);
        self.notify();
      },
      setLayerSolo(id, solo) {
        if (solo) self.solo.add(id);
        else self.solo.delete(id);
        self.applyMix(self.spec, self.nowT(), 0.25);
        self.notify();
      },
      layerLevel(id) {
        const db = self.layerMeter[id].getValue() as number;
        return Math.min(1, Math.max(0, (db + 60) / 48));
      },
      spectrum: (out) => self.spectrum(out),
      energy: () => self.energy(),
      context: () => self.context,
      dominantLayer: () => dominantOf(self.spec),
      timeToNextBar: () => self.timeToNextBar(),
      onFirstSound(cb) {
        if (self.firstSoundFired) {
          cb();
          return () => {};
        }
        self.firstSoundListeners.add(cb);
        return () => self.firstSoundListeners.delete(cb);
      },
    };
  }

  /** Libera todos los nodos y detiene el Transport. */
  dispose(): void {
    this.transport.stop();
    for (const part of this.parts) {
      part.stop();
      part.dispose();
    }
    this.parts.length = 0;
    this.kit.dispose();
    this.duckProbe?.pre.dispose();
    this.duckProbe?.post.dispose();
    this.sfxWave?.dispose();
    this.masterWave?.dispose();
    for (const layer of [this.pad, this.keys, this.arp, this.bass, this.perc, this.shimmer]) layer.dispose();
    if (this.stemPlayers) for (const player of Object.values(this.stemPlayers)) player.dispose();
    for (const id of LAYER_IDS) {
      this.layerGain[id].dispose();
      this.layerMeter[id].dispose();
    }
    this.hum?.noise.dispose();
    this.hum?.filter.dispose();
    this.hum?.gain.dispose();
    for (const node of [
      this.sumBus, this.highpass, this.presence, this.shelf, this.compressor, this.peakGuard, this.ceiling, this.clipper, this.master,
      this.musicIn, this.musicRevSend, this.musicConv, this.musicRevReturn, this.musicFilter, this.musicTrim,
      this.musicSwitch, this.musicDuck, this.sfxTrim, this.sfxRevSend, this.sfxConv, this.sfxRevReturn, this.sfxSwitch, this.musicMeter,
      this.sfxMeter, this.masterMeter, this.waveform, this.fft,
    ])
      node.dispose();
    this.listeners.clear();
    this.firstSoundListeners.clear();
    this.running = false;
  }
}

export function createMix(options: MixOptions = {}): Mix {
  return new Mix(options);
}
