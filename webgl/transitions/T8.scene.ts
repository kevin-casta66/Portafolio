import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearMipmapLinearFilter,
  LineBasicNodeMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  NearestFilter,
  RedFormat,
  PlaneGeometry,
  Scene,
  UnsignedByteType,
} from "three/webgpu";
import { chipBitmap } from "@/motion/chip";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { uAccents, uText } from "../nodes/globals";
import { TSL, type N } from "../nodes/tsl";
import { createParticles, instanceAttribute, type ParticleSystem } from "../objects/particles";
import { internalsOn } from "./internals-math";
import type { TransitionSceneFactory } from "./state";
import { triangulateInWorker } from "./triangulate-client";
import type { Triangulation } from "./triangulate";

const { vec2, vec3, vec4, float, uniform, uv, texture, floor, log2, mix, smoothstep, clamp, step, mrt, max, positionLocal, attribute, fract, abs } = TSL;

const COLS = 48;
const ROWS = 30;
const RUNTIME_ACCENT = 4;
const GPU_ACCENT = 5;
/** Opacidad máxima del puente: el chip nunca tapa el contenido (mismo valor que la versión DOM). */
const MAX_ALPHA = 0.55;

export function bridgeRect(compact: boolean, gpuTop: number, viewW: number) {
  const width = Math.min(900, viewW * (compact ? 0.92 : 0.8));
  const height = (width * ROWS) / COLS;
  return { x: (viewW - width) / 2, y: gpuTop - height * 0.55, w: width, h: height };
}

