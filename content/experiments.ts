import { ph } from "@/lib/content/placeholder";
import type { ExperimentInput } from "@/lib/content/schema";

/**
 * PLACEHOLDER: experimentos del laboratorio GPU. `code` es el fragmento que se muestra al girar la
 * tarjeta; las demos interactivas llegan con el change 04.
 */
export const experiments = [
  {
    id: "generative-shader",
    name: ph({ es: "Shader generativo", en: "Generative shader" }),
    kind: "shader",
    image: "/media/placeholder.svg",
    alt: ph({ es: "Campo de ruido generativo", en: "Generative noise field" }),
    summary: ph({
      es: "Un campo de ruido controlable en tiempo real.",
      en: "A noise field you can steer in real time.",
    }),
    code: "const color = mix(a, b, noise(uv.mul(scale).add(time)));",
    stack: ["threejs"],
  },
  {
    id: "physics-playground",
    name: ph({ es: "Simulación física", en: "Physics simulation" }),
    kind: "physics",
    image: "/media/placeholder.svg",
    alt: ph({ es: "Cuerpos rígidos en movimiento", en: "Rigid bodies in motion" }),
    summary: ph({
      es: "Cuerpos rígidos que reaccionan al cursor.",
      en: "Rigid bodies that react to the cursor.",
    }),
    code: "body.applyImpulse({ x: dx, y: dy, z: 0 }, true);",
    stack: ["threejs", "typescript"],
  },
  {
    id: "data-sculpture",
    name: ph({ es: "Visualización de datos", en: "Data visualization" }),
    kind: "dataviz",
    image: "/media/placeholder.svg",
    alt: ph({ es: "Escultura de datos interactiva", en: "Interactive data sculpture" }),
    summary: ph({
      es: "Un conjunto de datos convertido en escultura interactiva.",
      en: "A dataset turned into an interactive sculpture.",
    }),
    code: "const scale = d3.scaleLinear().domain(extent).range([0, 1]);",
    stack: ["d3"],
  },
  {
    id: "magnetic-grid",
    name: ph({ es: "Micro-interacción compleja", en: "Complex micro-interaction" }),
    kind: "microinteraction",
    image: "/media/placeholder.svg",
    alt: ph({ es: "Rejilla que sigue al puntero", en: "Grid following the pointer" }),
    summary: ph({
      es: "Una rejilla que se deforma siguiendo al puntero.",
      en: "A grid that bends toward the pointer.",
    }),
    code: "gsap.quickTo(cell, 'x', { duration: 0.4, ease: 'expo.out' });",
    stack: ["motion-design"],
  },
] satisfies ExperimentInput[];
