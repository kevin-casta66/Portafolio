import {
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  Scene,
} from "three/webgpu";
import { layoutBlocks, type HeapBlock, type HeapLayout } from "@/lib/heap";
import { createPixelCamera, fitPixelCamera } from "../../core/camera";
import { readToken } from "../../core/color";
import { twins } from "../../core/twins";
import type { EngineContext, SceneInstance } from "../../core/types";
import { uBg, uBorder, uText, uType, uView } from "../../nodes/globals";
import { HEAP_LENS_MAGNIFY, HEAP_LENS_RADIUS, lensMagnifyNode, lensRadialDir } from "../../nodes/lens";
import { fillSd, gridLines, sdRoundRect, strokeSd } from "../../nodes/sdf";
import { TSL, type N } from "../../nodes/tsl";
import { loadMsdfFont, type MsdfFont } from "../../text/msdf-font";
import { createMsdfSampler } from "../../text/msdf-nodes";
import {
  CELL_H,
  CELL_W,
  STAGE_PAD,
  blockAtPoint,
  copiesFor,
  panToCenter,
  slotsOf,
  tileOf,
  type Tile,
} from "./grid";
import { buildInstances } from "./instances";
import { lensMapPoint, lensUnmapPoint, stepInertia, wrap, wrapDelta } from "./inertia";
import { PALETTE } from "./palette";
import { heapView, type HeapSceneData } from "./state";

const { vec2, vec3, vec4, float, uniform, uv, mix, clamp, smoothstep, step, min, max, exp, mrt } = TSL;

/** Duración de la viaje de cada bloque en «Run GC» y retardo entre bloques (60–80 ms, design D7). */
export const GC_BLOCK_SECONDS = 0.9;
export const GC_STAGGER_SECONDS = 0.07;
/** Cuántos segundos tarda la lente en aparecer/desaparecer y en alcanzar al puntero. */
const LENS_FOLLOW = 18;
const LENS_FADE = 9;
const HOVER_FOLLOW = 16;
const FOCUS_FOLLOW = 9;
/** Segmentos del quad de cada bloque: los suficientes para que sus bordes se curven bajo la lente. */
const BLOCK_SEGMENTS = { x: 14, y: 10 } as const;

const easeInOutQuart = (k: number): number =>
  k < 0.5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2;
const easeNode = (k: N): N =>
  mix(k.pow(4).mul(8), float(1).sub(float(2).sub(k.mul(2)).pow(4).div(2)), step(0.5, k));

type Slots = Map<string, { x: number; y: number }>;

/**
 * Escena del Memory Heap (`/heap`): una cuadrícula infinita de bloques de memoria —uno por proyecto o
 * experimento— dibujada en el canvas persistente con INSTANCING (2 mallas instanciadas: los bloques y los
 * glifos MSDF de sus etiquetas, más el aro de la lente: 3 draw calls, sea cual sea el contenido).
 *
 *  · Infinitud: el desplazamiento se envuelve módulo el tile en el vértice; solo se instancian las copias
 *    que cubren el escenario.
 *  · «Run GC»: cada instancia lleva su posición anterior y la nueva y la GPU las interpola con un retardo
 *    por bloque (stagger) y `quart in-out`; la lista DOM y la cuadrícula 2D usan el MISMO `layoutBlocks`.
 *  · Lente: un mapa radial en el VÉRTICE (`nodes/lens.ts`): la geometría subdividida se curva y el texto
 *    MSDF se amplía nítido; el aro y las franjas de aberración se dibujan en el borde.
 *  · Las entradas (arrastre, rueda, foco) las escribe la isla DOM en `heapView`; la inercia, el foco y el
 *    hover se integran aquí, en el tick único del motor (sin rAF propio).
 */
