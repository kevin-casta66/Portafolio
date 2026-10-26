import type { ProfileInput } from "@/lib/content/schema";

/**
 * Perfil de Kevin Castaño. Las cifras salen de su HV y de la actividad verificable en sus
 * repositorios (git, OpenSpec); no se publican datos internos de Ofima ni de sus clientes.
 */
export const profile = {
  name: "Kevin Castaño",
  role: {
    es: "Full Stack Developer · IA aplicada y Azure",
    en: "Full Stack Developer · Applied AI & Azure",
  },
  valueProp: {
    es: "Diseño y lidero software empresarial con .NET, Angular y Azure, y pongo la IA a trabajar de verdad: agentes que venden, specs que gobiernan equipos y automatizaciones que llevan código a producción.",
    en: "I design and lead enterprise software with .NET, Angular and Azure, and I put AI to real work: agents that sell, specs that govern teams and automations that ship code to production.",
  },
  availability: {
    available: true,
    label: { es: "Abierto a nuevas oportunidades", en: "Open to new opportunities" },
  },
  location: { es: "Medellín, Colombia", en: "Medellín, Colombia" },
  email: "kevinmacalister@hotmail.com",
  socials: [{ id: "github", label: "GitHub", url: "https://github.com/kevin-casta66" }],
  cv: { es: "/cv/cv-es.pdf", en: "/cv/cv-en.pdf" },
  bio: {
    keyword: [
      {
        text: { es: "Full Stack .NET + Angular", en: "Full Stack .NET + Angular" },
        note: {
          es: "Microservicios hexagonales con CQRS y micro-frontends con Module Federation.",
          en: "Hexagonal CQRS microservices and Module Federation micro-frontends.",
        },
      },
      {
        text: { es: "IA aplicada en producción", en: "Applied AI in production" },
        note: {
          es: "Agentes LLM con MCP y RAG, y desarrollo guiado por specs con Claude Code.",
          en: "LLM agents with MCP and RAG, and spec-driven development with Claude Code.",
        },
      },
      {
        text: { es: "Líder técnico", en: "Tech lead" },
        note: {
          es: "Infraestructura Azure, releases, revisión de PRs, estándares y capacitación del equipo.",
          en: "Azure infrastructure, releases, PR reviews, standards and team training.",
        },
      },
    ],
    identifier: [
      {
        text: { es: "Kevin Estiven Castaño Villa", en: "Kevin Estiven Castaño Villa" },
        note: {
          es: "En GitHub me encuentras como kevin-casta66.",
          en: "You will find me on GitHub as kevin-casta66.",
        },
      },
      {
        text: { es: "Medellín, Colombia", en: "Medellín, Colombia" },
        note: {
          es: "Abierto a trabajo remoto, híbrido o presencial.",
          en: "Open to remote, hybrid or on-site work.",
        },
      },
    ],
    string: [
      {
        text: {
          es: "La IA no reemplaza al ingeniero: lo multiplica",
          en: "AI does not replace the engineer: it multiplies them",
        },
        note: {
          es: "Por eso le doy reglas, límites y evaluaciones antes de dejarla escribir código.",
          en: "That is why I give it rules, limits and evals before letting it write code.",
        },
      },
      {
        text: {
          es: "Del circuito a la nube",
          en: "From circuit board to cloud",
        },
        note: {
          es: "Empecé programando microcontroladores; hoy despliego microservicios en Azure.",
          en: "I started programming microcontrollers; today I deploy microservices on Azure.",
        },
      },
    ],
    number: [
      {
        label: { es: "años construyendo software", en: "years building software" },
        value: 5,
        suffix: "+",
        note: {
          es: "Desde 2021: freelance, domótica y, hoy, software empresarial en Ofima.",
          en: "Since 2021: freelance, home automation and, today, enterprise software at Ofima.",
        },
      },
      {
        label: { es: "pull requests completados", en: "pull requests completed" },
        value: 580,
        suffix: "+",
        note: {
          es: "En Azure DevOps, integrando el trabajo de un equipo de unas 20 personas.",
          en: "In Azure DevOps, integrating the work of a team of about 20 people.",
        },
      },
      {
        label: { es: "repositorios gobernados con IA", en: "repositories governed with AI" },
        value: 34,
        note: {
          es: "Backend y frontend de DomoNow bajo un mismo Store de specs para agentes.",
          en: "DomoNow backend and frontend under a single spec Store for agents.",
        },
      },
    ],
  },
} satisfies ProfileInput;
