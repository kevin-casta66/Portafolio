/**
 * Valida el contenido (esquemas, referencias, habilidades huérfanas, casos de estudio…).
 * Uso: `pnpm content:check`. Se ejecuta automáticamente antes de `pnpm build`.
 */
try {
  const { content } = await import("../lib/content");
  const { skills, projects, experience, experiments, caseNav } = content;
  console.log(
    `Contenido válido: ${skills.length} habilidades, ${projects.length} proyectos ` +
      `(${caseNav.entries.length} con caso de estudio), ` +
      `${experience.length} experiencias, ${experiments.length} experimentos.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

export {};
