/**
 * Patches del modo generativo (ADDENDUM-v3 §3): instrumentos construidos con Tone.js para que la pieza
 * suene musical sin ningún archivo de audio. Ningún patch es una senoidal pura: todos llevan envolvente
 * ADSR, filtro y (a través de la mezcla) espacio por reverb de convolución.
 *
 * Nada aquí crea nodos al importar: todo se construye al llamar, con el contexto global de Tone en ese
 * momento (así el mismo código sirve para el contexto en vivo y para `Tone.Offline`).
 */
import * as Tone from "tone";
import { mulberry32 } from "./layers";
import { BEAT_S, type ChordSpec } from "./scale";

/** Opciones de Tone con tipos laxos (las uniones de osciladores de Tone son muy estrictas). */
const opts = <T>(o: unknown): T => o as T;

/**
 * Respuesta de sala generada en el cliente (sin archivo): ruido que decae exponencialmente, oscurecido con
 * el tiempo (los agudos mueren antes), con unas primeras reflexiones. Estéreo decorrelacionado.
 */
export function makeImpulse(seconds: number, brightness: number, seed: number): Tone.ToneAudioBuffer {
  const sampleRate = Tone.getContext().sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const preDelay = Math.floor(sampleRate * 0.012);
  const channels: Float32Array[] = [];
  for (let c = 0; c < 2; c++) {
    const rnd = mulberry32(seed + c * 7919);
    const data = new Float32Array(length);
    let lp = 0;
    for (let n = preDelay; n < length; n++) {
      const t = (n - preDelay) / sampleRate;
      const env = Math.exp((-6.91 * t) / seconds);
      const dark = Math.min(0.96, (1 - brightness) * 0.45 + 0.85 * (1 - Math.exp((-2.6 * t) / seconds)));
      lp = dark * lp + (1 - dark) * (rnd() * 2 - 1);
      data[n] = lp * env;
    }
    // Primeras reflexiones (un puñado de ecos tempranos de la sala).
    for (const [ms, amp] of [[17, 0.5], [29, 0.4], [41, 0.32], [58, 0.25], [77, 0.18]] as const) {
      const at = preDelay + Math.floor((sampleRate * (ms + c * 3)) / 1000);
      if (at < length) data[at] = (data[at] ?? 0) + amp * (rnd() > 0.5 ? 1 : -1);
    }
    channels.push(data);
  }
  return Tone.ToneAudioBuffer.fromArray(channels);
}

/**
 * Los `NoiseSynth` (y todo `Source` de Tone) exigen tiempos de arranque ESTRICTAMENTE crecientes: dos
 * disparos desordenados —un clic inmediato después de un tick programado a la semicorchea siguiente—
 * lanzarían «Start time must be strictly greater than previous start time». Cada fuente lleva su guarda.
 */
function monotonic(): (time: number) => number {
  let last = -Infinity;
  return (time) => {
    last = time > last ? time : last + 0.0005;
    return last;
  };
}

/** Curva escalonada de pocos niveles para el «bitcrush» leve de la fase GPU (síncrono, sin worklet). */
const crushCurve = (levels: number) => (x: number) => Math.round(x * levels) / levels;

// ───────────────────────────── Capas de la música ─────────────────────────────

export interface LayerVoice {
  readonly output: Tone.ToneAudioNode;
  dispose(): void;
}

