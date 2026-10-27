import type { RawContent, SKILL_CATEGORIES } from "@/lib/content/schema";

/**
 * Registro de comandos de la terminal (design D3). Es lógica PURA (sin DOM, sin React, sin Next): la
 * terminal, los atajos de teclado y el panel `?` comparten esta única definición, de modo que la
 * documentación coincide siempre con el comportamiento. La salida sale del contenido tipado del sitio
 * (`content/`), nunca de textos duplicados.
 */
export type Locale = "es" | "en";

export const COMMAND_IDS = [
  "help",
  "about",
  "projects",
  "skills",
  "cv",
  "contact",
  "heap",
  "motion",
  "mixer",
  "theme",
  "debug",
  "clear",
] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

/** Una línea de salida: texto y, si procede, un enlace interno a una ruta del sitio. */
export interface OutputLine {
  text: string;
  /** Ruta interna sin locale (`/projects/slug`); la terminal la renderiza como enlace. */
  href?: string;
}

export interface CommandResult {
  lines: OutputLine[];
  /** El comando borra la salida acumulada. */
  clear?: boolean;
  /** Es un error (se muestra con otro estilo y se anuncia igual). */
  error?: boolean;
}

/** Efectos reales que los comandos disparan; los implementa la terminal con el store y la navegación. */
export interface CommandActions {
  /** Inicia la descarga del CV y devuelve el nombre del archivo. */
  downloadCv(): string;
  /** Alterna el tema y devuelve el tema resultante. */
  toggleTheme(): "dark" | "light";
  /** Alterna el modo Debug y devuelve su estado resultante. */
  toggleDebug(): boolean;
  /** Cierra la terminal y se desplaza a DISPLAY. */
  goToContact(): void;
  /** Cierra la terminal y navega a la vista Memory Heap (`/heap`). */
  goToHeap(): void;
  /** Cierra la terminal y navega a la vitrina de movimiento (`/motion`, change 08). */
  goToMotion(): void;
  /**
   * Cierra la terminal y abre el mezclador de capas (change 08b). Devuelve `false` y no abre nada si
   * el sonido está desactivado.
   */
  openMixer(): boolean;
}

export interface CommandContext {
  locale: Locale;
  content: Pick<RawContent, "profile" | "skills" | "projects">;
  actions: CommandActions;
}

export interface Command {
  id: CommandId;
  /** Descripción de una línea (la usan `help` y el panel de atajos). */
  description: Record<Locale, string>;
  run(ctx: CommandContext): CommandResult;
}

const CATEGORY_LABEL: Record<(typeof SKILL_CATEGORIES)[number], Record<Locale, string>> = {
  ai: { es: "IA y automatización", en: "AI & automation" },
  backend: { es: "Backend", en: "Backend" },
  frontend: { es: "Frontend", en: "Frontend" },
  "cloud-devops": { es: "Cloud/DevOps", en: "Cloud/DevOps" },
  data: { es: "Datos", en: "Data" },
  design: { es: "Diseño", en: "Design" },
  "soft-skills": { es: "Soft skills", en: "Soft skills" },
};

const TEXT = {
  noCaseStudy: { es: "sin caso de estudio", en: "no case study" },
  caseStudy: { es: "caso de estudio", en: "case study" },
  cvStarted: { es: "Descargando", en: "Downloading" },
  contactJump: { es: "Saltando a DISPLAY…", en: "Jumping to DISPLAY…" },
  heapJump: { es: "Abriendo el Memory Heap…", en: "Opening the Memory Heap…" },
  motionJump: { es: "Abriendo la vitrina de movimiento…", en: "Opening the motion showcase…" },
  mixerOpen: { es: "Abriendo el mezclador de capas…", en: "Opening the layer mixer…" },
  mixerOff: {
    es: "El sonido está desactivado. Actívalo con la tecla M o el botón de sonido y vuelve a escribir «mixer».",
    en: "Sound is off. Turn it on with the M key or the sound button and type “mixer” again.",
  },
  themeNow: { es: "tema activo", en: "active theme" },
  debugNow: { es: "modo debug", en: "debug mode" },
  dark: { es: "oscuro", en: "dark" },
  light: { es: "claro", en: "light" },
  on: { es: "activado", en: "on" },
  off: { es: "desactivado", en: "off" },
  commands: { es: "Comandos disponibles:", en: "Available commands:" },
  notFound: { es: "Escribe «help» para ver los comandos.", en: "Type “help” to list the commands." },
  didYouMean: { es: "¿Quisiste decir", en: "Did you mean" },
} satisfies Record<string, Record<Locale, string>>;

