import { afterEach, describe, expect, it, vi } from "vitest";
import { audio, type AudioControls } from "@/audio";
import { landOnBar, MAX_AUDIO_DELAY_MS } from "./audio-sync";

const controlsWith = (timeToNextBar: () => number | null): AudioControls => ({
  ready: true,
  subscribe: () => () => {},
  layers: () => [],
  setLayerMuted: () => {},
  setLayerSolo: () => {},
  layerLevel: () => 0,
  spectrum: (out) => out.fill(0),
  energy: () => 0,
  context: () => "runtime",
  dominantLayer: () => "pad",
  timeToNextBar,
  onFirstSound: () => () => {},
});

afterEach(() => {
  audio.reset();
  vi.useRealTimers();
});

describe("landOnBar (aterrizar al primer tiempo del compás)", () => {
  it("sin audio la respuesta visual es inmediata (retraso 0)", () => {
    const run = vi.fn();
    expect(landOnBar(run)).toBe(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("si el compás llega en ≤ 350 ms espera hasta él", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, __portafolioAudioLog: [] as unknown[] });
    audio.registerEngine({ handle: () => {} }, controlsWith(() => 220));
    const run = vi.fn();
    expect(landOnBar(run)).toBe(220);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(219);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(run).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("si el compás está lejos NO retrasa la respuesta (el límite es 350 ms)", () => {
    audio.registerEngine({ handle: () => {} }, controlsWith(() => 1800));
    const run = vi.fn();
    expect(landOnBar(run)).toBe(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(MAX_AUDIO_DELAY_MS).toBe(350);
  });

  it("nunca supera el retraso máximo para ninguna posición dentro del compás", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, __portafolioAudioLog: [] as unknown[] });
    for (let wait = 0; wait <= 2857; wait += 37) {
      audio.reset();
      audio.registerEngine({ handle: () => {} }, controlsWith(() => wait));
      const delay = landOnBar(() => {});
      expect(delay).toBeLessThanOrEqual(MAX_AUDIO_DELAY_MS);
    }
    vi.unstubAllGlobals();
  });
});
