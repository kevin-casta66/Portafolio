## Context

08b (archivado el 2026-10-27) dejó el motor adaptativo funcionando y sus pruebas pasan, pero se ejecutaban con `--autoplay-policy=no-user-gesture-required` y disparaban casi todo con el gancho. Una auditoría del 2026-10-27 con interacciones reales sobre el build de producción (`:3000`, Chrome sin flags) dio:

| Hallazgo | Medida |
|---|---|
| Recarga con sonido elegido: la puerta no aparece y el motor espera `pointerdown`/`keydown`/`touchstart` | Tras scroll + hover sin clic: `started=false` y 4 `hover:token` emitidos sin sonido; arranca al primer clic |
| Música ≈ −23 dB RMS | Pico del bus de efectos: `bytecode:instruction` −35, `runtime:core-hover` −34/−35, `terminal:key` −33, `ui:open` −29, `counter:tick` −27 dB |
| Polifonía | Consola: «Max polyphony exceeded. Note dropped». `audio/patches.ts`: pluck 4 voces, bell 3, otros 3–4 |
| Nombre del hero | 29 `hero:key` cada ~35 ms; `gapMs` 70 + cuantización a 16n (178 ms a 84 BPM) colapsan la mayoría |

Lo que sí funciona: foco en contacto, Enter y comando desconocido de la terminal, Debug, `mixer`, hover en tokens y skills, selección de skill y los cambios de mezcla por fase.

## Goals / Non-Goals

**Goals:** que cada interacción del mapa sonoro se oiga de forma fiable en Chrome y Brave sin flags, y pruebas que lo demuestren.

**Non-Goals:** rediseñar la pieza o el catálogo de efectos; añadir sonidos nuevos (p. ej. hover de tarjetas de proyecto); cambios de 09 o 10.

## Decisions

- **D1 Desbloqueo.** La rueda y el hover no son activación de usuario en Chrome ni en Brave, así que no se puede arrancar el `AudioContext` sin clic, tecla o toque. Se añade un aviso pequeño junto al control de sonido, «Activar sonido» (región `status`, sin robar foco), visible solo con `sound.enabled`, la puerta resuelta y el contexto sin estar `running`. Alternativa descartada: arrancar en `scroll`/`wheel` (el navegador lo rechaza en silencio).
- **D2 Niveles.** Se recalibra `db` en `audio/sfx.ts` midiendo el pico del bus de efectos contra el RMS de la música en cada fase con el script de auditoría; objetivo 0…+6 dB (ticks y teclas hasta −3 dB). Ducking del bus de música con un `Gain` que acciona el reproductor de efectos (−3 dB, ataque ~20 ms, liberación ~250 ms).
- **D3 Polifonía.** `maxPolyphony` ≥ 8 en los `PolySynth` de efectos y release más corto. `VoiceBudget` sigue siendo la única autoridad del límite global de 12: si no hay voz, el efecto se registra como descartado en lugar de dejar que Tone lo descarte.
- **D4 Nombre del hero.** `motion/choreography/hero.ts` emite la nota del motivo cada 3 letras (con su índice) y el clic mecánico de tecla sigue por letra, sin altura y a nivel bajo.
- **D5 Pruebas.** `scripts/audio/verify-sound-real.mjs`, sin flag de autoplay y con interacciones reales (hover, scroll, clic), recarga sin clic, niveles por efecto y consola sin avisos de polifonía. El gancho añade el registro de descartes con motivo.

## Risks / Trade-offs

- Subir los efectos puede acercar la salida al limitador → se verifica pico < −1 dBFS a volumen 100 %.
- El aviso añade UI al JS inicial → presupuesto ≤ 0,5 KB gzip, con textos en los mensajes ya cargados.
