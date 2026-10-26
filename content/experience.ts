import type { ExperienceInput } from "@/lib/content/schema";

/**
 * Experiencia real. Cada logro necesita una instrucción (`op`) y un texto con una cifra
 * cuantificada en ambos idiomas; si no, el build falla. Las cifras de Ofima salen del historial
 * git y de OpenSpec (sin datos internos ni de clientes).
 */
export const experience = [
  {
    id: "ofima-2025-now",
    company: "Ofima S.A.S",
    role: {
      es: "Full Stack Developer · Líder técnico de IA y Azure",
      en: "Full Stack Developer · AI & Azure Tech Lead",
    },
    start: "2025-01",
    end: null,
    fn: "fn ofima_2025_now()",
    stack: [
      "dotnet",
      "clean-architecture",
      "microservices",
      "angular",
      "micro-frontends",
      "azure",
      "azure-devops",
      "postgresql",
      "mongodb",
      "claude-code",
      "openspec",
      "tech-leadership",
    ],
    achievements: [
      {
        op: "LEAD",
        text: {
          es: "Diseñé, junto a otro desarrollador, el desarrollo guiado por specs con IA (OpenSpec + Claude Code) que gobierna los 34 repositorios de DomoNow desde un Store central.",
          en: "Co-designed the AI spec-driven workflow (OpenSpec + Claude Code) that governs DomoNow's 34 repositories from a central Store.",
        },
      },
      {
        op: "PUSH",
        text: {
          es: "Creé 8 skills propias de Claude Code que conectan módulos, reconstruyen reglas de negocio leyendo el código y auditan la arquitectura .NET.",
          en: "Built 8 custom Claude Code skills that connect modules, rebuild business rules from the code and audit the .NET architecture.",
        },
      },
      {
        op: "LEAD",
        text: {
          es: "Escribí cerca de 200 reglas técnicas de backend y frontend que siguen como estándar el equipo y los agentes de IA.",
          en: "Wrote about 200 backend and frontend technical rules that the team and the AI agents follow as the standard.",
        },
      },
      {
        op: "CALL",
        text: {
          es: "Completé más de 580 pull requests en Azure DevOps, integrando el trabajo de un equipo de unas 20 personas.",
          en: "Completed 580+ pull requests in Azure DevOps, integrating the work of a team of about 20 people.",
        },
      },
      {
        op: "DEPLOY",
        text: {
          es: "Como responsable de releases, completé los 231 PR de promoción dev → qa → producción en 28 repositorios.",
          en: "As release owner, completed all 231 dev → qa → production promotion PRs across 28 repositories.",
        },
      },
      {
        op: "OPTIMIZE",
        text: {
          es: "Automaticé la promoción de QA a producción de unos 30 repositorios con la API REST de Azure DevOps: orden de dependencias, ramas y PR automáticos.",
          en: "Automated the QA-to-production promotion of about 30 repositories with the Azure DevOps REST API: dependency order, branches and automatic PRs.",
        },
      },
      {
        op: "DEPLOY",
        text: {
          es: "Administro la infraestructura Azure de 14 microservicios: API Management con validación JWT por ambiente, Key Vault con identidad administrada, Blob Storage, Web Apps y Container Registry.",
          en: "Run the Azure infrastructure of 14 microservices: API Management with per-environment JWT validation, Key Vault with managed identity, Blob Storage, Web Apps and Container Registry.",
        },
      },
      {
        op: "PUSH",
        text: {
          es: "Construí desde cero el módulo piloto de Parqueaderos (API .NET + micro-frontend Angular) con 18 reglas de negocio y 30 pruebas unitarias del cobro.",
          en: "Built the pilot Parking module from scratch (.NET API + Angular micro-frontend) with 18 business rules and 30 unit tests for billing.",
        },
      },
      {
        op: "TEST",
        text: {
          es: "Desarrollé en 11 microservicios .NET y 11 micro-frontends Angular: asambleas con votación en tiempo real, alertas de pánico, zonas comunes, muro social y PWA.",
          en: "Shipped work in 11 .NET microservices and 11 Angular micro-frontends: live-voting assemblies, panic alerts, common areas, social wall and PWA.",
        },
      },
      {
        op: "LEAD",
        text: {
          es: "Escribí la guía de adopción del Store OpenSpec (17 secciones) y capacito al equipo en desarrollo asistido por IA.",
          en: "Wrote the OpenSpec Store adoption guide (17 sections) and train the team in AI-assisted development.",
        },
      },
    ],
  },
  {
    id: "freelance-2021-2023",
    company: "Freelance",
    role: {
      es: "Desarrollador independiente · web y sistemas embebidos",
      en: "Independent developer · web and embedded systems",
    },
    start: "2021-01",
    end: "2023-01",
    fn: "fn freelance_2021_2023()",
    stack: ["embedded-cpp", "nodejs", "python", "sql"],
    achievements: [
      {
        op: "PUSH",
        text: {
          es: "Programé microcontroladores en C++ para empresas de domótica durante 3 años.",
          en: "Programmed C++ microcontrollers for home-automation companies for 3 years.",
        },
      },
      {
        op: "DEPLOY",
        text: {
          es: "Durante 2 años entregué sitios y aplicaciones web para corporaciones gubernamentales y PyMEs, a medida y con WordPress.",
          en: "For 2 years delivered websites and web apps for government corporations and SMBs, custom-built and on WordPress.",
        },
      },
      {
        op: "MIGRATE",
        text: {
          es: "Diseñé circuitos electrónicos a medida e integré sistemas eléctricos y electrónicos para clientes de distintos sectores entre 2021 y 2023.",
          en: "Designed custom electronic circuits and integrated electrical and electronic systems for clients across sectors from 2021 to 2023.",
        },
      },
    ],
  },
  {
    id: "gameover-2023",
    company: "Game Over Restobar",
    role: { es: "Soporte técnico y desarrollo web", en: "Tech support and web development" },
    start: "2023-01",
    end: "2023-12",
    fn: "fn gameover_2023_2023()",
    stack: ["nodejs", "sql"],
    achievements: [
      {
        op: "REFACTOR",
        text: {
          es: "En 2023 di soporte a la plataforma web de reservas, mejoré el diseño y las funciones de sus páginas y mantuve el hardware del negocio.",
          en: "In 2023 supported the web booking platform, improved the design and features of its pages and maintained the business hardware.",
        },
      },
    ],
  },
] satisfies ExperienceInput[];
