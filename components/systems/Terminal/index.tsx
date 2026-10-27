"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { audio } from "@/audio";
import { rawContent } from "@/content";
import { Glass } from "@/components/ui/Glass";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { closeTerminal, toggleDebug, toggleTheme, triggerDownload } from "@/lib/actions";
import {
  COMMAND_IDS,
  completeCommand,
  createHistory,
  runCommand,
  type CommandActions,
  type Locale,
  type OutputLine,
} from "@/lib/commands";
import { emit } from "@/lib/events";
import { jumpToSection } from "@/lib/navigation";
import { appStore, useAppStore } from "@/lib/store";
import { trapTab } from "../focus-trap";

interface LogLine extends OutputLine {
  kind: "input" | "output" | "error" | "info";
}

/**
 * Terminal oculta (change 06): un `<dialog>` modal nativo (foco contenido, Escape y `::backdrop`
 * gratis) sobre vidrio. La salida vive en un `role="log"` educado, así que cada comando se anuncia sin
 * mover el foco de la línea de entrada. Los comandos, el autocompletado y el historial salen del
 * registro puro de `lib/commands.ts`; este componente solo los conecta con la interfaz.
 */
export default function Terminal() {
  const t = useTranslations("Terminal");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const open = useAppStore((s) => s.ui.terminalOpen);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const history = useMemo(() => createHistory(), []);

  const [value, setValue] = useState("");
  const [lines, setLines] = useState<LogLine[]>(() => [{ kind: "info", text: t("welcome") }]);

  // Abrir / cerrar el diálogo nativo según el store (la única fuente de verdad del estado abierto).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      inputRef.current?.focus();
      // Primera apertura: `root_access` (idempotente: el store ignora los siguientes).
      emit("achievement:unlock", { id: "root_access" });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // La salida siempre muestra lo último.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  const actions: CommandActions = {
    downloadCv() {
      const href = rawContent.profile.cv[locale];
      triggerDownload(href);
      return href.split("/").pop() ?? href;
    },
    toggleTheme,
    toggleDebug,
    goToContact() {
      closeTerminal();
      // Tras cerrar (el diálogo devuelve el foco a quien lo abrió), el salto lleva el foco al encabezado.
      window.setTimeout(() => {
        if (pathname === "/") jumpToSection("display");
        else router.push("/#display");
      }, 0);
    },
    goToHeap() {
      closeTerminal();
      window.setTimeout(() => router.push("/heap"), 0);
    },
    goToMotion() {
      closeTerminal();
      window.setTimeout(() => router.push("/motion"), 0);
    },
    openMixer() {
      if (!appStore.getState().sound.enabled) return false;
      closeTerminal();
      // Tras cerrar la terminal (el diálogo devuelve el foco), se abre el mezclador.
      window.setTimeout(() => appStore.getState().setUi({ mixerOpen: true }), 0);
      return true;
    },
  };

  const execute = (raw: string) => {
    const command = raw.trim();
    if (command === "") return;
    history.push(command);
    const result = runCommand(command, { locale, content: rawContent, actions });
    // Comando desconocido: una nota grave suave (la salida ya lo dice por escrito).
    if (result.error) audio.emit("terminal:unknown");
    setLines((previous) => {
      if (result.clear) return [{ kind: "info", text: t("cleared") }];
      return [
        ...previous,
        { kind: "input", text: `$ ${command}` },
        ...result.lines.map((line): LogLine => ({ ...line, kind: result.error ? "error" : "output" })),
      ];
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      execute(value);
      setValue("");
      audio.emit("ui:enter");
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = event.key === "ArrowUp" ? history.previous() : history.next();
      if (next !== null) setValue(next);
      return;
    }
    if (event.key === "Tab" && value.trim() !== "" && !event.shiftKey) {
      const completion = completeCommand(value);
      if (completion.kind === "none") return; // deja que Tab siga su curso (foco dentro del diálogo)
      event.preventDefault();
      if (completion.kind === "unique") setValue(completion.value);
      else
        setLines((previous) => [
          ...previous,
          { kind: "input", text: `$ ${value}` },
          { kind: "output", text: completion.options.join("   ") },
        ]);
      return;
    }
    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setLines([{ kind: "info", text: t("cleared") }]);
      return;
    }
    // Tecla mecánica suave (solo suena con el sonido activado; el motor limita la frecuencia de disparo).
    if (event.key.length === 1 || event.key === "Backspace") audio.emit("terminal:key");
  };

  return (
    <Glass
      as="dialog"
      strong
      refract
      ref={dialogRef}
      aria-labelledby="terminal-title"
      data-terminal
      onKeyDown={(event) => trapTab(event, dialogRef.current)}
      onClose={() => {
        closeTerminal();
        openerRef.current?.focus({ preventScroll: true });
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        // Clic en el fondo oscurecido (fuera del contenido): cierra.
        if (event.target === event.currentTarget) closeTerminal();
      }}
      className="terminal m-auto w-[min(46rem,calc(100vw-2rem))] rounded-lg p-0 text-fg"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 id="terminal-title" className="font-mono text-sm font-semibold">
          {t("title")} <span className="text-fg-muted">— {COMMAND_IDS.length} cmd</span>
        </h2>
        <button
          type="button"
          onClick={closeTerminal}
          aria-label={t("close")}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border font-mono text-sm hover:border-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t("outputLabel")}
        data-lenis-prevent
        className="max-h-[50dvh] min-h-40 overflow-y-auto px-4 py-3 font-mono text-sm"
      >
        {lines.map((line, index) => (
          <p
            key={index}
            data-line={line.kind}
            className={
              line.kind === "input"
                ? "whitespace-pre-wrap break-words text-accent"
                : "whitespace-pre-wrap break-words text-fg"
            }
          >
            {line.href ? (
              <Link
                href={line.href}
                onClick={closeTerminal}
                className="underline decoration-accent underline-offset-4 hover:text-accent"
              >
                {line.text}
              </Link>
            ) : (
              line.text
            )}
          </p>
        ))}
      </div>

      <label className="flex items-center gap-2 border-t border-border px-4 py-3 font-mono text-sm">
        <span aria-hidden="true" className="text-accent">
          $
        </span>
        <span className="sr-only">{t("inputLabel")}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          data-terminal-input
          className="min-w-0 flex-1 bg-transparent text-fg"
        />
      </label>
    </Glass>
  );
}
