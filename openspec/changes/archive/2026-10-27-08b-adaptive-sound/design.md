## Context

Estado actual tras los changes 00–08 (observado en el código):
- `components/systems/Sound/SoundManager.tsx` (308 líneas) + `synth.ts` (171): genera con Web Audio bucles de 4 s por fase (`ambienceLoop`), sonidos de UI por nombre (`uiSound`: key, enter, toggle, achievement, open) y un tono continuo `TONE` (110–440 Hz) ligado a la velocidad del scroll. Se carga diferido con `SystemsLoader` cuando `sound.enabled`; escucha `ui:sound` del bus `lib/events.ts`; expone `window.__portafolioSound` con `?motionTest`; pausa con `visibilitychange`.
- Preferencias en `lib/store.ts`: `sound: { enabled, gateChoice }`, `prefs.sound` en localStorage; la puerta (`components/phases/Boot/BootGate.tsx`) llama a `setGateChoice`. Atajo M en `lib/shortcuts.ts`/`lib/actions.ts`.
- Fase activa en `motion/phase-state.ts` (`phaseState.phase`), velocidad de scroll ya suavizada (`motion/velocity.ts`, `uScrollVelocity` en `webgl/nodes/globals.ts`), Hold-to-Execute en `motion/useHold.ts`, terminal en `components/systems/Terminal` + `lib/commands.ts`, logros en `lib/achievements.ts` + `content/achievements.ts`, Call Stack en `components/systems/CallStack/index.tsx`, controles de cabecera en `components/systems/HeaderControls.tsx`, medios de proyecto en `components/phases/Runtime/ProjectMedia.tsx`.
- Restricciones: JS inicial intacto (línea base 255,6 KB gzip, método de 04–08), sin color literal, i18n es/en, INP < 200 ms, nada suena antes de la puerta. `tone` no está instalado; versión estable vigente 15.1.22 (`npm view tone`, publicada el 2025-04-27; `next` 15.5.x no se usa).

## Goals / Non-Goals

**Goals:**
- Una pieza musical adaptativa por capas, afinada y cuantizada, que suene musical desde el primer día sin archivos de audio (modo generativo) y admita stems producidos con la misma interfaz.
- Un único punto de entrada de eventos de sonido para que los componentes no conozcan el motor.
- Medición objetiva de niveles (RMS/pico por bus) y ganchos de prueba suficientes para verificar por código todo lo que no requiere oído humano.

**Non-Goals:**
- Componer o encargar stems producidos (el modo stems queda implementado y probado con un fixture, pero no se publican archivos sin licencia verificada).
- Medición LUFS certificada (ITU-R BS.1770 completa): se aproxima con RMS ponderado y se documenta el margen; la confirmación auditiva la hace el usuario.
- Audio espacial 3D/HRTF o sonido en `/motion` más allá del mezclador y los eventos generales.

## Decisions

### D1. Módulo `audio/` con fachada `audio.emit()` y carga perezosa en dos niveles
`audio/index.ts` (en el bundle inicial, < 1 KB) exporta `audio.emit(event, payload?)`. Si el sonido no está habilitado o el motor no ha cargado, los eventos se descartan (salvo los de estado, como la fase actual, que se guardan como «último valor»). Al elegir sonido se importa dinámicamente `audio/engine.ts`, que a su vez importa `tone` (chunk propio). Eventos tipados: `gate:sound|silent`, `boot:line`, `boot:done`, `phase:<id>`, `case:enter|leave|breakpoint`, `hover:token`, `hover:skill`, `select:skill`, `bytecode:instruction|function`, `runtime:core-hover` (con x normalizada), `hold:start|progress|cancel|complete`, `contact:focus|send|ok|error`, `notfound:enter|restart`, `terminal:key|unknown`, `achievement`, `theme`, `quickview:on|off`, `media:play|stop`, `mixer:open`. `lib/events.ts` `ui:sound` se mantiene como adaptador temporal y se elimina al migrar los emisores. *Alternativa*: suscribir el motor a cada componente → acoplamiento y bundle mayor.

### D2. Tone.js 15.1.22 como motor
Transport (84 BPM, 4/4) da el reloj musical y la cuantización (`"@1m"`, `"@4n"`, `"@8n"`); PolySynth/FMSynth/MonoSynth/NoiseSynth para los patches; `Filter`, `Chorus`, `Convolver` (respuesta de sala corta generada en el cliente, sin archivo), `BitCrusher`, `Compressor`, `Limiter`, `EQ3`/`Filter` para la cadena; `Meter`/`Analyser` para RMS y el uniform. Se fija exacta. *Alternativa*: Web Audio a mano → mucho más código para cuantización y patches; el addendum pide Tone.js.

