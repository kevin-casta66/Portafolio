import { Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry } from "three/webgpu";
import { uAccents, uBg, uTime } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { placeOnTwin, type ExperimentFactory } from "./base";

const { vec2, vec3, vec4, float, uv, uniform, mix, smoothstep, clamp, length, fract, floor, sin, mx_fractal_noise_float, mrt, dot } = TSL;

/**
 * Experimento 1 · shader generativo. Un campo de ruido fractal con distorsión de dominio (domain
 * warping) en TSL, con tres controles: escala, velocidad y distorsión. El tiempo del campo se
 * ACUMULA en JS (dt × velocidad), así cambiar la velocidad no produce saltos. En tier alto añade el
 * acabado cinematográfico: viñeta, grano y brillo (bloom por el canal `glow`).
 */
export const createShaderExperiment: ExperimentFactory = () => {
  const group = new Group();
  const uScale = uniform(2.4);
  const uWarp = uniform(0.55);
  const uT = uniform(0);
  const uCinematic = uniform(0);

  const p = vec2(uv().x.sub(0.5).mul(1.6), uv().y.sub(0.5)).mul(uScale);
  const t = uT;
  const q = vec2(
    mx_fractal_noise_float(vec3(p.x, p.y, t.mul(0.4)), 4, 2, 0.5),
    mx_fractal_noise_float(vec3(p.x.add(5.2), p.y.add(1.3), t.mul(0.4)), 4, 2, 0.5),
  );
  const warped = p.add(q.mul(uWarp).mul(2.2));
  const n = mx_fractal_noise_float(vec3(warped.x, warped.y, t.mul(0.25)), 5, 2, 0.5).mul(0.5).add(0.5);
  const bands = smoothstep(0.35, 0.65, n);
  const hue = clamp(n.add(sin(t.mul(0.2)).mul(0.1)), 0, 1);
  // Paleta: del fondo a los acentos de LEXER (índice 1), PARSER (2) y GPU (5), todos de los tokens.
  const c1 = mix(uBg, uAccents.element(1), smoothstep(0.0, 0.5, hue));
  const c2 = mix(c1, uAccents.element(2), smoothstep(0.35, 0.8, hue));
  const base = mix(c2, uAccents.element(5), smoothstep(0.7, 1.0, hue).mul(bands));
  // Acabado cinematográfico (solo tier alto): viñeta + grano.
  const vignette = float(1).sub(smoothstep(0.35, 0.95, length(uv().sub(0.5).mul(vec2(1.2, 1.0)).mul(1.4))).mul(0.6).mul(uCinematic));
  const grain = fract(dot(floor(uv().mul(vec2(420, 260))).add(floor(uTime.mul(24))), vec2(12.9898, 78.233)).sin().mul(43758.5453)).sub(0.5).mul(0.05).mul(uCinematic);
  const color = base.mul(vignette).add(grain);

  const material = new MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  material.colorNode = vec3(color);
  material.mrtNode = mrt({ glow: vec4(vec3(base).mul(bands).mul(0.35).mul(uCinematic), bands.mul(0.35).mul(uCinematic)) });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  group.add(mesh);

  let time = 0;
  return {
    group,
    update(frame, twin, _input, params) {
      placeOnTwin(group, twin);
      mesh.scale.set(twin.rect.w, twin.rect.h, 1);
      uScale.value = Number(params.scale ?? 2.4);
      uWarp.value = Number(params.warp ?? 0.55);
      const speed = frame.reduced ? 0 : Number(params.speed ?? 0.5);
      time += frame.dt * speed;
      uT.value = time;
      uCinematic.value = frame.preset.cinematic ? 1 : 0;
      return speed > 0 && twin.visible;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
};
