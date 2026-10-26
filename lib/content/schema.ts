import { z } from "zod";

/** Texto visible en ambos idiomas: si falta uno, la validación falla indicando el campo. */
export const localizedSchema = z.object({
  es: z.string().min(1, "falta la versión en español"),
  en: z.string().min(1, "falta la versión en inglés"),
});
export type Localized = z.infer<typeof localizedSchema>;

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser kebab-case (a-z, 0-9, -)");
const urlSchema = z.string().regex(/^https?:\/\//, "debe empezar por http:// o https://");

export const SKILL_CATEGORIES = [
  "frontend",
  "backend",
  "cloud-devops",
  "data",
  "design",
  "soft-skills",
] as const;
/** Nivel cualitativo (no hay porcentajes): uso diario, producción o exploración. */
export const SKILL_LEVELS = ["daily", "production", "exploring"] as const;
export const PROJECT_STATUSES = ["running", "deployed", "open-source"] as const;
export const INSTRUCTIONS = [
  "PUSH",
  "CALL",
  "OPTIMIZE",
  "DEPLOY",
  "REFACTOR",
  "TEST",
  "MIGRATE",
  "LEAD",
] as const;
export const EXPERIMENT_KINDS = ["shader", "physics", "dataviz", "microinteraction"] as const;

export const skillSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: z.enum(SKILL_CATEGORIES),
  years: z.number().min(0),
  level: z.enum(SKILL_LEVELS),
});

export const projectSchema = z.object({
  slug: idSchema,
  name: z.string().min(1),
  pid: z.number().int().positive(),
  status: z.enum(PROJECT_STATUSES),
  year: z.number().int().min(2000),
  problem: localizedSchema,
  role: localizedSchema,
  /** Identificadores de habilidad: de aquí se derivan las relaciones habilidad↔proyecto. */
  stack: z.array(idSchema).min(1),
  metrics: z.array(z.object({ label: localizedSchema, value: z.string().min(1) })).min(1),
  media: z.object({
    image: z.string().min(1),
    alt: localizedSchema,
    video: z.string().optional(),
    poster: z.string().optional(),
  }),
  links: z.object({
    demo: urlSchema.optional(),
    code: urlSchema.optional(),
    /** Slug del caso: debe existir `content/cases/<slug>.<es|en>.mdx`. */
    caseStudy: idSchema.optional(),
  }),
  featured: z.boolean(),
});

export const achievementSchema = z.object({
  op: z.enum(INSTRUCTIONS),
  text: localizedSchema,
});

export const experienceSchema = z.object({
  id: idSchema,
  company: z.string().min(1),
  role: localizedSchema,
  start: z.string().regex(/^\d{4}-\d{2}$/, "formato AAAA-MM"),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "formato AAAA-MM")
    .nullable(),
  /** Nombre de la función compilada, p. ej. `fn acme_2023_2025()`. */
  fn: z.string().regex(/^fn [a-z0-9_]+\(\)$/, "formato `fn nombre_aaaa_aaaa()`"),
  stack: z.array(idSchema).min(1),
  achievements: z.array(achievementSchema).min(1),
});

export const experimentSchema = z.object({
  id: idSchema,
  name: localizedSchema,
  kind: z.enum(EXPERIMENT_KINDS),
  image: z.string().min(1),
  alt: localizedSchema,
  summary: localizedSchema,
  /** Fragmento clave que se muestra al girar la tarjeta. */
  code: z.string().min(1),
  stack: z.array(idSchema),
});

/** Token de la biografía: el texto visible y la frase extra que muestra su tooltip. */
const bioTokenSchema = z.object({ text: localizedSchema, note: localizedSchema });
const bioNumberSchema = z.object({
  label: localizedSchema,
  value: z.number(),
  suffix: z.string().optional(),
  note: localizedSchema,
});

export const profileSchema = z.object({
  name: z.string().min(1),
  role: localizedSchema,
  valueProp: localizedSchema,
  availability: z.object({ available: z.boolean(), label: localizedSchema }),
  location: localizedSchema,
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email inválido"),
  socials: z.array(z.object({ id: idSchema, label: z.string().min(1), url: urlSchema })),
  cv: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  /** Biografía como flujo de tokens (fase LEXER): una lista por categoría. */
  bio: z.object({
    keyword: z.array(bioTokenSchema).min(1).optional(),
    identifier: z.array(bioTokenSchema).min(1).optional(),
    string: z.array(bioTokenSchema).min(1).optional(),
    number: z.array(bioNumberSchema).min(1).optional(),
  }),
});

export type Skill = z.infer<typeof skillSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Experiment = z.infer<typeof experimentSchema>;
export type Profile = z.infer<typeof profileSchema>;

export type SkillInput = z.input<typeof skillSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type ExperienceInput = z.input<typeof experienceSchema>;
export type ExperimentInput = z.input<typeof experimentSchema>;
export type ProfileInput = z.input<typeof profileSchema>;

export interface RawContent {
  profile: ProfileInput;
  skills: SkillInput[];
  projects: ProjectInput[];
  experience: ExperienceInput[];
  experiments: ExperimentInput[];
}
