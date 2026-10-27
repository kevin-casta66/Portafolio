/**
 * Manifiesto del modo «stems» (ADDENDUM-v3 §3, §9). Cuando existen archivos de capas producidos con
 * licencia verificada, `public/audio/stems/manifest.json` los describe y el motor los usa EN LUGAR de los
 * patches generativos, con exactamente la misma lógica de capas. Hoy no existe ese archivo y la música se
 * genera en el navegador.
 *
 * Todo es PURO (sin Tone ni DOM): la validación del presupuesto (< 4 MB), de las 6 capas, de la duración
 * del bucle y de la licencia se prueba sin navegador.
 */
import { BAR_S, BPM, PROGRESSION_BARS } from "./scale";
import { LAYER_IDS, type LayerId } from "./types";

/** Presupuesto total de los archivos de capas (bytes). */
export const STEMS_BUDGET_BYTES = 4 * 1024 * 1024;
export const STEMS_DIR = "/audio/stems/";
export const STEMS_MANIFEST_URL = `${STEMS_DIR}manifest.json`;
/** Licencias aceptadas (ADDENDUM-v3 §9): dominio público o licencia comercial verificada. */
export const ALLOWED_LICENSES = ["CC0-1.0", "commercial"] as const;

export interface StemEntry {
  /** Opus en WebM (preferido) y AAC en M4A (alternativa para Safari); al menos uno. */
  webm?: string;
  m4a?: string;
  bytes: number;
}

export interface StemsManifest {
  version: 1;
  bpm: number;
  bars: number;
  loopSeconds: number;
  stems: Record<LayerId, StemEntry>;
  credits: { title: string; author: string; license: (typeof ALLOWED_LICENSES)[number]; source: string };
}

export type ManifestResult = { ok: true; manifest: StemsManifest } | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function validateStemsManifest(input: unknown): ManifestResult {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ["el manifiesto debe ser un objeto"] };
  if (input.version !== 1) errors.push("version debe ser 1");
  if (input.bpm !== BPM) errors.push(`bpm debe ser ${BPM}`);
  if (input.bars !== PROGRESSION_BARS) errors.push(`bars debe ser ${PROGRESSION_BARS}`);
  const expected = PROGRESSION_BARS * BAR_S;
  if (typeof input.loopSeconds !== "number" || Math.abs(input.loopSeconds - expected) > 0.02)
    errors.push(`loopSeconds debe ser ${expected.toFixed(3)} (±0,02): el bucle ha de cuadrar con la pieza`);

  let total = 0;
  const stems = isObject(input.stems) ? input.stems : {};
  for (const id of LAYER_IDS) {
    const entry = stems[id];
    if (!isObject(entry)) {
      errors.push(`falta la capa «${id}»`);
      continue;
    }
    if (typeof entry.webm !== "string" && typeof entry.m4a !== "string") errors.push(`la capa «${id}» necesita webm o m4a`);
    if (typeof entry.bytes !== "number" || entry.bytes <= 0) errors.push(`la capa «${id}» necesita bytes > 0`);
    else total += entry.bytes;
  }
  if (total > STEMS_BUDGET_BYTES) errors.push(`los archivos suman ${total} bytes: superan el presupuesto de ${STEMS_BUDGET_BYTES}`);

  const credits = isObject(input.credits) ? input.credits : {};
  for (const key of ["title", "author", "source"] as const)
    if (typeof credits[key] !== "string" || credits[key] === "") errors.push(`credits.${key} es obligatorio`);
  if (!ALLOWED_LICENSES.includes(credits.license as (typeof ALLOWED_LICENSES)[number]))
    errors.push(`credits.license debe ser una de: ${ALLOWED_LICENSES.join(", ")}`);

  return errors.length ? { ok: false, errors } : { ok: true, manifest: input as unknown as StemsManifest };
}

/** Elige el formato de una capa según lo que reproduce el navegador: Opus en WebM; si no, AAC en M4A. */
export function pickStemFormat(
  entry: StemEntry,
  canPlay: (mime: string) => boolean,
): { url: string; format: "webm" | "m4a" } | null {
  if (entry.webm && canPlay('audio/webm; codecs="opus"')) return { url: STEMS_DIR + entry.webm, format: "webm" };
  if (entry.m4a && canPlay('audio/mp4; codecs="mp4a.40.2"')) return { url: STEMS_DIR + entry.m4a, format: "m4a" };
  return null;
}

/** Texto de créditos del pie y del README (solo si hay stems). */
export const creditLine = (credits: StemsManifest["credits"]): string =>
  `Música: «${credits.title}», ${credits.author} (${credits.license}) · ${credits.source}`;
