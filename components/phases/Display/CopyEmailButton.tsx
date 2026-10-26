"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type Feedback = "idle" | "copied" | "failed";

/**
 * Muestra el email como texto seleccionable y un botón que lo copia. El feedback («Copiado al
 * portapapeles» o el aviso de error) se anuncia en una región viva; si el portapapeles no está
 * disponible, el email sigue visible para copiarlo a mano.
 */
export function CopyEmailButton({ email }: { email: string }) {
  const t = useTranslations("Display.alt");
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback("idle"), 4000);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={`mailto:${email}`}
        className="select-all font-mono text-lg text-fg underline underline-offset-4"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-10 items-center rounded-md border border-accent px-4 font-mono text-sm text-accent hover:bg-phase-tint"
      >
        {t("copy")}
      </button>
      <span role="status" aria-live="polite" className="font-mono text-sm">
        {feedback === "copied" ? <span className="text-syntax-string">{t("copied")}</span> : null}
        {feedback === "failed" ? <span className="text-syntax-type">{t("copyFailed")}</span> : null}
      </span>
    </div>
  );
}
