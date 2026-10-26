import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { rawContent } from "@/content";
import { CaseError, loadCase } from "@/lib/cases";
import { ContentError, validateContent, type Content } from "./validate";

export { ContentError, validateContent } from "./validate";
export type { Content } from "./validate";
export type { CaseNav, CaseNavEntry } from "./cases";
export type { Localized, Project, Skill, Experience, Experiment, Profile } from "./schema";

const casesDir = join(process.cwd(), "content", "cases");

/** Problemas de los archivos de caso (metadatos inválidos, casos sin proyecto). */
const caseProblems: string[] = [];

/**
 * Contenido validado. Se evalúa al importar: si hay errores, `next build` falla con un mensaje claro.
 * Los casos de estudio se validan por completo (metadatos, diagrama, breakpoints del cuerpo): un
 * frontmatter inválido rompe el build con el archivo y el campo.
 */
export const content: Content = (() => {
  const result = validateContent(rawContent, {
    caseExists: (slug, locale) => {
      try {
        return loadCase(slug, locale) !== null;
      } catch (error) {
        if (!(error instanceof CaseError)) throw error;
        caseProblems.push(error.message);
        return true;
      }
    },
  });

  // Casos que ningún proyecto enlaza: no se generarían rutas y es casi seguro un olvido.
  if (existsSync(casesDir)) {
    const linked = new Set(result.projects.map((p) => p.links.caseStudy));
    for (const file of readdirSync(casesDir)) {
      const match = /^(.+)\.(es|en)\.mdx$/.exec(file);
      if (match && !linked.has(match[1])) {
        caseProblems.push(`content/cases/${file} no está enlazado por ningún proyecto (links.caseStudy)`);
      }
    }
  }
  if (caseProblems.length > 0) throw new ContentError(caseProblems);
  return result;
})();

export const getSkillProjects = (skillId: string) => content.projectsBySkill[skillId] ?? [];
