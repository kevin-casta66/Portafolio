import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { content } from "@/lib/content";
import { ContactForm } from "./ContactForm";
import { CopyEmailButton } from "./CopyEmailButton";

/** DISPLAY — contacto. Formulario, email copiable, redes, CV y el cierre del programa. */
export async function DisplaySection() {
  const locale = await getLocale();
  const t = await getTranslations("Display");
  const { profile } = content;
  const cvHref = profile.cv[locale] ?? profile.cv.es;

  return (
    <section
      data-debug-name="DisplaySection"
      id="display"
      data-phase="display"
      aria-labelledby="display-title"
      className="scroll-mt-20 border-t border-border py-16 sm:py-24"
    >
      <div className="grid-12">
        <SectionHeader id="display" phase="DISPLAY" title={t("title")} intro={t("intro")} />

        {/* Gemelo del monitor: el canvas dibuja su marco alrededor del formulario (sin cubrirlo).
            mb-24 reserva el bisel + la peana (88 px, webgl/objects/monitor.ts) para que no tapen
            el contenido de debajo. */}
        <div data-twin="monitor" className="col-span-12 mb-24 lg:col-span-7">
          <ContactForm alternativeEmail={profile.email} />
        </div>

        <aside
          aria-labelledby="display-alt-title"
          className="col-span-12 mt-10 lg:col-span-5 lg:mt-0"
        >
          <h3 id="display-alt-title" className="font-display text-xl font-medium">
            {t("alt.heading")}
          </h3>
          <div className="mt-4">
            <CopyEmailButton email={profile.email} />
          </div>

          <h4 className="mt-8 font-mono text-sm text-fg-muted">{t("alt.social")}</h4>
          <ul className="mt-2 flex flex-wrap gap-3">
            {profile.socials.map((social) => (
              <li key={social.id}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-md border border-border px-4 hover:border-accent hover:text-accent"
                >
                  {social.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={cvHref}
                download
                className="inline-flex h-10 items-center rounded-md border border-border px-4 hover:border-accent hover:text-accent"
              >
                {t("alt.cv")}
              </a>
            </li>
          </ul>
        </aside>

        <p className="col-span-12 mt-16 font-mono text-lg text-accent">{`$ ${t("closing")}`}</p>
      </div>
    </section>
  );
}