export const createT8Scene: TransitionSceneFactory = (ctx, state, tctx) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uP = uniform(0);
  const uScroll = uniform(0);
  const uRect = uniform(vec4(0, 0, 100, 60)); // x, y (documento), w, h del puente
  const uMesh = uniform(0);

  // ── Imagen del chip: DataTexture R8 con mipmaps, pixelada por bloques ───────────────────────────
  const bitmap = chipBitmap(COLS, ROWS);
  const data = new Uint8Array(COLS * ROWS);
  bitmap.forEach((row, y) => row.forEach((v, x) => (data[y * COLS + x] = Math.round(v * 255))));
  const tex = new DataTexture(data, COLS, ROWS, RedFormat, UnsignedByteType);
  tex.magFilter = NearestFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  const env = smoothstep(0, 0.12, uP).mul(float(1).sub(smoothstep(0.86, 1, uP)));
  const toLocal = (p: N) => vec3(p.x.mul(uRect.z).add(uRect.x), p.y.mul(uRect.w).add(uRect.y).sub(uScroll).negate(), 0);

  const imageMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  {
    const cell = vec2(uv().x.mul(COLS), float(1).sub(uv().y).mul(ROWS));
    const block = mix(float(1), float(12), smoothstep(0.1, 0.55, uP));
    const center = floor(cell.div(block)).add(0.5).mul(block);
    const sampleUv = vec2(center.x.div(COLS), center.y.div(ROWS));
    const value = texture(tex, sampleUv).level(log2(block)).r;
    // Separación entre píxeles gruesos (se ve al crecer el bloque).
    const inner = fract(cell.div(block)).sub(0.5);
    const edge = float(0.5).sub(clamp(block.mul(0.02), 0, 0.2));
    const gap = float(1).sub(step(edge, max(abs(inner.x), abs(inner.y))).mul(smoothstep(1.5, 4, block)));
    const fade = float(1).sub(smoothstep(0.5, 0.66, uP)); // el chip pixelado da paso a la malla
    imageMat.colorNode = vec3(uAccents.element(RUNTIME_ACCENT));
    imageMat.opacityNode = value.mul(0.9).mul(gap).mul(fade).mul(env).mul(MAX_ALPHA);
  }
  const image = new Mesh(new PlaneGeometry(1, 1), imageMat);
  image.frustumCulled = false;
  scene.add(image);

  // ── «Ver internos» (MOTION-SPEC §3, T8): mapa de tamaño de píxel. Rejilla de los bloques del mosaico
  // (su trazo se ensancha con el bloque) teñida de acento GPU → RUNTIME según el tamaño del bloque.
  // Capa aparte y oculta con el flag apagado: el render normal no cambia.
  const mosaicMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  {
    const cell = vec2(uv().x.mul(COLS), float(1).sub(uv().y).mul(ROWS));
    const block = mix(float(1), float(12), smoothstep(0.1, 0.55, uP)); // mismo tamaño que `imageMat`
    const inner = fract(cell.div(block));
    const w = float(1.5).div(uRect.z.div(COLS).mul(block)); // trazo de 1,5 px CSS en unidades de bloque
    const line = max(
      max(step(float(1).sub(w), inner.x), step(inner.x, w)),
      max(step(float(1).sub(w), inner.y), step(inner.y, w)),
    );
    const size = block.sub(1).div(11);
    const fade = float(1).sub(smoothstep(0.5, 0.66, uP));
    mosaicMat.colorNode = mix(vec3(uAccents.element(GPU_ACCENT)), vec3(uAccents.element(RUNTIME_ACCENT)), size);
    mosaicMat.opacityNode = line.mul(0.85).add(size.mul(0.2)).mul(fade).mul(env);
  }
  const mosaic = new Mesh(new PlaneGeometry(1, 1), mosaicMat);
  mosaic.frustumCulled = false;
  mosaic.renderOrder = 10;
  mosaic.visible = false;
  scene.add(mosaic);

  // ── Malla triangulada (Web Worker) ──────────────────────────────────────────────────────────────
  let lines: LineSegments | null = null;
  let fill: Mesh | null = null;
  let dots: ParticleSystem | null = null;
  // «Ver internos»: malla ANTES de triangular (vértices siempre visibles) y DESPUÉS (aristas aún no
  // reveladas en tenue, para ver qué falta por triangular). Se crean con la malla y se ocultan apagado.
  let ghostLines: LineSegments | null = null;
  let ghostDots: ParticleSystem | null = null;
  const owned: { dispose(): void }[] = [];
  let disposed = false;

  const buildMesh = (t: Triangulation) => {
    if (disposed) return;
    const pointCount = t.points.length / 2;
    const px = (i: number) => (t.points[i * 2] as number) / COLS;
    const py = (i: number) => (t.points[i * 2 + 1] as number) / ROWS;
    // Orden de aparición: de izquierda a derecha con una ligera inclinación (se «triangula» barriendo).
    const order = (x: number, y: number) => clamp01(x * 0.8 + y * 0.2);

    // Aristas
    const lineVerts = new Float32Array(t.edges.length * 3);
    const lineReveal = new Float32Array(t.edges.length);
    for (let e = 0; e < t.edges.length; e += 2) {
      for (let k = 0; k < 2; k++) {
        const i = t.edges[e + k] as number;
        lineVerts.set([px(i), py(i), 0], (e + k) * 3);
      }
      const r = order((px(t.edges[e] as number) + px(t.edges[e + 1] as number)) / 2, (py(t.edges[e] as number) + py(t.edges[e + 1] as number)) / 2);
      lineReveal[e] = lineReveal[e + 1] = r;
    }
    const lg = new BufferGeometry();
    lg.setAttribute("position", new BufferAttribute(lineVerts, 3));
    lg.setAttribute("reveal", new BufferAttribute(lineReveal, 1));
    const lm = new LineBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    lm.positionNode = toLocal(positionLocal);
    const lr = attribute("reveal", "float");
    const lineA = step(lr, uMesh.mul(1.15)).mul(float(1).sub(smoothstep(0.88, 1, uP)));
    lm.colorNode = vec3(uAccents.element(GPU_ACCENT));
    lm.opacityNode = lineA.mul(0.7);
    lm.mrtNode = mrt({ glow: vec4(vec3(uAccents.element(GPU_ACCENT)).mul(lineA), lineA.mul(0.3)) });
    lines = new LineSegments(lg, lm);
    lines.frustumCulled = false;
    scene.add(lines);
    owned.push(lg, lm);

    // Caras: un triángulo por índice, con la intensidad del chip como relleno.
    const tn = t.triangles.length;
    const fv = new Float32Array(tn * 3);
    const fp = new Float32Array(tn * 2); // reveal, shade
    for (let i = 0; i < tn; i += 3) {
      let cx = 0;
      let cy = 0;
      for (let k = 0; k < 3; k++) {
        const v = t.triangles[i + k] as number;
        fv.set([px(v), py(v), 0], (i + k) * 3);
        cx += px(v) / 3;
        cy += py(v) / 3;
      }
      const reveal = order(cx, cy);
      const shade = t.shade[i / 3] as number;
      for (let k = 0; k < 3; k++) fp.set([reveal, shade], (i + k) * 2);
    }
    const fg = new BufferGeometry();
    fg.setAttribute("position", new BufferAttribute(fv, 3));
    fg.setAttribute("fp", new BufferAttribute(fp, 2));
    const fm = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    fm.positionNode = toLocal(positionLocal);
    const fpAttr = attribute("fp", "vec2");
    const faceA = step(fpAttr.x.add(0.06), uMesh.mul(1.15)).mul(float(1).sub(smoothstep(0.88, 1, uP)));
    fm.colorNode = vec3(mix(uAccents.element(GPU_ACCENT), uAccents.element(RUNTIME_ACCENT), fpAttr.y));
    fm.opacityNode = faceA.mul(fpAttr.y.mul(0.28).add(0.05));
    fill = new Mesh(fg, fm);
    fill.frustumCulled = false;
    fill.renderOrder = -1;
    scene.add(fill);
    owned.push(fg, fm);

    // Vértices: sprites de 3 px.
    const dotPos = instanceAttribute(t.points.slice(), 2);
    const dotReveal = clamp(dotPos.x.div(COLS).mul(0.8).add(dotPos.y.div(ROWS).mul(0.2)), 0, 1);
    const place = toLocal(vec2(dotPos.x.div(COLS), dotPos.y.div(ROWS)));
    dots = createParticles(pointCount, {
      position: place,
      size: vec2(3.2, 3.2),
      color: vec3(uAccents.element(GPU_ACCENT)),
      opacity: step(dotReveal, uMesh.mul(1.15)).mul(float(1).sub(smoothstep(0.88, 1, uP))).mul(0.9),
      glow: vec4(vec3(uAccents.element(GPU_ACCENT)), step(dotReveal, uMesh.mul(1.15)).mul(0.5)),
    });
    scene.add(dots.sprite);

    const gm = new LineBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    gm.positionNode = toLocal(positionLocal);
    gm.colorNode = vec3(uText);
    gm.opacityNode = float(1).sub(step(lr, uMesh.mul(1.15))).mul(0.4).mul(env);
    ghostLines = new LineSegments(lg, gm);
    ghostLines.frustumCulled = false;
    ghostLines.renderOrder = 10;
    ghostLines.visible = internalsOn(state);
    scene.add(ghostLines);
    owned.push(gm);
    ghostDots = createParticles(pointCount, {
      position: place,
      size: vec2(6, 6),
      color: vec3(uAccents.element(RUNTIME_ACCENT)),
      opacity: env.mul(0.95),
    });
    ghostDots.sprite.renderOrder = 11;
    ghostDots.sprite.visible = internalsOn(state);
    scene.add(ghostDots.sprite);
    ctx.markDirty();
  };

  void triangulateInWorker({ cols: COLS, rows: ROWS }).then(buildMesh);

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const gpu = tctx.root.querySelector("#gpu");
      const gpuTop = gpu ? gpu.getBoundingClientRect().top + window.scrollY : 0;
      const r = bridgeRect(tctx.compact, gpuTop, document.documentElement.clientWidth);
      uRect.value.set(r.x, r.y, r.w, r.h);
      image.position.set(r.x + r.w / 2, -(r.y + r.h / 2 - frame.scrollY), 0);
      image.scale.set(r.w, r.h, 1);
      const internals = internalsOn(state);
      mosaic.visible = internals;
      if (internals) {
        mosaic.position.copy(image.position);
        mosaic.scale.copy(image.scale);
      }
      if (ghostLines) ghostLines.visible = internals;
      if (ghostDots) ghostDots.sprite.visible = internals;
      uP.value = state.p;
      uScroll.value = frame.scrollY;
      // La malla se triangula entre p = 0,45 y 0,8.
      uMesh.value = clamp01((state.p - 0.45) / 0.35);
      return false;
    },
    dispose() {
      disposed = true;
      image.geometry.dispose();
      imageMat.dispose();
      tex.dispose();
      dots?.dispose();
      ghostDots?.dispose();
      mosaic.geometry.dispose();
      mosaicMat.dispose();
      owned.forEach((o) => o.dispose());
    },
  };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
