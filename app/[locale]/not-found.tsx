import { getTranslations } from "next-intl/server";
import { NotFoundMotion } from "@/components/phases/NotFound/NotFoundMotion";
import { Link } from "@/i18n/navigation";

/** 16 bytes por línea, determinista: misma salida en cada build y en cada petición. */
function memoryDump(lines = 14): string[] {
  let seed = 0xc0de;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  return Array.from({ length: lines }, (_, row) => {
    const address = (0x7ffe0000 + row * 16).toString(16).padStart(8, "0");
    const bytes = Array.from({ length: 16 }, () =>
      ((next() >> 8) & 0xff).toString(16).padStart(2, "0"),
    );
    return `0x${address}  ${bytes.join(" ")}`;
  });
}

/** 404 temática: «Segmentation fault» con volcado hexadecimal decorativo y salida al inicio. */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const dump = memoryDump();

  return (
    <section data-phase="gpu" aria-labelledby="not-found-title" className="grid-12 py-16 sm:py-24">
      <div className="col-span-12 lg:col-span-6">
        <p className="font-mono text-sm text-accent" aria-hidden="true">
          404
        </p>
        <h1
          id="not-found-title"
          data-msdf="title"
          className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl"
        >
          {t("title")}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-fg-muted">{t("body")}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center rounded-md bg-accent px-6 font-medium text-bg hover:opacity-90"
        >
          {t("restart")}
        </Link>
      </div>

      {/* Decorativo: oculto a tecnologías de asistencia y sin desbordar la página */}
      <pre
        aria-hidden="true"
        data-anim="memory-dump"
        className="col-span-12 mt-10 overflow-hidden rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-fg-muted lg:col-span-6 lg:mt-0"
      >
        {dump.join("\n")}
      </pre>
      <NotFoundMotion />
    </section>
  );
}
