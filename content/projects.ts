import { ph } from "@/lib/content/placeholder";
import type { ProjectInput } from "@/lib/content/schema";

const media = (alt: { es: string; en: string }): ProjectInput["media"] => ({
  image: "/media/placeholder.svg",
  alt: ph(alt),
});

/**
 * PLACEHOLDER: 6 proyectos de ejemplo. Sustituye textos, métricas y enlaces por los reales.
 * `stack` referencia ids de `content/skills.ts`: de ahí se calculan las relaciones habilidad↔proyecto.
 * Para añadir un caso de estudio crea `content/cases/<slug>.es.mdx` y `.en.mdx` y pon `links.caseStudy`.
 */
export const projects = [
  {
    slug: "atlas-dashboard",
    name: ph("Atlas Dashboard"),
    pid: 1001,
    status: "deployed",
    year: 2025,
    problem: ph({
      es: "Los equipos tardaban horas en consolidar métricas dispersas.",
      en: "Teams spent hours consolidating scattered metrics.",
    }),
    role: ph({
      es: "Desarrollo full-stack y diseño de UI",
      en: "Full-stack development and UI design",
    }),
    stack: ["react", "typescript", "nextjs", "tailwind", "postgresql", "d3", "communication"],
    metrics: [
      { label: ph({ es: "usuarios activos", en: "active users" }), value: ph("4.200") },
      { label: ph({ es: "puntuación Lighthouse", en: "Lighthouse score" }), value: ph("98") },
    ],
    media: media({ es: "Captura del panel Atlas", en: "Atlas dashboard screenshot" }),
    links: {
      demo: ph("https://example.com/atlas"),
      code: ph("https://github.com/tu-usuario/atlas"),
    },
    featured: true,
  },
  {
    slug: "orbit-api",
    name: ph("Orbit API"),
    pid: 1002,
    status: "running",
    year: 2024,
    problem: ph({
      es: "Una API monolítica que no escalaba con el tráfico.",
      en: "A monolithic API that could not scale with traffic.",
    }),
    role: ph({ es: "Arquitectura y backend", en: "Architecture and backend" }),
    stack: ["nodejs", "typescript", "postgresql", "docker", "github-actions"],
    metrics: [
      { label: ph({ es: "reducción de latencia", en: "latency reduction" }), value: ph("48%") },
      {
        label: ph({ es: "peticiones por segundo", en: "requests per second" }),
        value: ph("1.800"),
      },
    ],
    media: media({ es: "Diagrama de la API Orbit", en: "Orbit API diagram" }),
    links: { code: ph("https://github.com/tu-usuario/orbit-api") },
    featured: true,
  },
  {
    slug: "shader-garden",
    name: ph("Shader Garden"),
    pid: 1003,
    status: "open-source",
    year: 2025,
    problem: ph({
      es: "Aprender shaders sin entorno interactivo es lento y abstracto.",
      en: "Learning shaders without an interactive environment is slow and abstract.",
    }),
    role: ph({ es: "Autoría y mantenimiento", en: "Author and maintainer" }),
    stack: ["threejs", "typescript", "motion-design"],
    metrics: [
      { label: ph({ es: "estrellas en GitHub", en: "GitHub stars" }), value: ph("320") },
      { label: ph({ es: "fotogramas por segundo", en: "frames per second" }), value: ph("60") },
    ],
    media: media({
      es: "Escena generativa de Shader Garden",
      en: "Shader Garden generative scene",
    }),
    links: {
      demo: ph("https://example.com/shader-garden"),
      code: ph("https://github.com/tu-usuario/shader-garden"),
    },
    featured: true,
  },
  {
    slug: "pixel-forge",
    name: ph("Pixel Forge"),
    pid: 1004,
    status: "deployed",
    year: 2023,
    problem: ph({
      es: "El sistema de diseño se desincronizaba entre Figma y código.",
      en: "The design system drifted between Figma and code.",
    }),
    role: ph({ es: "Sistema de diseño y mentoría", en: "Design system and mentoring" }),
    stack: ["react", "figma", "tailwind", "motion-design", "mentoring"],
    metrics: [
      { label: ph({ es: "componentes", en: "components" }), value: ph("64") },
      { label: ph({ es: "equipos que lo usan", en: "teams using it" }), value: ph("5") },
    ],
    media: media({
      es: "Biblioteca de componentes Pixel Forge",
      en: "Pixel Forge component library",
    }),
    links: { demo: ph("https://example.com/pixel-forge") },
    featured: false,
  },
  {
    slug: "pipeline-kit",
    name: ph("Pipeline Kit"),
    pid: 1005,
    status: "open-source",
    year: 2024,
    problem: ph({
      es: "Cada repositorio tenía su propio pipeline de CI frágil.",
      en: "Every repository had its own fragile CI pipeline.",
    }),
    role: ph({ es: "Autoría y documentación", en: "Author and documentation" }),
    stack: ["github-actions", "docker", "nodejs", "communication"],
    metrics: [
      {
        label: ph({ es: "reducción del tiempo de build", en: "build time reduction" }),
        value: ph("62%"),
      },
      { label: ph({ es: "repositorios migrados", en: "repositories migrated" }), value: ph("18") },
    ],
    media: media({ es: "Flujo del pipeline Kit", en: "Pipeline Kit workflow" }),
    links: { code: ph("https://github.com/tu-usuario/pipeline-kit") },
    featured: false,
  },
  {
    slug: "signal-board",
    name: ph("Signal Board"),
    pid: 1006,
    status: "running",
    year: 2025,
    problem: ph({
      es: "Los datos operativos llegaban tarde a quien debía decidir.",
      en: "Operational data reached decision makers too late.",
    }),
    role: ph({ es: "Frontend y visualización de datos", en: "Frontend and data visualization" }),
    stack: ["nextjs", "react", "d3", "postgresql", "mentoring"],
    metrics: [
      { label: ph({ es: "decisiones por semana", en: "decisions per week" }), value: ph("35") },
      { label: ph({ es: "tiempo de carga", en: "load time" }), value: ph("1,1 s") },
    ],
    media: media({ es: "Tablero Signal Board", en: "Signal Board dashboard" }),
    links: { demo: ph("https://example.com/signal-board") },
    featured: false,
  },
] satisfies ProjectInput[];
