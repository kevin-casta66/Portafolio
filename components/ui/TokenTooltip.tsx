"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { audio, type TokenKind } from "@/audio";

const TOKEN_KINDS: readonly string[] = ["keyword", "identifier", "string", "number"];

interface TokenTooltipProps {
  /** Tipo inferido (`keyword`, `identifier`, `string`, `number`). */
  type: string;
  /** Frase adicional del autor. */
  note: string;
  children: ReactNode;
}

/**
 * Token enfocable con tooltip tipo IDE. Se abre con hover (ratón), foco (teclado) o toque; se cierra
 * con Escape (el foco se queda en el token), al perder el foco o al tocar fuera. El tooltip está
 * siempre en el DOM y asociado con `aria-describedby`, así los lectores de pantalla anuncian el tipo
 * y la frase al enfocar el token.
 */
export function TokenTooltip({ type, note, children }: TokenTooltipProps) {
  const t = useTranslations("Lexer");
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef<string>("mouse");
  /** `true` si el foco llegó por puntero: en ese caso el tooltip lo gestionan hover y toque, no el foco. */
  const focusFromPointer = useRef(false);
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);

  // Una nota afinada según el tipo del token cada vez que se abre (hover, foco o toque).
  useEffect(() => {
    if (open && TOKEN_KINDS.includes(type)) audio.emit("hover:token", { kind: type as TokenKind });
  }, [open, type]);

  // Evita que el tooltip se salga del viewport (y cause scroll horizontal) en pantallas estrechas.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current || !tooltipRef.current) return;
    const left = wrapperRef.current.getBoundingClientRect().left;
    const width = tooltipRef.current.getBoundingClientRect().width;
    setAlignEnd(left + width > document.documentElement.clientWidth - 8);
  }, [open]);

  // Toque fuera del token: cierra.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && document.activeElement !== e.currentTarget.firstChild) {
          setOpen(false);
        }
      }}
    >
      <span
        tabIndex={0}
        aria-describedby={id}
        data-anim="token"
        className="inline-block cursor-help rounded-md border border-border bg-surface px-3 py-1.5 hover:border-accent"
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
          focusFromPointer.current = true;
        }}
        onClick={() => {
          // Táctil y lápiz alternan; con ratón el hover y el foco ya lo gestionan.
          if (lastPointer.current !== "mouse") setOpen((v) => !v);
        }}
        onFocus={() => {
          if (!focusFromPointer.current) setOpen(true);
        }}
        onBlur={() => {
          focusFromPointer.current = false;
          setOpen(false);
        }}
        onKeyDown={(e) => {
          focusFromPointer.current = false;
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {children}
      </span>
      <span
        ref={tooltipRef}
        id={id}
        role="tooltip"
        hidden={!open}
        className={
          "absolute top-full z-20 mt-2 block w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-surface-elevated p-3 text-left font-mono text-xs text-fg shadow-lg " +
          (alignEnd ? "right-0" : "left-0")
        }
      >
        <span className="block text-accent">{t("inferredType", { type })}</span>
        <span className="mt-1 block text-fg-muted">{note}</span>
      </span>
    </span>
  );
}
