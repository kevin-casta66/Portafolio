import type { MsdfGlyph } from "./msdf-font";

/**
 * Maquetación de glifos MSDF a partir de las PALABRAS ya colocadas por el navegador (rectángulos DOM
 * de cada palabra): así el texto 3D coincide con el título DOM incluso con saltos de línea, y no hace
 * falta reimplementar el ajuste de líneas. Cada palabra se coloca en su posición DOM y se ajusta en
 * horizontal al ancho DOM (corrige diferencias de peso o de kerning entre el atlas y la fuente web).
 */
export interface FontMetrics {
  size: number;
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
  glyphs: ReadonlyMap<string, MsdfGlyph>;
}

export interface PlacedWord {
  text: string;
  /** Esquina superior izquierda del rectángulo DOM de la palabra, relativa al elemento (px CSS). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GlyphMesh {
  /** x, y (hacia abajo; el llamante invierte el eje si lo necesita), z = 0. */
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  /** Posición normalizada 0..1 de cada vértice a lo largo del texto (barridos de disolución). */
  along: Float32Array;
  /** Índice de glifo por vértice (semilla por glifo). */
  glyphIndex: Float32Array;
  glyphCount: number;
}

/** Ancho que ocupa una palabra con las métricas del atlas, en px a `fontPx`. */
export function measureWord(text: string, font: FontMetrics, fontPx: number): number {
  const s = fontPx / font.size;
  let w = 0;
  for (const ch of text) w += (font.glyphs.get(ch)?.xadvance ?? 0) * s;
  return w;
}

/** Máxima corrección horizontal aceptada al ajustar una palabra al ancho DOM. */
const MAX_FIT = 0.15;

export function layoutWords(words: PlacedWord[], font: FontMetrics, fontPx: number): GlyphMesh {
  const s = fontPx / font.size;
  let total = 0;
  for (const w of words) for (const ch of w.text) if (font.glyphs.get(ch)?.width) total++;

  const positions = new Float32Array(total * 4 * 3);
  const uvs = new Float32Array(total * 4 * 2);
  const indices = new Uint16Array(total * 6);
  const along = new Float32Array(total * 4);
  const glyphIndex = new Float32Array(total * 4);

  const first = words[0];
  const last = words[words.length - 1];
  const minX = first ? Math.min(...words.map((w) => w.x)) : 0;
  const maxX = last ? Math.max(...words.map((w) => w.x + w.width)) : 1;
  const span = Math.max(1, maxX - minX);

  let g = 0;
  for (const word of words) {
    const natural = measureWord(word.text, font, fontPx);
    const k = natural > 0 ? word.width / natural : 1;
    const fit = Math.abs(k - 1) <= MAX_FIT ? k : 1;
    // El cuadro de línea del atlas se centra en el rectángulo DOM de la palabra.
    const lineTop = word.y + (word.height - font.lineHeight * s) / 2;
    let pen = 0;
    for (const ch of word.text) {
      const glyph = font.glyphs.get(ch);
      if (!glyph) continue;
      if (glyph.width > 0 && glyph.height > 0) {
        const x0 = word.x + (pen + glyph.xoffset * s) * fit;
        const x1 = x0 + glyph.width * s * fit;
        const y0 = lineTop + glyph.yoffset * s;
        const y1 = y0 + glyph.height * s;
        const v = g * 4;
        positions.set([x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0], v * 3);
        const u0 = glyph.x / font.scaleW;
        const u1 = (glyph.x + glyph.width) / font.scaleW;
        const t0 = glyph.y / font.scaleH;
        const t1 = (glyph.y + glyph.height) / font.scaleH;
        uvs.set([u0, t0, u1, t0, u0, t1, u1, t1], v * 2);
        indices.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], g * 6);
        const t = (x0 - minX) / span;
        along.fill(Math.min(1, Math.max(0, t)), v, v + 4);
        glyphIndex.fill(g, v, v + 4);
        g++;
      }
      pen += glyph.xadvance * s;
    }
  }
  return { positions, uvs, indices, along, glyphIndex, glyphCount: g };
}
