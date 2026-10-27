import { defineAchievement } from "@/lib/achievements";

/**
 * Catálogo inicial de logros (change 06). Los changes 07 y 08 añaden los suyos con
 * `defineAchievement` desde su propio módulo; `heap_explorer` ya existe aquí porque el spec lo
 * incluye en el catálogo inicial y el 07 solo lo desbloquea.
 */
export const achievements = [
  defineAchievement({
    id: "root_access",
    title: { es: "Acceso root", en: "Root access" },
    description: { es: "Abriste la terminal oculta.", en: "You opened the hidden terminal." },
    hint: { es: "Hay una consola escondida bajo la tecla ~.", en: "There is a console hidden under the ~ key." },
  }),
  defineAchievement({
    id: "process_executed",
    title: { es: "Proceso ejecutado", en: "Process executed" },
    description: {
      es: "Completaste tu primer Hold-to-Execute sobre un proyecto.",
      en: "You completed your first Hold-to-Execute on a project.",
    },
    hint: { es: "Mantén pulsada una tarjeta de proyecto.", en: "Press and hold a project card." },
  }),
  defineAchievement({
    id: "heap_explorer",
    title: { es: "Explorador del heap", en: "Heap explorer" },
    description: { es: "Entraste en la vista Memory Heap.", en: "You entered the Memory Heap view." },
    hint: { es: "Los proyectos también se pueden ver como memoria.", en: "Projects can also be seen as memory." },
  }),
  defineAchievement({
    id: "kernel_panic",
    title: { es: "Kernel panic", en: "Kernel panic" },
    description: { es: "Llegaste a una dirección que no existe (404).", en: "You reached an address that does not exist (404)." },
    hint: { es: "Algunas rutas no llevan a ninguna parte.", en: "Some routes lead nowhere." },
  }),
  defineAchievement({
    id: "debugger_attached",
    title: { es: "Depurador adjunto", en: "Debugger attached" },
    description: { es: "Activaste el modo Debug.", en: "You turned on Debug mode." },
    hint: { es: "Un botón del header muestra lo que hay bajo el capó.", en: "A header button shows what is under the hood." },
  }),
] as const;
