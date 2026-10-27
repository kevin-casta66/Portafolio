# ADDENDUM v3 — «PORTAFOLIO»: Rediseño completo del sistema de sonido

> Fuente de verdad del change `08b-adaptive-sound`. Manda sobre docs/BRIEF.md, docs/ADDENDUM-v2.md y el
> diseño sonoro del change 06 (spec `sound`) en todo lo relativo al audio.

## 0. Contexto y diagnóstico
El portafolio está implementado y cumple los prompts anteriores. El único problema es el audio. Diagnóstico del motor actual:
- No hay audio producido: todo se sintetiza en tiempo real (bucles generados con ruido y senoidales, clics aleatorios).
- Un tono senoidal puro sigue la velocidad del scroll (110–440 Hz). Es fatigante y debe ELIMINARSE.
- Los logros usan un arpegio senoidal sin envolvente ni espacio acústico.
- No existe tonalidad, tempo ni coherencia entre fases: cada fase suena como un objeto distinto.
- Verificar con un test que "Iniciar con sonido" registra correctamente la elección en la puerta y en las preferencias.

Conserva lo que funciona: la puerta de entrada con sonido/silencio, el atajo M, la persistencia de la preferencia, el fundido al ocultar la pestaña (visibilitychange) y el hook de pruebas `?motionTest` con `window.__portafolioSound`, que debe ampliarse.

## 1. Objetivo y principios
El sonido debe hacer que un reclutador disfrute 3 a 5 minutos de navegación sin cansarse, y debe demostrar dominio técnico de audio interactivo. Principios:
1. **Recompensa, no papel tapiz**: la música es discreta; los sonidos confirman acciones y premian la exploración.
2. **Una sola pieza, muchas capas**: nunca se cambia de canción entre fases; se suman o quitan capas de la misma composición.
3. **Todo afinado y a tiempo**: cada sonido de UI es una nota de la escala de la pieza y se cuantiza al pulso, de modo que ninguna interacción desafina.
4. **Considerado con la oficina**: volumen inicial bajo, sin agudos estridentes, nada que sobresalte. El sonido nunca transmite información que no esté también en pantalla.
5. **El silencio también es diseño**: cuando el usuario se detiene a leer, la música se recoge.

