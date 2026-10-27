import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content } from "@/lib/content";
import { byRecency } from "@/lib/content/experience-order";

/** BYTECODE — experiencia. Cada etapa es una función; cada logro, una instrucción + texto humano. */
export async function BytecodeSection() {
  const locale = await getLocale();
  const t = await getTranslations("Bytecode");
  const skillName = new Map(content.skills.map((s) => [s.id, s.name]));
  const month = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
  const format = (value: string) => month.format(new Date(`${value}-01T00:00:00`));

  // Orden cronológico inverso: lo más reciente primero.
  const stages = byRecency(content.experience);

  return (
    <section
      data-debug-name="BytecodeSection"
      id="bytecode"
      data-phase="bytecode"
      aria-labelledby="bytecode-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="bytecode" phase="BYTECODE" title={t("title")} intro={t("intro")} />

        <ol className="col-span-12 flex flex-col gap-10">
          {stages.map((stage) => (
            <li
              key={stage.id}
              data-anim="function"
              data-stage-id={stage.id}
              className="rounded-lg border border-border bg-surface p-5 sm:p-8"
            >
              <h3 className="font-mono text-lg font-medium text-accent break-words sm:text-xl">
                {stage.fn}
              </h3>
              <p className="mt-1 text-fg">
                {stage.company} · {stage.role[locale]}
              </p>
              <p className="font-mono text-sm text-fg-muted">
                <time dateTime={stage.start}>{format(stage.start)}</time>
                {" – "}
                {stage.end ? <time dateTime={stage.end}>{format(stage.end)}</time> : t("present")}
              </p>

              <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div>
                  <h4 className="sr-only">{t("instructions")}</h4>
                  <ol className="flex flex-col gap-3">
                    {stage.achievements.map((achievement, i) => (
                      <li
                        key={i}
                        data-anim="instruction"
                        className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4"
                      >
                        <code className="w-24 shrink-0 font-mono text-sm font-semibold text-syntax-keyword">
                          {achievement.op}
                        </code>
                        <span>{achievement.text[locale]}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div
                  role="group"
                  aria-labelledby={`registers-${stage.id}`}
                  data-anim="registers"
                  className="rounded-md border border-border p-4"
                >
                  <h4 id={`registers-${stage.id}`} className="font-mono text-sm text-accent">
                    {t("registers")}
                  </h4>
                  <p className="font-mono text-xs text-fg-muted">{t("registersHint")}</p>
                  <ul className="mt-3 flex flex-wrap gap-2 md:flex-col md:gap-1">
                    {stage.stack.map((id, i) => (
                      <li key={id} className="font-mono text-sm">
                        <span className="text-fg-muted">{`r${i}`}</span> {skillName.get(id) ?? id}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