/** PAD: 3 voces persistentes de dientes de sierra detunados que se deslizan de un acorde al siguiente. */
export class Pad implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly voices: Tone.Synth[];
  private readonly filter: Tone.Filter;
  private readonly chorus: Tone.Chorus;
  private readonly lfo: Tone.LFO;
  private started = false;

  constructor() {
    this.output = new Tone.Gain(1);
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 1100, rolloff: -24, Q: 0.4 });
    this.chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 3.5, depth: 0.7, wet: 0.55 }).start();
    this.lfo = new Tone.LFO({ frequency: 0.07, min: 800, max: 1500 }).start();
    this.lfo.connect(this.filter.frequency);
    this.voices = [0, 1, 2].map(
      () =>
        new Tone.Synth(
          opts<Partial<Tone.SynthOptions>>({
            oscillator: { type: "fatsawtooth", count: 3, spread: 16 },
            envelope: { attack: 2.4, decay: 0.3, sustain: 1, release: 3.2 },
            portamento: 0.7,
            volume: -19,
          }),
        ).connect(this.filter),
    );
    this.filter.connect(this.chorus);
    this.chorus.connect(this.output);
  }

  /** Enciende las 3 voces en el acorde `chord` (una sola vez; después solo se deslizan). */
  start(chord: ChordSpec, time: number): void {
    if (this.started) return;
    this.started = true;
    this.voices.forEach((v, i) => v.triggerAttack(chord.pad[i] as string, time, 0.9));
  }

  setChord(chord: ChordSpec, time: number): void {
    if (!this.started) return this.start(chord, time);
    this.voices.forEach((v, i) => v.setNote(chord.pad[i] as string, time));
  }

  /** Desafina el pad (cinta que se para / arranca). */
  detuneTo(cents: number, seconds: number): void {
    this.voices.forEach((v) => v.detune.rampTo(cents, seconds));
  }

  dispose(): void {
    this.voices.forEach((v) => v.dispose());
    this.lfo.dispose();
    this.filter.dispose();
    this.chorus.dispose();
    this.output.dispose();
  }
}

/** KEYS: piano eléctrico FM suave con trémolo: toca el motivo en la mezcla. */
export class Keys implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly poly: Tone.PolySynth;
  private readonly tremolo: Tone.Tremolo;
  private readonly filter: Tone.Filter;

  constructor() {
    this.output = new Tone.Gain(1);
    this.poly = new Tone.PolySynth(
      Tone.FMSynth,
      opts<Partial<Tone.SynthOptions>>({
        harmonicity: 1,
        modulationIndex: 6,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.006, decay: 1.4, sustain: 0.1, release: 0.9 },
        modulationEnvelope: { attack: 0.004, decay: 0.6, sustain: 0.35, release: 0.6 },
        volume: -2,
      }),
    );
    this.poly.maxPolyphony = 4;
    this.tremolo = new Tone.Tremolo({ frequency: 4.4, depth: 0.16, spread: 40 }).start();
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 3400, rolloff: -12 });
    this.poly.chain(this.tremolo, this.filter, this.output);
  }

  play(note: string, durS: number, time: number, vel: number): void {
    this.poly.triggerAttackRelease(note, durS, time, vel);
  }

  dispose(): void {
    this.poly.dispose();
    this.tremolo.dispose();
    this.filter.dispose();
    this.output.dispose();
  }
}

/** ARP: plucks de triángulo con eco; con la fase GPU entra un «bitcrush» leve (rasterización). */
export class Arp implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly poly: Tone.PolySynth;
  private readonly dry: Tone.Gain;
  private readonly crushed: Tone.WaveShaper;
  private readonly wet: Tone.Gain;
  private readonly filter: Tone.Filter;
  private readonly delay: Tone.FeedbackDelay;

  constructor() {
    this.output = new Tone.Gain(1);
    this.poly = new Tone.PolySynth(
      Tone.Synth,
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.24, sustain: 0, release: 0.4 },
        volume: -16,
      }),
    );
    this.poly.maxPolyphony = 3;
    this.dry = new Tone.Gain(1);
    this.crushed = new Tone.WaveShaper(crushCurve(10), 2048);
    this.wet = new Tone.Gain(0);
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 3300, rolloff: -12 });
    this.delay = new Tone.FeedbackDelay({ delayTime: BEAT_S * 0.75, feedback: 0.32, wet: 0.24 });
    this.poly.connect(this.dry);
    this.poly.connect(this.crushed);
    this.crushed.connect(this.wet);
    this.dry.connect(this.filter);
    this.wet.connect(this.filter);
    this.filter.chain(this.delay, this.output);
  }

  play(note: string, durS: number, time: number, vel: number): void {
    this.poly.triggerAttackRelease(note, durS, time, vel);
  }

  /** 0 = limpio, 1 = totalmente «crusheado». */
  setCrush(amount: number, seconds = 0.8): void {
    this.dry.gain.rampTo(1 - amount * 0.7, seconds);
    this.wet.gain.rampTo(amount, seconds);
  }

  dispose(): void {
    this.poly.dispose();
    this.dry.dispose();
    this.crushed.dispose();
    this.wet.dispose();
    this.filter.dispose();
    this.delay.dispose();
    this.output.dispose();
  }
}

