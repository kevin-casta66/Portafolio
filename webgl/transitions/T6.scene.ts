import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { t6 } from "@/motion/shared";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import type { SceneFactory } from "../core/types";
import { uAccent, uBg, uBorder, uText, uTime, uView } from "../nodes/globals";
import { fillSd, gridLines, sdRoundRect, strokeSd } from "../nodes/sdf";
import { TSL, type N } from "../nodes/tsl";
import { twinPosition } from "../core/twins";

const { vec2, vec3, vec4, float, uniform, uv, mix, smoothstep, max, abs, exp, sin, mrt } = TSL;

/** Radio de las esquinas de la tarjeta (`--radius-lg`) y alto de la franja de cabecera, en px. */
const RADIUS = 8;
const HEADER_BAND = 40;

/**
 * Escena de T6 (tarjeta ⇄ cabecera del caso): el GEMELO de la tarjeta como una superficie dibujada por
 * una sola función de distancia —relleno, borde, cuadrícula y franja de cabecera—, así es nítida a
 * cualquier tamaño y no hace falta ningún render target ni textura (nada que liberar salvo la malla y
 * su material). La superficie ocupa el rectángulo `t6.state` (en px de viewport) y la lente se aplica
 * al muestreo: barril ponderado por la distancia al borde (centro limpio, para que «Attaching
 * debugger…» —texto DOM encima— se lea) y aberración cromática separando los canales R/G/B.
 */
export const createT6Scene: SceneFactory = () => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uRect = uniform(TSL.vec4(0, 0, 1, 1));
  const uLens = uniform(0);
  const uAlpha = uniform(0);
  const uMask = uniform(0);

  // Posición del fragmento en px CSS de viewport (y hacia abajo), sea cual sea la resolución del pase.
  const px = vec2(uv().x.mul(uView.x), float(1).sub(uv().y).mul(uView.y));
  const half = vec2(uRect.z.mul(0.5), uRect.w.mul(0.5));
  const center = vec2(uRect.x.add(half.x), uRect.y.add(half.y));
  const q = px.sub(center).div(max(half, vec2(1, 1)));
  const r = max(abs(q.x), abs(q.y));
  // Peso de la lente: 0 en el centro, 1 en el borde (smoothstep desde el 35 % del radio).
  const edgeW = smoothstep(0.35, 1.0, r);
  const barrel = uLens.mul(0.06).mul(edgeW).mul(edgeW);
  // Separación entre canales: unos 8 px en el borde de una pantalla de 1280 px (flecos finos, no bandas).
  const chroma = uLens.mul(0.12);

  /** Cara de la tarjeta en las coordenadas locales `s` (−1..1): devuelve vec4(rgb sin premultiplicar, máscara). */
  const face = (s: N): N => {
    const local = s.mul(half);
    const sd = sdRoundRect(local, half, float(RADIUS));
    const mask = fillSd(sd);
    const surface = mix(uBg, uText, 0.06);
    const fromTop = local.y.add(half.y);
    const band = float(1).sub(smoothstep(HEADER_BAND - 1, HEADER_BAND + 1, fromTop));
    const lines = gridLines(local.add(half), 28, 1).mul(0.07);
    const scan = sin(local.y.mul(0.9).add(uTime.mul(6))).mul(0.015).add(0.015);
    let rgb = mix(surface, uAccent, band.mul(0.16).add(lines).add(scan.mul(uLens)));
    const border = strokeSd(sd.add(0.75), 1.5);
    rgb = mix(rgb, mix(uBorder, uAccent, float(0.35).add(uLens.mul(0.65))), border);
    return vec4(rgb, mask);
  };

  // Un muestreo por canal: el barril empuja cada uno una fracción distinta (aberración en los bordes).
  const at = (k: number): N => q.mul(float(1).sub(barrel.mul(float(1).add(chroma.mul(k)))));
  const fr = face(at(1));
  const fg = face(at(0));
  const fb = face(at(-1));
  const coverage = max(max(fr.a, fg.a), fb.a);

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.premultipliedAlpha = true;
  // Premultiplicado por canal: cada color se atenúa con SU máscara, de ahí los flecos de color en el borde.
  const faceColor = vec3(fr.r.mul(fr.a), fg.g.mul(fg.a), fb.b.mul(fb.a));
  // Vista de máscara: el peso de la lente (0 centro, 1 borde) en escala de grises.
  material.colorNode = mix(faceColor, vec3(edgeW.mul(coverage)), uMask).mul(uAlpha);
  material.opacityNode = coverage.mul(uAlpha);

  // Brillo del borde para el bloom selectivo (solo tier alto): más fuerte con la lente en su punto álgido.
  const sdG = sdRoundRect(q.mul(float(1).sub(barrel)).mul(half), half, float(RADIUS));
  const rim = exp(max(sdG.negate(), float(0)).div(-16)).mul(fg.a);
  material.mrtNode = mrt({ glow: vec4(uAccent.mul(rim).mul(uLens.mul(0.6).add(0.1)), rim.mul(uLens).mul(0.5)).mul(uAlpha) });

  const quad = new Mesh(new PlaneGeometry(1, 1), material);
  quad.frustumCulled = false;
  quad.visible = false;
  scene.add(quad);
  t6.ready = true;

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const s = t6.state;
      const show = s.visible && s.alpha > 0.002 && s.w > 0 && s.h > 0;
      quad.visible = show;
      if (!show) return false;
      const pos = twinPosition({ x: 0, y: 0, w: frame.viewW, h: frame.viewH });
      quad.position.set(pos.x, pos.y, 0);
      quad.scale.set(frame.viewW, frame.viewH, 1);
      uRect.value.set(s.x, s.y, s.w, s.h);
      uLens.value = s.lens;
      uAlpha.value = s.alpha;
      uMask.value = t6.maskView ? 1 : 0;
      return true; // mientras la superficie existe se anima
    },
    debug: () => ({ ...t6.state, ready: t6.ready, armed: t6.armed }),
    dispose() {
      t6.ready = false;
      quad.geometry.dispose();
      material.dispose();
    },
  };
};
