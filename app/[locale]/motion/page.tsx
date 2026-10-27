import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EasingCurve } from "@/components/showcase/EasingCurve";
import { TransitionCard, type TransitionCardData } from "@/components/showcase/TransitionCard";
import { motionCatalog } from "@/content/motion";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { DEMO_USES_3D, posterSrc } from "@/motion/showcase";
import { duration, easing, spring, stagger, staggerRange, toCssBezier, type CubicBezier } from "@/motion/tokens";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Motion" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/motion`,
      languages: { es: "/es/motion", en: "/en/motion", "x-default": "/es/motion" },
    },
    openGraph: { title, description, type: "website", locale, url: `/${locale}/motion` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const EASING_NAMES: Record<keyof typeof easing, string> = {
  inExpo: "--ease-in-expo",
  scene: "--ease-scene",
};

/**
 * Vitrina de movimiento (change 08): los tokens de movimiento dibujados desde su fuente única y el
 * catálogo T1–T11, una tarjeta por transición. Todo el texto y un fotograma estático por transición
 * llegan en el HTML (sin JavaScript); `TransitionCard` añade Replay, velocidad e internos encima.
 */
export default async function MotionPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Motion");
  const tt = await getTranslations({ locale, namespace: "Motion.tokens" });

  const cards: TransitionCardData[] = motionCatalog.map((entry) => ({
    id: entry.id,
    name: entry.name[locale],
    trigger: entry.trigger[locale],
    technique: entry.technique[locale],
    reducedMotion: entry.reducedMotion[locale],
    lowTier: entry.lowTier[locale],
    note: entry.note[locale],
    internals: entry.internals[locale],
    durations: entry.durationTokens.map((token) => ({ token, ms: duration[token] })),
    easings: entry.easingTokens.map((token) => (token === "spring" ? "spring-ui" : EASING_NAMES[token])),
    uses3d: DEMO_USES_3D[entry.id],
    poster: posterSrc(entry.id),
  }));

  const curveLabels = (name: string, values: string) => ({
    curve: tt("easing.curveLabel", { name, values }),
    hint: tt("easing.previewHint"),
    reduced: tt("easing.previewReduced"),
    values: tt("easing.values"),
  });

  return (
    <section data-phase="gpu" data-motion-page aria-labelledby="motion-title" className="pb-24 pt-10 sm:pt-14">
      <div className="grid-12 gap-y-10">
        <header className="col-span-12 rounded-lg border border-border bg-surface p-6 sm:p-10">
          <p className="font-mono text-sm text-accent">{t("kicker")}</p>
          <h1
            id="motion-title"
            tabIndex={-1}
            className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-tight outline-offset-8 sm:text-5xl"
          >
            {t("title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-fg-muted">{t("intro")}</p>
          <p className="mt-5">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-md border border-border px-4 font-mono text-sm text-fg-muted hover:border-accent hover:text-accent"
            >
              {content.profile.name}
            </Link>
          </p>
        </header>

        <section aria-labelledby="motion-tokens-title" className="col-span-12">
          <h2 id="motion-tokens-title" className="font-display text-2xl font-semibold">
            {tt("heading")}
          </h2>
          <p className="mt-2 max-w-3xl text-fg-muted">{tt("intro")}</p>

          <h3 className="mt-8 font-display text-lg font-medium">{tt("easing.heading")}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(Object.keys(easing) as (keyof typeof easing)[]).map((key) => (
              <EasingCurve
                key={key}
                name={EASING_NAMES[key]}
                description={tt(`easing.${key}`)}
                bezier={easing[key] as CubicBezier}
                labels={curveLabels(EASING_NAMES[key], toCssBezier(easing[key]))}
              />
            ))}
            <EasingCurve
              name="spring-ui"
              description={tt("easing.spring")}
              bezier={null}
              labels={curveLabels("spring-ui", `stiffness ${spring.stiffness}, damping ${spring.damping}`)}
            />
          </div>

          <h3 className="mt-10 font-display text-lg font-medium">{tt("durations.heading")}</h3>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{tt("durations.heading")}</caption>
              <thead className="bg-surface-elevated font-mono text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-normal">
                    {tt("durations.token")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-normal">
                    {tt("durations.value")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-normal">
                    {tt("durations.use")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(duration) as (keyof typeof duration)[]).map((key) => (
                  <tr key={key} className="border-t border-border">
                    <th scope="row" className="px-4 py-2 font-mono font-normal text-accent">
                      {key}
                    </th>
                    <td className="px-4 py-2 font-mono">{duration[key]} ms</td>
                    <td className="px-4 py-2 text-fg-muted">{tt(`durations.uses.${key}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 font-display text-lg font-medium">{tt("stagger.heading")}</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["char", "item"] as const).map((key) => (
              <li key={key} className="rounded-lg border border-border bg-surface p-4">
                <p className="font-mono text-2xl text-accent">{stagger[key]} ms</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {tt(`stagger.${key}`, { min: staggerRange[key].min, max: staggerRange[key].max })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="motion-catalog-title" className="col-span-12">
          <h2 id="motion-catalog-title" className="font-display text-2xl font-semibold">
            {t("catalog.heading")}
          </h2>
          <p className="mt-2 max-w-3xl text-fg-muted">{t("catalog.intro")}</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {cards.map((card) => (
              <TransitionCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
