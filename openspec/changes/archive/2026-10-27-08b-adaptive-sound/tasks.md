## 1. Base del módulo de audio

- [x] 1.1 Instalar `tone` 15.1.22 exacta con pnpm y crear `audio/` (`index.ts`, `engine.ts`, `layers.ts`, `sfx.ts`, `scale.ts`, `patches.ts`, `sources.ts`); verificar que `pnpm typecheck` pasa y que el JS inicial de `/es` no incluye `tone` (método de 04–08, línea base 255,6 KB gzip)
- [x] 1.2 Implementar `audio/scale.ts` (pentatónica de Re mayor en 2 octavas, progresión Bm7–Gmaj7–Dmaj7–A6, leitmotiv y variaciones de 3 notas estables por id, `noteFor(kind)`, cuantización) con tests unitarios que comprueban que toda nota de UI pertenece a la escala y que cada logro obtiene una variación distinta y estable
- [x] 1.3 Implementar la fachada `audio.emit()` tipada con el catálogo de eventos de D1 (descarta eventos sin motor y guarda el último estado de fase) y su test unitario; verificar que nada se importa de `tone` en `audio/index.ts`

## 2. Motor, capas y mezcla

- [x] 2.1 Implementar en `audio/engine.ts` el Transport (84 BPM, 4/4), buses MÚSICA/EFECTOS, compresor, limitador −1 dBTP, pasa-altos 60 Hz, atenuación 2–5 kHz y volumen master (35 % con rampa de 3 s); verificar en navegador con el gancho que el master arranca en 0 y llega al 35 % en 3 s y que el pico nunca supera −1 dBFS
- [x] 2.2 Diseñar los patches generativos de las 6 capas (PAD con detune+chorus+reverb de convolución corta generada, KEYS FM, ARP pluck, BASS redondo, PERC suave, SHIMMER granular) en `audio/patches.ts`, todos con ADSR y envío a reverb; verificar con un test que ningún patch es una senoidal sin envolvente y dejar una muestra de 30 s grabada con `Tone.Offline` en el scratchpad para la escucha del usuario
- [x] 2.3 Implementar `audio/layers.ts` (patrones sobre la progresión de 4 compases y `PHASE_MIX` para boot, source, lexer, parser, bytecode, runtime, case, gpu, display, notfound) con cambios cuantizados al siguiente compás y reemplazo de cambios pendientes; verificar con tests del cálculo de deltas y en navegador que cruzar 3 fases rápido solo aplica la última, en el compás siguiente
- [x] 2.4 Implementar el gestor de voces (máx. 12, prioridades, rate-limit por efecto) y el catálogo `audio/sfx.ts` (duración ≤ 1,2 s salvo riser); verificar con tests unitarios y en navegador disparando 50 efectos en 2 s sobre RUNTIME que nunca hay más de 12 voces ni clipping
- [x] 2.5 Implementar `audio/sources.ts` con modo generativo por defecto y modo stems (`Tone.Player` en bucle, Opus/WebM o AAC/M4A según soporte, presupuesto < 4 MB) que solo se activa si existe `public/audio/stems/manifest.json`; crear `public/audio/CREDITS.md` con la plantilla de licencias; verificar con un fixture de stems generado en el test (no publicado) que la misma lógica de capas funciona en ambos modos

## 3. Integración por fase e interacciones

- [x] 3.1 Sustituir `components/systems/Sound/synth.ts` y el tono de scroll por un `SoundManager` puente que carga el motor tras elegir sonido, reenvía la fase activa y mantiene M, persistencia y `visibilitychange` (fundido + pausa del Transport); verificar que no queda ningún tono continuo ligado al scroll y que ocultar la pestaña silencia y reanuda sin perder la posición
- [x] 3.2 Emitir los eventos de BOOT y SOURCE (líneas `[ OK ]`, firma al 100 % en el primer tiempo, tecleo del nombre con notas del motivo) y cambiar el botón de la puerta a «▶ Iniciar con sonido · recomendado con audífonos» (es/en); verificar con un test que la elección registra `gateChoice` y la preferencia guardada, y con el gancho que nada suena antes de la puerta
- [x] 3.3 Emitir los eventos de LEXER y PARSER (nota por tipo de token, ticks de contadores con campanita, nota por categoría, acorde con barrido al seleccionar) y de BYTECODE (pluck por instrucción, platillo al cambiar de empleo); verificar con el registro de eventos del gancho al recorrer las secciones
- [x] 3.4 Emitir los eventos de RUNTIME (destello panoramizado por la X del cursor sobre un núcleo) y el riser del Hold-to-Execute (start, progress, cancel, complete cuantizado) en `motion/useHold.ts`/`HoldToExecute`; verificar en navegador que el riser termina con el anillo, cae al soltar antes y que el impacto suena en el siguiente tiempo
- [x] 3.5 Emitir los eventos del caso de estudio (−8 dB, solo PAD+KEYS, tick por breakpoint), GPU (sin bombo, SHIMMER, bitcrush; modulación opcional desde las demos del laboratorio), DISPLAY (nota al enfocar, pulsos L→R al enviar, firma que resuelve en Re mayor con `200 OK`, dos notas descendentes con error) y 404 (cinta que se detiene y que arranca); verificar con el gancho y con `CONTACT_TRANSPORT=mock` y `mock-fail`
- [x] 3.6 Implementar la respuesta a la velocidad del scroll (filtro y reverb del bus de música; −3 dB y filtro cerrado tras 2 s de quietud); verificar con el gancho los valores al hacer scroll rápido y tras 2 s quieto
- [x] 3.7 Sonidos de terminal (teclas mecánicas ±3 % con rate-limit, nota grave en comando desconocido), logros (variación de 3 notas en la corchea siguiente) y tema (EQ más brillante en claro, más cálida en oscuro); verificar con tests de la variación por logro y en navegador escribiendo rápido sin saturar

