"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type CSSProperties } from "react";
import { Glass } from "@/components/ui/Glass";
import { usePathname } from "@/i18n/navigation";
import { jumpToSection } from "@/lib/navigation";
import { useAppStore } from "@/lib/store";
import { ACCENT_TOKEN, PHASES, type PhaseId } from "@/motion/phase";
import { AchievementsList, useAchievementCount } from "../Achievements/AchievementsList";
import { useMediaQuery } from "../useMediaQuery";

const LIST_ID = "achievements-list";

/** Color de acento de una fase como variable CSS de los tokens (DISPLAY reutiliza el de GPU). */
const accentOf = (phase: PhaseId) => `var(--accent-${ACCENT_TOKEN[phase]})`;
const frameStyle = (phase: PhaseId) => ({ "--frame-accent": accentOf(phase) }) as CSSProperties;

function AchievementsButton() {
  const t = useTranslations("Achievements");
  const { unlocked, total } = useAchievementCount();
  return (
    <>
      <button
        type="button"
        popoverTarget={LIST_ID}
        aria-label={t("counter", { unlocked, total })}
        data-callstack-counter
        className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-fg hover:border-accent"
      >
        <span aria-hidden="true">
          {unlocked}/{total}
        </span>
      </button>
      {/* Popover nativo: se cierra con Escape y devuelve el foco al contador; el botón de cierre queda a un Tab */}
      <Glass
        as="div"
        id={LIST_ID}
        popover="auto"
        strong
        className="callstack-popover max-w-sm rounded-lg p-4 text-fg"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-mono text-sm font-semibold">{t("listTitle")}</h2>
          <button
            type="button"
            popoverTarget={LIST_ID}
            popoverTargetAction="hide"
            aria-label={t("close")}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border font-mono text-sm hover:border-accent"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <AchievementsList />
      </Glass>
    </>
  );
}

/** Barra lateral de escritorio: pila de frames; la fase activa se ilumina con su acento. */
function SidePanel({ active }: { active: PhaseId }) {
  const t = useTranslations("CallStack");
  const activeIndex = PHASES.indexOf(active);

  return (
    <Glass
      as="div"
      refract
      data-callstack="side"
      className="callstack fixed left-1.5 top-1/2 z-[50] -translate-y-1/2 rounded-lg p-1.5 text-fg"
    >
      <nav aria-label={t("label")}>
        <ol className="flex flex-col gap-0.5">
          {PHASES.map((phase, index) => {
            const isActive = phase === active;
            return (
              <li key={phase}>
                <a
                  href={`#${phase}`}
                  aria-current={isActive ? "location" : undefined}
                  data-frame={phase}
                  data-active={isActive}
                  data-on-stack={index <= activeIndex}
                  style={frameStyle(phase)}
                  onClick={(event) => {
                    event.preventDefault();
                    jumpToSection(phase);
                  }}
                  className="callstack-frame flex items-center gap-2 rounded-md px-1.5 py-1 font-mono text-xs"
                >
                  <span aria-hidden="true" className="callstack-dot" />
                  <span className="callstack-name">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-fg-muted">
                        {"› "}
                      </span>
                    ) : null}
                    {phase}()<span className="sr-only"> — {t(`phases.${phase}`)}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mt-1 border-t border-border pt-1.5">
        <AchievementsButton />
      </div>
    </Glass>
  );
}

/** Barra inferior compacta (móvil/tablet): fase actual, progreso por transform y lista desplegable. */
function BottomBar({ active }: { active: PhaseId }) {
  const t = useTranslations("CallStack");
  const barRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDetailsElement>(null);

  // Progreso del recorrido: escritura directa de una variable CSS (sin renders de React por scroll).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--progress", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    document.documentElement.dataset.callstackBar = "on";
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      delete document.documentElement.dataset.callstackBar;
    };
  }, []);

  return (
    <Glass
      as="div"
      data-callstack="bottom"
      className="callstack-bar fixed inset-x-0 bottom-0 z-[50] border-x-0 border-b-0 text-fg"
    >
      <div
        ref={barRef}
        role="progressbar"
        aria-label={t("progress")}
        aria-valuemin={0}
        aria-valuemax={100}
        className="callstack-progress"
      />
      <details ref={listRef} className="callstack-details">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 pr-24 font-mono text-sm">
          <span>
            <span className="sr-only">{t("current")}: </span>
            <span style={{ color: accentOf(active) }}>{active}()</span>
          </span>
          <span aria-hidden="true" className="text-fg-muted">
            ▴
          </span>
        </summary>
        <nav aria-label={t("mobileLabel")} className="px-2 pb-2">
          <ol className="grid grid-cols-2 gap-1">
            {PHASES.map((phase) => (
              <li key={phase}>
                <a
                  href={`#${phase}`}
                  aria-current={phase === active ? "location" : undefined}
                  data-frame={phase}
                  data-active={phase === active}
                  style={frameStyle(phase)}
                  onClick={(event) => {
                    event.preventDefault();
                    if (listRef.current) listRef.current.open = false;
                    jumpToSection(phase);
                  }}
                  className="callstack-frame flex min-h-11 items-center gap-2 rounded-md px-2 font-mono text-sm"
                >
                  <span aria-hidden="true" className="callstack-dot" />
                  {phase}()<span className="sr-only"> — {t(`phases.${phase}`)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </details>
      <div className="absolute right-3 top-1.5">
        <AchievementsButton />
      </div>
    </Glass>
  );
}

/**
 * Call Stack (change 06): navegación global por fases como pila de llamadas. Solo existe en el home
 * (ahí están las secciones) y fuera de la Vista Rápida. En escritorio es una barra lateral compacta
 * que se expande al pasar el puntero o enfocarla; en móvil, una barra inferior con progreso.
 */
export default function CallStack() {
  const pathname = usePathname();
  const phase = useAppStore((s) => s.phase);
  const quick = useAppStore((s) => s.quickView);
  const bootDone = useAppStore((s) => s.bootDone);
  const desktop = useMediaQuery("(min-width: 1024px)");

  // Nada de pila mientras la puerta de arranque (z-index 60) cubre la página.
  if (pathname !== "/" || quick || !bootDone) return null;
  const active: PhaseId = phase === "boot" ? "source" : phase;
  return desktop ? <SidePanel active={active} /> : <BottomBar active={active} />;
}
