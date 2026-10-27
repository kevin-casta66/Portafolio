"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { emit } from "@/lib/events";
import { showcaseStore, useShowcase } from "@/lib/showcase-store";
import { DEFAULT_SPEED, type DemoId, type DemoSpeed, type StageInfo, type TransitionDemo } from "@/motion/showcase";
import { InternalsToggle } from "./InternalsToggle";
import { SpeedControl } from "./SpeedControl";
import { STAGE_WIDTH, createStageDemo } from "./stage-demo";
import { useReducedMotion } from "./useReducedMotion";

export interface TransitionCardData {
  id: DemoId;
  name: string;
  trigger: string;
  technique: string;
  reducedMotion: string;
  lowTier: string;
  note: string;
  internals: string;
  /** Duraciones y easings con su valor real (de `motion/tokens.ts`). */
  durations: { token: string; ms: number }[];
  easings: string[];
  uses3d: boolean;
  poster: string;
}

/** Deja pasar ~`n` frames (el siguiente commit de React) sin crear un bucle de frame propio. */
const nextFrames = (n = 2) => new Promise<void>((resolve) => setTimeout(resolve, n * 20));

/** Parámetros de la URL que se reenvían al escenario (forzar backend, pruebas). */
function stageQuery(): string {
  const source = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  for (const key of ["webgl", "motionTest"]) {
    const value = source.get(key);
    if (value !== null) out.set(key, value);
  }
  const text = out.toString();
  return text ? `?${text}` : "";
}

/**
 * Tarjeta de una transición (design D1/D2): texto estático (lo que ve cualquier visitante, también sin
 * JS), fotograma estático y controles. Replay monta el escenario aislado en un iframe y lo reproduce; solo
 * hay una demo viva a la vez (`showcaseStore`) y las demás vuelven a su fotograma.
 */
