import { getLocale, getTranslations } from "next-intl/server";
import { MagneticLink } from "@/components/ui/Magnetic";
import { content } from "@/lib/content";
import { PhaseIllustration } from "@/components/phases/PhaseIllustration";

/**
 * SOURCE — hero. Todo el contenido esencial sale en el HTML del servidor. La línea de código es
 * texto real (los números de línea son decorativos y no se copian con la selección).
 */
export async function SourceSection() {
  const locale = await getLocale();
  const t = await getTranslations("Hero");
  const { profile } = content;
  const cvHref = profile.cv[locale] ?? profile.cv.es;
  const available = profile.availability.available;

  return (
    <section
      data-debug-name="SourceSection"
      id="source"
      data-phase="source"
      aria-labelledby="source-title"
      className="scroll-mt-20 py-10 sm:py-16 lg:py-24"
    >
      <div className="grid-12 items-center gap-y-10">
        <div className="col-span-12 lg:col-span-7">
          <p
            data-anim="availability"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-sm text-fg"
          >
            <span
              aria-hidden="true"
              className={
                available
                  ? "size-2 rounded-full bg-syntax-string"
                  : "size-2 rounded-full bg-fg-muted"
              }
            />
            {available ? profile.availability.label[locale] : t("unavailable")}
          </p>

          <h1
            id="source-title"
            tabIndex={-1}
            data-msdf="title"
            data-anim="name"
            className="mt-5 font-display text-display font-semibold leading-none"
          >
            {profile.name}
          </h1>
          <p data-anim="role" className="mt-4 text-xl text-fg sm:text-2xl">
            {profile.role[locale]}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <MagneticLink
              href="#runtime"
              data-anim="cta"
              surfaceClassName="rounded-md bg-accent group-hover:opacity-90"
              className="inline-flex h-12 items-center px-6 font-medium text-bg"
            >
              {t("ctaProjects")}
            </MagneticLink>
            <MagneticLink
              href={cvHref}
              download
              data-anim="cta"
              surfaceClassName="rounded-md border border-accent group-hover:bg-phase-tint"
              className="inline-flex h-12 items-center px-6 font-medium text-accent"
            >
              {t("ctaCv")}
            </MagneticLink>
          </div>

          <p data-anim="value-prop" className="mt-6 max-w-prose text-lg text-fg-muted">
            {profile.valueProp[locale]}
          </p>
        </div>

        <figure
          aria-label={t("codeLabel")}
          data-anim="editor"
          className="col-span-12 overflow-hidden rounded-lg border border-border bg-surface lg:col-span-5"
        >
          <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-fg-muted">
            {t("editorFile")}
          </figcaption>
          <ol className="code-lines py-3 font-mono text-sm">
            <li>
              <code className="text-syntax-punct">{"// SOURCE"}</code>
            </li>
            <li>
              <code data-anim="code-line" className="break-words">
                <span data-token="keyword" className="text-syntax-keyword">
                  const
                </span>{" "}
                <span data-token="identifier">dev</span>{" "}
                <span data-token="operator" className="text-syntax-punct">
                  =
                </span>{" "}
                <span data-token="keyword" className="text-syntax-keyword">
                  new
                </span>{" "}
                <span data-token="type" className="text-syntax-type">
                  Developer
                </span>
                <span data-token="punct" className="text-syntax-punct">
                  (
                </span>
                <span data-token="string" className="text-syntax-string">
                  {`"${profile.name}"`}
                </span>
                <span data-token="punct" className="text-syntax-punct">
                  )
                </span>
              </code>
            </li>
          </ol>
        </figure>
        <PhaseIllustration phase="source" className="col-span-12 mx-auto max-w-3xl" />
      </div>
    </section>
  );
}
