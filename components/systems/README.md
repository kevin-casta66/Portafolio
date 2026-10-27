# components/systems

Sistemas globales (change 06). Se montan UNA vez en el layout raíz (`app/[locale]/layout.tsx`) y
sobreviven a la navegación entre el home y los casos de estudio.

| Sistema | Dónde | Cuándo se carga |
|---|---|---|
| Header: Vista Rápida ⚡, sonido, Debug, terminal, atajos, tema, idioma, CV | `Header.tsx` + `HeaderControls.tsx` | Inicial (islas de cliente mínimas) |
| Atajos globales (un único `keydown`) | `useGlobalShortcuts.ts` ← `lib/shortcuts.ts` | Inicial |
| Vista Rápida ↔ URL ↔ store | `QuickViewSync.tsx`, `components/quick-view/` | Inicial (sync); el currículum es SSR |
| Call Stack + logros (contador y lista) | `CallStack/`, `Achievements/` | Tras el LCP |
| Avisos de logros | `Achievements/AchievementToasts.tsx` | Tras el LCP, o ya si hay un logro en cola |
| Terminal (`<dialog>` sobre vidrio) | `Terminal/` ← `lib/commands.ts` | Al abrirla (prefetch al acercarse al botón) |
| Panel de atajos `?` (+ preferencia de cursor) | `ShortcutsPanel.tsx` | Al abrirlo |
| Modo Debug (stats-gl + Tweakpane) | `Debug/DebugOverlay.tsx` ← `webgl/core/debug.ts`, `webgl/tweakables.ts` | Al activar Debug; las herramientas se importan dentro del chunk |
| Cursor contextual | `Cursor/` | Tras el LCP, solo con puntero fino y sin la preferencia «cursor del sistema» |
| Diseño sonoro (Web Audio, sintetizado) | `Sound/` | Al activar el sonido |
| Botones magnéticos | `components/ui/Magnetic.tsx` + `magnetic-controller.ts` | Inicial (solo el hero y «Enviar») |
| Vidrio líquido | `components/ui/Glass.tsx` | Solo Call Stack, terminal y la lente del Heap (lo impone ESLint) |

`SystemsLoader.tsx` decide qué se monta y cuándo; desactivar Debug, el sonido o el cursor propio
desmonta su sistema. `chunks.ts` memoriza cada import dinámico.

## Reglas

- **Una acción, un efecto.** `lib/actions.ts` es la única implementación de cada acción global (tema,
  Debug, sonido, Vista Rápida, terminal…): la usan el control de la interfaz, el atajo y el comando de la
  terminal, así que producen exactamente el mismo efecto.
- **Logros por el bus.** Se desbloquean con `emit("achievement:unlock", { id })` (`lib/events.ts`); el
  puente de `StoreHydrator` los deduplica, persiste y encola como aviso. El catálogo vive en
  `content/achievements.ts` y es extensible con `defineAchievement` (`lib/achievements.ts`).
- **Sin color literal ni `requestAnimationFrame`** (ESLint). El movimiento del cursor y de los botones
  usa `transform` directo + transiciones CSS con el resorte `--ease-magnetic`.
- **El contenido esencial nunca depende de un sistema.** Todo sigue operable sin JS, con movimiento
  reducido y con `prefers-reduced-transparency` (el vidrio degrada a la superficie opaca).
- **Gancho de pruebas** (solo con `?motionTest`): `window.__portafolioApp` (store y emit) y
  `window.__portafolioSound`.

## Sonido

Todo se SINTETIZA en el cliente (`Sound/synth.ts`, funciones puras con pruebas): ambiente por fase en
bucles de 4 s, sonidos de UI y un tono ligado a la velocidad de scroll. No hay archivos de audio:
con el sonido desactivado no se pide nada por red. **El criterio auditivo (timbre, volumen, mezcla)
debe confirmarlo una persona.**
