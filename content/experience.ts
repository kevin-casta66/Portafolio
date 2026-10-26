import { ph } from "@/lib/content/placeholder";
import type { ExperienceInput } from "@/lib/content/schema";

/**
 * PLACEHOLDER: experiencia de ejemplo. Cada logro necesita una instrucción (`op`) y un texto con una
 * cifra cuantificada en ambos idiomas; si no, el build falla.
 */
export const experience = [
  {
    id: "acme-2023-2025",
    company: ph("Acme Corp"),
    role: ph({ es: "Desarrollador Full-Stack Senior", en: "Senior Full-Stack Developer" }),
    start: "2023-03",
    end: "2025-09",
    fn: "fn acme_2023_2025()",
    stack: ["react", "typescript", "nextjs", "postgresql"],
    achievements: [
      {
        op: "OPTIMIZE",
        text: ph({ es: "Reduje el tiempo de carga un 48 %.", en: "Cut load time by 48%." }),
      },
      {
        op: "DEPLOY",
        text: ph({
          es: "Lancé 12 funcionalidades sin tiempo de inactividad.",
          en: "Shipped 12 features with zero downtime.",
        }),
      },
    ],
  },
  {
    id: "globex-2020-2023",
    company: ph("Globex"),
    role: ph({ es: "Desarrollador Frontend", en: "Frontend Developer" }),
    start: "2020-06",
    end: "2023-02",
    fn: "fn globex_2020_2023()",
    stack: ["react", "tailwind", "figma"],
    achievements: [
      {
        op: "PUSH",
        text: ph({
          es: "Construí un sistema de diseño con 64 componentes.",
          en: "Built a design system with 64 components.",
        }),
      },
      {
        op: "LEAD",
        text: ph({
          es: "Mentoricé a 4 desarrolladores junior.",
          en: "Mentored 4 junior developers.",
        }),
      },
    ],
  },
  {
    id: "initech-2018-2020",
    company: ph("Initech"),
    role: ph({ es: "Desarrollador Web", en: "Web Developer" }),
    start: "2018-01",
    end: "2020-05",
    fn: "fn initech_2018_2020()",
    stack: ["nodejs", "docker"],
    achievements: [
      {
        op: "MIGRATE",
        text: ph({
          es: "Migré 9 servicios a contenedores.",
          en: "Migrated 9 services to containers.",
        }),
      },
    ],
  },
] satisfies ExperienceInput[];
