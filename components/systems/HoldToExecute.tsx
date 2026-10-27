"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { audio } from "@/audio";
import { usePathname, useRouter } from "@/i18n/navigation";
import { announceProcessExecuted } from "@/lib/events";
import { prefersReducedMotion } from "@/motion/reduced";
import { SPRING_SETTLE_MS, springLinear } from "@/motion/spring";
import { cssEase, duration } from "@/motion/tokens";
import { useHold, type ActivateHow, type CancelReason, type HoldKind } from "@/motion/useHold";

const R = 24;
const SIZE = 56;
const FRAME_PAD = 6;

/**
 * Hold-to-Execute (T6): anillo de progreso «Ejecutando…» y región en vivo, para todas las tarjetas
 * `[data-hold]`. Se carga después del LCP (ver `HoldLoader`) y no tiene estado de React por frame: el
 * anillo es un SVG que se mueve y se anima por WAAPI (solo `opacity`, `transform` y el trazo).
 *
 *  - Ratón / táctil: anillo circular en el cursor. Teclado: marco alrededor de la tarjeta enfocada.
 *  - Soltar antes de tiempo revierte el trazo con el resorte de UI (rebote elástico).
 *  - Completo (800 ms): `process_executed` (solo el primero de la sesión) y transición completa.
 *  - Clic / Enter: versión corta. Movimiento reducido: sin anillo, fundido.
 */
