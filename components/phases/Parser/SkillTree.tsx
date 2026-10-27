"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { prefersReducedMotion } from "@/motion/reduced";
import { cssEase, duration } from "@/motion/tokens";

export interface TreeSkill {
  id: string;
  name: string;
  years: number;
  level: "daily" | "production" | "exploring";
  projects: { slug: string; name: string }[];
}
export interface TreeCategory {
  id: string;
  skills: TreeSkill[];
}

type NodeKind = "root" | "branch" | "leaf";
interface TreeNode {
  id: string;
  kind: NodeKind;
  parentId: string | null;
  level: number;
  posInSet: number;
  setSize: number;
  childIds: string[];
  skill?: TreeSkill;
  category?: string;
}

const ROOT = "root";
const branchId = (category: string) => `cat-${category}`;
const leafId = (skill: string) => `skill-${skill}`;

/** Aplana el árbol (raíz → categorías → hojas) en un mapa de nodos con su posición ARIA. */
function buildNodes(categories: TreeCategory[]): Map<string, TreeNode> {
  const nodes = new Map<string, TreeNode>();
  nodes.set(ROOT, {
    id: ROOT,
    kind: "root",
    parentId: null,
    level: 1,
    posInSet: 1,
    setSize: 1,
    childIds: categories.map((c) => branchId(c.id)),
  });
  categories.forEach((category, i) => {
    nodes.set(branchId(category.id), {
      id: branchId(category.id),
      kind: "branch",
      parentId: ROOT,
      level: 2,
      posInSet: i + 1,
      setSize: categories.length,
      childIds: category.skills.map((s) => leafId(s.id)),
      category: category.id,
    });
    category.skills.forEach((skill, j) => {
      nodes.set(leafId(skill.id), {
        id: leafId(skill.id),
        kind: "leaf",
        parentId: branchId(category.id),
        level: 3,
        posInSet: j + 1,
        setSize: category.skills.length,
        childIds: [],
        skill,
        category: category.id,
      });
    });
  });
  return nodes;
}

/** Ids visibles en orden de lectura, según qué ramas están expandidas. */
function visibleIds(nodes: Map<string, TreeNode>, expanded: Set<string>): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    out.push(id);
    const node = nodes.get(id);
    if (node && node.kind !== "leaf" && expanded.has(id)) node.childIds.forEach(walk);
  };
  walk(ROOT);
  return out;
}

