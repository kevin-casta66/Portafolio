import type { HeapBlock, HeapLayout } from "@/lib/heap";
import type { FontMetrics } from "../../text/glyph-layout";
import { CELL_H, CELL_W, PITCH_Y, slotsOf, type Slot } from "./grid";

/**
 * Datos por instancia del heap (puros, sin three): se calculan en CPU UNA vez por cambio de layout, de
 * viewport o de idioma, y la GPU hace el resto (interpolación «Run GC», envoltura infinita, lente).
 * Hay dos mallas instanciadas: los bloques (un quad subdividido por bloque y copia) y los glifos MSDF
 * de sus etiquetas (un quad por glifo, bloque y copia): en total 2 draw calls, sea cual sea el contenido.
 */
export const TINT = { text: 0, accent: 1, muted: 2 } as const;
/** Conjunto de etiquetas de grupo: se desvanecen durante «Run GC» (las viejas salen y las nuevas entran). */
export const LABEL_SET = { block: 0, old: 1, current: 2 } as const;

export interface GlyphRect {
  /** Posición y tamaño del quad relativos a la esquina superior izquierda del bloque (px, y hacia abajo). */
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  tint: number;
}

const INNER_X = 14;
const ADDRESS_PX = 13;
const NAME_PX = 14;
const META_PX = 11;
const NAME_LINES = 3;
const LINE_GAP = 4;

/** Divide `text` en líneas de como mucho `maxChars` caracteres (por palabras) y trunca con «…» al exceder `maxLines`. */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.normalize("NFC").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    let word = words[i] as string;
    if (word.length > maxChars) word = word.slice(0, Math.max(1, maxChars - 1)) + "…";
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumed < words.length && lines.length > 0) {
    const last = lines[lines.length - 1] as string;
    const room = Math.max(1, maxChars - 1);
    lines[lines.length - 1] = (last.length > room ? last.slice(0, room) : last).replace(/[\s·.,;:–-]+$/, "") + "…";
  }
  return lines.slice(0, maxLines);
}

/** Glifos de una línea de texto monoespaciado a partir de `(x, top)` con el cuerpo `fontPx`. */
export function layoutLine(
  text: string,
  font: FontMetrics,
  fontPx: number,
  x: number,
  top: number,
  tint: number,
): GlyphRect[] {
  const s = fontPx / font.size;
  const lineTop = top - ((font.lineHeight - font.base) * s) / 2;
  const out: GlyphRect[] = [];
  let pen = 0;
  for (const ch of text.normalize("NFC")) {
    const g = font.glyphs.get(ch);
    if (!g) continue;
    if (g.width > 0 && g.height > 0) {
      out.push({
        x: x + pen + g.xoffset * s,
        y: lineTop + g.yoffset * s,
        w: g.width * s,
        h: g.height * s,
        u0: g.x / font.scaleW,
        v0: g.y / font.scaleH,
        u1: (g.x + g.width) / font.scaleW,
        v1: (g.y + g.height) / font.scaleH,
        tint,
      });
    }
    pen += g.xadvance * s;
  }
  return out;
}

/** Ancho de avance de un carácter monoespaciado (px) con el cuerpo `fontPx`. */
export function advanceOf(font: FontMetrics, fontPx: number): number {
  const g = font.glyphs.get("0");
  return ((g?.xadvance ?? font.size * 0.6) * fontPx) / font.size;
}

export interface BlockText {
  address: string;
  name: string;
  meta: string;
}

/** Glifos de TODO el texto de un bloque (dirección, nombre en hasta 3 líneas y tipo · año). */
export function layoutBlockText(text: BlockText, font: FontMetrics): GlyphRect[] {
  const innerW = CELL_W - INNER_X * 2;
  const glyphs: GlyphRect[] = [];
  // La dirección va en el color de texto (no en acento): sobre la franja teñida del tipo el acento no llega a AA.
  glyphs.push(...layoutLine(text.address, font, ADDRESS_PX, INNER_X, 11, TINT.text));
  const maxChars = Math.max(4, Math.floor(innerW / advanceOf(font, NAME_PX)));
  const lines = wrapLines(text.name, maxChars, NAME_LINES);
  lines.forEach((line, i) => {
    glyphs.push(...layoutLine(line, font, NAME_PX, INNER_X, 44 + i * (NAME_PX + LINE_GAP + 2), TINT.text));
  });
  const metaMax = Math.max(4, Math.floor(innerW / advanceOf(font, META_PX)));
  const meta = text.meta.length > metaMax ? text.meta.slice(0, metaMax - 1) + "…" : text.meta;
  glyphs.push(...layoutLine(meta, font, META_PX, INNER_X, CELL_H - 24, TINT.muted));
  return glyphs;
}

