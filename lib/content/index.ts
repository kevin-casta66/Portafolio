import { existsSync } from "node:fs";
import { join } from "node:path";
import { rawContent } from "@/content";
import { validateContent, type Content } from "./validate";

export { ContentError, validateContent } from "./validate";
export type { Content } from "./validate";
export type { Localized, Project, Skill, Experience, Experiment, Profile } from "./schema";

const casesDir = join(process.cwd(), "content", "cases");

/** Contenido validado. Se evalúa al importar: si hay errores, `next build` falla con un mensaje claro. */
export const content: Content = validateContent(rawContent, {
  caseExists: (slug, locale) => existsSync(join(casesDir, `${slug}.${locale}.mdx`)),
});

export const getSkillProjects = (skillId: string) => content.projectsBySkill[skillId] ?? [];
