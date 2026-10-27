## ADDED Requirements

### Requirement: Comando mixer
La terminal SHALL aceptar el comando `mixer`, que aparece en `help` y en el autocompletado, y que abre el mezclador de capas musicales. Si el sonido está desactivado, el comando SHALL indicarlo en la salida y ofrecer cómo activarlo, sin reproducir nada hasta que el visitante lo active.

#### Scenario: Abrir el mezclador
- **WHEN** el visitante escribe `mixer` con el sonido activo
- **THEN** se abre el mezclador de capas y la salida de la terminal lo confirma

#### Scenario: Sonido desactivado
- **WHEN** el visitante escribe `mixer` con el sonido desactivado
- **THEN** la salida explica que el sonido está apagado y cómo activarlo, y no suena nada