/** BASS: bajo redondo de triángulo con envolvente de filtro: el pulso del «program counter». */
export class Bass implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly synth: Tone.MonoSynth;

  constructor() {
    this.output = new Tone.Gain(1);
    this.synth = new Tone.MonoSynth(
      opts<Partial<Tone.MonoSynthOptions>>({
        oscillator: { type: "sawtooth" },
        filter: { type: "lowpass", rolloff: -24, Q: 1.4 },
        envelope: { attack: 0.012, decay: 0.22, sustain: 0.38, release: 0.28 },
        filterEnvelope: { attack: 0.006, decay: 0.22, sustain: 0.16, release: 0.3, baseFrequency: 210, octaves: 3 },
        volume: -4,
      }),
    );
    this.synth.connect(this.output);
  }

  play(note: string, durS: number, time: number, vel: number): void {
    this.synth.triggerAttackRelease(note, durS, time, vel);
  }

  dispose(): void {
    this.synth.dispose();
    this.output.dispose();
  }
}

/** PERC: hi-hat filtrado, rimshot suave y bombo muy contenido (solo en RUNTIME). */
export class Perc implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly hat: Tone.NoiseSynth;
  private readonly hatFilter: Tone.Filter;
  private readonly rim: Tone.NoiseSynth;
  private readonly rimFilter: Tone.Filter;
  private readonly rimBody: Tone.MembraneSynth;
  private readonly kickSynth: Tone.MembraneSynth;
  private readonly hatTime = monotonic();
  private readonly rimTime = monotonic();

  constructor() {
    this.output = new Tone.Gain(1);
    this.hatFilter = new Tone.Filter({ type: "bandpass", frequency: 7200, Q: 0.7 });
    this.hat = new Tone.NoiseSynth(
      opts<Partial<Tone.NoiseSynthOptions>>({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.02 },
        volume: -24,
      }),
    ).connect(this.hatFilter);
    this.hatFilter.connect(this.output);
    this.rimFilter = new Tone.Filter({ type: "bandpass", frequency: 1900, Q: 1.4 });
    this.rim = new Tone.NoiseSynth(
      opts<Partial<Tone.NoiseSynthOptions>>({
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.015 },
        volume: -17,
      }),
    ).connect(this.rimFilter);
    this.rimFilter.connect(this.output);
    this.rimBody = new Tone.MembraneSynth(
      opts<Partial<Tone.MembraneSynthOptions>>({
        pitchDecay: 0.012,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 },
        volume: -22,
      }),
    ).connect(this.output);
    this.kickSynth = new Tone.MembraneSynth(
      opts<Partial<Tone.MembraneSynthOptions>>({
        pitchDecay: 0.05,
        octaves: 2.6,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -8,
      }),
    ).connect(this.output);
  }

  hatHit(time: number, vel: number): void {
    this.hat.triggerAttackRelease(0.04, this.hatTime(time), vel);
  }
  rimHit(time: number, vel: number): void {
    this.rim.triggerAttackRelease(0.03, this.rimTime(time), vel);
    this.rimBody.triggerAttackRelease("A3", 0.05, time, vel * 0.8);
  }
  kickHit(time: number, vel: number): void {
    this.kickSynth.triggerAttackRelease("D2", 0.25, time, vel);
  }

  dispose(): void {
    for (const n of [this.hat, this.hatFilter, this.rim, this.rimFilter, this.rimBody, this.kickSynth, this.output]) n.dispose();
  }
}

/** SHIMMER: textura brillante y granular de la fase GPU (notas altas con eco largo). */
export class Shimmer implements LayerVoice {
  readonly output: Tone.Gain;
  private readonly poly: Tone.PolySynth;
  private readonly highpass: Tone.Filter;
  private readonly delay: Tone.FeedbackDelay;

