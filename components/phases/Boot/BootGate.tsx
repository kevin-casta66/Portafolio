"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { audio } from "@/audio";
import { usePathname } from "@/i18n/navigation";
import { armAudioUnlockOnFirstGesture, audioUnlock } from "@/lib/audio";
import { appStore } from "@/lib/store";
import { BOOT_SHORT_MS } from "@/motion/boot";
import { BOOTED_KEY } from "@/motion/config";
import { prefersReducedMotion } from "@/motion/reduced";
import { SPRING_SETTLE_MS, springLinear } from "@/motion/spring";
import { cssEase, duration, stagger } from "@/motion/tokens";
import { createBootController, type BootController } from "./boot-controller";
import { applyGateChoice } from "./gate-choice";

const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"]);
/** Grosor del «punto» del CRT. */
const LINE_SCALE = 0.006;

const readBooted = (): boolean => {
  try {
    return window.sessionStorage.getItem(BOOTED_KEY) === "1";
  } catch {
    return false; // sin almacenamiento de sesión: siempre la secuencia completa
  }
};
const markBooted = () => {
  try {
    window.sessionStorage.setItem(BOOTED_KEY, "1");
  } catch {
    /* la elección solo vale para la página actual */
  }
};

/** Resuelve cuando todas las imágenes críticas de las secciones (proyectos y laboratorio) cargaron. */
function preloadCriticalMedia(): Promise<unknown> {
  const sources = new Set<string>();
  document.querySelectorAll<HTMLImageElement>("#runtime img, #gpu img").forEach((img) => {
    if (img.currentSrc || img.src) sources.add(img.currentSrc || img.src);
  });
  return Promise.all(
    [...sources].map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = image.onerror = () => resolve();
          image.src = src;
        }),
    ),
  );
}

/** Posición del cursor de texto del hero: el INICIO de la línea de código, donde empieza el tecleo. */
function heroCaretPoint(): { x: number; y: number } | null {
  const line = document.querySelector("[data-anim='code-line']");
  if (!line) return null;
  const rect = line.getBoundingClientRect();
  return { x: rect.left, y: rect.top + rect.height / 2 };
}

/**
 * T1 · Puerta de arranque. Capa visual superpuesta al contenido SSR (que nunca se oculta ni se retrasa):
 * logs POST con progreso real, letras del nombre escalonadas con resorte, elección con/sin sonido,
 * «Saltar ⏎» desde el primer frame y salida tipo CRT (línea → punto) hacia el cursor del hero.
 * No es modal: el skip link, la Vista Rápida y el CV quedan por encima y operables, y hacer scroll,
 * pulsar Escape o activar cualquiera de ellos la cierra en silencio.
 */
