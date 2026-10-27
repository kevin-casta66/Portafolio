import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { bayer } from "./nodes/bayer";
import { uBloomStrength, uChroma, uChromaGain, uGrainGain, uTime } from "./nodes/globals";
import { TSL, type N } from "./nodes/tsl";
import type { QualityPreset } from "./quality";

const { vec2, vec3, vec4, float, screenUV, screenCoordinate, fract, sin, dot, max, min, clamp, floor } = TSL;

/**
 * Cadena de postprocesado del `RenderPipeline` (three/webgpu): composición de capas → aberración
 * cromática → bloom selectivo (canal `glow` del MRT, solo tier alto) → grano → dithering Bayer.
 * Todo son nodos TSL propios o de `three/addons/tsl/display`; no hay ninguna librería de
 * postprocesado externa (ni `postprocessing` de pmndrs ni `EffectComposer`).
 */
export interface LayerTextures {
  /** Color (RGBA premultiplicado) de la escena, ya renderizado a su render target. */
  color: N;
  /** Canal `glow` del MRT (emisivo para el bloom) o `null` si la escena no emite. */
  glow: N | null;
}

/** Composición «over» de las capas (ordenadas de abajo arriba) muestreadas en `uvNode`. */
export function composeAt(layers: readonly LayerTextures[], uvNode: N): N {
  return layers.reduce<N>((acc, layer) => {
    const sample = layer.color.sample(uvNode);
    return sample.add(acc.mul(float(1).sub(sample.a)));
  }, vec4(0, 0, 0, 0));
}

/** Ruido de grano barato y sin textura (hash de seno). */
const grainNoise = (p: N): N => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));

export interface PostOptions {
  preset: QualityPreset;
  /** Intensidad del bloom. */
  bloomStrength?: N;
}

export function buildOutput(layers: readonly LayerTextures[], { preset, bloomStrength }: PostOptions) {
  // Aberración cromática: desplazamiento radial por canal (uChroma ∈ [0,1]).
  const dir = screenUV.sub(0.5);
  const amount = uChroma.mul(0.012).mul(uChromaGain);
  const base = composeAt(layers, screenUV);
  const hasChroma = layers.length > 0;
  const r = hasChroma ? composeAt(layers, screenUV.add(dir.mul(amount))).r : base.r;
  const b = hasChroma ? composeAt(layers, screenUV.sub(dir.mul(amount))).b : base.b;
  let out: N = vec4(r, base.g, b, base.a);

  // Bloom selectivo: solo se suma el canal `glow` de las escenas que lo emiten.
  if (preset.bloom) {
    const glows = layers.map((l) => l.glow).filter((g): g is N => g !== null);
    if (glows.length > 0) {
      const glowSum = glows.reduce<N>((acc, g) => acc.add(g), vec4(0, 0, 0, 0));
      // La intensidad es un uniform de módulo (ajustable en Debug): se aplica sobre el bloom unitario.
      const blurred = bloom(glowSum, 1, 0.5, 0.0);
      const added = blurred.rgb.mul(bloomStrength ?? uBloomStrength);
      out = vec4(out.rgb.add(added), clamp(out.a.add(max(added.r, max(added.g, added.b))), 0, 1));
    }
  }

  // Grano de película (solo donde hay imagen: se multiplica por alfa).
  if (preset.grain) {
    const px = screenCoordinate;
    const noise = grainNoise(px.add(floor(uTime.mul(24)).mul(7.31))).sub(0.5).mul(0.004).mul(uGrainGain); // en lineal: el OETF sRGB amplifica los oscuros, por eso es tan bajo
    out = vec4(out.rgb.add(vec3(noise).mul(out.a)), out.a);
  }

  // Dithering Bayer 4×4 antes de cuantizar: elimina el banding de los degradados suaves.
  const coord = screenCoordinate;
  const threshold = bayer(coord.x, coord.y, 2).sub(0.5).mul(0.5 / 255);
  out = vec4(max(vec3(0), out.rgb.add(vec3(threshold).mul(out.a))), min(1, max(0, out.a)));
  return out;
}
