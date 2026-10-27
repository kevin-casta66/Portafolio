## ADDED Requirements

### Requirement: Logro de ingeniero de sonido
El catálogo de logros SHALL incluir `sound_engineer` («ingeniero de sonido»), que se desbloquea la primera vez que el visitante abre el mezclador de capas, con textos en español e inglés, y que se comporta como el resto de logros (aviso discreto, anuncio accesible, contador y persistencia).

#### Scenario: Abrir el mezclador por primera vez
- **WHEN** el visitante abre el mezclador de capas por primera vez
- **THEN** se desbloquea el logro `sound_engineer` y aparece su aviso

#### Scenario: Volver a abrir el mezclador
- **WHEN** el visitante abre el mezclador en otra ocasión
- **THEN** el logro no vuelve a anunciarse