export default function HoldToExecute() {
  const t = useTranslations("Hold");
  const router = useRouter();
  const pathname = usePathname();
  const [live, setLive] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const circle = useRef<SVGSVGElement>(null);
  const frame = useRef<SVGSVGElement>(null);
  const progress = useRef<SVGGeometryElement | null>(null);
  const running = useRef<Animation | null>(null);
  /** Temporizador que informa del progreso del anillo al audio (riser); sin estado de React. */
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopProgressReport = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
  };
  useEffect(() => stopProgressReport, []);

  // El código de la transición (GSAP, etc.) se precarga: el primer hold no espera a la red. Además se
  // engancha lo que no pasa por una tarjeta: «Volver a proyectos» y el botón «atrás» del navegador.
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    if (!prefersReducedMotion()) void import("@/motion/t6"); // el código de la superficie, listo de antemano
    void import("@/motion/pageTransition").then((m) => {
      if (!cancelled) off = m.installPageHooks(router);
    });
    return () => {
      cancelled = true;
      off?.();
    };
    // El router de next-intl es estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada cambio de ruta resuelve la espera de la página destino de la transición en curso.
  useEffect(() => {
    void import("@/motion/pageTransition").then((m) => m.syncRoute(pathname));
  }, [pathname]);

  const announce = (message: string) => {
    setLive("");
    queueMicrotask(() => setLive(message));
  };

  const hide = (immediately: boolean) => {
    const el = root.current;
    if (!el) return;
    if (immediately) running.current?.cancel();
    running.current = null;
    if (immediately) {
      // Las animaciones con `fill: forwards` mandan sobre el estilo: se cancelan antes de ocultar.
      el.getAnimations().forEach((a) => a.cancel());
      el.style.opacity = "0";
      return;
    }
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: duration.micro,
      easing: cssEase.inExpo,
      fill: "forwards",
    });
  };

  const open = async (card: HTMLElement, intensity: "full" | "short" | "fade") => {
    const slug = card.dataset.hold ?? "";
    if (!slug) return;
    const { startCaseTransition } = await import("@/motion/pageTransition");
    startCaseTransition({
      card,
      slug,
      title: card.dataset.holdTitle ?? "",
      intensity,
      attachingLabel: t("attaching"),
      navigate: () => router.push(`/projects/${slug}`),
    });
  };

  useHold({
    onStart(card, at, kind: HoldKind) {
      const el = root.current;
      const circ = circle.current;
      const fr = frame.current;
      if (!el || !circ || !fr) return;
      const useFrame = kind === "keyboard";
      circ.style.display = useFrame ? "none" : "block";
      fr.style.display = useFrame ? "block" : "none";
      if (useFrame) {
        const r = card.getBoundingClientRect();
        fr.setAttribute("width", String(r.width + FRAME_PAD * 2));
        fr.setAttribute("height", String(r.height + FRAME_PAD * 2));
        const rect = fr.querySelector("rect.hold-progress");
        const track = fr.querySelector("rect.hold-track");
        for (const node of [rect, track]) {
          node?.setAttribute("width", String(r.width + FRAME_PAD));
          node?.setAttribute("height", String(r.height + FRAME_PAD));
        }
        el.style.transform = `translate(${r.left - FRAME_PAD}px, ${r.top - FRAME_PAD}px)`;
        progress.current = rect as SVGGeometryElement | null;
      } else {
        el.style.transform = `translate(${at.x - SIZE / 2}px, ${at.y - SIZE / 2}px)`;
        progress.current = circ.querySelector("circle.hold-progress");
      }
      const label = el.querySelector<HTMLElement>("[data-hold-label]");
      if (label) {
        label.style.transform = useFrame ? "translate(0, -140%)" : `translate(-${SIZE / 2 - 8}px, ${SIZE + 6}px)`;
      }
      running.current?.cancel();
      el.getAnimations().forEach((a) => a.cancel());
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: duration.micro,
        easing: cssEase.inExpo,
        fill: "forwards",
      });
      running.current =
        progress.current?.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], {
          duration: duration.hold,
          easing: "linear",
          fill: "forwards",
        }) ?? null;
      announce(t("executing"));
      // Riser del audio: arranca con el anillo y recibe su progreso real cada ~100 ms.
      audio.emit("hold:start");
      stopProgressReport();
      progressTimer.current = setInterval(() => {
        const current = Number(running.current?.currentTime ?? 0);
        audio.emit("hold:progress", { progress: Math.min(1, current / duration.hold) });
      }, 100);
    },

    onCancel(_card, reason: CancelReason) {
      stopProgressReport();
      audio.emit("hold:cancel"); // el riser cae y se desvanece (también tras un clic corto)
      const anim = running.current;
      if (reason === "click" || !anim || !progress.current) {
        hide(true);
        return;
      }
      // Revierte el trazo con el resorte de UI desde donde estaba (rebote elástico).
      const done = Math.min(1, Number(anim.currentTime ?? 0) / duration.hold);
      anim.cancel();
      const back = progress.current.animate(
        [{ strokeDashoffset: 100 * (1 - done) }, { strokeDashoffset: 100 }],
        { duration: SPRING_SETTLE_MS, easing: springLinear(), fill: "forwards" },
      );
      running.current = back;
      void back.finished.then(() => hide(true)).catch(() => {});
      announce(t("cancelled"));
    },

    onComplete(card) {
      stopProgressReport();
      audio.emit("hold:progress", { progress: 1 });
      audio.emit("hold:complete"); // impacto + acorde resuelto, cuantizados al siguiente tiempo
      hide(false);
      announceProcessExecuted();
      announce(t("opening", { name: card.dataset.holdTitle ?? "" }));
      void open(card, "full");
    },

    onActivate(card, how: ActivateHow) {
      announce(t("opening", { name: card.dataset.holdTitle ?? "" }));
      void open(card, how === "reduced" || prefersReducedMotion() ? "fade" : "short");
    },
  });

  return (
    <>
      <div
        ref={root}
        aria-hidden="true"
        data-hold-ring
        className="pointer-events-none fixed left-0 top-0 z-[75] opacity-0"
      >
        <svg ref={circle} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={4} className="stroke-border" />
          <circle
            className="hold-progress stroke-accent"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <svg ref={frame} style={{ display: "none" }} className="block overflow-visible" width={0} height={0}>
          <rect
            className="hold-track stroke-border"
            x={FRAME_PAD / 2}
            y={FRAME_PAD / 2}
            rx={14}
            fill="none"
            strokeWidth={3}
          />
          <rect
            className="hold-progress stroke-accent"
            x={FRAME_PAD / 2}
            y={FRAME_PAD / 2}
            rx={14}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
          />
        </svg>
        <span
          data-hold-label
          className="absolute left-0 top-0 whitespace-nowrap rounded-md border border-accent bg-surface px-2 py-1 font-mono text-xs text-accent"
        >
          {t("executing")}
        </span>
      </div>
      <div role="status" aria-live="polite" data-hold-live className="sr-only">
        {live}
      </div>
    </>
  );
}