export function BootGate({ projectCount, demo = false }: { projectCount: number; demo?: boolean }) {
  const t = useTranslations("Boot");
  // Las letras salen del nombre traducido: cualquier longitud funciona (Portafolio = 10, Portfolio = 9).
  const letters = Array.from(t("brand").toUpperCase());
  const pathname = usePathname();
  const [controller] = useState<BootController>(() =>
    createBootController({
      // La elección se registra en la puerta y en las preferencias, y habilita (o no) el motor de audio.
      onChoice: (choice) =>
        applyGateChoice(choice, {
          setGateChoice: appStore.getState().setGateChoice,
          emit: (event) => audio.emit(event),
        }),
      // En la demo de /motion (change 08) la puerta no marca la sesión como «ya arrancada».
      onBooted: demo ? () => {} : markBooted,
      onDone: () => {
        appStore.getState().setBootDone(true);
        // Fin del arranque: la firma sonora completa (una sola vez; sin motor se descarta).
        audio.emit("boot:done");
        document.documentElement.classList.remove("boot-pending");
        const gate = document.querySelector("[data-boot-gate]");
        if (gate?.contains(document.activeElement) || document.activeElement === document.body) {
          document.getElementById("content")?.focus({ preventScroll: true });
        }
      },
    }),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );

  // Cada línea `[ OK ]` que se completa dispara una nota ascendente (en orden, una sola vez por línea).
  const announcedLines = useRef(0);
  useEffect(() => {
    if (snapshot.mode !== "full") return;
    const done = snapshot.lines.filter((line) => line.done).length;
    while (announcedLines.current < done) audio.emit("boot:line", { index: announcedLines.current++ });
  }, [snapshot.mode, snapshot.lines]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);

  // Arranque: decide el modo y registra los recursos reales.
  useEffect(() => {
    const visited = demo ? false : readBooted();
    const search = window.location.search;
    const hash = window.location.hash;
    const home = pathname === "/" || demo;
    if (home && !visited && !/[?&]view=quick(&|$)/.test(search) && (!hash || hash === "#content")) {
      controller.registry.track("skills", Promise.resolve());
      controller.registry.track("projects", preloadCriticalMedia(), projectCount);
      controller.registry.track("fonts", document.fonts.ready);
      // Detección de GPU real (change 04): máx. 1,5 s; si no responde se aplica el tier medio.
      controller.registry.track(
        "gpu",
        import("@/webgl/detect").then(async (m) => {
          const detection = await m.detectTier();
          return m.TIER_NUMBER[detection.tier];
        }),
      );
    }
    const mode = controller.start({ pathname: demo ? "/" : pathname, search, hash, visitedThisSession: visited });
    if (mode === "off") {
      appStore.getState().setBootDone(true);
      document.documentElement.classList.remove("boot-pending");
    } else {
      // La puerta (z-index igual) toma el relevo de la cortina CSS.
      document.documentElement.classList.remove("boot-pending");
      if (mode === "short") {
        const stored = appStore.getState().sound.gateChoice;
        if (stored === "sound") armAudioUnlockOnFirstGesture();
      }
    }
    return () => controller.destroy();
    // Solo al montar: la puerta se decide en la carga inicial, no en cada navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Letras del nombre: entran una a una con resorte (sin resorte y con fundido si hay movimiento reducido).
  useEffect(() => {
    if (snapshot.mode !== "full" || !lettersRef.current) return;
    const letters = Array.from(lettersRef.current.children) as HTMLElement[];
    const reduced = prefersReducedMotion();
    const animations = letters.map((letter, index) =>
      letter.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(1.2em) scale(0.7)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: reduced ? duration.ui : SPRING_SETTLE_MS,
          delay: index * stagger.char,
          easing: reduced ? cssEase.inExpo : springLinear(),
          fill: "both",
        },
      ),
    );
    let cancelled = false;
    void Promise.all(animations.map((a) => a.finished)).then(() => {
      if (!cancelled) controller.lettersFinished();
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot.mode, controller]);

  // Cierre sin elección: scroll, teclas de scroll, Escape, Enter o cualquier acceso superior.
  const active = snapshot.stage === "logs" || snapshot.stage === "choose";
  useEffect(() => {
    if (!active) return;
    const skip = () => controller.skip();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || SCROLL_KEYS.has(event.key)) return skip();
      if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        if (target === document.body || target?.closest("[data-boot-gate]")) skip();
      }
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("header, .skip-link")) skip();
    };
    const onScroll = () => {
      if (window.scrollY > 0) skip();
    };
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, controller]);

  // Salida: colapso CRT (línea → punto) → el punto viaja al cursor del hero. Con movimiento reducido, fundido.
  useEffect(() => {
    if (snapshot.stage !== "exit") return;
    const overlay = overlayRef.current;
    if (!overlay) {
      controller.exitFinished();
      return;
    }
    const short = snapshot.mode === "short";
    const reduced = prefersReducedMotion();
    let cancelled = false;
    const finish = () => {
      if (!cancelled) controller.exitFinished();
    };
    const opts = (ms: number, easing: string = cssEase.scene): KeyframeAnimationOptions => ({
      duration: ms,
      easing,
      fill: "forwards",
    });

    const run = async () => {
      if (reduced) {
        await overlay.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          opts(short ? BOOT_SHORT_MS : duration.ui, cssEase.inExpo),
        ).finished;
        return;
      }
      const step = short ? BOOT_SHORT_MS / 3 : duration.ui;
      contentRef.current
        ?.animate([{ opacity: 1 }, { opacity: 0 }], opts(short ? step : duration.micro))
        .finished.catch(() => {});
      // 1) colapso vertical a una línea horizontal; 2) colapso horizontal a un punto.
      await overlay.animate(
        [{ transform: "scaleY(1)" }, { transform: `scaleY(${LINE_SCALE})` }],
        opts(step),
      ).finished;
      await overlay.animate(
        [
          { transform: `scaleY(${LINE_SCALE}) scaleX(1)` },
          { transform: `scaleY(${LINE_SCALE}) scaleX(${LINE_SCALE})` },
        ],
        opts(step),
      ).finished;
      if (short) return;
      // 3) el punto se convierte en el cursor de texto del hero.
      const dot = dotRef.current;
      const target = heroCaretPoint();
      if (dot && target) {
        overlay.style.opacity = "0";
        dot.style.opacity = "1";
        const fromX = window.innerWidth / 2;
        const fromY = window.innerHeight / 2;
        const toX = target.x;
        const toY = target.y;
        await dot.animate(
          [
            { transform: "translate(0, 0)" },
            { transform: `translate(${toX - fromX}px, ${toY - fromY}px)` },
          ],
          opts(duration.ui, cssEase.inExpo),
        ).finished;
        await dot.animate([{ opacity: 1 }, { opacity: 0 }], opts(duration.micro)).finished;
      }
    };
    run().then(finish, finish);
    return () => {
      cancelled = true;
    };
  }, [snapshot.stage, snapshot.mode, controller]);

  if (snapshot.mode === "off" || snapshot.stage === "idle" || snapshot.stage === "done")
    return null;

  // La versión corta (visitas posteriores) nunca muestra opciones: aplica la elección guardada.
  const showChoices =
    snapshot.mode === "full" && (snapshot.stage === "choose" || snapshot.stage === "exit");
  const percent = Math.round(snapshot.progress * 100);

  return (
    <>
      <div
        ref={overlayRef}
        data-boot-gate
        data-stage={snapshot.stage}
        className="boot-gate fixed inset-0 z-[60] flex items-center justify-center bg-bg font-mono text-fg max-sm:pt-40"
      >
        <div
          ref={contentRef}
          className="relative flex w-full max-w-2xl flex-col gap-6 px-[var(--page-margin)]"
        >
          <button
            type="button"
            onClick={() => controller.skip()}
            className="self-end inline-flex h-11 items-center rounded-md border border-border px-4 text-sm text-fg-muted hover:border-accent hover:text-fg"
          >
            {t("skip")}
          </button>

          {/*
            La palabra se anuncia una sola vez: las letras animadas son decorativas. El número de letras
            depende del idioma (Portafolio / Portfolio), así que el tamaño de la tipografía se ajusta al
            ancho disponible (`.boot-brand`, unidades de contenedor) y la animación recorre las que haya.
          */}
          <div className="boot-brand">
            <p
              className="font-display font-semibold tracking-[0.2em]"
              style={{ "--letters": letters.length } as CSSProperties}
            >
              <span className="sr-only">{t("brand")}</span>
              <span ref={lettersRef} data-boot-letters aria-hidden="true" className="inline-flex">
                {letters.map((letter, index) => (
                  <span key={index} style={{ opacity: 0 }} className="inline-block">
                    {letter}
                  </span>
                ))}
              </span>
            </p>
          </div>

          <ul
            role="status"
            aria-live="off"
            aria-label={t("region")}
            className="flex min-h-24 flex-col gap-1 text-sm"
          >
            {snapshot.lines.map((line) => (
              <li
                key={line.id}
                data-boot-line
                data-done={line.done}
                className={line.done ? "text-fg" : "text-fg-muted"}
              >
                <span className={line.done ? "text-syntax-string" : "text-fg-muted"}>
                  {line.done ? t("ok") : t("wait")}
                </span>{" "}
                {t(`lines.${line.id as "skills"}`, {
                  count: line.value ?? 0,
                  value: line.value ?? "",
                })}
              </li>
            ))}
          </ul>

          <div
            aria-hidden="true"
            className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated"
          >
            <div
              className="h-full origin-left bg-accent"
              style={{ transform: `scaleX(${snapshot.progress})` }}
              data-percent={percent}
            />
          </div>

          <div className="flex min-h-12 flex-wrap gap-3">
            {showChoices ? (
              <>
                <button
                  type="button"
                  data-boot-choice="sound"
                  onClick={() => {
                    // El gesto del usuario desbloquea el audio en este mismo manejador.
                    void audioUnlock();
                    controller.choose("sound");
                  }}
                  className="inline-flex h-12 items-center rounded-md bg-accent px-6 font-medium text-bg hover:opacity-90"
                >
                  {t("withSound")}
                </button>
                <button
                  type="button"
                  data-boot-choice="silent"
                  onClick={() => controller.choose("silent")}
                  className="inline-flex h-12 items-center rounded-md border border-accent px-6 font-medium text-accent hover:bg-phase-tint"
                >
                  {t("silent")}
                </button>
              </>
            ) : null}
          </div>

          {/* Resumen único para lectores de pantalla (los logs no se anuncian línea a línea). */}
          <p role="status" aria-live="polite" className="sr-only">
            {snapshot.stage === "choose" ? t("summary") : ""}
          </p>
        </div>
      </div>

      <span
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 z-[61] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-0"
      />
    </>
  );
}
