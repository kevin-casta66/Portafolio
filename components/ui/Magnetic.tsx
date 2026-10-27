"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { registerMagnetic } from "./magnetic-controller";

interface Shared {
  /** Clases del fondo visual (color, borde, radio): es la capa que se desplaza. */
  surfaceClassName: string;
  children: ReactNode;
}

/**
 * Registra el host y sus dos capas visuales en el controlador compartido. El host (enlace o botón)
 * conserva su posición, su área de clic y su anillo de foco; solo se mueven `surface` (el fondo) y
 * `label` (el texto, algo menos: paralaje sutil).
 */
function useMagnetic() {
  const host = useRef<HTMLElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!host.current || !surface.current || !label.current) return;
    return registerMagnetic({
      host: host.current,
      layers: [
        { el: surface.current, factor: 1 },
        { el: label.current, factor: 0.6 },
      ],
    });
  }, []);
  return { host, surface, label };
}

const LAYER_MOTION = "magnetic-layer";

/** Enlace con atracción magnética (CTAs del hero). */
export function MagneticLink({
  surfaceClassName,
  className,
  children,
  ...props
}: Shared & Omit<ComponentPropsWithoutRef<"a">, "children">) {
  const { host, surface, label } = useMagnetic();
  return (
    <a
      ref={host as React.RefObject<HTMLAnchorElement>}
      data-magnetic
      className={`group relative ${className ?? ""}`}
      {...props}
    >
      <span ref={surface} aria-hidden="true" className={`${LAYER_MOTION} absolute inset-0 ${surfaceClassName}`} />
      <span ref={label} className={`${LAYER_MOTION} relative`}>
        {children}
      </span>
    </a>
  );
}

/** Botón con atracción magnética (enviar el formulario). */
export function MagneticButton({
  surfaceClassName,
  className,
  children,
  ...props
}: Shared & Omit<ComponentPropsWithoutRef<"button">, "children">) {
  const { host, surface, label } = useMagnetic();
  return (
    <button
      ref={host as React.RefObject<HTMLButtonElement>}
      data-magnetic
      className={`group relative ${className ?? ""}`}
      {...props}
    >
      <span ref={surface} aria-hidden="true" className={`${LAYER_MOTION} absolute inset-0 ${surfaceClassName}`} />
      <span ref={label} className={`${LAYER_MOTION} relative`}>
        {children}
      </span>
    </button>
  );
}
