import type { SkillInput } from "@/lib/content/schema";

/**
 * Habilidades con años y nivel reales. Cada una debe aparecer en el `stack` de al menos un
 * proyecto (`content/projects.ts`); si no, el build falla.
 */
export const skills = [
  // IA y automatización
  { id: "claude-code", name: "Claude Code · agentes", category: "ai", years: 1, level: "daily" },
  { id: "openspec", name: "Spec-driven (OpenSpec)", category: "ai", years: 1, level: "daily" },
  { id: "llm-agents", name: "Agentes LLM · tool calling", category: "ai", years: 1, level: "production" },
  { id: "mcp", name: "Model Context Protocol", category: "ai", years: 1, level: "production" },
  { id: "rag", name: "RAG · embeddings", category: "ai", years: 1, level: "production" },
  { id: "llm-evals", name: "Evaluación y costos de LLM", category: "ai", years: 1, level: "production" },
  { id: "ai-automation", name: "Automatización con IA", category: "ai", years: 1, level: "daily" },

  // Backend
  { id: "dotnet", name: "C# · .NET", category: "backend", years: 2, level: "daily" },
  { id: "clean-architecture", name: "Hexagonal · CQRS · MediatR", category: "backend", years: 2, level: "daily" },
  { id: "microservices", name: "Microservicios · REST", category: "backend", years: 2, level: "daily" },
  { id: "signalr", name: "SignalR · tiempo real", category: "backend", years: 1, level: "production" },
  { id: "messaging", name: "Azure Service Bus · colas", category: "backend", years: 1, level: "production" },
  { id: "nodejs", name: "Node.js", category: "backend", years: 3, level: "production" },
  { id: "python", name: "Python", category: "backend", years: 2, level: "production" },
  { id: "embedded-cpp", name: "C++ embebido · ESP32", category: "backend", years: 4, level: "production" },

  // Frontend
  { id: "angular", name: "Angular", category: "frontend", years: 2, level: "daily" },
  { id: "typescript", name: "TypeScript", category: "frontend", years: 3, level: "daily" },
  { id: "micro-frontends", name: "Micro-frontends · Module Federation", category: "frontend", years: 1, level: "daily" },
  { id: "react", name: "React", category: "frontend", years: 2, level: "production" },
  { id: "nextjs", name: "Next.js", category: "frontend", years: 2, level: "production" },
  { id: "tailwind", name: "Tailwind CSS", category: "frontend", years: 2, level: "production" },
  { id: "threejs", name: "Three.js · WebGPU", category: "frontend", years: 1, level: "exploring" },
  { id: "pwa", name: "PWA · service workers", category: "frontend", years: 1, level: "production" },

  // Cloud y DevOps
  { id: "azure", name: "Azure (APIM, Key Vault, Web Apps)", category: "cloud-devops", years: 2, level: "daily" },
  { id: "azure-devops", name: "Azure DevOps · CI/CD", category: "cloud-devops", years: 2, level: "daily" },
  { id: "docker", name: "Docker", category: "cloud-devops", years: 2, level: "production" },
  { id: "playwright", name: "QA E2E · Playwright", category: "cloud-devops", years: 1, level: "production" },

  // Datos
  { id: "postgresql", name: "PostgreSQL · pgvector", category: "data", years: 3, level: "daily" },
  { id: "mongodb", name: "MongoDB", category: "data", years: 1, level: "production" },
  { id: "sql", name: "SQL · modelado relacional", category: "data", years: 3, level: "daily" },

  // Diseño
  { id: "figma", name: "Figma", category: "design", years: 1, level: "production" },
  { id: "design-systems", name: "Design systems", category: "design", years: 2, level: "production" },
  { id: "motion-design", name: "Motion design · GSAP", category: "design", years: 1, level: "exploring" },

  // Liderazgo
  { id: "tech-leadership", name: "Liderazgo técnico", category: "soft-skills", years: 2, level: "daily" },
  { id: "code-review", name: "Revisión de código y PRs", category: "soft-skills", years: 2, level: "daily" },
  { id: "team-training", name: "Capacitación de equipos", category: "soft-skills", years: 1, level: "production" },
  { id: "work-planning", name: "Planes de trabajo", category: "soft-skills", years: 2, level: "production" },
] satisfies SkillInput[];