export const text = (key: keyof typeof TEXT, locale: Locale): string => TEXT[key][locale];

const pad = (value: string, width: number) => value.padEnd(width, " ");

export const COMMANDS: readonly Command[] = [
  {
    id: "help",
    description: { es: "Lista los comandos", en: "List the commands" },
    run: ({ locale }) => ({
      lines: [
        { text: text("commands", locale) },
        ...COMMAND_IDS.map((id) => {
          const command = COMMANDS.find((c) => c.id === id) as Command;
          return { text: `  ${pad(id, 9)} ${command.description[locale]}` };
        }),
      ],
    }),
  },
  {
    id: "about",
    description: { es: "Quién soy", en: "Who I am" },
    run: ({ locale, content }) => {
      const { name, role, valueProp, location, email, availability } = content.profile;
      return {
        lines: [
          { text: `${name} — ${role[locale]}` },
          { text: valueProp[locale] },
          { text: `${location[locale]} · ${availability.label[locale]}` },
          { text: email },
        ],
      };
    },
  },
  {
    id: "projects",
    description: { es: "Lista los proyectos", en: "List the projects" },
    run: ({ locale, content }) => ({
      lines: content.projects.map((p) => ({
        text: `PID ${p.pid} [${p.status}] ${p.name} — ${
          p.links.caseStudy ? text("caseStudy", locale) : text("noCaseStudy", locale)
        }`,
        ...(p.links.caseStudy ? { href: `/projects/${p.links.caseStudy}` } : {}),
      })),
    }),
  },
  {
    id: "skills",
    description: { es: "Habilidades por categoría", en: "Skills by category" },
    run: ({ locale, content }) => {
      const order = Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[];
      return {
        lines: order.flatMap((category) => {
          const names = content.skills.filter((s) => s.category === category).map((s) => s.name);
          return names.length === 0
            ? []
            : [{ text: `${pad(CATEGORY_LABEL[category][locale], 21)} ${names.join(" · ")}` }];
        }),
      };
    },
  },
  {
    id: "cv",
    description: { es: "Descarga el CV", en: "Download the CV" },
    run: ({ locale, actions }) => ({
      lines: [{ text: `${text("cvStarted", locale)} ${actions.downloadCv()}…` }],
    }),
  },
  {
    id: "contact",
    description: {
      es: "Datos de contacto y salto al formulario",
      en: "Contact details and jump to the form",
    },
    run: ({ locale, content, actions }) => {
      actions.goToContact();
      return {
        lines: [
          { text: content.profile.email },
          ...content.profile.socials.map((s) => ({ text: `${s.label}: ${s.url}` })),
          { text: text("contactJump", locale) },
        ],
      };
    },
  },
  {
    id: "heap",
    description: { es: "Abre la vista Memory Heap", en: "Open the Memory Heap view" },
    run: ({ locale, actions }) => {
      actions.goToHeap();
      return { lines: [{ text: text("heapJump", locale), href: "/heap" }] };
    },
  },
  {
    id: "motion",
    description: {
      es: "Abre la vitrina de movimiento (T1–T11)",
      en: "Open the motion showcase (T1–T11)",
    },
    run: ({ locale, actions }) => {
      actions.goToMotion();
      return { lines: [{ text: text("motionJump", locale), href: "/motion" }] };
    },
  },
  {
    id: "mixer",
    description: {
      es: "Abre el mezclador de capas de la música",
      en: "Open the music layer mixer",
    },
    run: ({ locale, actions }) =>
      actions.openMixer()
        ? { lines: [{ text: text("mixerOpen", locale) }] }
        : { lines: [{ text: text("mixerOff", locale) }] },
  },
  {
    id: "theme",
    description: { es: "Alterna tema oscuro/claro", en: "Toggle dark/light theme" },
    run: ({ locale, actions }) => ({
      lines: [{ text: `${text("themeNow", locale)}: ${text(actions.toggleTheme(), locale)}` }],
    }),
  },
  {
    id: "debug",
    description: { es: "Alterna el modo Debug", en: "Toggle Debug mode" },
    run: ({ locale, actions }) => ({
      lines: [
        { text: `${text("debugNow", locale)}: ${text(actions.toggleDebug() ? "on" : "off", locale)}` },
      ],
    }),
  },
  {
    id: "clear",
    description: { es: "Borra la salida", en: "Clear the output" },
    run: () => ({ lines: [], clear: true }),
  },
];