const NARROW_QUERY = "(max-width: 767px)";
function subscribeNarrow(onChange: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const getServerNarrow = () => false;

/**
 * Árbol de habilidades con el patrón WAI-ARIA Tree View: roles `tree`/`treeitem`/`group`, un único
 * punto de tabulación (roving tabindex) y navegación por flechas, Inicio/Fin, Enter/Espacio y Escape.
 * En escritorio se dispone en horizontal con todo expandido; por debajo de 768 px es vertical y solo
 * la primera rama arranca abierta. El servidor renderiza todo expandido, así sin JavaScript el
 * contenido completo es legible.
 */
export function SkillTree({ categories }: { categories: TreeCategory[] }) {
  const t = useTranslations("Parser");
  const uid = useId();
  const nodes = useState(() => buildNodes(categories))[0];
  const narrow = useSyncExternalStore(subscribeNarrow, getNarrow, getServerNarrow);

  const [override, setOverride] = useState<Set<string> | null>(null);
  const [activeId, setActiveId] = useState(ROOT);
  const [selected, setSelected] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** `true` solo cuando una rama se abre/cierra por acción del usuario (no en el montaje inicial). */
  const userToggled = useRef(false);

  const firstBranch = categories[0] ? branchId(categories[0].id) : null;
  const defaultExpanded = narrow
    ? new Set([ROOT, ...(firstBranch ? [firstBranch] : [])])
    : new Set([ROOT, ...categories.map((c) => branchId(c.id))]);
  const expanded = override ?? defaultExpanded;

  const domId = (id: string) => `${uid}-${id}`;
  const focusNode = (id: string) => {
    setActiveId(id);
    document.getElementById(domId(id))?.focus();
  };
  const setExpanded = (id: string, open: boolean) => {
    userToggled.current = true;
    const next = new Set(expanded);
    if (open) next.add(id);
    else next.delete(id);
    setOverride(next);
  };
  const selectedSkill = selected ? nodes.get(leafId(selected))?.skill : undefined;
  const selectedCategory = selected ? nodes.get(leafId(selected))?.category : undefined;

  // Trazas de luz hacia las vistas previas de los proyectos de la tecnología seleccionada.
  useEffect(() => {
    if (!selected || prefersReducedMotion()) return;
    const wrap = wrapRef.current;
    const from = document.getElementById(`${uid}-${leafId(selected)}`);
    const targets = Array.from(wrap?.querySelectorAll<HTMLElement>("[data-trace-target]") ?? []);
    if (!wrap || !from || targets.length === 0) return;
    let cancelled = false;
    let handle: { retract(): void } | null = null;
    void import("@/motion/traces").then((m) => {
      if (!cancelled) handle = m.drawTraces(wrap, from, targets);
    });
    return () => {
      cancelled = true;
      handle?.retract();
    };
  }, [selected, uid]);

  const activate = (node: TreeNode) => {
    if (node.kind === "leaf" && node.skill) {
      setSelected((current) => (current === node.skill?.id ? null : (node.skill?.id ?? null)));
    } else {
      setExpanded(node.id, !expanded.has(node.id));
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      if (selected) setSelected(null);
      return;
    }
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const node = item?.dataset.nodeId ? nodes.get(item.dataset.nodeId) : undefined;
    if (!node) return;

    const visible = visibleIds(nodes, expanded);
    const index = visible.indexOf(node.id);
    let handled = true;

    switch (event.key) {
      case "ArrowDown":
        if (visible[index + 1]) focusNode(visible[index + 1] as string);
        break;
      case "ArrowUp":
        if (index > 0) focusNode(visible[index - 1] as string);
        break;
      case "ArrowRight":
        if (node.kind !== "leaf") {
          if (!expanded.has(node.id)) setExpanded(node.id, true);
          else if (node.childIds[0]) focusNode(node.childIds[0]);
        }
        break;
      case "ArrowLeft":
        if (node.kind !== "leaf" && expanded.has(node.id)) setExpanded(node.id, false);
        else if (node.parentId) focusNode(node.parentId);
        break;
      case "Home":
        focusNode(visible[0] as string);
        break;
      case "End":
        focusNode(visible[visible.length - 1] as string);
        break;
      case "Enter":
      case " ":
        activate(node);
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  };

  const renderNode = (id: string) => {
    const node = nodes.get(id);
    if (!node) return null;
    const isBranch = node.kind !== "leaf";
    const isOpen = isBranch && expanded.has(id);
    const isSelected = node.skill?.id === selected;
    const dimmed =
      selected !== null &&
      node.kind !== "root" &&
      !isSelected &&
      node.category !== selectedCategory;
    const dimmedLeaf = selected !== null && node.kind === "leaf" && !isSelected;
    const label =
      node.kind === "root"
        ? t("root")
        : node.kind === "branch"
          ? t(`categories.${node.category as "frontend"}`)
          : (node.skill?.name ?? "");
    const labelId = `${domId(id)}-label`;
    const metaId = `${domId(id)}-meta`;
    const groupId = `${domId(id)}-group`;

    // El treeitem es solo la fila: su contenido visible coincide con su nombre accesible. El grupo
    // de hijos es un hermano enlazado con `aria-owns`, así el árbol sigue siendo un árbol ARIA.
    return (
      <li
        key={id}
        role="none"
        className={
          "flex flex-col md:flex-row md:items-start" + (node.kind === "root" ? " md:w-max" : "")
        }
      >
        <div
          id={domId(id)}
          role="treeitem"
          data-node-id={id}
          data-anim={node.kind === "leaf" ? "ast-leaf" : "ast-node"}
          aria-level={node.level}
          aria-setsize={node.setSize}
          aria-posinset={node.posInSet}
          aria-expanded={isBranch ? isOpen : undefined}
          aria-selected={node.kind === "leaf" ? isSelected : undefined}
          aria-owns={isOpen ? groupId : undefined}
          aria-labelledby={node.kind === "leaf" ? `${labelId} ${metaId}` : labelId}
          tabIndex={activeId === id ? 0 : -1}
          onFocus={(e) => {
            setActiveId(id);
            // En escritorio el árbol se desplaza para mantener visible el nodo enfocado (navegación por
            // teclado sin arrastre): el foco nativo no recoloca un nodo parcialmente visible.
            e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}
          onClick={() => {
            setActiveId(id);
            activate(node);
          }}
          className={
            "row flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-opacity " +
            (isSelected
              ? "border-accent bg-phase-tint "
              : node.kind === "root"
                ? "border-accent "
                : "border-border bg-surface hover:border-accent ") +
            (dimmed || dimmedLeaf ? "opacity-40" : "")
          }
        >
          {node.kind !== "root" ? (
            <svg
              aria-hidden="true"
              data-anim="branch"
              viewBox="0 0 16 16"
              className="-ml-1 hidden h-4 w-4 shrink-0 text-border md:block"
            >
              <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          ) : null}
          {isBranch ? (
            <span aria-hidden="true" className="font-mono text-accent">
              {isOpen ? "▾" : "▸"}
            </span>
          ) : null}
          <span id={labelId} className={node.kind === "leaf" ? "font-medium" : "font-mono text-sm"}>
            {label}
          </span>
          {node.kind === "leaf" && node.skill ? " " : null}
          {node.kind === "leaf" && node.skill ? (
            <span id={metaId} className="font-mono text-xs text-fg-muted">
              {t("years", { count: node.skill.years })} ·{" "}
              {t("projects", { count: node.skill.projects.length })} ·{" "}
              {t(`levels.${node.skill.level}`)}
            </span>
          ) : null}
        </div>

        {isOpen ? (
          <ul
            id={groupId}
            role="group"
            ref={(el) => {
              // Móvil: al abrir una rama por acción del usuario se expande con `transform`+`opacity`
              // (nunca animando la altura): crece desde arriba.
              if (!el || !userToggled.current || !narrow || prefersReducedMotion()) return;
              el.animate(
                [
                  { opacity: 0, transform: "scaleY(0.6)" },
                  { opacity: 1, transform: "none" },
                ],
                { duration: duration.ui, easing: cssEase.inExpo },
              );
            }}
            className="ml-3 mt-2 flex flex-col gap-2 border-l border-border pl-3 md:ml-4 md:mt-0 md:pl-4"
          >
            {node.childIds.map(renderNode)}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div ref={wrapRef} className="relative" onKeyDown={(e) => e.key === "Escape" && onKeyDown(e)}>
      <p className="mb-4 max-w-prose font-mono text-xs text-fg-muted">{t("selectHint")}</p>

      <ul
        role="tree"
        aria-label={t("treeLabel")}
        onKeyDown={onKeyDown}
        data-cursor="drag"
        className="md:overflow-x-auto md:pb-4"
      >
        {renderNode(ROOT)}
      </ul>

      <div aria-live="polite" className="mt-8 min-h-24">
        {selectedSkill ? (
          <div data-anim="related">
            <h3 className="font-display text-xl font-medium">
              {t("relatedHeading", { skill: selectedSkill.name })}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {selectedSkill.projects.map((project) => (
                <li key={project.slug}>
                  <a
                    href={`#project-${project.slug}`}
                    data-trace-target
                    className="inline-flex h-10 items-center rounded-md border border-accent px-4 text-accent hover:bg-phase-tint"
                  >
                    {project.name}
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 font-mono text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              {t("clearSelection")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
