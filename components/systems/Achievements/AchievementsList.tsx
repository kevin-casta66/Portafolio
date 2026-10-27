"use client";

import { useLocale, useTranslations } from "next-intl";
import { getAchievements } from "@/lib/achievements";
import { useAppStore } from "@/lib/store";
import "@/content/achievements";

/** Cuántos logros del catálogo hay desbloqueados y el total (el contador `n/total` del Call Stack). */
export function useAchievementCount(): { unlocked: number; total: number } {
  const unlockedIds = useAppStore((s) => s.achievements);
  const catalog = getAchievements();
  return {
    unlocked: catalog.filter((a) => unlockedIds.includes(a.id)).length,
    total: catalog.length,
  };
}

/**
 * Contenido de la lista de logros: los desbloqueados muestran su descripción; los bloqueados solo una
 * pista. Es una lista de texto, legible con lector de pantalla y sin trampas de foco.
 */
export function AchievementsList() {
  const t = useTranslations("Achievements");
  const locale = useLocale() as "es" | "en";
  const unlockedIds = useAppStore((s) => s.achievements);

  return (
    <ul className="mt-3 space-y-3">
      {getAchievements().map((a) => {
        const unlocked = unlockedIds.includes(a.id);
        return (
          <li key={a.id} data-unlocked={unlocked} className="font-mono text-sm">
            <p className={unlocked ? "text-accent" : "text-fg"}>
              <span aria-hidden="true">{unlocked ? "[x] " : "[ ] "}</span>
              {unlocked ? a.title[locale] : "???"}
              <span className="sr-only">
                {" — "}
                {unlocked ? t("unlockedLabel") : t("lockedLabel")}
              </span>
            </p>
            <p className="mt-1 text-fg-muted">
              {unlocked ? a.description[locale] : `${t("hint")}: ${a.hint[locale]}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
