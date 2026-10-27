import { ph } from "@/lib/content/placeholder";
import type { ExperimentInput } from "@/lib/content/schema";

/**
 * Experimentos del laboratorio GPU. `code` es el fragmento REAL (extraído del código del
 * experimento, en `webgl/lab/`) que se muestra, resaltado con Shiki en build, al girar la tarjeta.
 * Las demos viven en `webgl/lab/`; `image` y `summary` son placeholders hasta que pongas los tuyos.
 */
export const experiments = [
  {
    id: "generative-shader",
    name: ph({ es: "Shader generativo", en: "Generative shader" }),
    kind: "shader",
    year: 2026,
    image: "/media/placeholder.svg",
    alt: ph({ es: "Campo de ruido generativo", en: "Generative noise field" }),
    summary: ph({
      es: "Un campo de ruido controlable en tiempo real.",
      en: "A noise field you can steer in real time.",
    }),
    code: `const q = vec2(
  mx_fractal_noise_float(vec3(p.x, p.y, t.mul(0.4)), 4, 2, 0.5),
  mx_fractal_noise_float(vec3(p.x.add(5.2), p.y.add(1.3), t.mul(0.4)), 4, 2, 0.5),
);
const warped = p.add(q.mul(uWarp).mul(2.2)); // distorsión de dominio
const n = mx_fractal_noise_float(vec3(warped, t.mul(0.25)), 5, 2, 0.5);`,
    stack: ["threejs"],
  },
  {
    id: "physics-playground",
    name: ph({ es: "Simulación física", en: "Physics simulation" }),
    kind: "physics",
    year: 2026,
    image: "/media/placeholder.svg",
    alt: ph({ es: "Cuerpos rígidos en movimiento", en: "Rigid bodies in motion" }),
    summary: ph({
      es: "Cuerpos rígidos que reaccionan al cursor.",
      en: "Rigid bodies that react to the cursor.",
    }),
    code: `// Worker: paso fijo a 60 Hz con Rapier
body.setLinvel({ x: (drag.x - p.x) * 14, y: (drag.y - p.y) * 14, z: 0 }, true);
world.step();
const angle = 2 * Math.atan2(q.z, q.w);
post({ type: "state", bodies: out }, [out.buffer]);`,
    stack: ["threejs", "typescript"],
  },
  {
    id: "data-sculpture",
    name: ph({ es: "Visualización de datos", en: "Data visualization" }),
    kind: "dataviz",
    year: 2026,
    image: "/media/placeholder.svg",
    alt: ph({ es: "Escultura de datos interactiva", en: "Interactive data sculpture" }),
    summary: ph({
      es: "Un conjunto de datos convertido en escultura interactiva.",
      en: "A dataset turned into an interactive sculpture.",
    }),
    code: `const barTop = margin.add(h.mul(float(1).sub(margin.mul(2))));
const inBar = step(0.16, within).mul(step(within, 0.84))
  .mul(step(margin, y)).mul(step(y, barTop));
const cap = step(barTop.sub(0.035), y).mul(inBar); // cara superior`,
    stack: ["threejs", "typescript"],
  },
  {
    id: "magnetic-grid",
    name: ph({ es: "Micro-interacción compleja", en: "Complex micro-interaction" }),
    kind: "microinteraction",
    year: 2026,
    image: "/media/placeholder.svg",
    alt: ph({ es: "Rejilla que sigue al puntero", en: "Grid following the pointer" }),
    summary: ph({
      es: "Una rejilla que se deforma siguiendo al puntero.",
      en: "A grid that bends toward the pointer.",
    }),
    code: `const pull = normalize(d).mul(smoothstep(uRadius, 0, dist)).mul(uStrength).mul(2600);
const spring = h.sub(p).mul(70);
const nv = v.add(spring.add(pull).mul(uDt)).mul(0.9);
posBuf.element(i).assign(p.add(nv.mul(uDt)));`,
    stack: ["motion-design"],
  },
] satisfies ExperimentInput[];