### D3. Capas como definición declarativa + mapa de fases
`audio/layers.ts` define 6 capas (PAD, KEYS, PERC, ARP, BASS, SHIMMER) con su patch, patrón (en `Tone.Part`/`Sequence` sobre la progresión Bm7–Gmaj7–Dmaj7–A6 de 4 compases) y nivel; un `PHASE_MIX` (`boot`, `source`, `lexer`, `parser`, `bytecode`, `runtime`, `case`, `gpu`, `display`, `notfound`) dice qué capas suenan, ganancias relativas y parámetros (densidad del ARP, bitcrush, bombo). Al cambiar de contexto el motor calcula el delta y programa fundidos en el siguiente compás (`Transport.nextSubdivision("1m")`); un cambio que llega antes de ese compás reemplaza al pendiente (sin solapes). Todas las capas suenan siempre por debajo y se abren/cierran por ganancia: así nunca hay «nueva canción» y el modo stems usa exactamente la misma lógica (un `Player` en bucle por capa en vez del patch).

### D4. Escala, cuantización y catálogo de efectos
`audio/scale.ts`: pentatónica de Re mayor en dos octavas (D4–B5 aprox.), acordes de la progresión, el leitmotiv (4 notas) y sus variaciones de 3 notas (una por logro, asignada de forma estable por id), utilidades `noteFor(kind)` y `quantize(subdivision)`. `audio/sfx.ts`: catálogo `{ id, notas o generador, duración ≤ 1,2 s, bus, subdivisión, prioridad }`. Las funciones de escala, cuantización, selección de variación y límite de voces son puras y con tests unitarios.

### D5. Cadena de mezcla y protecciones
`music bus` y `sfx bus` (ganancias por interruptor Música/Efectos) → `Compressor` suave (ratio ~2:1) → `Limiter(-1)` → pasa-altos 60 Hz → EQ con −2/−3 dB en 2–5 kHz → `Volume` master (35 % por defecto, rampa de 3 s) → destino. Un gestor de voces limita a 12 voces simultáneas (descarta las de menor prioridad y aplica un rate-limit por efecto, p. ej. teclas de terminal ≥ 35 ms). Ningún patch usa senoidal pura sin envolvente: todos llevan ADSR y envío a reverb. EQ por tema: estante de agudos +1,5 dB en claro, −1,5 dB en oscuro, con rampa.

### D6. Interacciones especiales
- **Hold-to-Execute**: `hold:start` arranca un riser (NoiseSynth filtrado con frecuencia de corte y un oscilador ascendente) cuya rampa dura exactamente el umbral de `useHold` (800 ms); `hold:progress` corrige la deriva; `hold:cancel` aplica una caída de 250 ms; `hold:complete` programa impacto + acorde en `@4n`.
- **Scroll**: el motor lee la velocidad ya suavizada (`motion/velocity.ts`) en un `Tone.Loop` de baja frecuencia (o en el tick único vía suscripción) y mapea a la frecuencia del filtro del bus de música y al envío de reverb; tras 2 s de quietud, rampa a filtro cerrado y −3 dB.
- **Contacto**: `contact:send` → pulsos panoramizados L→R; `contact:ok` → leitmotiv completo resolviendo en D mayor (el único momento con la tónica cerrada); `contact:error` → dos notas descendentes.
- **404**: «cinta que se detiene» con rampa de `playbackRate`/detune descendente en la música y zumbido muy bajo; `restart` invierte la rampa.

### D7. Sincronía audio-visual
- **Aterrizaje a compás**: el controlador de transiciones de fase (03/04) consulta `audio.timeToNextBar()` (o `null` si no hay audio); si el próximo compás está a ≤ 350 ms, retrasa el inicio de la parte no-scrub (glitch T11, avisos) hasta ese instante; si está más lejos, no espera. Las transiciones scrubbed por scroll no se retrasan nunca (el usuario controla su ritmo).
- **Analizador → uniform**: un `Meter` sobre el bus de música (energía de PAD + bombo) escribe un valor suavizado en un uniform global nuevo `uAudioEnergy` (`webgl/nodes/globals.ts`), que `postfx.ts` y las partículas usan con un factor pequeño (≤ 5 % de bloom). Con sonido desactivado vale 0.
- **Now playing**: el Call Stack muestra 4–5 barras alimentadas por un `Analyser` (FFT pequeño) leído en el tick único (sin rAF propio), con nombre de fase y capa predominante; estático con reduced motion; abre el popover de sonido.

