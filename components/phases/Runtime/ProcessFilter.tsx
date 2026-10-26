"use client";

import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { prefersReducedMotion } from "@/motion/reduced";
import { duration } from "@/motion/tokens";
import { LayoutToggle } from "./LayoutToggle";

interface ProcessFilterProps {
  /** Tecnologías presentes en los proyectos (ids de habilidad). */
  options: string[];
  /** Valor activo (`""` = todos), ya validado en el servidor. */
  value: string;
  /** Procesos visibles con el filtro actual. */
  count: number;
}

/**
 * Filtro presentado como el comando `ps aux | grep <tech>`. El estado vive en `?grep=` y el servidor
 * filtra, así funciona al recargar, al compartir el enlace y sin JavaScript (formulario GET).
 */
export function ProcessFilter({ options, value, count }: ProcessFilterProps) {
  const t = useTranslations("Runtime");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const selectId = useId();
  const commandId = useId();

  const command = value ? `ps aux | grep ${value}` : "ps aux";

  // FLIP del filtro: se captura la posición ANTES de que el servidor devuelva la lista filtrada y se
  // anima DESPUÉS. Las tarjetas que salen ya no existen en el DOM: se animan «fantasmas» (clones
  // decorativos) con un fundido; las que se quedan se desplazan; las que entran aparecen con fundido.
  const pendingFlip = useRef<{
    state: unknown;
    ghosts: HTMLElement[];
    list: HTMLElement;
  } | null>(null);

  const captureFlip = async (next: string) => {
    if (prefersReducedMotion()) return;
    const list = document.getElementById("runtime-list");
    if (!list) return;
    const { Flip, registerGsap } = await import("@/motion/gsap");
    registerGsap();
    const items = Array.from(list.children) as HTMLElement[];
    const state = Flip.getState(items);
    const listRect = list.getBoundingClientRect();
    const ghosts = items
      .filter(
        (li) =>
          next &&
          !(li.querySelector("article")?.getAttribute("data-stack") ?? "")
            .split(" ")
            .includes(next),
      )
      .map((li) => {
        const rect = li.getBoundingClientRect();
        const ghost = li.cloneNode(true) as HTMLElement;
        ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        ghost.setAttribute("aria-hidden", "true");
        ghost.setAttribute("inert", "");
        Object.assign(ghost.style, {
          position: "absolute",
          left: `${rect.left - listRect.left}px`,
          top: `${rect.top - listRect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          pointerEvents: "none",
          margin: "0",
        });
        return ghost;
      });
    pendingFlip.current = { state, ghosts, list };
  };

  useLayoutEffect(() => {
    const pending = pendingFlip.current;
    if (!pending) return;
    pendingFlip.current = null;
    void (async () => {
      const { Flip, EASE, gsap, seconds } = await import("@/motion/gsap");
      const { list, ghosts } = pending;
      const targets = Array.from(list.children) as HTMLElement[];
      ghosts.forEach((ghost) => list.appendChild(ghost));
      // Salen con fundido.
      gsap.to(ghosts, {
        opacity: 0,
        duration: seconds(duration.ui),
        ease: EASE.inExpo,
        onComplete: () => ghosts.forEach((g) => g.remove()),
      });
      // Las que quedan se desplazan a su nueva posición; las nuevas entran con fundido.
      Flip.from(pending.state as Parameters<typeof Flip.from>[0], {
        targets,
        duration: seconds(duration.ui),
        ease: EASE.inExpo,
        scale: true,
        absolute: false,
        onEnter: (els: Element[]) =>
          gsap.fromTo(
            els,
            { opacity: 0 },
            { opacity: 1, duration: seconds(duration.ui), ease: EASE.inExpo },
          ),
        onComplete: () => gsap.set(targets, { clearProps: "transform,opacity" }),
      });
    })();
  }, [value]);

  return (
    <form
      method="get"
      action={`${pathname}#runtime`}
      onSubmit={(e) => e.preventDefault()}
      className="col-span-12 mb-8 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <label htmlFor={selectId} className="font-mono text-sm text-fg-muted">
        {t("filterLabel")}
      </label>

      <select
        id={selectId}
        name="grep"
        value={value}
        aria-describedby={commandId}
        onChange={(e) => {
          const next = e.target.value;
          void captureFlip(next).finally(() => {
            startTransition(() => {
              router.replace(next ? `${pathname}?grep=${encodeURIComponent(next)}` : pathname, {
                scroll: false,
              });
            });
          });
        }}
        className="h-10 rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg"
      >
        <option value="">{t("filterAll")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <noscript>
        <button
          type="submit"
          className="h-10 rounded-md border border-accent px-4 text-sm text-accent"
        >
          {t("apply")}
        </button>
      </noscript>

      <code
        id={commandId}
        aria-label={t("filterCommand")}
        className="rounded-md bg-bg px-3 py-2 font-mono text-sm text-syntax-string"
      >
        {`$ ${command}`}
      </code>

      <p role="status" aria-busy={pending} className="font-mono text-sm text-fg-muted">
        {t("results", { count })}
      </p>

      <LayoutToggle />
    </form>
  );
}
