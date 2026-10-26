import type { SkillInput } from "@/lib/content/schema";

/**
 * PLACEHOLDER: años y niveles de ejemplo. Cada habilidad debe aparecer en el `stack` de al menos
 * un proyecto (`content/projects.ts`); si no, el build falla.
 */
export const skills = [
  { id: "react", name: "React", category: "frontend", years: 6, level: "daily" },
  { id: "typescript", name: "TypeScript", category: "frontend", years: 5, level: "daily" },
  { id: "nextjs", name: "Next.js", category: "frontend", years: 4, level: "daily" },
  { id: "tailwind", name: "Tailwind CSS", category: "frontend", years: 4, level: "production" },
  { id: "threejs", name: "Three.js", category: "frontend", years: 2, level: "production" },
  { id: "nodejs", name: "Node.js", category: "backend", years: 6, level: "daily" },
  { id: "docker", name: "Docker", category: "cloud-devops", years: 4, level: "production" },
  {
    id: "github-actions",
    name: "GitHub Actions",
    category: "cloud-devops",
    years: 3,
    level: "production",
  },
  { id: "postgresql", name: "PostgreSQL", category: "data", years: 5, level: "production" },
  { id: "d3", name: "D3.js", category: "data", years: 2, level: "exploring" },
  { id: "figma", name: "Figma", category: "design", years: 4, level: "production" },
  { id: "motion-design", name: "Motion design", category: "design", years: 3, level: "production" },
  { id: "communication", name: "Comunicación", category: "soft-skills", years: 6, level: "daily" },
  { id: "mentoring", name: "Mentoría", category: "soft-skills", years: 3, level: "production" },
] satisfies SkillInput[];
