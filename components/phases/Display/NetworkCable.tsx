"use client";

import { useTranslations } from "next-intl";
import { useImperativeHandle, useRef, type Ref } from "react";
import { prefersReducedMotion } from "@/motion/reduced";
import { cssEase, duration } from "@/motion/tokens";

export interface CableHandle {
  /** `true` si hay un paquete en curso (con movimiento reducido nunca). */
  active(): boolean;
  /** El mensaje sale: el paquete viaja por el cable hacia el servidor. */
  send(): void;
  /**
   * Llega la respuesta real. Espera a que el paquete termine su ida (recorrido mínimo) y entonces:
   * con éxito regresa al emisor; con error se detiene y se apaga. Resuelve al terminar.
   */
  receive(ok: boolean): Promise<void>;
  /** Apaga el paquete sin animación. */
  reset(): void;
}

/**
 * Cable animado «tú → servidor» del formulario de contacto. Decorativo (`aria-hidden`): el resultado
 * real se anuncia por la región `aria-live` del formulario. El paquete solo se mueve con `transform`
 * y `opacity`. La ida dura `duration.ui` y la vuelta también: tras la respuesta, el resultado se
 * muestra como máximo `2 × duration.ui` (600 ms) después, dentro del tope de 700 ms.
 */
export function NetworkCable({ ref }: { ref?: Ref<CableHandle> }) {
  const t = useTranslations("Display.cable");
  const track = useRef<HTMLDivElement>(null);
  const packet = useRef<HTMLDivElement>(null);
  const out = useRef<Promise<unknown> | null>(null);
  const current = useRef<Animation | null>(null);

  const travel = (from: number, to: number): Animation | null =>
    packet.current?.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration: duration.ui, easing: cssEase.scene, fill: "forwards" },
    ) ?? null;
  const length = () => Math.max(0, (track.current?.clientWidth ?? 0) - 12);
  const fade = (to: number): Animation | null =>
    packet.current?.animate([{ opacity: 1 - to }, { opacity: to }], {
      duration: duration.micro,
      easing: cssEase.inExpo,
      fill: "forwards",
    }) ?? null;

  useImperativeHandle(ref, () => ({
    active: () => out.current !== null,
    send() {
      if (prefersReducedMotion() || !packet.current) return;
      current.current?.cancel();
      packet.current.style.opacity = "1";
      const animation = travel(0, length());
      current.current = animation;
      out.current = animation ? animation.finished.catch(() => {}) : Promise.resolve();
    },
    async receive(ok) {
      await out.current;
      const el = packet.current;
      if (!el) return;
      if (ok) {
        // El paquete regresa: ida y vuelta completas.
        await travel(length(), 0)?.finished.catch(() => {});
      }
      // El resultado se muestra al regresar el paquete; este se apaga en paralelo (sin retrasarlo).
      void fade(0)?.finished.then(
        () => this.reset(),
        () => this.reset(),
      );
    },
    reset() {
      current.current?.cancel();
      out.current = null;
      if (packet.current) packet.current.style.opacity = "0";
    },
  }));

  return (
    <div
      ref={track}
      aria-hidden="true"
      data-anim="network-cable"
      className="relative flex h-6 items-center"
    >
      <span className="font-mono text-xs text-fg-muted">{t("you")}</span>
      <div className="relative mx-3 h-px flex-1 bg-border">
        <div
          ref={packet}
          className="absolute -top-[5px] left-0 size-[11px] rounded-sm bg-accent"
          style={{ opacity: 0 }}
        />
      </div>
      <span className="font-mono text-xs text-fg-muted">{t("server")}</span>
    </div>
  );
}
