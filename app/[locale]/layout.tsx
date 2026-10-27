import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { BootGateLoader } from "@/components/phases/Boot/BootGateLoader";
import { Header } from "@/components/systems/Header";
import { HoldLoader } from "@/components/systems/HoldLoader";
import { MotionLoader } from "@/components/systems/MotionLoader";
import { QuickViewSync } from "@/components/systems/QuickViewSync";
import { StoreHydrator } from "@/components/systems/StoreHydrator";
import { SystemsLoader } from "@/components/systems/SystemsLoader";
import { WebglLoader } from "@/components/systems/WebglLoader";
import { GlassFilters } from "@/components/ui/GlassFilters";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { motionScript } from "@/lib/motion-script";
import { themeScript } from "@/lib/theme-script";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Layout" });

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          {/* Primero: su efecto (hidratación del store y puente de eventos) debe ejecutarse antes que el de cualquier página */}
          <StoreHydrator />
          <div className="read-progress" aria-hidden="true" />
          <a href="#content" className="skip-link">
            {t("skipToContent")}
          </a>
          <BootGateLoader projectCount={content.projects.length} />
          <Header />
          <main id="content" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <footer className="border-t border-border py-8">
            <div className="grid-12">
              <p className="col-span-12 font-mono text-sm text-fg-muted">{t("footerNote")}</p>
            </div>
          </footer>
          <GlassFilters />
          <Suspense fallback={null}>
            <QuickViewSync />
          </Suspense>
          <SystemsLoader />
          <MotionLoader />
          <WebglLoader />
          <HoldLoader />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
