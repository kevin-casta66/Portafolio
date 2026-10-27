import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HeapExplorer } from "@/components/heap/HeapExplorer";
import { HeapScene } from "@/components/heap/HeapScene";
import { AchievementTrigger } from "@/components/systems/AchievementTrigger";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { buildHeapBlocks, resolveDestinations } from "@/lib/heap";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Heap" });
  const title = `${t("meta.title")} — ${content.profile.name}`;
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/heap`,
      languages: { es: "/es/heap", en: "/en/heap", "x-default": "/es/heap" },
    },
    openGraph: { title, description, type: "website", locale, url: `/${locale}/heap` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Memory Heap (change 07): todos los proyectos y experimentos como bloques de memoria. La lista de
 * bloques sale de `content/` y llega completa en el HTML (design D1); `HeapExplorer` añade la
 * cuadrícula 2D, el teclado y «Run GC» encima de los mismos datos.
 */
export default async function HeapPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Heap");

  const blocks = buildHeapBlocks(content.projects, content.experiments);
  const destinations = resolveDestinations(blocks, content.projects);
  const skillNames = Object.fromEntries(content.skills.map((s) => [s.id, s.name]));

  return (
    <section
      data-phase="runtime"
      data-heap-page
      aria-labelledby="heap-title"
      className="pb-20 pt-10 sm:pt-14"
    >
      <div className="grid-12 gap-y-6">
        <header className="col-span-12 rounded-lg border border-border bg-surface p-6 sm:p-10">
          <p className="font-mono text-sm text-accent">{t("kicker")}</p>
          <h1
            id="heap-title"
            tabIndex={-1}
            className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-tight outline-offset-8 sm:text-5xl"
          >
            {t("title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-fg-muted">{t("intro")}</p>
          <p data-heap-total className="mt-5 font-mono text-sm text-fg-muted">
            {t("total", { count: blocks.length })}
          </p>
          <p className="mt-5">
            <Link
              href={{ pathname: "/", hash: "runtime" }}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 font-mono text-sm text-fg-muted hover:border-accent hover:text-accent"
            >
              {t("back")}
            </Link>
          </p>
        </header>

        <HeapExplorer blocks={blocks} skillNames={skillNames} destinations={destinations} />
        {/* Escenario 3D (solo con la experiencia completa): el canvas persistente dibuja aquí la cuadrícula infinita. */}
        <HeapScene blocks={blocks} skillNames={skillNames} destinations={destinations} />
        {/* Logro heap_explorer (change 06): el store lo deduplica, solo avisa la primera vez. */}
        <AchievementTrigger id="heap_explorer" />
      </div>
    </section>
  );
}