## 2. Dirección musical
- **Género**: electrónica ambiental cálida con toques lo-fi y de piano eléctrico. En la línea estética de la electrónica ambiental melódica (texturas suaves, pulso tranquilo), sin copiar ninguna obra existente.
- **Tempo**: 84 BPM, compás 4/4.
- **Tonalidad**: Re mayor. Progresión base de 4 compases: Bm7 – Gmaj7 – Dmaj7 – A6 (cálida y cíclica, nunca termina de cerrar hasta el final de la experiencia).
- **Escala de interacción**: pentatónica de Re mayor (Re, Mi, Fa#, La, Si) en dos octavas. Cualquier combinación de notas de UI suena consonante.
- **Firma sonora (leitmotiv)**: un motivo de 4 notas en piano eléctrico o celesta que identifica a Kevin Castaño. Aparece al terminar el arranque, en los logros (variado) y completo al final, en el contacto.
- **Paleta de instrumentos**: pad cálido (ondas detunadas con filtro pasa-bajos y reverb), piano eléctrico suave (FM), pluck/arpegio, bajo redondo con envolvente, percusión suave (clics, rimshot, hi-hats filtrados, bombo muy contenido), texturas brillantes para la fase GPU.

## 3. Arquitectura de la música adaptativa
- **Capas verticales (stems)** de la misma pieza, sincronizadas al mismo reloj: PAD, KEYS (motivo), PERC, ARP, BASS, SHIMMER.
- Las capas entran y salen con fundidos que empiezan en el siguiente compás (cuantización a compás), nunca a mitad de frase.
- **Dos modos de fuente** con la misma interfaz:
  - **Modo stems**: archivos producidos (Opus en WebM con fallback AAC en M4A para Safari), 96–128 kbps, en bucle sin cortes. Presupuesto total < 4 MB, cargados solo después de elegir "Iniciar con sonido".
  - **Modo generativo (por defecto hasta tener stems)**: las mismas capas sintetizadas con patches bien diseñados (envolventes ADSR suaves, filtros, reverb por convolución con una respuesta de sala corta, chorus en el pad). Debe sonar musical desde el primer día, no como tonos de prueba.
- **Motor**: Tone.js (Transport para tempo y cuantización, Sampler/PolySynth, efectos), cargado con import dinámico solo al activar el sonido. Verifica la versión vigente y fíjala.
- **Bus de mezcla**: música → bus MÚSICA; interacciones → bus EFECTOS; ambos → compresor suave → limitador (techo −1 dBTP) → master. Filtro pasa-altos a 60 Hz en el master (los altavoces de portátil no reproducen graves profundos y solo ensucian) y una ligera atenuación en 2–5 kHz para evitar estridencia.

## 4. Mapa sonoro por fase
| Fase | Capas activas | Interacciones sonoras |
|---|---|---|
| BOOT | PAD (entra en 4 s con el filtro cerrado) | Cada línea `[ OK ]` = una nota ascendente suave de la escala. Al 100%: la firma sonora completa en el primer tiempo del compás. |
| SOURCE (Hero) | PAD + KEYS | El tecleo del nombre suena como teclas mecánicas suaves; cada letra dispara además una nota del motivo, así que el nombre "toca" la firma. |
| LEXER | + PERC ligera | Hover sobre un token = una nota según su tipo (keyword Re, identifier Mi, string Fa#, number La). Los contadores suben con ticks rápidos y suaves que terminan en una campanita. |
| PARSER (Habilidades) | + ARP (su densidad crece a medida que el árbol crece) | Hover en una tecnología = nota según su categoría. Clic en una tecnología = acorde que se abre + un barrido brillante que acompaña las trazas de luz hacia los proyectos. |
| BYTECODE (Experiencia) | + BASS (pulso en corcheas, como el program counter) | Cada instrucción resaltada = un pluck apagado. Cambio de función/empleo = un platillo suave en crescendo. |
| RUNTIME (Proyectos) | Mezcla completa con bombo contenido: es el clímax, pero sin ser invasivo | Hover en un núcleo = destello panoramizado según la posición X del cursor. Hold-to-Execute: ver sección 5. |
| Caso de estudio | La música baja 8 dB y queda solo PAD + KEYS | Ambiente de lectura. Cambiar de breakpoint = tick suave. |
| GPU (Laboratorio) | Sin bombo; + SHIMMER (textura granular), arpegio con leve bitcrush (rasterización) | Las demos interactivas pueden modular el filtro y la reverb de la música en vivo. |
| DISPLAY (Contacto) | Se retiran capas hasta PAD + KEYS | Foco en un campo = nota suave. Enviar = blips de "paquete" que viajan de izquierda a derecha en el panorama. `200 OK` = firma sonora completa que resuelve por fin en el acorde de tónica (Re mayor). Error = dos notas descendentes suaves, nunca un sonido áspero. |
| 404 | Efecto de "cinta que se detiene" (bajada de pitch) y silencio con un leve zumbido | "Reiniciar proceso" = cinta que arranca. |

## 5. Interacciones estrella
- **Hold-to-Execute**: mientras el anillo se llena (~800 ms) suena un riser (ruido filtrado con el filtro abriéndose y un tono ascendente) sincronizado exactamente con el anillo. Si se suelta antes, el riser cae y se desvanece. Al completarse: impacto suave + acorde resuelto, cuantizado al siguiente tiempo, coincidiendo con la expansión del plano.
- **Velocidad del scroll** (sustituye al tono senoidal eliminado): modula de forma sutil la apertura del filtro y el envío de reverb del bus de música. Scroll rápido = la música se abre; detenerse a leer = la música se cierra y baja 3 dB tras 2 s de quietud.
- **Logros**: variación de 3 notas del leitmotiv, cuantizada a la corchea siguiente. Cada logro usa una variación distinta.
- **Terminal**: teclas mecánicas suaves con variación aleatoria de pitch (±3%) y límite de frecuencia de disparo para que escribir rápido no sature. Comando desconocido = nota grave suave.
- **Easter egg `mixer`**: el comando abre un mini mezclador con las capas (solo/mute por stem y vúmetros). Desbloquea el logro `sound_engineer`. Demuestra dominio de audio.
- **Cambio de tema**: tema claro = ecualización un poco más brillante; tema oscuro = más cálida.

## 6. Sincronía audio-visual
- Las transiciones de fase aterrizan en el primer tiempo del compás cuando el audio está activo (sin retrasar más de 350 ms la respuesta visual).
- Un analizador lee la energía del bombo y del pad y la envía como uniform a los shaders: bloom y partículas respiran muy sutilmente con la música.
- Indicador "now playing" en el Call Stack: barras de ecualizador reales (del analizador) junto al nombre de la fase y la capa actual. Clic = abre el control de sonido.

## 7. UX para el reclutador
- Botón de la puerta: "▶ Iniciar con sonido · recomendado con audífonos".
- Volumen inicial del master al 35%, con fundido de entrada de 3 s.
- El botón de sonido abre un pequeño popover con volumen general y dos interruptores independientes: Música y Efectos. Todo se guarda en las preferencias.
- La primera vez que suena algo, un aviso discreto: "Pulsa M para silenciar".
- Vista Rápida: la música se pausa con fundido y solo quedan efectos mínimos (o ninguno, según preferencia).
- Si se reproduce un video de un proyecto con audio, la música baja automáticamente (ducking).
- Pestaña oculta: fundido a silencio y pausa del Transport; al volver, reanudación con fundido.
- Reduced motion no silencia, pero desactiva el riser y los barridos; deja notas cortas.
- Nunca suena nada antes de la elección en la puerta.

## 8. Niveles de mezcla
- Música: muy de fondo, alrededor de −22 LUFS a corto plazo con el master al 35%.
- Efectos: picos como máximo 6 dB por encima de la música en ese momento; ningún efecto dura más de 1,2 s salvo el riser.
- Sin clipping en ningún escenario (verificar con el limitador y con tests).

## 9. Origen de los audios y licencias
- Si se usan stems producidos: composición encargada o librería con licencia comercial clara que permita uso web. Créditos visibles en el pie de página y en el README.
- Muestras (teclas mecánicas, piano eléctrico, percusión) solo con licencia CC0 o comercial verificada. Documenta la fuente de cada archivo en `/public/audio/CREDITS.md`.
- No uses música ni muestras de obras existentes sin licencia.

## 10. Implementación y pruebas
- Módulo `audio/` con: `engine.ts` (Transport, buses, carga perezosa), `layers.ts` (definición de capas y fases), `sfx.ts` (catálogo de sonidos de interacción con nota, duración y bus), `scale.ts` (escala pentatónica y utilidades de cuantización), `patches.ts` (síntesis del modo generativo).
- Un único punto de entrada de eventos (`audio.emit('phase:runtime')`, `audio.emit('hold:start')`...) para que los componentes no conozcan detalles del motor.
- Amplía `window.__portafolioSound` (solo con `?motionTest`) para exponer: capas activas, fase, tempo, nivel RMS por bus y estado de la puerta.
- Tests con Playwright: la elección "con sonido" activa el motor; cada fase activa sus capas; el riser se cancela al soltar; los niveles RMS se mantienen dentro de los límites; no hay sonido antes de la puerta; la pestaña oculta silencia.
- Rendimiento: el audio no puede afectar INP. Carga diferida, decodificación fuera del hilo crítico y límite de voces simultáneas (máximo 12).

## 11. Criterios de aceptación
- Ningún sonido es una senoidal pura sin envolvente ni espacio.
- Las fases suenan como una sola pieza que evoluciona, sin cortes ni cambios de canción.
- Cualquier combinación de interacciones suena afinada y en tiempo.
- Un reclutador puede escuchar 5 minutos seguidos sin fatiga, y silenciar o bajar el volumen en un segundo.
- El contacto enviado con éxito produce el momento sonoro más satisfactorio de toda la experiencia.
