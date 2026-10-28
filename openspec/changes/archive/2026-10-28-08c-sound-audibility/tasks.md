## 1. Desbloqueo en visitas posteriores

- [x] 1.1 Añadir el aviso «Activar sonido» (es/en, región `status`, sin robar foco) que aparece con el sonido elegido y el contexto sin arrancar, arranca el motor al activarlo y desaparece al sonar o al silenciar; verificar con Chrome sin flag de autoplay que tras recargar y hacer solo scroll y hover se muestra y que al activarlo los siguientes hovers suenan
- [x] 1.2 Verificar en Brave (navegador conectado) el recorrido de 1.1 y la primera visita con la puerta

## 2. Audibilidad y polifonía

- [x] 2.1 Subir `maxPolyphony` de los sintetizadores de efectos a 8 o más y acortar sus colas en `audio/patches.ts`, haciendo que `VoiceBudget` decida antes que Tone; verificar que el hover rápido por tokens y skills no registra «Max polyphony exceeded» en consola
- [x] 2.2 Recalibrar los niveles de `audio/sfx.ts` y añadir el ducking de la música (−3 dB, recuperación ≤ 300 ms); verificar con el script de auditoría que cada efecto queda entre 0 y +6 dB sobre la música de su fase (ticks y teclas hasta −3 dB) y que el pico a volumen 100 % sigue por debajo de −1 dBFS
- [x] 2.3 Convertir el tecleo del nombre del hero en un arpegio del motivo (una nota cada 2–3 letras); verificar que suena al menos una nota por cada 3 letras sin notas descartadas

## 3. Pruebas y cierre

- [x] 3.1 Añadir al gancho el registro de efectos descartados con motivo y crear `scripts/audio/verify-sound-real.mjs` (sin flag de autoplay, interacciones reales, recarga sin clic, niveles y consola); verificar que pasa
- [x] 3.2 Verificar `pnpm lint`, `typecheck`, `test`, `build`, que el JS inicial de `/es` no crece más de 0,5 KB gzip y `openspec validate 08c-sound-audibility --strict`
- [ ] 3.3 Escucha del usuario: recorrer el sitio y confirmar que cada interacción del mapa sonoro se oye (queda sin marcar hasta su confirmación)
