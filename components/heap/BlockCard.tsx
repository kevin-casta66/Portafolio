import { Link } from "@/i18n/navigation";
import type { HeapBlock, HeapDestination } from "@/lib/heap";

const linkClass =
  "inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:border-accent hover:text-accent";

interface BlockCardProps {
  block: HeapBlock;
  destination: HeapDestination;
  locale: "es" | "en";
  skillNames: Record<string, string>;
  labels: {
    kind: string;
    address: string;
    type: string;
    year: string;
    stack: string;
    open: string;
  };
  /** En la cuadrícula el bloque entero recibe el foco: el enlace queda fuera del orden de tabulación. */
  linkTabIndex?: -1 | undefined;
}

/** Enlace de apertura de un bloque: interno (con prefijo de idioma) o externo. */
export function OpenLink({
  destination,
  label,
  tabIndex,
}: {
  destination: HeapDestination;
  label: string;
  tabIndex?: -1 | undefined;
}) {
  if ("url" in destination) {
    return (
      <a
        href={destination.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={tabIndex}
        className={linkClass}
      >
        {label}
      </a>
    );
  }
  const href =
    "hash" in destination ? { pathname: destination.path, hash: destination.hash } : destination.path;
  return (
    <Link
      href={href}
      tabIndex={tabIndex}
      // Hold-to-Execute (change 05): clic en el enlace = versión corta de la transición.
      {...(destination.type === "case" ? { "data-hold-link": "" } : {})}
      className={linkClass}
    >
      {label}
    </Link>
  );
}

/** Contenido de un bloque de memoria: lo comparten la cuadrícula 2D y la lista accesible. */
export function BlockCard({ block, destination, locale, skillNames, labels, linkTabIndex }: BlockCardProps) {
  const stack = block.stack.map((id) => skillNames[id] ?? id).join(", ");
  return (
    <>
      <p className="font-mono text-sm font-semibold text-accent">
        <span className="sr-only">{labels.address}: </span>
        {block.address}
      </p>
      <p className="mt-1 font-mono text-xs text-fg-muted">
        <span className="sr-only">{labels.type}: </span>
        {labels.kind} · <span className="sr-only">{labels.year}: </span>
        {block.year}
      </p>
      <h2 className="mt-2 font-display text-lg font-semibold leading-snug">{block.name[locale]}</h2>
      <p className="mt-2 text-sm text-fg-muted">
        <span className="sr-only">{labels.stack}: </span>
        {stack}
      </p>
      <p className="mt-4">
        <OpenLink destination={destination} label={labels.open} tabIndex={linkTabIndex} />
      </p>
    </>
  );
}
