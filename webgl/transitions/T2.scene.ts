import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { particlesFor } from "../quality";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { uAccent, uScrollVelocity } from "../nodes/globals";
import { TSL, type N } from "../nodes/tsl";
import { createParticles, instanceAttribute, type ParticleSystem } from "../objects/particles";
import { sampleElementText } from "./glyph-points";
import { assignParticles, type PointSet } from "./particles";
import { DISSOLVE_SETTLE, DISSOLVE_SPAN } from "./T2";
import type { TransitionSceneFactory } from "./state";

const { Fn, vec2, vec3, vec4, float, uniform, uv, mrt, mix, smoothstep, clamp, sin, abs, step, instancedArray, instanceIndex, mx_noise_float } = TSL;

/** Carril del Lexer al que va cada clase de token de la línea de código (misma tabla que la versión DOM). */
const LANE_OF: Record<string, string> = {
  keyword: "keyword",
  operator: "keyword",
  identifier: "identifier",
  type: "identifier",
  punct: "identifier",
  string: "string",
};

/** Escena de T2: partículas que salen de los píxeles de la línea de código y forman los tokens. */
export const createT2Scene: TransitionSceneFactory = (ctx, state, tctx) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uP = uniform(0);
  const uScroll = uniform(0);
  const uX0 = uniform(0);
  const uXSpan = uniform(1);
  /** «Ver internos» (change 08): 0 = vista normal (idéntica), 1 = mapa de umbral de la disolución. */
  const uInternals = uniform(0);

  // Mapa de umbral de la disolución (docs/MOTION-SPEC.md §3, T2): escala de grises que crece de izquierda
  // a derecha (el frente avanza en ese orden) con el grano de ruido de cada partícula, y el borde del
  // frente —donde actúa el bloom selectivo— en el acento. Solo existe y se dibuja con `internals`.
  const mapMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const along = uv().x;
  const grain = mx_noise_float(vec3(uv().x.mul(70), uv().y.mul(9), 0.5)).mul(0.5).add(0.5).mul(0.05);
  const threshold = along.mul(DISSOLVE_SPAN).add(grain); // mismo orden que `release` de cada partícula
  const edge = smoothstep(0.04, 0.01, abs(uP.sub(threshold)));
  mapMat.colorNode = mix(vec3(clamp(threshold.div(DISSOLVE_SPAN + 0.05), 0, 1)), uAccent, edge);
  mapMat.opacityNode = float(0.9);
  mapMat.mrtNode = mrt({ glow: vec4(uAccent.mul(edge), edge) });
  const mapGeometry = new PlaneGeometry(1, 1);
  const mapMesh = new Mesh(mapGeometry, mapMat);
  mapMesh.frustumCulled = false;
  mapMesh.visible = false;
  scene.add(mapMesh);
  /** Rectángulo de la línea de código en coordenadas de documento (x0, x1, y0, y1). */
  const bounds = { x0: 0, x1: 0, y0: 0, y1: 0, ready: false };

  let system: ParticleSystem | null = null;
  let builtCount = -1;
  let computeMode = false;
  let kernel: N = null;
  let docPosNode: N = null;
  const frame0 = () => ctx.frame;

  /** Recorrido de una partícula: sale cuando el frente de disolución llega a su glifo y viaja en arco. */
  const motion = (aStart: N, aEnd: N, aSeed: N) => {
    const along = clamp(aStart.x.sub(uX0).div(uXSpan), 0, 1);
    const release = along.mul(DISSOLVE_SPAN).add(aSeed.x.mul(0.05));
    const rel = clamp(uP.sub(release).div(DISSOLVE_SETTLE), 0, 1);
    const e = rel.mul(rel).mul(float(3).sub(rel.mul(2))); // smoothstep: ease de escena
    const arc = sin(rel.mul(Math.PI)).mul(vec2(aSeed.x.sub(0.5), aSeed.y.sub(0.5))).mul(150);
    return { release, rel, docPos: mix(aStart, aEnd, e).add(arc) };
  };

  const sources = (): PointSet[] => {
    const out: PointSet[] = [];
    tctx.root.querySelectorAll<HTMLElement>("#source [data-token]").forEach((el) => {
      const sample = sampleElementText(el, 3);
      if (sample) out.push({ points: sample.points, color: sample.color, lane: LANE_OF[el.dataset.token ?? ""] ?? "keyword" });
    });
    return out;
  };
  const targets = (): PointSet[] => {
    const out: PointSet[] = [];
    tctx.root.querySelectorAll<HTMLElement>("#lexer [data-anim='token']").forEach((el) => {
      const sample = sampleElementText(el, 3);
      const lane = el.closest<HTMLElement>("[data-lane]")?.dataset.lane ?? "identifier";
      if (sample) out.push({ points: sample.points, color: sample.color, lane });
    });
    return out;
  };

  const build = (count: number) => {
    if (system) {
      scene.remove(system.sprite);
      system.dispose();
      system = null;
    }
    builtCount = count;
    if (count <= 0) return;
    const src = sources();
    const buffers = assignParticles(src, targets(), count, 20260);
    if (buffers.count === 0) return;
    // Extensión horizontal de la línea (para el frente de disolución de izquierda a derecha).
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of src)
      for (let i = 0; i < s.points.length; i += 2) {
        const x = s.points[i] as number;
        const y = s.points[i + 1] as number;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    bounds.ready = Number.isFinite(minX) && Number.isFinite(minY);
    if (bounds.ready) Object.assign(bounds, { x0: minX, x1: maxX, y0: minY, y1: maxY });
    uX0.value = minX;
    uXSpan.value = Math.max(1, maxX - minX);

    // Tier alto con WebGPU: el desplazamiento de cada partícula lo calcula un COMPUTE shader (storage
    // buffers) y el vertex shader solo lee la posición. Resto: la misma función en el vertex shader.
    // En ambos casos la posición es función pura del progreso: retroceder deshace la transición.
    computeMode = frame0().preset.tier === "high" && frame0().gpuCompute;
    let aStart: N;
    let aEnd: N;
    let aSeed: N;
    let aColor: N;
    if (computeMode) {
      const startBuf = instancedArray(buffers.start, "vec2");
      const endBuf = instancedArray(buffers.end, "vec2");
      const seedBuf = instancedArray(buffers.seed, "vec2");
      const colorBuf = instancedArray(buffers.color, "vec3");
      const posBuf = instancedArray(buffers.count, "vec2");
      aStart = startBuf.element(instanceIndex);
      aEnd = endBuf.element(instanceIndex);
      aSeed = seedBuf.element(instanceIndex);
      aColor = colorBuf.element(instanceIndex);
      kernel = Fn(() => {
        const i = instanceIndex;
        const m = motion(startBuf.element(i), endBuf.element(i), seedBuf.element(i));
        // Turbulencia (ruido de valor 3D) solo a mitad de vuelo: añade remolinos sin romper la reversibilidad.
        const swirl = vec2(
          mx_noise_float(vec3(m.docPos.mul(0.012), uP.mul(3))),
          mx_noise_float(vec3(m.docPos.mul(0.012).add(17.3), uP.mul(3))),
        ).mul(sin(m.rel.mul(Math.PI))).mul(46);
        posBuf.element(i).assign(m.docPos.add(swirl));
      })().compute(buffers.count);
      docPosNode = posBuf.element(instanceIndex);
    } else {
      aStart = instanceAttribute(buffers.start, 2);
      aEnd = instanceAttribute(buffers.end, 2);
      aSeed = instanceAttribute(buffers.seed, 2);
      aColor = instanceAttribute(buffers.color, 3);
      kernel = null;
      docPosNode = motion(aStart, aEnd, aSeed).docPos;
    }

    const { release, rel } = motion(aStart, aEnd, aSeed);
    const docPos = docPosNode;
    const view = vec2(docPos.x, docPos.y.sub(uScroll));
    const alive = smoothstep(release, release.add(0.02), uP).mul(float(1).sub(smoothstep(0.9, 0.99, uP)));
    const front = float(1).sub(smoothstep(0, 0.14, rel)).mul(step(0.0001, rel)).add(step(rel, 0.0001).mul(step(release, uP)));
    const stretch = abs(uScrollVelocity).mul(4).mul(rel.mul(float(1).sub(rel)).mul(4)).add(1);
    const size = vec2(aSeed.y.mul(1.0).add(1.2), aSeed.y.add(1.2).mul(stretch));

    system = createParticles(buffers.count, {
      position: vec3(view.x, view.y.negate(), 0),
      size,
      color: aColor,
      // Con «Ver internos» las partículas se atenúan (factor 1 apagado: sin cambio) para ver el mapa.
      opacity: alive.mul(0.95).mul(float(1).sub(uInternals.mul(0.6))),
      glow: vec4(aColor.mul(front), front.mul(alive)).mul(float(1).sub(uInternals.mul(0.7))),
    });
    scene.add(system.sprite);
  };

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const want = particlesFor(frame.tier, frame.mobile);
      if (want !== builtCount) build(want);
      uP.value = state.p;
      uScroll.value = frame.scrollY;
      uInternals.value = state.internals ? 1 : 0;
      mapMesh.visible = state.internals && bounds.ready;
      if (mapMesh.visible) {
        const w = Math.max(1, bounds.x1 - bounds.x0);
        const h = Math.max(24, (bounds.y1 - bounds.y0) * 2.5);
        mapMesh.position.set((bounds.x0 + bounds.x1) / 2, -((bounds.y0 + bounds.y1) / 2 - frame.scrollY), 0);
        mapMesh.scale.set(w, h, 1);
      }
      return false;
    },
    compute(renderer) {
      if (computeMode && kernel) renderer.compute(kernel);
    },
    debug: () => ({ compute: computeMode, particles: builtCount }),
    applyQuality() {
      builtCount = -1; // se reconstruye con el nuevo presupuesto de partículas en el siguiente frame
    },
    dispose() {
      if (system) {
        scene.remove(system.sprite);
        system.dispose();
      }
      scene.remove(mapMesh);
      mapGeometry.dispose();
      mapMat.dispose();
    },
  };
};