/** Etiqueta de grupo («▸ React · 3»): se dibuja en la fila de etiqueta, encima de las celdas del grupo. */
export function layoutGroupLabel(text: string, font: FontMetrics): GlyphRect[] {
  return layoutLine(text, font, 15, 4, 22, TINT.accent);
}

// ── Construcción de los buffers por instancia ───────────────────────────────────────────────────────

export interface BlockBuffers {
  count: number;
  /** vec4: x, y, w, h del quad relativos a la esquina del bloque. */
  rect: Float32Array;
  /** vec4: desde (x, y) y hasta (x, y) del bloque, en coordenadas del tile. */
  from: Float32Array;
  /** vec4: copia (x, y), retardo (s) y reservado. */
  meta: Float32Array;
  /** vec4: tipo (0 proyecto, 1 experimento), hover, foco, tinte de grupo. */
  aux: Float32Array;
  /** Clave del bloque de cada instancia (para pintar el hover/foco sin recorrer el layout). */
  keys: string[];
}

export interface TextBuffers {
  count: number;
  rect: Float32Array;
  uv: Float32Array;
  from: Float32Array;
  meta: Float32Array;
  /** vec4: tinte, conjunto de etiqueta, reservado, reservado. */
  aux: Float32Array;
}

export interface BuildInput {
  blocks: readonly HeapBlock[];
  from: HeapLayout;
  to: HeapLayout;
  /** Copias del tile por eje y su desfase (la copia 0 es la `-1`: cubre el borde izquierdo/superior). */
  nx: number;
  ny: number;
  locale: "es" | "en";
  font: FontMetrics;
  skillNames: Readonly<Record<string, string>>;
  labels: { project: string; experiment: string };
  /** Retardo entre bloques de «Run GC» (s). */
  stagger: number;
  /** Conjunto de etiquetas que llevan los grupos del layout DESTINO / ORIGEN (durante «Run GC»). */
  includeOldLabels: boolean;
  /**
   * Posiciones de partida de cada bloque si NO son las del layout `from` (un «Run GC» que empieza cuando
   * otro sigue en curso parte de donde está cada bloque en ese instante, sin saltos).
   */
  fromSlots?: ReadonlyMap<string, { x: number; y: number }>;
}

export const kindIndex = (block: HeapBlock): number => (block.kind === "project" ? 0 : 1);

export function blockText(block: HeapBlock, locale: "es" | "en", labels: BuildInput["labels"]): BlockText {
  const kind = block.kind === "project" ? labels.project : labels.experiment;
  return { address: block.address, name: block.name[locale], meta: `${kind} · ${block.year}` };
}

function groupLabelText(layout: HeapLayout, input: BuildInput): { text: string; slot: Slot }[] {
  return layout.groups.map((g) => {
    const name = layout.criterion === "tech" ? (input.skillNames[g.label] ?? g.label) : g.label;
    return { text: `▸ ${name} · ${g.count}`, slot: { key: g.id, x: 0, y: g.row * PITCH_Y } };
  });
}

/** Retardo de cada bloque en «Run GC»: escalonado en el orden de lectura del layout DESTINO. */
export function delaysFor(to: HeapLayout, stagger: number): Map<string, number> {
  return new Map(to.cells.map((c, i) => [c.key, i * stagger]));
}

