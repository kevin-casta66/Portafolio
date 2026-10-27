import { afterEach, describe, expect, it, vi } from "vitest";
import { audio, type AudioSink } from "./index";
import type { AudioControls } from "./types";

const controls = (ready = true): AudioControls => ({
  ready,
  subscribe: () => () => {},
  layers: () => [],
  setLayerMuted: () => {},
  setLayerSolo: () => {},
  layerLevel: () => 0.5,
  spectrum: (out) => out.fill(0.5),
  energy: () => 0.3,
  context: () => "runtime",
  dominantLayer: () => "bass",
  timeToNextBar: () => 120,
  onFirstSound: () => () => {},
});

afterEach(() => audio.reset());

describe("fachada audio.emit", () => {
  it("sin motor, emitir no hace nada ni falla (nada suena antes de la puerta)", () => {
    expect(() => audio.emit("hover:token", { kind: "keyword" })).not.toThrow();
    expect(audio.controls.ready).toBe(false);
    expect(audio.timeToNextBar()).toBeNull();
  });

  it("recuerda el estado de la puerta aunque no haya motor: líneas, elección y fin del arranque", () => {
    expect(audio.gate).toEqual({ resolved: false, bootDone: false, lines: 0 });
    audio.emit("boot:line", { index: 0 });
    audio.emit("boot:line", { index: 1 });
    expect(audio.gate.lines).toBe(2);
    expect(audio.gate.resolved).toBe(false);
    const onGate = vi.fn();
    audio.onGate(onGate);
    audio.emit("gate:sound");
    expect(audio.gate.resolved).toBe(true);
    expect(onGate).toHaveBeenCalledTimes(1);
    audio.emit("boot:done");
    expect(audio.gate.bootDone).toBe(true);
  });

  it("«Iniciar en silencio» también resuelve la puerta", () => {
    audio.emit("gate:silent");
    expect(audio.gate.resolved).toBe(true);
    expect(audio.gate.bootDone).toBe(false);
  });

  it("entrega los eventos al motor registrado y expone sus controles", () => {
    const handle = vi.fn();
    const sink: AudioSink = { handle };
    const off = audio.registerEngine(sink, controls());
    audio.emit("hold:progress", { progress: 0.4 });
    audio.emit("hold:start");
    expect(handle).toHaveBeenNthCalledWith(1, "hold:progress", { progress: 0.4 });
    expect(handle).toHaveBeenNthCalledWith(2, "hold:start", undefined);
    expect(audio.controls.ready).toBe(true);
    expect(audio.controls.layerLevel("bass")).toBe(0.5);
    expect(audio.timeToNextBar()).toBe(120);
    off();
    expect(audio.controls.ready).toBe(false);
    audio.emit("hold:cancel");
    expect(handle).toHaveBeenCalledTimes(2);
  });

  it("un motor que se registra tarde recibe el último contexto (la fase en la que ya estaba el visitante)", () => {
    audio.emit("phase:parser");
    audio.emit("phase:bytecode");
    const handle = vi.fn();
    audio.registerEngine({ handle }, controls());
    expect(handle).toHaveBeenCalledWith("phase:bytecode", undefined);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("un motor que falla no rompe al emisor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    audio.registerEngine(
      {
        handle() {
          throw new Error("boom");
        },
      },
      controls(),
    );
    expect(() => audio.emit("achievement", { id: "root_access" })).not.toThrow();
    spy.mockRestore();
  });

  it("sin el parámetro de pruebas no existe el gancho global", () => {
    expect((globalThis as { window?: { __portafolioSound?: unknown } }).window?.__portafolioSound).toBeUndefined();
  });
});
