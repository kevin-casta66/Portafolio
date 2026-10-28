# audio/ — motor de sonido adaptativo (changes 08b y 08c)

Una sola pieza generativa (Tone.js 15.1.22, Re mayor, 84 BPM, progresión Bm7–Gmaj7–Dmaj7–A6) con seis capas
(PAD, KEYS, PERC, ARP, BASS, SHIMMER) que entran y salen según la fase visible, cuantizadas al compás.
Los efectos de interfaz usan solo notas de la pentatónica y se cuantizan a la semicorchea (16n) o la corchea (8n).

## Piezas

| Archivo | Función |
|---|---|
| `index.ts` | Fachada del JS inicial (sin `tone`): `audio.emit`, `audio.gate`, `audio.controls`, `timeToNextBar` |
| `engine.ts` | Se carga tras elegir sonido en la puerta: arranca el `Mix`, escucha el store, scroll, visibilidad, Vista Rápida y movimiento reducido |
| `mix.ts` | Cadena maestra, contextos de mezcla, presupuesto de voces (12), ducking de la música, recorte de efectos por fase, riser, 404 «cinta», registro de efectos (solo pruebas) |
| `layers.ts` / `scale.ts` / `voices.ts` / `sfx.ts` / `patches.ts` | Patrones, escala, gestor de voces, catálogo de efectos, patches |
| `stems-manifest.ts` / `sources.ts` | Modo stems opcional (`NEXT_PUBLIC_AUDIO_STEMS=1` + `public/audio/stems/manifest.json`) |
| `test-hook.ts` | `window.__portafolioSound`, solo con `?motionTest` |

## Niveles de los efectos (change 08c)

- `SFX[evento].db` es el nivel del efecto respecto a la **referencia de su instrumento** (siempre ≤ 0 dB; la velocidad de nota es `10^(db/20)`).
  Los volúmenes base de los instrumentos están en `patches.ts` y se calibraron con `scripts/audio/verify-sound-real.mjs`.
- Objetivo: pico del bus de efectos entre **0 y +6 dB** sobre el RMS de la música del momento (ticks de contador y teclas hasta −3 dB).
  La mezcla de cada fase suena distinto: `SFX_PHASE_DB` (mix.ts) sube los efectos en BYTECODE/RUNTIME/GPU y el bus de efectos
  acompaña a la música en el caso de estudio (−8 dB) y en la quietud (−3 dB).
- **Ducking**: mientras suena un efecto (salvo teclas y ticks de contador) la música baja 3 dB (ataque ~20 ms, liberación ~250 ms).
- **Voces**: máximo 12 en total; `VoiceBudget` decide antes que Tone y anota el descarte con motivo. Los `PolySynth` de efectos
  admiten ≥ 8 voces (`SFX_POLY`) y `maxS` de cada efecto es la vida que el presupuesto le asigna (ajustada a la cola real).
- Cuantización: nunca uses `scheduleOnce(fn, "@16n")` de Tone (devuelve tiempo del contexto interpretado como tiempo del Transport y el
  efecto llega tarde justo lo que tardó el Transport en arrancar); `Mix.nextBoundary()` convierte a ticks. Dentro de callbacks del
  Transport, todo `rampTo`/`setValueAtTime` lleva el `time` recibido (Tone avisa si no).
- Tecleo del nombre (hero): clic mecánico por letra y nota del motivo cada 3 letras (`HERO_NOTE_EVERY`, `hero:key { index, pitched }`).

## Desbloqueo del audio

Chrome y Brave solo arrancan el `AudioContext` con un clic, una tecla o un toque (la rueda y el hover no cuentan). En una visita
posterior con el sonido elegido, `SoundManager` espera esa primera activación (`onUnlockGesture`) y mientras tanto muestra el aviso
«Activar sonido» (`role="status"`, sin robar el foco, `[data-sound-unlock]`), que arranca el motor con su propio clic y desaparece.

## Reglas

- Nada suena antes de la elección en la puerta; «Saltar» es silencio por diseño. No hay `AudioContext` sin gesto (ver «Desbloqueo del audio»).
- Volumen master 35 % (rampa de 3 s). Cadena con compresor, protector de picos y limitador: pico < −1 dBFS a cualquier volumen.
- `tone` va en un chunk propio: no cuenta en el JS inicial.
- Créditos y licencias: `public/audio/CREDITS.md`.

## Verificación

Con un build en marcha (`CONTACT_TRANSPORT=mock next start -p 3126`):

```
node scripts/audio/verify-sound.mjs       # motor: puerta, fases, compás, riser, voces, pestaña oculta, reduced motion (con autoplay permitido)
node scripts/audio/verify-sound-ux.mjs    # popover, mezclador, logro, atajo M (+ axe)
node scripts/audio/verify-sound-real.mjs  # SIN flag de autoplay: aviso «Activar sonido», recarga sin clic, niveles por efecto y fase, ducking, voces, consola
node scripts/audio/measure-inp.mjs sound  # INP con sonido (CPU=4 para perfil móvil)
```

Usan el Chrome instalado (`BASE` cambia la URL). `verify-sound-real.mjs` admite `BROWSER_CHANNEL`, `BRAVE_PATH`, `LEVELS_ONLY=1`
(solo la tabla de niveles, para calibrar), `LEVELS_JSON` y `ONLY_PHASES=source,lexer`. Con `?motionTest` el gancho añade
`sfxLog()` (efectos reproducidos/descartados con motivo: `rate`, `voices`, `silence`, `quickview`, `reduced`, y `delayMs`),
`levels()` (picos del bus de efectos y de la salida, RMS de la música) y `snapshot().duckDb`.
La escucha final (task 3.3 de 08c) la hace el usuario.