export function buildInstances(input: BuildInput): { blocks: BlockBuffers; text: TextBuffers } {
  const { blocks, from, to, nx, ny } = input;
  const fromSlots: ReadonlyMap<string, { x: number; y: number }> =
    input.fromSlots ?? new Map(slotsOf(from).map((s) => [s.key, s]));
  const toSlots = new Map(slotsOf(to).map((s) => [s.key, s]));
  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const delays = delaysFor(to, input.stagger);
  const groupIndex = new Map(to.groups.map((g, i) => [g.id, i]));
  const groupOf = new Map(to.cells.map((c) => [c.key, c.group]));
  const copies = nx * ny;

  // Glifos de cada bloque (una vez) y de las etiquetas de grupo.
  const glyphsOf = new Map<string, GlyphRect[]>();
  for (const b of blocks) glyphsOf.set(b.key, layoutBlockText(blockText(b, input.locale, input.labels), input.font));
  const newLabels = groupLabelText(to, input).map((l) => ({ ...l, glyphs: layoutGroupLabel(l.text, input.font) }));
  const oldLabels = input.includeOldLabels
    ? groupLabelText(from, input).map((l) => ({ ...l, glyphs: layoutGroupLabel(l.text, input.font) }))
    : [];

  const keys = to.cells.map((c) => c.key);
  const blockCount = keys.length * copies;
  const b: BlockBuffers = {
    count: blockCount,
    rect: new Float32Array(blockCount * 4),
    from: new Float32Array(blockCount * 4),
    meta: new Float32Array(blockCount * 4),
    aux: new Float32Array(blockCount * 4),
    keys: new Array<string>(blockCount),
  };

  let glyphTotal = 0;
  for (const key of keys) glyphTotal += (glyphsOf.get(key)?.length ?? 0) * copies;
  for (const l of [...newLabels, ...oldLabels]) glyphTotal += l.glyphs.length * copies;
  const t: TextBuffers = {
    count: glyphTotal,
    rect: new Float32Array(glyphTotal * 4),
    uv: new Float32Array(glyphTotal * 4),
    from: new Float32Array(glyphTotal * 4),
    meta: new Float32Array(glyphTotal * 4),
    aux: new Float32Array(glyphTotal * 4),
  };

  let bi = 0;
  let ti = 0;
  for (let cy = 0; cy < ny; cy++) {
    for (let cx = 0; cx < nx; cx++) {
      const copyX = cx - 1;
      const copyY = cy - 1;
      for (const key of keys) {
        const dst = toSlots.get(key) as Slot;
        const src = fromSlots.get(key) ?? dst;
        const block = byKey.get(key) as HeapBlock;
        const delay = delays.get(key) ?? 0;
        const o = bi * 4;
        b.rect.set([0, 0, CELL_W, CELL_H], o);
        b.from.set([src.x, src.y, dst.x, dst.y], o);
        b.meta.set([copyX, copyY, delay, 0], o);
        const group = groupOf.get(key);
        const tintGroup = group ? (groupIndex.get(group) ?? 0) : 0;
        b.aux.set([kindIndex(block), 0, 0, tintGroup], o);
        b.keys[bi] = key;
        bi++;
        for (const g of glyphsOf.get(key) ?? []) {
          const q = ti * 4;
          t.rect.set([g.x, g.y, g.w, g.h], q);
          t.uv.set([g.u0, g.v0, g.u1, g.v1], q);
          t.from.set([src.x, src.y, dst.x, dst.y], q);
          t.meta.set([copyX, copyY, delay, 0], q);
          t.aux.set([g.tint, LABEL_SET.block, 0, 0], q);
          ti++;
        }
      }
      const pushLabels = (list: typeof newLabels, set: number) => {
        for (const l of list) {
          for (const g of l.glyphs) {
            const q = ti * 4;
            t.rect.set([g.x, g.y, g.w, g.h], q);
            t.uv.set([g.u0, g.v0, g.u1, g.v1], q);
            t.from.set([l.slot.x, l.slot.y, l.slot.x, l.slot.y], q);
            t.meta.set([copyX, copyY, 0, 0], q);
            t.aux.set([g.tint, set, 0, 0], q);
            ti++;
          }
        }
      };
      pushLabels(newLabels, LABEL_SET.current);
      pushLabels(oldLabels, LABEL_SET.old);
    }
  }
  return { blocks: b, text: t };
}