export async function createHeapScene(ctx: EngineContext): Promise<SceneInstance> {
  const font: MsdfFont = await loadMsdfFont("jetbrains-mono-400");
  const sampler = createMsdfSampler(font);
  const scene = new Scene();
  const camera = createPixelCamera();

  // ── Uniforms ─────────────────────────────────────────────────────────────────────────────────────
  const uOrigin = uniform(vec2(0, 0)); // esquina del escenario + margen (px de viewport)
  const uPan = uniform(vec2(0, 0)); // desplazamiento ya envuelto, en [0, tile)
  const uTile = uniform(vec2(1, 1));
  const uGc = uniform(0); // segundos desde que empezó «Run GC»
  const uGcP = uniform(1); // progreso global 0..1 (etiquetas y tile)
  const uLensPos = uniform(vec2(-9999, -9999));
  const uLensR = uniform(HEAP_LENS_RADIUS);
  const uLensMag = uniform(0);
  const uStage = uniform(vec4(0, 0, 1, 1));
  // Acento de la página (`--accent-active`): en `/heap` y durante la transición desde RUNTIME es el de RUNTIME,
  // el mismo que ven los elementos DOM; el acento global del motor sigue la FASE por scroll y aquí no hay fases.
  const uA = uniform(new Color());
  const uReveal = uniform(1); // opacidad global de bloques y texto (transición RUNTIME → Heap)

  // ── Atributos por instancia ──────────────────────────────────────────────────────────────────────
  const attr = (name: string): N => TSL.attribute(name, "vec4");
  const iRect = attr("iRect");
  const iFrom = attr("iFrom");
  const iMeta = attr("iMeta");
  const iAux = attr("iAux");
  const corner = vec2(uv().x, float(1).sub(uv().y)); // 0..1, y hacia abajo

  /** Posición en pantalla (px, y hacia abajo) de cada vértice: interpolación «Run GC» + envoltura + lente. */
  const k = clamp(uGc.sub(iMeta.z).div(GC_BLOCK_SECONDS), 0, 1);
  const base = mix(iFrom.xy, iFrom.zw, easeNode(k));
  const local = iRect.xy.add(corner.mul(iRect.zw));
  const flat = uOrigin.add(base).add(iMeta.xy.mul(uTile)).add(uPan).add(local);
  const lens = lensMagnifyNode(flat, uLensPos, uLensR, uLensMag);
  const position = vec3(lens.pos.x, lens.pos.y.negate(), 0);
  const screen = TSL.varying(lens.pos);
  const rim = TSL.varying(lens.rim);

  /** Recorte al escenario con un fundido de 10 px: los bloques no se pintan sobre la cabecera ni los controles. */
  const stageMask = (() => {
    const m = min(
      min(screen.x.sub(uStage.x), uStage.x.add(uStage.z).sub(screen.x)),
      min(screen.y.sub(uStage.y), uStage.y.add(uStage.w).sub(screen.y)),
    );
    return clamp(m.div(10), 0, 1);
  })();

  // ── Material de los bloques ──────────────────────────────────────────────────────────────────────
  const blockMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  {
    const q = corner.sub(0.5).mul(vec2(CELL_W, CELL_H));
    const half = vec2(CELL_W / 2 - 0.5, CELL_H / 2 - 0.5);
    const kindColor = mix(uA, uType, iAux.x);
    const hover = iAux.y;
    const focus = iAux.z;
    const dir = lensRadialDir(screen, uLensPos);
    // Refracción de borde: los canales R y B se muestrean desplazados a lo largo del radio de la lente.
    const off = rim.mul(uLensMag).mul(2.4);
    const sdAt = (p: N): N => sdRoundRect(p, half, float(8));
    const sdG = sdAt(q);
    const sdR = sdAt(q.add(dir.mul(off)));
    const sdB = sdAt(q.sub(dir.mul(off)));
    const faceAt = (sd: N): N => fillSd(sd);
    const header = float(1).sub(smoothstep(30, 32, q.y.add(CELL_H / 2)));
    const bg = mix(uBg, uText, float(PALETTE.blockMix).add(hover.mul(PALETTE.hoverMix)));
    const lines = gridLines(q.add(vec2(CELL_W / 2, CELL_H / 2)), 14, 1).mul(0.035);
    let rgb = mix(bg, kindColor, header.mul(PALETTE.headerTint).add(hover.mul(PALETTE.hoverTint)));
    rgb = mix(rgb, uText, lines);
    const border = strokeSd(sdG, 1.5);
    rgb = mix(rgb, mix(uBorder, kindColor, float(0.4).add(hover.mul(0.6))), border);
    const ring = strokeSd(sdG.add(5), 2).mul(focus);
    rgb = mix(rgb, uA, ring);
    // Brillo del aro de la lente sobre el contenido ampliado.
    rgb = mix(rgb, uA, rim.mul(uLensMag.div(HEAP_LENS_MAGNIFY)).mul(PALETTE.rimTint));
    const fr = faceAt(sdR);
    const fg = faceAt(sdG);
    const fb = faceAt(sdB);
    const coverage = max(max(fr, fg), fb);
    blockMat.colorNode = vec3(rgb.r.mul(fr), rgb.g.mul(fg), rgb.b.mul(fb)).div(max(coverage, 0.001));
    blockMat.opacityNode = coverage.mul(stageMask).mul(uReveal);
    const glow = border.mul(hover.mul(0.55).add(focus)).add(ring.mul(0.8));
    blockMat.mrtNode = mrt({ glow: vec4(kindColor.mul(glow), glow.mul(0.6).mul(stageMask)) });
  }
  blockMat.positionNode = position;

  // ── Material del texto MSDF ──────────────────────────────────────────────────────────────────────
  const textMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const iUv = attr("iUv");
  {
    const atlasUv = vec2(mix(iUv.x, iUv.z, uv().x), mix(iUv.y, iUv.w, float(1).sub(uv().y)));
    const alpha = sampler.alphaAt(atlasUv);
    const tint = iAux.x;
    const set = iAux.y;
    const muted = mix(uBg, uText, PALETTE.mutedMix);
    textMat.colorNode = mix(mix(uText, uA, clamp(tint, 0, 1)), muted, clamp(tint.sub(1), 0, 1));
    const oldAlpha = float(1).sub(smoothstep(0, 0.3, uGcP));
    const newAlpha = smoothstep(0.55, 1, uGcP);
    const isOld = step(0.5, set).mul(float(1).sub(step(1.5, set)));
    const isNew = step(1.5, set);
    const labelAlpha = mix(mix(float(1), oldAlpha, isOld), newAlpha, isNew);
    textMat.opacityNode = alpha.mul(labelAlpha).mul(stageMask).mul(uReveal);
  }
  textMat.positionNode = position;

  // ── Aro de la lente (espacio de pantalla) ────────────────────────────────────────────────────────
  const ringMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  {
    const px = vec2(uv().x.mul(uView.x), float(1).sub(uv().y).mul(uView.y));
    const d = px.sub(uLensPos).length().sub(uLensR);
    const amount = uLensMag.div(HEAP_LENS_MAGNIFY);
    const line = float(1).sub(clamp(d.abs().div(1.6), 0, 1));
    const halo = exp(d.abs().div(-9)).mul(0.18);
    const inner = exp(max(d.negate(), float(0)).div(-14)).mul(step(d, float(0))).mul(0.14);
    const a = clamp(line.mul(0.85).add(halo).add(inner), 0, 1).mul(amount);
    ringMat.colorNode = vec3(uA);
    ringMat.opacityNode = a;
    ringMat.mrtNode = mrt({ glow: vec4(uA.mul(line).mul(amount), line.mul(amount).mul(0.5)) });
  }

  // ── Mallas ───────────────────────────────────────────────────────────────────────────────────────
  const plane = new PlaneGeometry(1, 1, BLOCK_SEGMENTS.x, BLOCK_SEGMENTS.y);
  const glyphQuad = new PlaneGeometry(1, 1, 1, 1);
  const ringGeo = new PlaneGeometry(1, 1);
  const ringQuad = new Mesh(ringGeo, ringMat);
  ringQuad.frustumCulled = false;
  ringQuad.renderOrder = 3;
  ringQuad.visible = false;
  scene.add(ringQuad);

  let blocksMesh: Mesh | null = null;
  let textMesh: Mesh | null = null;
  let blockGeo: InstancedBufferGeometry | null = null;
  let textGeo: InstancedBufferGeometry | null = null;
  let blockAux: InstancedBufferAttribute | null = null;
  let keys: string[] = [];
  const indicesByKey = new Map<string, number[]>();

  const instanced = (source: PlaneGeometry, count: number, attrs: Record<string, Float32Array>) => {
    const g = new InstancedBufferGeometry();
    g.index = source.index;
    g.setAttribute("position", source.getAttribute("position"));
    g.setAttribute("uv", source.getAttribute("uv"));
    for (const [name, array] of Object.entries(attrs)) g.setAttribute(name, new InstancedBufferAttribute(array, 4));
    g.instanceCount = count;
    return g;
  };

  // ── Estado de la escena ──────────────────────────────────────────────────────────────────────────
  let dataRef: HeapSceneData | null = null;
  let fromOverride: Slots | null = null;
  let locale: "es" | "en" = "es";
  let blocks: readonly HeapBlock[] = [];
  let layoutFrom: HeapLayout | null = null;
  let layoutTo: HeapLayout | null = null;
  let tileFrom: Tile = { w: 1, h: 1 };
  let tileTo: Tile = { w: 1, h: 1 };
  let copies = { nx: 0, ny: 0 };
  let gcT = Infinity; // segundos desde que empezó el «Run GC»; Infinity = sin GC en curso
  let gcTotal = 0;
  let seenGc = heapView.gcSerial;
  let seenFocus = heapView.focusSerial;
  let focusTarget: { x: number; y: number } | null = null;
  let needsRebuild = true;
  const hoverMix = new Map<string, number>();
  const focusMix = new Map<string, number>();
  let lensAmt = 0;
  const lensPos = { x: -9999, y: -9999 };
  let lastHover: string | null = null;
  let lastRect: { x: number; y: number; w: number; h: number } | null = null;
  let stats = { instances: 0, glyphs: 0 };
  const release = twins.acquire();

  const slotNow = (key: string): { x: number; y: number } => {
    const from = layoutFrom ? slotsOf(layoutFrom).find((s) => s.key === key) : undefined;
    const to = layoutTo ? slotsOf(layoutTo).find((s) => s.key === key) : undefined;
    const dst = to ?? from ?? { x: 0, y: 0 };
    const src = fromOverride?.get(key) ?? from ?? dst;
    const idx = layoutTo ? layoutTo.cells.findIndex((c) => c.key === key) : 0;
    const e = gcT === Infinity ? 1 : easeInOutQuart(Math.min(1, Math.max(0, (gcT - idx * GC_STAGGER_SECONDS) / GC_BLOCK_SECONDS)));
    return { x: src.x + (dst.x - src.x) * e, y: src.y + (dst.y - src.y) * e };
  };

  const disposeMeshes = () => {
    for (const m of [blocksMesh, textMesh]) if (m) scene.remove(m);
    blockGeo?.dispose();
    textGeo?.dispose();
    blocksMesh = textMesh = null;
    blockGeo = textGeo = null;
    blockAux = null;
  };

  let lastRebuildMs = 0;
  let accentAt = -1;
  let accentDirty = true;
  const rebuild = (stageW: number, stageH: number): void => {
    if (!layoutFrom || !layoutTo || !heapView.data) return;
    const t0 = performance.now();
    disposeMeshes();
    const minTile = { w: Math.min(tileFrom.w, tileTo.w), h: Math.min(tileFrom.h, tileTo.h) };
    copies = copiesFor(stageW, stageH, minTile);
    const built = buildInstances({
      blocks,
      from: layoutFrom,
      to: layoutTo,
      nx: copies.nx,
      ny: copies.ny,
      locale,
      font,
      skillNames: heapView.data.skillNames,
      labels: heapView.data.labels,
      stagger: GC_STAGGER_SECONDS,
      includeOldLabels: gcT !== Infinity,
      ...(fromOverride ? { fromSlots: fromOverride } : {}),
    });
    blockGeo = instanced(plane, built.blocks.count, {
      iRect: built.blocks.rect,
      iFrom: built.blocks.from,
      iMeta: built.blocks.meta,
      iAux: built.blocks.aux,
    });
    blockAux = blockGeo.getAttribute("iAux") as InstancedBufferAttribute;
    textGeo = instanced(glyphQuad, built.text.count, {
      iRect: built.text.rect,
      iUv: built.text.uv,
      iFrom: built.text.from,
      iMeta: built.text.meta,
      iAux: built.text.aux,
    });
    blocksMesh = new Mesh(blockGeo, blockMat);
    textMesh = new Mesh(textGeo, textMat);
    for (const [i, m] of [blocksMesh, textMesh].entries()) {
      m.frustumCulled = false;
      m.renderOrder = i;
      scene.add(m);
    }
    keys = built.blocks.keys;
    indicesByKey.clear();
    keys.forEach((key, i) => indicesByKey.set(key, [...(indicesByKey.get(key) ?? []), i]));
    stats = { instances: built.blocks.count, glyphs: built.text.count };
    needsRebuild = false;
    writeBlockStyle(true);
    lastRebuildMs = performance.now() - t0;
  };

  /** Hover/foco de cada bloque en el atributo `iAux` (solo se sube a la GPU si algo cambió). */
  const writeBlockStyle = (force = false): void => {
    if (!blockAux) return;
    const arr = blockAux.array as Float32Array;
    let changed = force;
    for (const [key, list] of indicesByKey) {
      const h = hoverMix.get(key) ?? 0;
      const f = focusMix.get(key) ?? 0;
      for (const i of list) {
        if (arr[i * 4 + 1] !== h || arr[i * 4 + 2] !== f) {
          arr[i * 4 + 1] = h;
          arr[i * 4 + 2] = f;
          changed = true;
        }
      }
    }
    if (changed) blockAux.needsUpdate = true;
  };

  const startGc = (frameReduced: boolean): void => {
    if (!layoutTo || !heapView.data) return;
    // Parte de donde está cada bloque ahora (un GC en curso no provoca saltos).
    const now: Slots = new Map();
    for (const b of blocks) now.set(b.key, slotNow(b.key));
    const next = layoutBlocks(blocks, heapView.criterion, layoutTo.columns);
    layoutFrom = layoutTo;
    tileFrom = tileCurrent();
    layoutTo = next;
    tileTo = tileOf(next);
    fromOverride = now;
    gcT = frameReduced ? Infinity : 0;
    gcTotal = (blocks.length - 1) * GC_STAGGER_SECONDS + GC_BLOCK_SECONDS;
    if (frameReduced) {
      layoutFrom = layoutTo;
      tileFrom = tileTo;
      fromOverride = null;
    }
    needsRebuild = true;
  };

  const tileCurrent = (): Tile => {
    if (gcT === Infinity || gcTotal <= 0) return tileTo;
    const e = easeInOutQuart(Math.min(1, gcT / gcTotal));
    return { w: tileFrom.w + (tileTo.w - tileFrom.w) * e, h: tileFrom.h + (tileTo.h - tileFrom.h) * e };
  };

  const finePointer = () => window.matchMedia("(pointer: fine)").matches;

  const publishHover = (key: string | null, rect: { x: number; y: number; w: number; h: number } | null): void => {
    const moved =
      rect && lastRect
        ? Math.abs(rect.x - lastRect.x) > 0.5 || Math.abs(rect.y - lastRect.y) > 0.5 || Math.abs(rect.w - lastRect.w) > 0.5
        : rect !== lastRect;
    if (key === lastHover && !moved) return;
    lastHover = key;
    lastRect = rect;
    heapView.hoverKey = key;
    heapView.hoverRect = rect;
    heapView.onHover?.(key, rect);
  };

  /** Bloque que hay en (px, py) de pantalla y su caja (con la lente de intensidad `mag` aplicada). */
  const hitAt = (
    px: number,
    py: number,
    mag: number,
  ): { key: string; rect: { x: number; y: number; w: number; h: number } } | null => {
    if (!layoutTo) return null;
    const tile = tileCurrent();
    const wpx = wrap(heapView.pan.x, tile.w);
    const wpy = wrap(heapView.pan.y, tile.h);
    const ox = uOrigin.value.x;
    const oy = uOrigin.value.y;
    const o = mag > 0.02 ? lensUnmapPoint(px, py, lensPos.x, lensPos.y, HEAP_LENS_RADIUS, mag) : { x: px, y: py };
    const qx = o.x - ox - wpx;
    const qy = o.y - oy - wpy;
    const hit = blockAtPoint(layoutTo, qx, qy);
    if (!hit) return null;
    const x0 = ox + wpx + hit.x + Math.floor((qx - hit.x) / tile.w) * tile.w;
    const y0 = oy + wpy + hit.y + Math.floor((qy - hit.y) / tile.h) * tile.h;
    const corners = [
      [x0, y0],
      [x0 + CELL_W, y0],
      [x0, y0 + CELL_H],
      [x0 + CELL_W, y0 + CELL_H],
    ].map(([cx, cy]) => lensMapPoint(cx as number, cy as number, lensPos.x, lensPos.y, HEAP_LENS_RADIUS, mag));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { key: hit.key, rect: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
  };
  heapView.pick = (x, y) => (gcT === Infinity ? hitAt(x, y, 0) : null);

  heapView.markDirty = () => ctx.markDirty();
  heapView.ready = true;

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const data = heapView.data;
      // Escenario: el del DOM, o el virtual de la transición RUNTIME → Heap (aún sin página /heap).
      const override = heapView.stageOverride;
      const domTwin = twins.get("heap");
      const twin = override ? { rect: override, visible: true } : domTwin;
      if (!data || !twin || twin.rect.w < 8 || twin.rect.h < 8) {
        if (blocksMesh) blocksMesh.visible = false;
        if (textMesh) textMesh.visible = false;
        ringQuad.visible = false;
        publishHover(null, null);
        return false;
      }
      const stage = twin.rect;

      // Datos e idioma: un cambio vuelve a construir todo.
      // Mismo contenido (la isla se re-monta al alternar la vista): no se reconstruye nada.
      const sameData =
        dataRef !== null &&
        dataRef.blocks === data.blocks &&
        dataRef.locale === data.locale &&
        dataRef.skillNames === data.skillNames &&
        dataRef.labels.project === data.labels.project &&
        dataRef.labels.experiment === data.labels.experiment;
      if (!sameData) {
        dataRef = data;
        blocks = data.blocks;
        locale = data.locale;
        layoutTo = layoutBlocks(blocks, heapView.criterion);
        layoutFrom = layoutTo;
        tileTo = tileFrom = tileOf(layoutTo);
        fromOverride = null;
        gcT = Infinity;
        seenGc = heapView.gcSerial;
        needsRebuild = true;
        hoverMix.clear();
        focusMix.clear();
      }
      if (!layoutTo || !layoutFrom) return false;
      dataRef = data;

      // El criterio cambió sin «Run GC» (p. ej. se re-activó la isla con otro `?gc=`): salta sin animar.
      if (layoutTo.criterion !== heapView.criterion && seenGc === heapView.gcSerial && gcT === Infinity) {
        layoutTo = layoutBlocks(blocks, heapView.criterion, layoutTo.columns);
        layoutFrom = layoutTo;
        tileTo = tileFrom = tileOf(layoutTo);
        fromOverride = null;
        needsRebuild = true;
      }

      // «Run GC».
      if (seenGc !== heapView.gcSerial) {
        seenGc = heapView.gcSerial;
        startGc(frame.reduced);
      }
      let animating = false;
      if (gcT !== Infinity) {
        gcT += frame.dt;
        if (gcT >= gcTotal) {
          gcT = Infinity;
          layoutFrom = layoutTo;
          tileFrom = tileTo;
          fromOverride = null;
          needsRebuild = true; // sin etiquetas viejas
        } else animating = true;
      }

      // Copias necesarias para el escenario actual.
      const want = copiesFor(stage.w, stage.h, { w: Math.min(tileFrom.w, tileTo.w), h: Math.min(tileFrom.h, tileTo.h) });
      if (want.nx !== copies.nx || want.ny !== copies.ny) needsRebuild = true;
      if (needsRebuild) rebuild(stage.w, stage.h);
      if (!blocksMesh || !textMesh) return false;
      blocksMesh.visible = textMesh.visible = twin.visible;

      const tile = tileCurrent();
      uTile.value.set(tile.w, tile.h);
      uGc.value = gcT === Infinity ? 1e6 : gcT;
      uGcP.value = gcT === Infinity ? 1 : easeInOutQuart(Math.min(1, gcT / Math.max(0.001, gcTotal)));

      // ── Desplazamiento: arrastre (lo escribe la isla), inercia y centrado por foco ───────────────
      const pan = heapView.pan;
      if (heapView.dragging) {
        focusTarget = null;
        heapView.velocity.x = heapView.velocity.y = 0;
      }
      if (seenFocus !== heapView.focusSerial) {
        seenFocus = heapView.focusSerial;
        const slot = heapView.focusKey ? slotsOf(layoutTo).find((s) => s.key === heapView.focusKey) : undefined;
        if (slot) {
          const t = panToCenter(slot, stage.w, stage.h);
          const goal = { x: pan.x + wrapDelta(t.x - pan.x, tile.w), y: pan.y + wrapDelta(t.y - pan.y, tile.h) };
          if (frame.reduced) {
            pan.x = goal.x;
            pan.y = goal.y;
            focusTarget = null;
          } else {
            focusTarget = goal;
            heapView.velocity.x = heapView.velocity.y = 0;
          }
        }
      }
      if (!heapView.dragging) {
        if (frame.reduced) {
          heapView.velocity.x = heapView.velocity.y = 0; // sin inercia con movimiento reducido
        } else if (Math.hypot(heapView.velocity.x, heapView.velocity.y) > 0) {
          focusTarget = null;
          const m = { x: pan.x, y: pan.y, vx: heapView.velocity.x, vy: heapView.velocity.y };
          animating = stepInertia(m, frame.dt) || animating;
          pan.x = m.x;
          pan.y = m.y;
          heapView.velocity.x = m.vx;
          heapView.velocity.y = m.vy;
        }
      } else animating = true;
      if (focusTarget) {
        const k = Math.min(1, frame.dt * FOCUS_FOLLOW);
        pan.x += (focusTarget.x - pan.x) * k;
        pan.y += (focusTarget.y - pan.y) * k;
        if (Math.hypot(focusTarget.x - pan.x, focusTarget.y - pan.y) < 0.4) {
          pan.x = focusTarget.x;
          pan.y = focusTarget.y;
          focusTarget = null;
        } else animating = true;
      }
      // La cuadrícula es periódica: el desplazamiento se guarda envuelto (sin perder precisión con el uso).
      const wpx = wrap(pan.x, tile.w);
      const wpy = wrap(pan.y, tile.h);
      if (gcT === Infinity) {
        pan.x = wpx;
        pan.y = wpy;
        if (focusTarget) {
          focusTarget.x = wrap(focusTarget.x, tile.w);
          focusTarget.y = wrap(focusTarget.y, tile.h);
        }
      }
      uPan.value.set(wpx, wpy);
      uOrigin.value.set(stage.x + STAGE_PAD, stage.y + STAGE_PAD);
      uStage.value.set(stage.x, stage.y, stage.w, stage.h);
      uReveal.value = heapView.reveal;
      if (frame.time - accentAt > 0.25 || accentDirty) {
        accentAt = frame.time;
        accentDirty = false;
        const [r, g, b] = readToken("--accent-active");
        uA.value.setRGB(r, g, b, "srgb");
      }

      // ── Lente ───────────────────────────────────────────────────────────────────────────────────
      const p = frame.pointer;
      const insideStage =
        p.active && p.x >= stage.x && p.x <= stage.x + stage.w && p.y >= stage.y && p.y <= stage.y + stage.h;
      const lensAllowed = frame.tier !== "low" && !frame.reduced && !override && finePointer();
      const lensWanted = lensAllowed && insideStage && !heapView.dragging;
      lensAmt += ((lensWanted ? 1 : 0) - lensAmt) * Math.min(1, frame.dt * LENS_FADE);
      if (!lensWanted && lensAmt < 0.01) lensAmt = 0;
      if (insideStage) {
        if (lensPos.x < -9000) {
          lensPos.x = p.x;
          lensPos.y = p.y;
        }
        const f = Math.min(1, frame.dt * LENS_FOLLOW);
        lensPos.x += (p.x - lensPos.x) * f;
        lensPos.y += (p.y - lensPos.y) * f;
        if (Math.hypot(p.x - lensPos.x, p.y - lensPos.y) > 0.6) animating = true;
        else {
          lensPos.x = p.x;
          lensPos.y = p.y;
        }
      }
      const mag = HEAP_LENS_MAGNIFY * lensAmt;
      if (lensWanted && Math.abs(lensAmt - 1) > 0.01) animating = true;
      if (!lensWanted && lensAmt > 0) animating = true;
      uLensMag.value = mag;
      uLensPos.value.set(lensPos.x, lensPos.y);
      ringQuad.visible = lensAmt > 0.01;
      ringQuad.scale.set(frame.viewW, frame.viewH, 1);
      ringQuad.position.set(frame.viewW / 2, -frame.viewH / 2, 0);

      // ── Hover: el bloque que HAY bajo el cursor (se deshace la lente para acertar en lo ampliado) ──
      let hoverKey: string | null = null;
      let hoverRect: { x: number; y: number; w: number; h: number } | null = null;
      const calm = Math.hypot(heapView.velocity.x, heapView.velocity.y) < 40;
      if (insideStage && !override && !heapView.dragging && gcT === Infinity && calm && twin.visible) {
        const hit = hitAt(p.x, p.y, mag);
        if (hit) {
          hoverKey = hit.key;
          hoverRect = hit.rect;
        }
      }
      publishHover(hoverKey, hoverRect);

      // Hover / selección táctil / foco: se suavizan por bloque.
      const lit = hoverKey ?? heapView.selectedKey;
      let styleAnimating = false;
      for (const b of blocks) {
        const ht = b.key === lit ? 1 : 0;
        const ft = b.key === heapView.focusKey ? 1 : 0;
        const h = hoverMix.get(b.key) ?? 0;
        const f = focusMix.get(b.key) ?? 0;
        const nh = Math.abs(ht - h) < 0.01 ? ht : h + (ht - h) * Math.min(1, frame.dt * HOVER_FOLLOW);
        const nf = Math.abs(ft - f) < 0.01 ? ft : f + (ft - f) * Math.min(1, frame.dt * HOVER_FOLLOW);
        if (nh !== h) hoverMix.set(b.key, nh);
        if (nf !== f) focusMix.set(b.key, nf);
        if (nh !== ht || nf !== ft) styleAnimating = true;
      }
      writeBlockStyle();
      return animating || styleAnimating;
    },
    applyColors() {
      accentDirty = true; // cambio de tema
    },
    debug: () => ({
      instances: stats.instances,
      glyphs: stats.glyphs,
      rebuildMs: lastRebuildMs,
      copies,
      tile: tileCurrent(),
      pan: { ...heapView.pan },
      velocity: { ...heapView.velocity },
      lens: { x: lensPos.x, y: lensPos.y, amount: lensAmt },
      gc: { running: gcT !== Infinity, t: gcT === Infinity ? null : gcT, total: gcTotal },
      hover: lastHover,
      focus: heapView.focusKey,
      criterion: heapView.criterion,
      stageOverride: heapView.stageOverride,
      reveal: heapView.reveal,
      layout: layoutTo ? { rows: layoutTo.rows, groups: layoutTo.groups.length, cells: layoutTo.cells.length } : null,
      slots: layoutTo ? Object.fromEntries(layoutTo.cells.map((c) => [c.key, slotNow(c.key)])) : null,
    }),
    dispose() {
      heapView.ready = false;
      heapView.markDirty = null;
      heapView.pick = null;
      publishHover(null, null);
      disposeMeshes();
      release();
      scene.remove(ringQuad);
      ringGeo.dispose();
      plane.dispose();
      glyphQuad.dispose();
      blockMat.dispose();
      textMat.dispose();
      ringMat.dispose();
      font.dispose();
    },
  };
}

export const __testing = { easeInOutQuart };
