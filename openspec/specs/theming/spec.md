## Purpose

Permite al visitante usar el tema oscuro "Silicio" o el tema claro "Datasheet", ambos accesibles, persistentes y sin parpadeos al cargar.

## Requirements

### Requirement: Dos temas
El sistema SHALL ofrecer un tema oscuro "Silicio" y un tema claro "Datasheet" (papel #F4F1EA, tinta #12141A). Ambos temas SHALL redefinir los mismos tokens semánticos, de modo que ningún componente necesite lógica específica por tema.

#### Scenario: Cambio de tema
- **WHEN** el visitante activa el tema claro
- **THEN** fondo, superficies, texto, bordes y acentos cambian a los valores "Datasheet" sin recargar la página

### Requirement: Tema inicial
En la primera visita el tema SHALL seguir la preferencia del sistema operativo (`prefers-color-scheme`), usando el tema oscuro cuando no haya preferencia. Una elección explícita del visitante SHALL persistir entre visitas y prevalecer sobre la preferencia del sistema.

#### Scenario: Preferencia del sistema
- **WHEN** un visitante nuevo con el sistema en modo claro abre el sitio
- **THEN** el sitio se muestra en tema "Datasheet"

#### Scenario: Elección persistida
- **WHEN** el visitante elige el tema oscuro y vuelve otro día con el sistema en modo claro
- **THEN** el sitio se muestra en tema oscuro

#### Scenario: Almacenamiento no disponible
- **WHEN** el navegador bloquea el almacenamiento local
- **THEN** el sitio se muestra con el tema de la preferencia del sistema y no lanza errores

### Requirement: Sin parpadeo de tema
El tema correcto MUST aplicarse antes del primer pintado; el visitante MUST NOT ver un destello del tema contrario durante la carga.

#### Scenario: Recarga con tema claro guardado
- **WHEN** un visitante con tema claro guardado recarga la página
- **THEN** el primer frame pintado ya usa el tema claro

### Requirement: Contraste AA en ambos temas
Todas las combinaciones de texto sobre fondo definidas por los tokens SHALL cumplir contraste WCAG 2.2 AA (4,5:1 texto normal, 3:1 texto grande y componentes de interfaz) en ambos temas; en "Datasheet" los acentos SHALL oscurecerse lo necesario para cumplirlo.

#### Scenario: Acento sobre papel
- **WHEN** se usa el acento ámbar como color de texto sobre el fondo "Datasheet"
- **THEN** la relación de contraste es al menos 4,5:1

#### Scenario: Verificación automática
- **WHEN** se ejecuta la comprobación de contraste de tokens
- **THEN** reporta todas las parejas texto/fondo de ambos temas y falla si alguna no cumple AA