export function TransitionCard({ card, locale }: { card: TransitionCardData; locale: string }) {
  const t = useTranslations("Motion");
  const reduced = useReducedMotion();
  const active = useShowcase((s) => s.activeDemoId === card.id);
  const status = useShowcase((s) => s.status[card.id] ?? "idle");
  const [speed, setSpeed] = useState<DemoSpeed>(DEFAULT_SPEED);
  const [internals, setInternals] = useState(false);
  const [info, setInfo] = useState<StageInfo | null>(null);
  const [live, setLive] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const demo = useRef<TransitionDemo | null>(null);
  const speedRef = useRef(speed);
  const internalsRef = useRef(internals);
  const visibleRef = useRef(true);
  const busy = useRef(false);

  const say = useCallback(
    (key: "loading" | "playing" | "done" | "error" | "internalsOn" | "internalsOff" | "speed", extra?: string) =>
      setAnnouncement(t(`card.announce.${key}`, { id: card.id, speed: extra ?? "" })),
    [t, card.id],
  );

  /** Retira el escenario: libera el contexto, las escenas y los render targets de la demo. */
  const teardown = useCallback(() => {
    void demo.current?.dispose();
    demo.current = null;
    setLive(false);
    setInfo(null);
  }, []);

  // Otra demo tomó el relevo: esta vuelve a su fotograma estático.
  useEffect(() => {
    if (!active && demo.current) teardown();
  }, [active, teardown]);

  // Al desmontar la tarjeta (navegación) no queda ningún escenario vivo.
  useEffect(
    () => () => {
      void demo.current?.dispose();
      demo.current = null;
      showcaseStore.getState().release(card.id);
    },
    [card.id],
  );

  // Escala del escenario lógico (1280 px) al ancho de la tarjeta.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const apply = () => {
      const frame = el.querySelector<HTMLElement>("[data-stage-frame]");
      if (frame) frame.style.transform = `scale(${el.clientWidth / STAGE_WIDTH})`;
    };
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    apply();
    return () => observer.disconnect();
  }, [live]);

  // La demo viva se pausa al salir del viewport (design D6).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
        demo.current?.setVisible(visibleRef.current);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mount = useCallback(async (): Promise<boolean> => {
    const host_ = host.current;
    if (!host_) return false;
    const created = createStageDemo(card.id, locale, stageQuery());
    demo.current = created;
    showcaseStore.getState().setStatus(card.id, "loading");
    say("loading");
    try {
      const result = await created.mount(host_);
      if (demo.current !== created) return false; // otra demo se activó mientras cargaba
      created.setSpeed(speedRef.current);
      if (internalsRef.current) created.setInternals(true);
      created.setVisible(visibleRef.current);
      setInfo(result);
      setLive(true);
      return true;
    } catch {
      if (demo.current === created) teardown();
      showcaseStore.getState().setStatus(card.id, "error");
      say("error");
      return false;
    }
  }, [card.id, locale, say, teardown]);

  const onReplay = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const previous = showcaseStore.getState().activate(card.id);
      // La demo anterior se retira (en el siguiente commit de React) ANTES de que empiece esta.
      if (previous) await nextFrames(3);
      if (!demo.current && !(await mount())) return;
      showcaseStore.getState().setStatus(card.id, "playing");
      say("playing");
      await demo.current?.replay();
      if (!demo.current) return;
      showcaseStore.getState().setStatus(card.id, "done");
      say("done");
      emit("achievement:unlock", { id: "motion_inspector" });
      // Con movimiento reducido la demo se reproduce una vez y vuelve al fotograma estático.
      if (reduced) {
        teardown();
        showcaseStore.getState().release(card.id);
      }
    } catch {
      teardown();
      showcaseStore.getState().setStatus(card.id, "error");
      say("error");
    } finally {
      busy.current = false;
    }
  }, [card.id, mount, reduced, say, teardown]);

  const onSpeed = (value: DemoSpeed) => {
    speedRef.current = value;
    setSpeed(value);
    demo.current?.setSpeed(value);
    say("speed", `${value}x`);
  };

  const onInternals = () => {
    const next = !internals;
    internalsRef.current = next;
    setInternals(next);
    demo.current?.setInternals(next);
    say(next ? "internalsOn" : "internalsOff");
  };

  const loading = status === "loading";
  const playing = status === "playing";
  const titleId = `demo-${card.id}-title`;

  return (
    <article
      id={`demo-${card.id}`}
      aria-labelledby={titleId}
      data-demo={card.id}
      data-demo-status={status}
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-mono text-sm text-accent">{card.id}</p>
        <h3 id={titleId} className="font-display text-xl font-semibold">
          {card.name}
        </h3>
        <span className="ml-auto font-mono text-xs text-fg-muted">
          {card.uses3d ? t("card.uses3d") : t("card.usesDom")}
        </span>
      </header>

      <div
        ref={stage}
        role="group"
        aria-label={t("card.stageLabel", { id: card.id })}
        data-stage
        className="relative aspect-video overflow-hidden rounded-md border border-border bg-surface-elevated"
      >
        <Image
          src={card.poster}
          alt={t("card.posterAlt", { id: card.id, name: card.name })}
          width={1280}
          height={720}
          sizes="(min-width: 1024px) 50vw, 100vw"
          unoptimized
          className="absolute inset-0 size-full object-cover"
        />
        <div
          ref={host}
          data-stage-host
          className={"absolute inset-0 transition-opacity duration-300 " + (live ? "opacity-100" : "opacity-0")}
        />
        {loading ? (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-bg/70 font-mono text-sm"
          >
            {t("card.loading")}
          </p>
        ) : null}
        {info?.fallback2d ? (
          <span
            data-fallback-2d
            className="absolute left-2 top-2 rounded bg-surface-elevated px-2 py-1 font-mono text-xs text-accent"
          >
            {t("card.fallback2d")}
          </span>
        ) : null}
        {status === "error" ? (
          <p className="absolute inset-x-0 bottom-0 bg-surface-elevated p-2 font-mono text-xs">
            {t("card.error")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onReplay()}
          aria-disabled={loading || playing}
          className="inline-flex h-10 items-center rounded-md bg-accent px-5 font-mono text-sm font-medium text-bg hover:opacity-90 aria-disabled:opacity-60"
        >
          {loading ? t("card.loading") : playing ? t("card.playing") : t("card.replay")}
        </button>
        <SpeedControl label={t("card.speedLabel")} value={speed} onChange={onSpeed} />
        <InternalsToggle label={t("card.internals")} pressed={internals} onToggle={onInternals} />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Field label={t("catalog.fields.trigger")}>{card.trigger}</Field>
        <Field label={t("catalog.fields.duration")}>
          {card.durations.map((d) => `${d.token} ${d.ms} ms`).join(" · ")}
        </Field>
        <Field label={t("catalog.fields.easing")}>{card.easings.join(" · ")}</Field>
        <Field label={t("catalog.fields.technique")} wide>
          {card.technique}
        </Field>
        <Field label={t("catalog.fields.reducedMotion")}>{card.reducedMotion}</Field>
        <Field label={t("catalog.fields.lowTier")}>{card.lowTier}</Field>
        <Field label={t("catalog.fields.internals")} wide>
          {card.internals}
        </Field>
        <Field label={t("catalog.fields.note")} wide>
          {card.note}
        </Field>
      </dl>
    </article>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="font-mono text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