  constructor() {
    this.output = new Tone.Gain(1);
    this.poly = new Tone.PolySynth(
      Tone.Synth,
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "fatsine", count: 3, spread: 28 },
        envelope: { attack: 0.35, decay: 0.5, sustain: 0.25, release: 2.0 },
        volume: -20,
      }),
    );
    this.poly.maxPolyphony = 3;
    this.highpass = new Tone.Filter({ type: "highpass", frequency: 700, rolloff: -12 });
    this.delay = new Tone.FeedbackDelay({ delayTime: BEAT_S * 0.75, feedback: 0.45, wet: 0.5 });
    this.poly.chain(this.highpass, this.delay, this.output);
  }

  play(note: string, durS: number, time: number, vel: number): void {
    this.poly.triggerAttackRelease(note, durS, time, vel);
  }

  dispose(): void {
    this.poly.dispose();
    this.highpass.dispose();
    this.delay.dispose();
    this.output.dispose();
  }
}

// ───────────────────────────── Efectos de interacción ─────────────────────────────

/** Instrumentos de los sonidos de interacción; todos salen por `output` (el bus de efectos). */
export class SfxKit {
  readonly output: Tone.Gain;
  private readonly pluck: Tone.PolySynth;
  private readonly pluckFilter: Tone.Filter;
  private readonly bell: Tone.PolySynth;
  private readonly keyNoise: Tone.NoiseSynth;
  private readonly keyFilter: Tone.Filter;
  private readonly keyThock: Tone.MembraneSynth;
  private readonly low: Tone.Synth;
  private readonly chordSynth: Tone.PolySynth;
  private readonly cymbal: Tone.NoiseSynth;
  private readonly cymbalFilter: Tone.Filter;
  private readonly swishNoise: Tone.NoiseSynth;
  private readonly swishFilter: Tone.Filter;
  private readonly packetPan: Tone.Panner;
  private readonly packetSynth: Tone.PolySynth;
  private readonly flashPan: Tone.Panner;
  private readonly flashSynth: Tone.PolySynth;
  private readonly impactSynth: Tone.MembraneSynth;
  private readonly riserNoise: Tone.Noise;
  private readonly riserFilter: Tone.Filter;
  private readonly riserGain: Tone.Gain;
  private readonly riserOsc: Tone.Synth;
  private readonly riserOscGain: Tone.Gain;
  private riserRunning = false;
  private riserNoiseStarted = false;
  private readonly keyTime = monotonic();
  private readonly cymbalTime = monotonic();
  private readonly swishTime = monotonic();
  private readonly rnd = mulberry32(0xbeef);

