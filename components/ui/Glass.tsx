import type { ComponentPropsWithRef, ElementType } from "react";

type GlassProps<T extends ElementType> = {
  /** Elemento a renderizar (`div` por defecto; p. ej. `nav`, `dialog`). */
  as?: T;
  /** Fondo más opaco para superficies con mucho texto (la terminal). */
  strong?: boolean;
  /** Refracción de borde con filtro SVG: solo con puntero fino y tier no bajo (lo decide el CSS). */
  refract?: boolean;
} & Omit<ComponentPropsWithRef<T>, "as" | "strong" | "refract">;

/**
 * ÚNICA forma de aplicar el material «vidrio líquido» (design D10). Su uso está restringido por lint
 * al Call Stack, la terminal y la lente del Heap (`eslint.config.mjs`): cualquier otra superficie
 * usa los tokens opacos del tema.
 *
 * El fondo sale de `--glass-bg` / `--glass-bg-strong`, cuya opacidad mínima garantiza contraste AA
 * contra el peor fondo posible (`pnpm tokens:contrast`). Sin soporte de `backdrop-filter`, o con
 * preferencia de menos transparencia, el CSS (`styles/systems.css`) cambia a la superficie opaca.
 */
export function Glass<T extends ElementType = "div">({
  as,
  strong = false,
  refract = false,
  className,
  ...rest
}: GlassProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      data-glass={strong ? "strong" : "normal"}
      data-refract={refract ? "true" : undefined}
      className={className ? `glass ${className}` : "glass"}
      {...rest}
    />
  );
}
