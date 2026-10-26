import { LinearFilter, NoColorSpace, Texture } from "three/webgpu";
import type { MsdfFontName } from "./charset";

/**
 * Atlas MSDF de una fuente (generado en build por `scripts/build-msdf.ts`): métricas BMFont en JSON
 * + textura PNG de campo de distancia multicanal. La textura va sin mipmaps, en espacio de color
 * «sin color» (los canales son distancias, no colores) y sin voltear (v = 0 es la fila superior).
 */
export interface MsdfGlyph {
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

export interface MsdfFont {
  name: MsdfFontName;
  /** Tamaño (px) con el que se generó el atlas. */
  size: number;
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
  distanceRange: number;
  glyphs: Map<string, MsdfGlyph>;
  texture: Texture;
  dispose(): void;
}

interface RawFont {
  chars: (MsdfGlyph & { char: string })[];
  info: { size: number };
  common: { lineHeight: number; base: number; scaleW: number; scaleH: number };
  distanceField: { distanceRange: number };
}

const cache = new Map<MsdfFontName, Promise<MsdfFont>>();

export function loadMsdfFont(name: MsdfFontName): Promise<MsdfFont> {
  let promise = cache.get(name);
  if (!promise) {
    promise = (async () => {
      const base = `/webgl/msdf/${name}`;
      const [json, image] = await Promise.all([
        fetch(`${base}.json`).then((r) => {
          if (!r.ok) throw new Error(`atlas ${name}: ${r.status}`);
          return r.json() as Promise<RawFont>;
        }),
        fetch(`${base}.png`)
          .then((r) => {
            if (!r.ok) throw new Error(`atlas ${name}: ${r.status}`);
            return r.blob();
          })
          .then((blob) => createImageBitmap(blob, { colorSpaceConversion: "none" })),
      ]);
      const texture = new Texture(image);
      texture.flipY = false;
      texture.colorSpace = NoColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.needsUpdate = true;
      const glyphs = new Map<string, MsdfGlyph>();
      for (const c of json.chars) glyphs.set(c.char, c);
      return {
        name,
        size: json.info.size,
        lineHeight: json.common.lineHeight,
        base: json.common.base,
        scaleW: json.common.scaleW,
        scaleH: json.common.scaleH,
        distanceRange: json.distanceField.distanceRange,
        glyphs,
        texture,
        dispose() {
          texture.dispose();
          image.close();
          cache.delete(name);
        },
      } satisfies MsdfFont;
    })();
    cache.set(name, promise);
    promise.catch(() => cache.delete(name));
  }
  return promise;
}
