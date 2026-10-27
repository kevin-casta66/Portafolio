import { readFileSync } from "node:fs";
import path from "node:path";
import { creditLine, validateStemsManifest } from "@/audio/stems-manifest";

/**
 * Línea de créditos de la música PRODUCIDA para el pie (ADDENDUM-v3 §9). Solo existe si hay stems
 * publicados (`public/audio/stems/manifest.json` válido, con licencia CC0 o comercial); la música
 * generada en el navegador no tiene créditos de terceros y devuelve `null`. Se lee en el servidor al
 * construir: no añade nada al JS del cliente.
 */
export function stemsCreditLine(root: string = process.cwd()): string | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(root, "public", "audio", "stems", "manifest.json"), "utf8"));
    const result = validateStemsManifest(raw);
    return result.ok ? creditLine(result.manifest.credits) : null;
  } catch {
    return null;
  }
}