## 4. UX del control de sonido

- [x] 4.1 Ampliar `lib/store.ts` con `volume` (0,35 por defecto), `music`, `sfx` y `hintShown` persistidos y crear el popover de sonido en `HeaderControls` (slider y dos interruptores accesibles); verificar con tests del store y en navegador que apagar Música mantiene los efectos y que todo sobrevive a recargar
- [x] 4.2 Mostrar una sola vez el aviso «Pulsa M para silenciar» (región `status`, sin robar foco) al sonar algo por primera vez; verificar en navegador y con axe
- [x] 4.3 Vista Rápida (pausa de la música con fundido, efectos mínimos según preferencia), ducking de vídeos de proyecto con audio (`media:play|stop`) y reduced motion (sin risers ni barridos, notas cortas); verificar cada caso con el gancho

## 5. Mezclador, logro y now playing

- [x] 5.1 Añadir el comando `mixer` (help, autocompletado, mensaje si el sonido está apagado) y el mezclador `components/systems/Sound/Mixer.tsx` (mute/solo con `aria-pressed` y vúmetros en vivo, carga diferida con el motor); verificar con teclado que solo/mute afectan a la capa correcta
- [x] 5.2 Definir el logro `sound_engineer` (es/en) en `content/achievements.ts` y desbloquearlo en la primera apertura del mezclador; verificar que se anuncia una sola vez
- [x] 5.3 Añadir el indicador «now playing» al Call Stack (barras del analizador leídas en el tick único, fase y capa predominante, estático con reduced motion, abre el popover, oculto sin sonido); verificar con axe y en navegador

## 6. Sincronía audio-visual

- [x] 6.1 Exponer `audio.timeToNextBar()` y hacer que las partes no-scrub de las transiciones de fase (glitch T11, avisos) esperen al primer tiempo del compás solo si llega en ≤ 350 ms; actualizar docs/MOTION-SPEC.md; verificar con el gancho que el retraso medido nunca supera 350 ms y que sin sonido es 0
- [x] 6.2 Añadir el uniform `uAudioEnergy` en `webgl/nodes/globals.ts` alimentado por el medidor del bus de música (suavizado, 0 sin sonido) y usarlo con un factor ≤ 5 % en bloom y partículas; verificar que con el sonido apagado el render es idéntico al actual (comparativa A/B con `git show HEAD:` como en el change 08)

## 7. Gancho de pruebas y verificación integral

- [x] 7.1 Ampliar `window.__portafolioSound` (solo `?motionTest`) con puerta, fase, tempo, capas y ganancias, RMS por bus, pico, voces y registro de eventos; verificar que sin el parámetro no existe
- [x] 7.2 Escribir las pruebas de navegador (Playwright, Chrome instalado, autoplay permitido): «con sonido» activa el motor, cada fase activa sus capas, el riser se cancela al soltar, RMS dentro de límites (música ≈ −22 LUFS aproximado con master 35 %, efectos ≤ +6 dB sobre la música), sin sonido antes de la puerta y pestaña oculta silencia; verificar que todas pasan
- [ ] 7.3 Medir INP con el sonido activo (hover, Hold, terminal, scroll) en perfil móvil y el JS inicial de `/es`; verificar INP < 200 ms y que el JS inicial no crece más de 1 KB
- [x] 7.4 Actualizar docs/ROADMAP.md (nuevo change antes de 09), el README técnico del motor de audio y los créditos; verificar `pnpm lint`, `typecheck`, `test`, `build` y `openspec validate 08b-adaptive-sound --strict`
- [ ] 7.5 Escucha del usuario: 5 minutos seguidos recorriendo el sitio sin fatiga, silenciar o bajar volumen en un segundo y envío del contacto como el momento más satisfactorio (queda sin marcar hasta su confirmación)
