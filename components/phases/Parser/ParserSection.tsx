import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content } from "@/lib/content";
import { SKILL_CATEGORIES } from "@/lib/content/schema";
import { SkillTree, type TreeCategory } from "./SkillTree";

/**
 * PARSER — habilidades. Los datos del árbol salen del contenido: el conteo de proyectos de cada hoja
 * se deriva del stack de los proyectos (relación del change 01), nunca se escribe a mano.
 */
export async function ParserSection() {
  const t = await getTranslations("Parser");

  const categories: TreeCategory[] = SKILL_CATEGORIES.map((category) => ({
    id: category,
    skills: content.skills
      .filter((skill) => skill.category === category)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        years: skill.years,
        level: skill.level,
        projects: (content.projectsBySkill[skill.id] ?? []).map((p) => ({
          slug: p.slug,
          name: p.name,
        })),
      })),
  })).filter((category) => category.skills.length > 0);

  return (
    <section
      id="parser"
      data-phase="parser"
      aria-labelledby="parser-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="parser" phase="PARSER (AST)" title={t("title")} intro={t("intro")} />
        <div className="col-span-12">
          <SkillTree categories={categories} />
        </div>
      </div>
    </section>
  );
}
