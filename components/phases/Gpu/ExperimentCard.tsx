"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ExperimentKind } from "@/webgl/lab/definitions";
import { ExperimentControls } from "./ExperimentControls";
import { ExperimentStage } from "./ExperimentStage";

interface ExperimentCardProps {
  id: string;
  kind: ExperimentKind;
  dataset?: { label: string; years: number; projects: number }[] | undefined;
  name: string;
  summary: string;
  image: string;
  alt: string;
  codeTokens: { content: string; color: string }[][];
}

/**
 * Tarjeta de experimento que GIRA 180° en 3D (easing de transición de escena) para mostrar el
 * fragmento de código clave en su reverso. Cada cara tiene su propio botón «</> Ver código» /
 * «← Ver experimento» con `aria-pressed`; al girar, el foco pasa al botón de la cara visible y la
 * cara oculta queda `inert` (ni tabulable ni leída por lectores de pantalla). Con movimiento
 * reducido no hay giro: fundido entre caras.
 */
export function ExperimentCard({ id, kind, dataset, name, summary, image, alt, codeTokens }: ExperimentCardProps) {
  const t = useTranslations("Gpu");
  const [flipped, setFlipped] = useState(false);
  const codeId = useId();
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);

  const interacted = useRef(false);
  const flip = (next: boolean) => {
    interacted.current = true;
    setFlipped(next);
  };

  // El foco viaja con el usuario a la cara que queda visible (tras el commit: la cara que se muestra
  // deja de ser `inert` en ese mismo render, y solo entonces puede recibir el foco).
  useEffect(() => {
    if (!interacted.current) return;
    (flipped ? backButton : frontButton).current?.focus({ preventScroll: true });
  }, [flipped]);

  return (
    <article
      data-anim="experiment-card"
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="flip-card" data-flipped={flipped}>
        <div className="flip-inner aspect-[8/5]">
          {/* Anverso: la imagen del experimento */}
          <div
            className="flip-face flip-front bg-surface-elevated"
            inert={flipped}
            aria-hidden={flipped}
          >
            <Image
              src={image}
              alt={alt}
              width={640}
              height={400}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              unoptimized={image.endsWith(".svg")}
              className="size-full object-cover text-fg-muted"
            />
            {/* Escenario interactivo: el canvas 3D dibuja aquí; sin 3D se ve la imagen de arriba */}
            <ExperimentStage id={id} kind={kind} dataset={dataset} />
            <button
              ref={frontButton}
              type="button"
              aria-pressed={false}
              onClick={() => flip(true)}
              className="absolute bottom-3 left-3 inline-flex h-10 items-center rounded-md border border-accent bg-surface px-4 font-mono text-sm text-accent hover:bg-phase-tint"
            >
              {t("viewCode")}
            </button>
          </div>

          {/* Reverso: el código */}
          <div
            className="flip-face flip-back bg-surface-elevated"
            inert={!flipped}
            aria-hidden={!flipped}
          >
            <pre
              id={codeId}
              tabIndex={0}
              aria-label={t("codeRegion", { name })}
              className="absolute inset-0 overflow-auto p-4 pb-16 font-mono text-sm"
            >
              <code>
                {codeTokens.map((line, i) => (
                  <span key={i} className="block">
                    {line.map((token, j) => (
                      <span key={j} style={{ color: token.color }}>
                        {token.content}
                      </span>
                    ))}
                    {line.length === 0 ? " " : null}
                  </span>
                ))}
              </code>
            </pre>
            <button
              ref={backButton}
              type="button"
              aria-pressed={true}
              aria-controls={codeId}
              onClick={() => flip(false)}
              className="absolute bottom-3 left-3 inline-flex h-10 items-center rounded-md border border-accent bg-surface px-4 font-mono text-sm text-accent hover:bg-phase-tint"
            >
              {t("viewExperiment")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold">{name}</h3>
        <p className="mt-2 text-fg-muted">{summary}</p>
        <ExperimentControls id={id} kind={kind} />
      </div>
    </article>
  );
}
