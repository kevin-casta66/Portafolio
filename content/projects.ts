import type { ProjectInput } from "@/lib/content/schema";

/** Imagen genérica hasta tener capturas propias (sin datos reales de clientes). */
const media = (alt: { es: string; en: string }): ProjectInput["media"] => ({
  image: "/media/placeholder.svg",
  alt,
});

/**
 * Proyectos reales. `stack` referencia ids de `content/skills.ts`: de ahí se calculan las
 * relaciones habilidad↔proyecto. Los de Ofima (DomoNow) se describen de forma genérica y sin
 * enlaces al código, que es privado. Para añadir un caso de estudio crea
 * `content/cases/<slug>.es.mdx` y `.en.mdx` (ver `content/cases/README.md`) y pon `links.caseStudy`.
 */
export const projects = [
  {
    slug: "arquelume-ai-agent",
    name: "ArqueLume · Agente IA de ventas",
    pid: 1001,
    status: "running",
    year: 2026,
    problem: {
      es: "Los negocios pierden ventas por WhatsApp porque nadie responde a tiempo, y un chatbot que inventa precios es peor que no responder.",
      en: "Businesses lose WhatsApp sales because nobody answers in time, and a chatbot that makes up prices is worse than no answer.",
    },
    role: {
      es: "Arquitecto e ingeniero de IA (proyecto propio)",
      en: "Architect and AI engineer (own product)",
    },
    stack: [
      "llm-agents",
      "mcp",
      "rag",
      "llm-evals",
      "dotnet",
      "clean-architecture",
      "messaging",
      "azure",
      "postgresql",
    ],
    metrics: [
      { label: { es: "casos de evaluación", en: "evaluation cases" }, value: "106" },
      { label: { es: "modelos comparados", en: "models compared" }, value: "278" },
      {
        label: { es: "costo proyectado por negocio al mes", en: "projected cost per business/month" },
        value: "US$4,5",
      },
    ],
    media: media({
      es: "Diagrama del agente de ventas: WhatsApp, orquestador, servidor MCP y CRM",
      en: "Sales agent diagram: WhatsApp, orchestrator, MCP server and CRM",
    }),
    links: { caseStudy: "arquelume-ai-agent" },
    featured: true,
  },
  {
    slug: "domonow-spec-driven",
    name: "DomoNow · Gobierno de IA multi-repo",
    pid: 1002,
    status: "running",
    year: 2026,
    problem: {
      es: "34 repositorios y unas 20 personas trabajando con agentes de IA sin reglas comunes: cada agente improvisaba la arquitectura.",
      en: "34 repositories and about 20 people working with AI agents without shared rules: every agent improvised the architecture.",
    },
    role: {
      es: "Co-diseñador del flujo, autor de skills y reglas, capacitador (Ofima)",
      en: "Workflow co-designer, skills and rules author, trainer (Ofima)",
    },
    stack: [
      "claude-code",
      "openspec",
      "ai-automation",
      "azure-devops",
      "tech-leadership",
      "code-review",
      "team-training",
      "work-planning",
    ],
    metrics: [
      { label: { es: "repositorios gobernados", en: "repositories governed" }, value: "34" },
      { label: { es: "skills propias de Claude Code", en: "custom Claude Code skills" }, value: "8" },
      { label: { es: "reglas técnicas escritas", en: "technical rules written" }, value: "~200" },
    ],
    media: media({
      es: "Esquema del Store central de specs que gobierna los repositorios",
      en: "Diagram of the central spec Store that governs the repositories",
    }),
    links: { caseStudy: "domonow-spec-driven" },
    featured: true,
  },
  {
    slug: "arquelume-crm",
    name: "ArqueLume CRM",
    pid: 1003,
    status: "running",
    year: 2026,
    problem: {
      es: "Los pequeños negocios llevan clientes, ventas e inventario en hojas sueltas y no ven qué conversación se convierte en venta.",
      en: "Small businesses track customers, sales and stock in loose spreadsheets and cannot see which conversation becomes a sale.",
    },
    role: {
      es: "Diseño, backend, frontend, QA y despliegue en solitario (proyecto propio)",
      en: "Solo design, backend, frontend, QA and deployment (own product)",
    },
    stack: [
      "dotnet",
      "clean-architecture",
      "angular",
      "typescript",
      "signalr",
      "postgresql",
      "figma",
      "design-systems",
      "playwright",
      "nodejs",
      "azure-devops",
    ],
    metrics: [
      { label: { es: "entidades de dominio", en: "domain entities" }, value: "70" },
      { label: { es: "componentes de UI", en: "UI components" }, value: "38" },
      { label: { es: "bugs reales hallados por QA E2E", en: "real bugs caught by E2E QA" }, value: "6" },
    ],
    media: media({
      es: "Vista de leads en kanban del CRM",
      en: "CRM leads kanban view",
    }),
    links: { code: "https://github.com/kevin-casta66/arquelume-crm-web" },
    featured: true,
  },
  {
    slug: "domonow-parking",
    name: "DomoNow · Parqueaderos",
    pid: 1004,
    status: "deployed",
    year: 2026,
    problem: {
      es: "Los conjuntos residenciales controlaban la entrada de vehículos a mano, sin cobro automático ni relación con los pases de visitantes.",
      en: "Residential complexes tracked vehicle entry by hand, with no automatic billing or link to visitor passes.",
    },
    role: {
      es: "Autor del módulo piloto spec-driven, backend y frontend (Ofima)",
      en: "Author of the spec-driven pilot module, backend and frontend (Ofima)",
    },
    stack: [
      "dotnet",
      "clean-architecture",
      "microservices",
      "angular",
      "micro-frontends",
      "pwa",
      "sql",
      "docker",
      "azure",
    ],
    metrics: [
      { label: { es: "reglas de negocio", en: "business rules" }, value: "18" },
      { label: { es: "pruebas unitarias del cobro", en: "billing unit tests" }, value: "30" },
      { label: { es: "endpoints REST", en: "REST endpoints" }, value: "8" },
    ],
    media: media({
      es: "Flujo de ingreso y salida de vehículos con cobro",
      en: "Vehicle entry and exit flow with billing",
    }),
    links: {},
    featured: true,
  },
  {
    slug: "domonow-platform",
    name: "DomoNow · Plataforma SaaS",
    pid: 1005,
    status: "deployed",
    year: 2025,
    problem: {
      es: "Administrar un conjunto residencial exige accesos, reservas, asambleas, cartera y alertas en un solo lugar y en tiempo real.",
      en: "Running a residential complex needs access control, bookings, assemblies, billing and alerts in one place and in real time.",
    },
    role: {
      es: "Full stack en microservicios y micro-frontends (Ofima)",
      en: "Full stack across microservices and micro-frontends (Ofima)",
    },
    stack: ["microservices", "micro-frontends", "signalr", "mongodb", "pwa", "angular", "dotnet"],
    metrics: [
      { label: { es: "microservicios .NET con aportes", en: ".NET microservices contributed" }, value: "11" },
      { label: { es: "micro-frontends Angular con aportes", en: "Angular micro-frontends contributed" }, value: "11" },
      { label: { es: "commits en 14 meses", en: "commits in 14 months" }, value: "1.800+" },
    ],
    media: media({
      es: "Arquitectura de micro-frontends sobre microservicios",
      en: "Micro-frontend architecture on top of microservices",
    }),
    links: {},
    featured: false,
  },
  {
    slug: "esp32-access",
    name: "Control de acceso IoT · ESP32",
    pid: 1006,
    status: "deployed",
    year: 2026,
    problem: {
      es: "Abrir dos compartimientos motorizados desde iPhone y Android sin publicar una app, cuando Web Bluetooth no funciona en iOS.",
      en: "Opening two motorised compartments from iPhone and Android without publishing an app, when Web Bluetooth does not work on iOS.",
    },
    role: { es: "Firmware, seguridad y web app", en: "Firmware, security and web app" },
    stack: ["embedded-cpp", "python", "typescript"],
    metrics: [
      { label: { es: "bugs de firmware corregidos", en: "firmware bugs fixed" }, value: "6" },
      { label: { es: "iteraciones PBKDF2", en: "PBKDF2 iterations" }, value: "50.000" },
    ],
    media: media({
      es: "Placa ESP32 con lector RFID y la web app servida por la propia placa",
      en: "ESP32 board with RFID reader and the web app served by the board itself",
    }),
    links: {},
    featured: false,
  },
  {
    slug: "facturas-app",
    name: "Facturas App",
    pid: 1007,
    status: "open-source",
    year: 2026,
    problem: {
      es: "Facturar a mano en hojas de cálculo: sin PDF consistente, sin estadísticas y sin control de clientes y productos.",
      en: "Invoicing by hand in spreadsheets: no consistent PDF, no statistics and no control of customers and products.",
    },
    role: { es: "Desarrollo full stack", en: "Full-stack development" },
    stack: ["nextjs", "react", "typescript", "tailwind", "postgresql"],
    metrics: [{ label: { es: "módulos", en: "modules" }, value: "5" }],
    media: media({ es: "Panel de facturación con estadísticas", en: "Invoicing dashboard with statistics" }),
    links: { code: "https://github.com/kevin-casta66/Facturas_app" },
    featured: false,
  },
  {
    slug: "portafolio-site",
    name: "Portafolio",
    pid: 1008,
    status: "running",
    year: 2026,
    problem: {
      es: "Un portafolio que demuestre lo que hago en vez de contarlo: la web es un compilador que procesa mi propia trayectoria.",
      en: "A portfolio that shows what I do instead of telling it: the site is a compiler that processes my own career.",
    },
    role: {
      es: "Diseño, desarrollo y specs con agentes de IA",
      en: "Design, development and specs with AI agents",
    },
    stack: [
      "nextjs",
      "react",
      "typescript",
      "threejs",
      "tailwind",
      "motion-design",
      "claude-code",
      "openspec",
      "playwright",
    ],
    metrics: [
      { label: { es: "tests automatizados", en: "automated tests" }, value: "255" },
      { label: { es: "transiciones de escena", en: "scene transitions" }, value: "11" },
    ],
    media: media({ es: "Portada de este portafolio", en: "Home page of this portfolio" }),
    links: {},
    featured: false,
  },
] satisfies ProjectInput[];
