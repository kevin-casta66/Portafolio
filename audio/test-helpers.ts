import { achievements } from "@/content/achievements";

/** Ids de logros del catálogo en orden (el test de variaciones comprueba que cada uno suena distinto). */
export const achievementIds = (): string[] => achievements.map((a) => a.id);
