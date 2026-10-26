import type { ZodType } from "zod";
import { buildCaseNav, type CaseNav } from "./cases";
import {
  experienceSchema,
  experimentSchema,
  profileSchema,
  projectSchema,
  skillSchema,
  type Experience,
  type Experiment,
  type Profile,
  type Project,
  type RawContent,
  type Skill,
} from "./schema";

export class ContentError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `Contenido inválido (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
    this.name = "ContentError";
  }
}

export interface Content {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  experience: Experience[];
  experiments: Experiment[];
  /** Relación derivada del stack de cada proyecto: nadie la mantiene a mano. */
  projectsBySkill: Record<string, Project[]>;
  /** Recorrido entre casos de estudio y `hasCaseStudy` por proyecto (derivados de `links.caseStudy`). */
  caseNav: CaseNav;
}

export interface ValidateOptions {
  /** Indica si existe `content/cases/<slug>.<locale>.mdx`. */
  caseExists: (slug: string, locale: "es" | "en") => boolean;
}

function parseAll<T>(schema: ZodType<T>, items: unknown[], label: string, problems: string[]): T[] {
  return items.flatMap((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) return [result.data];
    for (const issue of result.error.issues) {
      problems.push(`${label}[${index}].${issue.path.join(".")}: ${issue.message}`);
    }
    return [];
  });
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

/** Valida el contenido completo y deriva las relaciones. Lanza `ContentError` con todos los problemas. */
export function validateContent(raw: RawContent, { caseExists }: ValidateOptions): Content {
  const problems: string[] = [];

  const profileResult = profileSchema.safeParse(raw.profile);
  if (!profileResult.success) {
    for (const issue of profileResult.error.issues) {
      problems.push(`profile.${issue.path.join(".")}: ${issue.message}`);
    }
  }
  const skills = parseAll(skillSchema, raw.skills, "skills", problems);
  const projects = parseAll(projectSchema, raw.projects, "projects", problems);
  const experience = parseAll(experienceSchema, raw.experience, "experience", problems);
  const experiments = parseAll(experimentSchema, raw.experiments, "experiments", problems);

  const groups: [string, string[]][] = [
    ["skills", skills.map((s) => s.id)],
    ["projects", projects.map((p) => p.slug)],
    ["experience", experience.map((e) => e.id)],
    ["experiments", experiments.map((e) => e.id)],
  ];
  for (const [label, ids] of groups) {
    for (const id of duplicates(ids)) problems.push(`${label}: identificador duplicado «${id}»`);
  }

  const skillIds = new Set(skills.map((s) => s.id));
  const refs: [string, string[]][] = [
    ...projects.map((p): [string, string[]] => [`el proyecto «${p.slug}»`, p.stack]),
    ...experience.map((e): [string, string[]] => [`la experiencia «${e.id}»`, e.stack]),
    ...experiments.map((e): [string, string[]] => [`el experimento «${e.id}»`, e.stack]),
  ];
  for (const [owner, stack] of refs) {
    for (const ref of stack) {
      if (!skillIds.has(ref))
        problems.push(`${owner} referencia la habilidad inexistente «${ref}»`);
    }
  }

  for (const e of experience) {
    e.achievements.forEach((a, i) => {
      for (const locale of ["es", "en"] as const) {
        if (!/\d/.test(a.text[locale])) {
          problems.push(
            `experience «${e.id}» logro ${i + 1} (${locale}) sin cifra cuantificada: «${a.text[locale]}»`,
          );
        }
      }
    });
  }

  for (const p of projects) {
    const slug = p.links.caseStudy;
    if (slug === undefined) continue;
    for (const locale of ["es", "en"] as const) {
      if (!caseExists(slug, locale)) {
        problems.push(
          `el proyecto «${p.slug}» enlaza al caso inexistente content/cases/${slug}.${locale}.mdx`,
        );
      }
    }
  }

  const projectsBySkill: Record<string, Project[]> = Object.fromEntries(
    skills.map((s) => [s.id, []]),
  );
  for (const p of projects) {
    for (const ref of new Set(p.stack)) projectsBySkill[ref]?.push(p);
  }
  for (const s of skills) {
    if ((projectsBySkill[s.id] ?? []).length === 0) {
      problems.push(`habilidad huérfana «${s.id}»: ningún proyecto la usa en su stack`);
    }
  }

  if (!profileResult.success || problems.length > 0) throw new ContentError(problems);
  return {
    profile: profileResult.data,
    skills,
    projects,
    experience,
    experiments,
    projectsBySkill,
    caseNav: buildCaseNav(projects),
  };
}
