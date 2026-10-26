"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/motion/reduced";

interface ProjectMediaProps {
  image: string;
  alt: string;
  video?: string | undefined;
  poster?: string | undefined;
  /** Mensaje (solo para lectores de pantalla) cuando el video no carga. */
  fallbackMessage: string;
}

const WIDTH = 640;
const HEIGHT = 400;

/**
 * Imagen o video corto de la tarjeta. Las dimensiones están reservadas (proporción 8:5) para evitar
 * saltos de layout. El video va silenciado, sin controles y sin autoplay (el autoplay solo en
 * viewport llega con la coreografía); si no carga, se muestra el póster.
 */
export function ProjectMedia({ image, alt, video, poster, fallbackMessage }: ProjectMediaProps) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const still = poster ?? image;

  // Reproduce en bucle y en silencio SOLO mientras la tarjeta está en el viewport; pausa al salir.
  // Con movimiento reducido no se reproduce nunca (se queda el póster).
  const hasVideo = Boolean(video) && !failed;
  useEffect(() => {
    const el = videoRef.current;
    if (!hasVideo || !el || prefersReducedMotion()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.preload = "auto";
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [hasVideo]);

  return (
    <div
      data-anim="media"
      className="relative aspect-[8/5] w-full overflow-hidden bg-surface-elevated"
    >
      {video && !failed ? (
        <video
          ref={videoRef}
          src={video}
          poster={still}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <Image
          src={still}
          alt={alt}
          width={WIDTH}
          height={HEIGHT}
          sizes="(min-width: 1024px) 45vw, 100vw"
          unoptimized={still.endsWith(".svg")}
          className="size-full object-cover text-fg-muted"
        />
      )}
      {failed ? (
        <p role="status" className="sr-only">
          {fallbackMessage}
        </p>
      ) : null}
    </div>
  );
}