  constructor() {
    this.output = new Tone.Gain(1);

    this.pluckFilter = new Tone.Filter({ type: "lowpass", frequency: 4200, rolloff: -12 });
    this.pluck = new Tone.PolySynth(
      Tone.Synth,
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.003, decay: 0.28, sustain: 0, release: 0.4 },
        volume: -9,
      }),
    );
    this.pluck.maxPolyphony = 4;
    this.pluck.chain(this.pluckFilter, this.output);

    this.bell = new Tone.PolySynth(
      Tone.FMSynth,
      opts<Partial<Tone.SynthOptions>>({
        harmonicity: 3.5,
        modulationIndex: 5,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.6, sustain: 0, release: 0.45 },
        modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.3 },
        volume: -12,
      }),
    );
    this.bell.maxPolyphony = 3;
    this.bell.connect(this.output);

    this.keyFilter = new Tone.Filter({ type: "bandpass", frequency: 2300, Q: 0.9 });
    this.keyNoise = new Tone.NoiseSynth(
      opts<Partial<Tone.NoiseSynthOptions>>({
        noise: { type: "brown" },
        envelope: { attack: 0.0008, decay: 0.022, sustain: 0, release: 0.01 },
        volume: -8,
      }),
    ).connect(this.keyFilter);
    this.keyFilter.connect(this.output);
    this.keyThock = new Tone.MembraneSynth(
      opts<Partial<Tone.MembraneSynthOptions>>({
        pitchDecay: 0.008,
        octaves: 1.5,
        envelope: { attack: 0.0008, decay: 0.05, sustain: 0, release: 0.02 },
        volume: -16,
      }),
    ).connect(this.output);

    this.low = new Tone.Synth(
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.012, decay: 0.55, sustain: 0, release: 0.4 },
        volume: -10,
      }),
    ).connect(this.output);

    this.chordSynth = new Tone.PolySynth(
      Tone.Synth,
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "fattriangle", count: 3, spread: 14 },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.15, release: 0.55 },
        volume: -16,
      }),
    );
    this.chordSynth.maxPolyphony = 5;
    this.chordSynth.connect(this.output);

    this.cymbalFilter = new Tone.Filter({ type: "highpass", frequency: 5200, rolloff: -12 });
    this.cymbal = new Tone.NoiseSynth(
      opts<Partial<Tone.NoiseSynthOptions>>({
        noise: { type: "white" },
        envelope: { attack: 0.45, decay: 0.55, sustain: 0, release: 0.12 },
        volume: -28,
      }),
    ).connect(this.cymbalFilter);
    this.cymbalFilter.connect(this.output);

    this.swishFilter = new Tone.Filter({ type: "bandpass", frequency: 900, Q: 2.2 });
    this.swishNoise = new Tone.NoiseSynth(
      opts<Partial<Tone.NoiseSynthOptions>>({
        noise: { type: "white" },
        envelope: { attack: 0.18, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -26,
      }),
    ).connect(this.swishFilter);
    this.swishFilter.connect(this.output);

    this.packetPan = new Tone.Panner(-1);
    this.packetSynth = new Tone.PolySynth(
      Tone.Synth,
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.003, decay: 0.12, sustain: 0, release: 0.12 },
        volume: -13,
      }),
    );
    this.packetSynth.maxPolyphony = 3;
    this.packetSynth.chain(this.packetPan, this.output);

    this.flashPan = new Tone.Panner(0);
    this.flashSynth = new Tone.PolySynth(
      Tone.FMSynth,
      opts<Partial<Tone.SynthOptions>>({
        harmonicity: 4,
        modulationIndex: 3,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.35 },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
        volume: -14,
      }),
    );
    this.flashSynth.maxPolyphony = 3;
    this.flashSynth.chain(this.flashPan, this.output);

    this.impactSynth = new Tone.MembraneSynth(
      opts<Partial<Tone.MembraneSynthOptions>>({
        pitchDecay: 0.08,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.2 },
        volume: -12,
      }),
    ).connect(this.output);

    // Riser del Hold-to-Execute: ruido rosa filtrado que se abre + tono ascendente (triángulo con envolvente).
    this.riserGain = new Tone.Gain(0);
    this.riserFilter = new Tone.Filter({ type: "bandpass", frequency: 300, Q: 2 });
    this.riserNoise = new Tone.Noise("pink");
    this.riserNoise.chain(this.riserFilter, this.riserGain, this.output);
    this.riserOscGain = new Tone.Gain(0);
    this.riserOsc = new Tone.Synth(
      opts<Partial<Tone.SynthOptions>>({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.1, sustain: 1, release: 0.15 },
        volume: -22,
      }),
    );
    this.riserOsc.chain(this.riserOscGain, this.output);
  }

  note(note: string, time: number, durS: number, vel: number): void {
    this.pluck.triggerAttackRelease(note, durS, time, vel);
  }
  bellNote(note: string | string[], time: number, durS: number, vel: number): void {
    this.bell.triggerAttackRelease(note, durS, time, vel);
  }
  /** Tecla mecánica con una variación aleatoria de altura de ±3 %. */
  key(time: number, vel: number): void {
    const v = 1 + (this.rnd() * 2 - 1) * 0.03;
    const at = this.keyTime(time);
    this.keyFilter.frequency.setValueAtTime(2300 * v, at);
    this.keyNoise.triggerAttackRelease(0.02, at, vel);
    this.keyThock.triggerAttackRelease(190 * v, 0.04, at, vel * 0.7);
  }
  tick(time: number, vel: number): void {
    const at = this.keyTime(time);
    this.keyFilter.frequency.setValueAtTime(3600, at);
    this.keyNoise.triggerAttackRelease(0.012, at, vel);
  }
  lowNote(note: string, time: number, durS: number, vel: number): void {
    this.low.triggerAttackRelease(note, durS, time, vel);
  }
  chord(notes: readonly string[], time: number, durS: number, vel: number): void {
    this.chordSynth.triggerAttackRelease([...notes], durS, time, vel);
  }
  cymbalHit(time: number, vel: number): void {
    this.cymbal.triggerAttackRelease(0.7, this.cymbalTime(time), vel);
  }
  swish(time: number, vel: number): void {
    const at = this.swishTime(time);
    this.swishFilter.frequency.setValueAtTime(700, at);
    this.swishFilter.frequency.exponentialRampToValueAtTime(5200, at + 0.5);
    this.swishNoise.triggerAttackRelease(0.3, at, vel);
  }
  /** Un blip de «paquete» en un punto del panorama (-1 izquierda, 1 derecha). */
  packet(note: string, pan: number, time: number, vel: number): void {
    this.packetPan.pan.setValueAtTime(pan, time);
    this.packetSynth.triggerAttackRelease(note, 0.07, time, vel);
  }
  flash(note: string, pan: number, time: number, vel: number): void {
    this.flashPan.pan.setValueAtTime(pan, time);
    this.flashSynth.triggerAttackRelease(note, 0.05, time, vel);
  }
  impact(time: number, vel: number): void {
    this.impactSynth.triggerAttackRelease("D2", 0.3, time, vel);
  }

  /** Arranca el riser: sube durante `seconds` (el umbral del hold) sincronizado con el anillo. */
  riserStart(time: number, seconds: number): void {
    if (this.riserRunning) this.riserCancel(time);
    this.riserRunning = true;
    if (!this.riserNoiseStarted) {
      this.riserNoiseStarted = true;
      this.riserNoise.start(time);
    }
    this.riserFilter.frequency.cancelScheduledValues(time);
    this.riserFilter.frequency.setValueAtTime(300, time);
    this.riserFilter.frequency.exponentialRampTo(6500, seconds, time);
    this.riserGain.gain.cancelScheduledValues(time);
    this.riserGain.gain.setValueAtTime(0.0001, time);
    this.riserGain.gain.exponentialRampTo(0.55, seconds, time);
    this.riserOsc.triggerAttack("D3", time);
    this.riserOsc.frequency.setValueAtTime(146.83, time);
    this.riserOsc.frequency.exponentialRampTo(587.33, seconds, time);
    this.riserOscGain.gain.cancelScheduledValues(time);
    this.riserOscGain.gain.setValueAtTime(0.0001, time);
    this.riserOscGain.gain.exponentialRampTo(0.7, seconds, time);
  }

  /** Suelta antes de completar: el riser cae y se desvanece. */
  riserCancel(time: number): void {
    if (!this.riserRunning) return;
    this.riserRunning = false;
    this.riserFilter.frequency.cancelScheduledValues(time);
    this.riserFilter.frequency.exponentialRampTo(200, 0.25, time);
    this.riserGain.gain.cancelScheduledValues(time);
    this.riserGain.gain.rampTo(0, 0.25, time);
    this.riserOscGain.gain.cancelScheduledValues(time);
    this.riserOscGain.gain.rampTo(0, 0.2, time);
    this.riserOsc.triggerRelease(time + 0.2);
  }

  /** Completado: el riser llega a su punto álgido y se corta en el impacto. */
  riserFinish(time: number): void {
    if (!this.riserRunning) return;
    this.riserRunning = false;
    this.riserGain.gain.cancelScheduledValues(time);
    this.riserGain.gain.rampTo(0, 0.12, time);
    this.riserOscGain.gain.cancelScheduledValues(time);
    this.riserOscGain.gain.rampTo(0, 0.1, time);
    this.riserOsc.triggerRelease(time + 0.1);
  }

  get riserActive(): boolean {
    return this.riserRunning;
  }

  dispose(): void {
    for (const n of [
      this.pluck, this.pluckFilter, this.bell, this.keyNoise, this.keyFilter, this.keyThock, this.low, this.chordSynth,
      this.cymbal, this.cymbalFilter, this.swishNoise, this.swishFilter, this.packetPan, this.packetSynth,
      this.flashPan, this.flashSynth, this.impactSynth, this.riserNoise, this.riserFilter, this.riserGain,
      this.riserOsc, this.riserOscGain, this.output,
    ])
      n.dispose();
  }
}
