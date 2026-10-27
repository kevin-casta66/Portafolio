# audio/ — motor de sonido adaptativo (change 08b)

Una sola pieza generativa (Tone.js 15.1.22, Re mayor, 84 BPM, progresión Bm7–Gmaj7–Dmaj7–A6) con seis capas
(PAD, KEYS, PERC, ARP, BASS, SHIMMER) que entran y salen según la fase visible, cuantizadas al compás.
Los efectos de interfaz usan solo notas de la pentatónica y se cuantizan a la corchea.

## Piezas

| Archivo | Función |
|---|---|
| `index.ts` | Fachada del JS inicial (sin `tone`): `audio.emit`, `audio.gate`, `audio.controls`, `timeToNextBar` |
| `engine.ts` | Se carga tras elegir sonido en la puerta: arranca el `Mix`, escucha el store, scroll, visibilidad, Vista Rápida y movimiento reducido |
| `mix.ts` | Cadena maestra, contextos de mezcla, presupuesto de voces (12), riser, 404 «cinta» |
| `layers.ts` / `scale.ts` / `voices.ts` / `sfx.ts` / `patches.ts` | Patrones, escala, gestor de voces, catálogo de efectos, patches |
| `stems-manifest.ts` / `sources.ts` | Modo stems opcional (`NEXT_PUBLIC_AUDIO_STEMS=1` + `public/audio/stems/manifest.json`) |
| `test-hook.ts` | `window.__portafolioSound`, solo con `?motionTest` |

## Reglas

- Nada suena antes de la elección en la puerta; «Saltar» es silencio por diseño. No hay `AudioContext` sin gesto.
- Volumen master 35 % (rampa de 3 s). Cadena con compresor, protector de picos y limitador: pico < −1 dBFS a cualquier volumen.
- `tone` va en un chunk propio: no cuenta en el JS inicial.
- Créditos y licencias: `public/audio/CREDITS.md`.

## Verificación

Con un build en marcha (`CONTACT_TRANSPORT=mock next start -p 3126`):

```
node scripts/audio/verify-sound.mjs      # motor: puerta, fases, compás, riser, voces, pestaña oculta, reduced motion
node scripts/audio/verify-sound-ux.mjs   # popover, mezclador, logro, atajo M (+ axe)
node scripts/audio/measure-inp.mjs sound # INP con sonido (CPU=4 para perfil móvil)
```

Usan el Chrome instalado (`BASE` cambia la URL). La escucha final (task 7.5) la hace el usuario.
