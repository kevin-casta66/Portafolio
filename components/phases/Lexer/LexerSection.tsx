import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TokenTooltip } from "@/components/ui/TokenTooltip";
import { content, type Localized } from "@/lib/content";

type Lane = "keyword" | "identifier" | "string" | "number";
const LANES: Lane[] = ["keyword", "identifier", "string", "number"];

/**
 * LEXER — sobre mí. La biografía como tokens clasificados en carriles. Los carriles sin tokens se
 * omiten; los valores `number` van con su valor final y su etiqueta en el HTML del servidor.
 */
export async function LexerSection() {
  const locale = await getLocale();
  const t = await getTranslations("Lexer");
  const { bio } = content.profile;

  const lanes = LANES.map((lane) => {
    const tokens =
      lane === "number"
        ? (bio.number ?? []).map((n) => ({
            key: n.label.en,
            note: n.note,
            node: (
              <>
                <span
                  className="font-mono text-2xl font-semibold text-syntax-type"
                  data-value={n.value}
                >
                  {n.value.toLocaleString(locale)}
                  {n.suffix ?? ""}
                </span>{" "}
                <span className="text-fg-muted">{n.label[locale]}</span>
              </>
            ),
          }))
        : (bio[lane] ?? []).map((token: { text: Localized; note: Localized }) => ({
            key: token.text.en,
            note: token.note,
            node: (
              <span className={lane === "string" ? "text-syntax-string" : "text-fg"}>
                {lane === "string" ? `"${token.text[locale]}"` : token.text[locale]}
              </span>
            ),
          }));
    return { lane, tokens };
  }).filter((l) => l.tokens.length > 0);

  return (
    <section
      id="lexer"
      data-phase="lexer"
      aria-labelledby="lexer-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="lexer" phase="LEXER" title={t("title")} intro={t("intro")} />

        <p className="col-span-12 mb-6 font-mono text-xs text-fg-muted">{t("tooltipHelp")}</p>

        <div className="col-span-12 grid gap-8 md:grid-cols-2">
          {lanes.map(({ lane, tokens }) => (
            <div key={lane} data-lane={lane}>
              <h3 className="font-mono text-sm text-accent">
                {t(`lanes.${lane}`)}{" "}
                <span className="text-fg-muted">{`// ${t(`laneHints.${lane}`)}`}</span>
              </h3>
              <ul className="mt-3 flex flex-wrap gap-3">
                {tokens.map((token) => (
                  <li key={token.key}>
                    <TokenTooltip type={lane} note={token.note[locale]}>
                      {token.node}
                    </TokenTooltip>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
