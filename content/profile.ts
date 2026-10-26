import { ph } from "@/lib/content/placeholder";
import type { ProfileInput } from "@/lib/content/schema";

/**
 * PLACEHOLDER: datos de ejemplo. Sustituye cada valor marcado con `ph()` por el tuyo
 * (`pnpm content:todo` lista los que faltan).
 */
export const profile = {
  name: ph("Nombre Apellido"),
  role: ph({ es: "Desarrollador Full-Stack", en: "Full-Stack Developer" }),
  valueProp: ph({
    es: "Construyo productos web rápidos y accesibles que convierten ideas en resultados medibles.",
    en: "I build fast, accessible web products that turn ideas into measurable results.",
  }),
  availability: {
    available: true,
    label: ph({ es: "Disponible para proyectos", en: "Available for projects" }),
  },
  location: ph({ es: "Ciudad, País", en: "City, Country" }),
  email: ph("hola@example.com"),
  socials: [
    { id: "github", label: "GitHub", url: ph("https://github.com/tu-usuario") },
    { id: "linkedin", label: "LinkedIn", url: ph("https://www.linkedin.com/in/tu-usuario") },
  ],
  cv: { es: "/cv/cv-es.pdf", en: "/cv/cv-en.pdf" },
  bio: {
    keyword: [
      {
        text: ph({ es: "Desarrollador full-stack", en: "Full-stack developer" }),
        note: ph({
          es: "Frontend, backend y todo lo que une ambos.",
          en: "Frontend, backend and everything that joins them.",
        }),
      },
      {
        text: ph({ es: "Obsesionado con el rendimiento", en: "Performance obsessed" }),
        note: ph({
          es: "Cada milisegundo cuenta cuando alguien espera.",
          en: "Every millisecond counts when someone is waiting.",
        }),
      },
    ],
    identifier: [
      {
        text: ph({ es: "Nombre Apellido", en: "Your Name" }),
        note: ph({
          es: "Así me encontrarás en GitHub y LinkedIn.",
          en: "That is how you will find me on GitHub and LinkedIn.",
        }),
      },
      {
        text: ph({ es: "Ciudad, País", en: "City, Country" }),
        note: ph({
          es: "Trabajo en remoto con equipos de cualquier zona horaria.",
          en: "I work remotely with teams in any time zone.",
        }),
      },
    ],
    string: [
      {
        text: ph({
          es: "Convertir problemas complejos en interfaces simples",
          en: "Turning complex problems into simple interfaces",
        }),
        note: ph({ es: "Lo que me motiva cada mañana.", en: "What gets me going every morning." }),
      },
      {
        text: ph({ es: "El código también es diseño", en: "Code is design too" }),
        note: ph({
          es: "Un buen sistema se nota en cómo se lee.",
          en: "A good system shows in how it reads.",
        }),
      },
    ],
    number: [
      {
        label: ph({ es: "años de experiencia", en: "years of experience" }),
        value: 6,
        note: ph({
          es: "Desde mi primer trabajo como desarrollador web.",
          en: "Since my first job as a web developer.",
        }),
      },
      {
        label: ph({ es: "proyectos entregados", en: "projects shipped" }),
        value: 24,
        note: ph({
          es: "En producción y con usuarios reales.",
          en: "In production and with real users.",
        }),
      },
      {
        label: ph({ es: "clientes", en: "clients" }),
        value: 12,
        note: ph({
          es: "Startups, agencias y equipos de producto.",
          en: "Startups, agencies and product teams.",
        }),
      },
    ],
  },
} satisfies ProfileInput;
