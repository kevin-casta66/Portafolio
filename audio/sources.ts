/**
 * Fuentes de la música (ADDENDUM-v3 §3): «generativa» (los patches de `patches.ts`, por defecto) o
 * «stems» (archivos producidos en bucle, uno por capa, con licencia verificada). Ambas se enganchan a
 * las mismas capas, ganancias y mezcla (`mix.ts`): lo único que cambia es qué suena dentro de cada capa.
 *
 * Los stems solo se piden si el build los declara (`NEXT_PUBLIC_AUDIO_STEMS=1`) y existe
 * `public/audio/stems/manifest.json`; sin ellos no se hace ninguna petición y la música se genera.
 */
import * as Tone from "tone";
import { STEMS_MANIFEST_URL, pickStemFormat, validateStemsManifest } from "./stems-manifest";
import { LAYER_IDS, type LayerId } from "./types";

export interface LoadedStems {
  /** Duración del bucle de 4 compases (s). */
  loopSeconds: number;
  buffers: Record<LayerId, Tone.ToneAudioBuffer>;
}

export type MusicSource = "generative" | "stems";

export const stemsEnabled = (): boolean => process.env.NEXT_PUBLIC_AUDIO_STEMS === "1";

/**
 * Descarga el manifiesto y las 6 capas en el formato que reproduce el navegador (Opus en WebM; AAC en
 * M4A como alternativa). Cualquier fallo —sin manifiesto, inválido, sin formato compatible, red— devuelve
 * `null` y la música se genera en el navegador.
 */
export async function loadStems(fetcher: typeof fetch = fetch): Promise<LoadedStems | null> {
  if (!stemsEnabled()) return null;
  try {
    const response = await fetcher(STEMS_MANIFEST_URL, { cache: "force-cache" });
    if (!response.ok) return null;
    const result = validateStemsManifest(await response.json());
    if (!result.ok) {
      if (process.env.NODE_ENV !== "production") console.warn("[audio] manifiesto de stems inválido:", result.errors);
      return null;
    }
    const probe = document.createElement("audio");
    const canPlay = (mime: string) => probe.canPlayType(mime) !== "";
    const picks = LAYER_IDS.map((id) => [id, pickStemFormat(result.manifest.stems[id], canPlay)] as const);
    if (picks.some(([, pick]) => pick === null)) return null;
    const loaded = await Promise.all(
      picks.map(async ([id, pick]) => [id, await Tone.ToneAudioBuffer.fromUrl(pick!.url)] as const),
    );
    return { loopSeconds: result.manifest.loopSeconds, buffers: Object.fromEntries(loaded) as Record<LayerId, Tone.ToneAudioBuffer> };
  } catch {
    return null;
  }
}

/** Un reproductor en bucle por capa, sincronizado con el Transport (misma rejilla que el modo generativo). */
export function createStemPlayers(stems: LoadedStems): Record<LayerId, Tone.Player> {
  const players = {} as Record<LayerId, Tone.Player>;
  for (const id of LAYER_IDS) {
    const player = new Tone.Player({ url: stems.buffers[id], loop: true, loopStart: 0, loopEnd: stems.loopSeconds });
    player.sync().start(0);
    players[id] = player;
  }
  return players;
}
