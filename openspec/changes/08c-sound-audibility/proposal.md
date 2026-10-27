## Why

Tras aplicar 08b, una auditoría con interacciones reales en Chrome sin permiso de autoplay mostró que muchos sonidos no se oyen aunque los componentes emiten sus eventos: al volver al sitio el motor no arranca hasta un clic, varios efectos quedan 10–12 dB por debajo de la música, los sintetizadores de efectos descartan notas por falta de polifonía y el tecleo del nombre pierde la mayoría de sus notas. Las pruebas de 08b no lo detectaron porque se lanzaban con autoplay permitido.

## What Changes

- Desbloqueo del audio en visitas posteriores: el motor arranca con la primera activación de usuario que acepte el navegador (clic, toque o tecla; la rueda y el hover no cuentan) y, mientras tanto, se muestra un aviso discreto y accesible «Activar sonido» que lo arranca con un clic.
- Audibilidad de los efectos: todo efecto de interacción queda entre 0 y +6 dB sobre la música del momento (hoy bytecode, núcleos y tarjetas de RUNTIME, teclas y apertura de la terminal y ticks de contadores quedan 10–12 dB por debajo), con un ducking ligero de la música (≈ −3 dB, recuperación ≤ 300 ms) mientras suena un efecto.
- Polifonía de efectos: los sintetizadores de efectos admiten al menos 8 voces con colas más cortas, y el presupuesto global de 12 voces decide antes de que Tone.js descarte notas («Max polyphony exceeded»).
- Tecleo del nombre (SOURCE): suena como un arpegio del motivo con una nota cada 2–3 letras en lugar de intentar una por letra.
- Pruebas: recorrido de navegador sin permiso de autoplay (puerta, recarga sin clic, hover y scroll) que comprueba el nivel y las voces de cada efecto y que la consola no registra notas descartadas.

## Capabilities

### New Capabilities

### Modified Capabilities
- `sound`: cambian «Carga diferida y persistencia» (desbloqueo en visitas posteriores y aviso), «Cadena de mezcla y niveles» (suelo de audibilidad, ducking y polifonía), «Mapa sonoro por fase» (tecleo del nombre como arpegio) y «Gancho de pruebas del sonido» (registro de efectos reproducidos y descartados).

## Impact

- Código: `audio/sfx.ts` (niveles), `audio/mix.ts` (ducking, presupuesto de voces, registro de descartes), `audio/patches.ts` (polifonía y colas), `components/systems/Sound/SoundManager.tsx` y `lib/audio.ts` (desbloqueo y aviso), `motion/choreography/hero.ts` (emisión del arpegio), `audio/test-hook.ts`, `scripts/audio/` (recorrido sin autoplay).
- Textos: aviso «Activar sonido» en `messages/es.json` y `messages/en.json`.
- Sin dependencias nuevas; el JS inicial no debe crecer más de 0,5 KB gzip.
- Se aplica antes de 09; no toca 09 ni 10.