// ───────────────────────── Autocompletado y sugerencias ─────────────────────────

/** Distancia de edición de Levenshtein (inserciones, borrados y sustituciones). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] as number) + 1,
        (previous[j] as number) + 1,
        (previous[j - 1] as number) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] as number;
}

/** El comando más parecido a lo escrito (distancia ≤ 2), o `null`. */
export function suggestCommand(input: string): CommandId | null {
  const word = input.trim().toLowerCase();
  let best: { id: CommandId; distance: number } | null = null;
  for (const id of COMMAND_IDS) {
    const distance = levenshtein(word, id);
    if (distance <= 2 && (best === null || distance < best.distance)) best = { id, distance };
  }
  return best?.id ?? null;
}

export type Completion =
  | { kind: "none" }
  | { kind: "unique"; value: CommandId }
  | { kind: "ambiguous"; options: CommandId[] };

/** Autocompleta por prefijo: único → se completa; ambiguo → opciones en orden alfabético. */
export function completeCommand(prefix: string): Completion {
  const word = prefix.trim().toLowerCase();
  if (word === "") return { kind: "none" };
  const options = COMMAND_IDS.filter((id) => id.startsWith(word)).sort();
  if (options.length === 0) return { kind: "none" };
  if (options.length === 1) return { kind: "unique", value: options[0] as CommandId };
  return { kind: "ambiguous", options };
}

// ───────────────────────── Ejecución ─────────────────────────

export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const name = input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (name === "") return { lines: [] };
  const command = COMMANDS.find((c) => c.id === name);
  if (command) return command.run(ctx);

  const suggestion = suggestCommand(name);
  return {
    error: true,
    lines: [
      { text: `command not found: ${name}` },
      ...(suggestion ? [{ text: `${text("didYouMean", ctx.locale)} «${suggestion}»?` }] : []),
      { text: text("notFound", ctx.locale) },
    ],
  };
}

// ───────────────────────── Historial ─────────────────────────

/** Historial de comandos con navegación por flechas (arriba = más antiguo, abajo = más reciente). */
export function createHistory() {
  const entries: string[] = [];
  let cursor = 0; // entries.length = «fuera del historial» (línea nueva)

  return {
    push(command: string): void {
      const value = command.trim();
      if (value === "") return;
      if (entries[entries.length - 1] !== value) entries.push(value);
      cursor = entries.length;
    },
    /** Flecha arriba: el comando anterior (se queda en el más antiguo). */
    previous(): string | null {
      if (entries.length === 0) return null;
      cursor = Math.max(0, cursor - 1);
      return entries[cursor] ?? null;
    },
    /** Flecha abajo: el siguiente; al pasar el último devuelve `""` (línea vacía). */
    next(): string | null {
      if (entries.length === 0) return null;
      cursor = Math.min(entries.length, cursor + 1);
      return cursor === entries.length ? "" : (entries[cursor] ?? null);
    },
    entries: () => [...entries],
  };
}
