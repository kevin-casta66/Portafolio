## Why

El portafolio está implementado, pero su audio (change 06) no está a la altura: todo se sintetiza como bucles de ruido y senoidales sin tonalidad ni tempo, un tono senoidal puro sigue la velocidad del scroll (fatigante) y los logros suenan como un arpegio senoidal sin envolvente. Cada fase suena como un objeto distinto. El docs/ADDENDUM-v3.md (que manda sobre docs/BRIEF.md §2–§5 y docs/ADDENDUM-v2.md en lo relativo al audio) pide sustituirlo por **una sola pieza musical adaptativa por capas**, afinada y a tiempo, que un reclutador pueda escuchar 3–5 minutos sin cansarse y que demuestre dominio técnico de audio interactivo.

Depende de: `01-foundation-design-system` (store, tokens, i18n), `02-static-semantic-sections` (fases y formulario de contacto), `03-scroll-choreography` (reloj único, fases, velocidad de scroll, puerta de arranque), `04-webgl-scenes` (uniforms globales para la sincronía audio-visual), `05-case-studies-view-transitions` (Hold-to-Execute, casos), `06-global-systems` (sonido actual, terminal, logros, Call Stack, Vista Rápida), `07-memory-heap` y `08-motion-showcase` (solo para que el sonido no rompa sus rutas). Se aplica **antes** de `09-performance-a11y-fallbacks` y `10-testing-deployment`, que auditan y prueban el resultado.

## What Changes

- **BREAKING (respecto al change 06)**: se elimina el motor de bucles sintetizados por fase y el **tono senoidal que seguía la velocidad del scroll**; se sustituyen por música adaptativa por capas.
- Nuevo módulo `audio/` (`engine.ts`, `layers.ts`, `sfx.ts`, `scale.ts`, `patches.ts`) con un único punto de entrada de eventos (`audio.emit('phase:runtime')`, `audio.emit('hold:start')`…): los componentes no conocen el motor.
- Una pieza en **Re mayor a 84 BPM (4/4)**, progresión Bm7 – Gmaj7 – Dmaj7 – A6, con 6 capas sincronizadas (PAD, KEYS, PERC, ARP, BASS, SHIMMER) que entran y salen **cuantizadas al siguiente compás**; leitmotiv de 4 notas de Kevin Castaño.
- **Modo generativo por defecto** (patches con ADSR, filtros, reverb por convolución corta y chorus) con **Tone.js 15.1.22**, cargado con import dinámico **solo tras elegir sonido**; **modo stems** opcional con la misma interfaz (Opus/WebM + AAC/M4A, < 4 MB) cuando existan archivos con licencia verificada (`public/audio/CREDITS.md`).
- Cadena de mezcla: buses MÚSICA y EFECTOS → compresor suave → limitador (techo −1 dBTP) → master con pasa-altos a 60 Hz y atenuación ligera de 2–5 kHz; máximo 12 voces simultáneas.
- **Mapa sonoro por fase** (BOOT, SOURCE, LEXER, PARSER, BYTECODE, RUNTIME, caso de estudio, GPU, DISPLAY, 404) con sus capas e interacciones afinadas a la pentatónica de Re mayor.
- Interacciones estrella: riser sincronizado con Hold-to-Execute (cae si se suelta), velocidad de scroll que abre/cierra filtro y reverb de la música (y −3 dB tras 2 s de quietud), logros como variaciones del leitmotiv, teclas mecánicas en la terminal con límite de disparo, ecualización por tema, envío del contacto como el momento sonoro más satisfactorio.
- Easter egg: comando de terminal **`mixer`** con mini mezclador (solo/mute por capa y vúmetros) y nuevo logro **`sound_engineer`**.
- Sincronía audio-visual: transiciones de fase que aterrizan en el primer tiempo del compás (≤ 350 ms de retraso), analizador cuyo nivel respira en bloom/partículas mediante un uniform, indicador **«now playing»** con ecualizador real en el Call Stack.
- UX: puerta con «▶ Iniciar con sonido · recomendado con audífonos», master inicial al 35 % con fundido de 3 s, popover de sonido con volumen y conmutadores Música/Efectos persistidos, aviso «Pulsa M para silenciar», Vista Rápida y vídeos con ducking, pestaña oculta con pausa del Transport, reduced motion sin risers ni barridos, nada suena antes de la puerta.
- `window.__portafolioSound` (solo con `?motionTest`) ampliado con capas activas, fase, tempo, RMS por bus y estado de la puerta; tests unitarios y de navegador (incl. que «Iniciar con sonido» registra la elección en la puerta y en las preferencias).

## Capabilities

### New Capabilities
<!-- Ninguna: el sonido ya es una capability (`sound`, change 06); se reescriben sus requisitos. -->

### Modified Capabilities
- `sound`: se reemplazan «Ambiente por fase», «Sonidos de interfaz», «Tono según velocidad del scroll» y «Carga diferida y persistencia», y se amplían «Preferencia inicial desde la puerta de arranque» y «Botón de silencio siempre visible»; se añaden requisitos de música por capas, cadena de mezcla y niveles, mapa por fase, Hold-to-Execute sonoro, sincronía audio-visual, UX del control de sonido, modo stems con licencias y gancho de pruebas.
- `achievements`: se añade el logro `sound_engineer` al catálogo.
- `terminal`: se añade el comando `mixer`.
- `call-stack-navigation`: se añade el indicador «now playing».

## Impact

- **Código**: nuevo `audio/` (motor, capas, sfx, escala, patches, mezclador); se retira `components/systems/Sound/synth.ts` y se rehace `SoundManager.tsx` como puente fino; emisores de eventos en BootGate, hero, LEXER, PARSER, BYTECODE, RUNTIME, Hold-to-Execute, casos, GPU/laboratorio, formulario de contacto, 404, terminal, logros, tema, Vista Rápida y medios de proyecto (`lib/events.ts` se amplía o se sustituye por `audio.emit`); `HeaderControls` (popover), Call Stack (now playing), `lib/commands.ts` (`mixer`), `content/achievements.ts` (`sound_engineer`), `webgl/nodes/globals.ts` (uniform de energía de audio), `lib/store.ts` (preferencias de volumen, música y efectos), mensajes es/en.
- **Dependencias**: `tone` 15.1.22 (exacta), solo en un chunk diferido; nada de audio en el JS inicial.
- **Rendimiento**: sin impacto en INP (programación en el reloj de audio, límite de 12 voces, decodificación fuera del hilo crítico); JS inicial del home sin aumento apreciable (línea base 255,6 KB gzip con el método de los changes 04–08).
- **Contenido y licencias**: `public/audio/CREDITS.md` obligatorio si hay archivos; créditos en el pie y en el README si se usan stems.
- **Docs**: docs/ADDENDUM-v3.md (fuente), docs/ROADMAP.md (nuevo change antes de 09), docs/MOTION-SPEC.md (aterrizaje de transiciones a compás con audio activo).