### D8. UX y estado
`lib/store.ts` amplía `sound` con `volume` (0–1, def. 0,35), `music` y `sfx` (booleanos) y `hintShown`; persistidos en `prefs`. `HeaderControls` muestra un botón que abre un popover nativo (`popover`) con slider de volumen y dos interruptores accesibles. El aviso «Pulsa M para silenciar» aparece la primera vez que suena algo (región `status`, sin foco). Vista Rápida: `quickview:on` pausa la música con fundido y deja solo efectos mínimos según preferencia. Ducking: `ProjectMedia` emite `media:play|stop` al reproducir vídeos con pista de audio (o no silenciados). Reduced motion: el motor sustituye riser y barridos por notas cortas. Puerta: texto nuevo del botón y test que comprueba `gateChoice` y `prefs.sound`.

### D9. Modo stems y licencias
`audio/sources.ts` define `GenerativeSource` (patches) y `StemsSource` (`Tone.Player` con `loop`, detección de soporte Opus/WebM vs AAC/M4A, presupuesto < 4 MB). Se elige stems solo si existe `public/audio/stems/manifest.json` con licencias declaradas; hoy no existe → modo generativo. Los tests de stems usan un fixture corto generado en la prueba (no se publica). `public/audio/CREDITS.md` se crea con la plantilla de licencias y vacío de entradas; el pie y el README muestran créditos solo si hay stems.

### D10. Mezclador y logro
Comando `mixer` en `lib/commands.ts` → abre `components/systems/Sound/Mixer.tsx` (diálogo nativo, carga diferida con el motor): una fila por capa con botones `aria-pressed` de mute y solo y un vúmetro (`meter` nativo con nivel en vivo). La primera apertura llama a `unlock("sound_engineer")` (definido en `content/achievements.ts`).

### D11. Pruebas y gancho
`window.__portafolioSound` (solo `?motionTest`) amplía el actual con `{ gate, enabled, phase, bpm, layers: {id, gain}[], rms: { music, sfx, master }, peak, voices, events: [...] }`. Los niveles se miden con `Meter` sobre cada bus; las pruebas de Playwright corren con `--autoplay-policy=no-user-gesture-required` y comprueban rangos (no oído). Lo puramente musical (que «suene bien» durante 5 minutos) lo confirma el usuario.

## Risks / Trade-offs

- [Tone.js pesa ~60–90 KB gzip] → chunk propio cargado solo tras elegir sonido; el JS inicial no lo incluye (se mide).
- [La síntesis generativa suena «a demo»] → patches con detune, chorus, reverb de convolución y humanización ligera de velocidad/tiempo; revisión auditiva del usuario antes de archivar.
- [CPU en móviles con 6 capas + reverb] → límite de 12 voces, reverb compartida en un envío, polifonía acotada por capa, y desactivar SHIMMER/bitcrush en tier bajo.
- [Aterrizar transiciones a compás se siente lento] → tope estricto de 350 ms y nunca en transiciones scrubbed.
- [Autoplay bloqueado por el navegador] → el `AudioContext` se reanuda en el mismo gesto de «Iniciar con sonido»; si se recarga con preferencia guardada, se reanuda en la siguiente interacción (comportamiento ya existente).
- [Medir LUFS en el navegador es aproximado] → RMS con ventana corta y margen documentado; verificación final auditiva del usuario.
- [Regresiones en emisores repartidos por muchos componentes] → un test de contrato que recorre el catálogo de eventos y comprueba que cada uno está emitido en algún componente.

## Migration Plan

1. Añadir `audio/` y la dependencia sin conectar; mantener `SoundManager` como puente.
2. Migrar emisores a `audio.emit()` y retirar `synth.ts` (bucles por fase y tono de scroll) en el mismo change.
3. Rollback: revertir el commit; las preferencias nuevas (`volume`, `music`, `sfx`) son aditivas y se ignoran si el motor antiguo vuelve.

## Open Questions

- Elección final de timbres (piano eléctrico FM frente a celesta para KEYS) tras la escucha del usuario; no afecta a specs ni tareas.
