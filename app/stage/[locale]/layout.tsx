import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { MotionLoader } from "@/components/systems/MotionLoader";
import { StoreHydrator } from "@/components/systems/StoreHydrator";
import { WebglLoader } from "@/components/systems/WebglLoader";
import { routing } from "@/i18n/routing";
import { motionScript } from "@/lib/motion-script";
import { themeScript } from "@/lib/theme-script";
import "../../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Los escenarios son para el iframe de `/motion`: nunca se indexan. */
export const metadata: Metadata = { title: "Portafolio · escenario", robots: { index: false, follow: false } };

/**
 * Layout RAÍZ de los escenarios de `/motion` (change 08): lo mínimo para ejecutar una transición real,
 * es decir tema, i18n, reloj de movimiento y el canvas persistente. Sin cabecera, puerta de arranque,
 * terminal, cursor ni sonido: dentro de un iframe esos sistemas globales sobrarían y se pisarían con
 * los de la página que lo aloja.
 */
export default async function StageLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} data-stage="" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <StoreHydrator />
          <main id="content" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <MotionLoader />
          <WebglLoader />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
