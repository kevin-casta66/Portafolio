import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audio, LAYER_IDS, type AudioControls, type LayerId, type LayerState } from "@/audio";
import es from "@/messages/es.json";
import { appStore } from "@/lib/store";
import { NowPlaying } from "../CallStack/NowPlaying";
import Mixer from "./Mixer";
import SoundPanel from "./SoundPanel";
import { SoundSettings } from "./SoundPopover";

// `useStore` de zustand renderiza en servidor con el estado INICIAL; aquí interesa el estado fijado por cada test.
vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return { ...actual, useAppStore: <T,>(selector: (s: ReturnType<typeof actual.appStore.getState>) => T): T => selector(actual.appStore.getState()) };
});

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="es" messages={es}>
      {node}
    </NextIntlClientProvider>,
  );

/** Motor simulado: las 6 capas, con el estado de mute/solo que fije cada test. */
function fakeControls(layers: Partial<Record<LayerId, Partial<LayerState>>> = {}): AudioControls {
  const state: LayerState[] = LAYER_IDS.map((id) => ({ id, gain: 1, muted: false, solo: false, ...layers[id] }));
  return {
    ready: true,
    subscribe: () => () => {},
    layers: () => state,
    setLayerMuted: vi.fn(),
    setLayerSolo: vi.fn(),
    layerLevel: () => 0.5,
    spectrum: (out) => out.fill(0.5),
    energy: () => 0.5,
    context: () => "runtime",
    dominantLayer: () => "bass",
    timeToNextBar: () => 120,
    onFirstSound: () => () => {},
  };
}

const registerFake = (controls: AudioControls) => audio.registerEngine({ handle: () => {} }, controls);

beforeEach(() => appStore.setState({ sound: { ...appStore.getState().sound, enabled: true, volume: 0.35, music: true, sfx: true } }));
afterEach(() => audio.reset());

describe("SoundSettings (popover de sonido)", () => {
  it("el JS inicial solo lleva el botón y el marco del popover (el cuerpo se pide al acercarse)", () => {
    const html = wrap(<SoundSettings />);
    expect(html).toContain('id="sound-popover"');
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-label="Ajustes de sonido"');
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain('type="range"');
  });
});

describe("SoundPanel (cuerpo del popover)", () => {
  it("muestra el volumen al 35 % y dos interruptores accesibles (Música y Efectos)", () => {
    const html = wrap(<SoundPanel />);
    expect(html).toContain('value="35"');
    expect(html).toContain('aria-valuetext="35 %"');
    expect((html.match(/role="switch"/g) ?? []).length).toBe(2);
    expect(html).toContain("Música");
    expect(html).toContain("Efectos");
  });

  it("refleja los interruptores y el volumen guardados, y avisa si el sonido está apagado", () => {
    appStore.setState({ sound: { ...appStore.getState().sound, enabled: false, volume: 0.8, music: false } });
    const html = wrap(<SoundPanel />);
    expect(html).toContain('value="80"');
    expect(html).toContain("El sonido está desactivado");
    expect((html.match(/checked=""/g) ?? []).length).toBe(1); // solo Efectos sigue activado
  });
});

describe("Mixer", () => {
  it("sin motor muestra el aviso y ninguna fila (no falla)", () => {
    const html = wrap(<Mixer />);
    expect(html).toContain("El motor de audio no está activo");
    expect(html).not.toContain("data-layer=");
  });

  it("con motor muestra una fila por capa con mute, solo y vúmetro con nombre accesible", () => {
    registerFake(fakeControls({ bass: { muted: true }, arp: { solo: true } }));
    const html = wrap(<Mixer />);
    for (const id of LAYER_IDS) expect(html).toContain(`data-layer="${id}"`);
    expect((html.match(/<meter /g) ?? []).length).toBe(6);
    expect(html).toContain('aria-label="Silenciar Bajo"');
    expect(html).toContain('aria-label="Solo Arpegio"');
    expect(html).toContain('aria-label="Nivel de Percusión"');
    // aria-pressed refleja el estado: bajo en mute, arpegio en solo
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Silenciar Bajo"|aria-label="Silenciar Bajo"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Solo Arpegio"|aria-label="Solo Arpegio"[^>]*aria-pressed="true"/);
  });

  it("con un solo activo, las demás capas se atenúan (data-silent)", () => {
    registerFake(fakeControls({ arp: { solo: true } }));
    const html = wrap(<Mixer />);
    // 5 vúmetros atenuados (todas menos la que está en solo)
    expect((html.match(/data-silent="true"/g) ?? []).length).toBe(5);
    expect((html.match(/data-silent="false"/g) ?? []).length).toBe(1);
  });
});

describe("NowPlaying", () => {
  it("no se muestra con el sonido desactivado", () => {
    registerFake(fakeControls());
    appStore.setState({ sound: { ...appStore.getState().sound, enabled: false } });
    expect(wrap(<NowPlaying />)).toBe("");
  });

  it("no se muestra mientras el motor no está listo", () => {
    expect(wrap(<NowPlaying />)).toBe("");
  });

  it("con sonido y motor listo es un botón que abre los ajustes, con un nombre accesible único", () => {
    registerFake(fakeControls());
    const html = wrap(<NowPlaying />);
    expect(html).toContain("data-now-playing");
    expect(html).toContain('popoverTarget="sound-popover"');
    expect(html).toContain("Reproduciendo: capa Bajo · fase runtime");
    expect(html).toContain("Abrir los ajustes de sonido");
    // las barras son decorativas: aria-hidden
    expect(html).toMatch(/aria-hidden="true"[^>]*class="flex h-3\.5/);
  });
});
