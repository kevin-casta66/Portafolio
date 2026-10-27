## Purpose

Define el armazón común de todas las páginas de «Portafolio»: estructura accesible, header con accesos para reclutadores, internacionalización es/en y estado global base que los sistemas posteriores reutilizan.

## Requirements

### Requirement: Landmarks y skip link
Cada página SHALL renderizar en el servidor una estructura con landmarks `header`, `main` y `footer`, y un enlace "Saltar al contenido" como primer elemento enfocable que lleva el foco a `main`.

#### Scenario: Navegación por teclado inicial
- **WHEN** el visitante pulsa Tab por primera vez tras cargar la página
- **THEN** el enlace "Saltar al contenido" se hace visible y, al activarlo, el foco se mueve al contenido principal

### Requirement: Header con accesos esenciales
El header SHALL mostrar en todas las páginas el nombre del autor (enlace al inicio), un enlace "Descargar CV" que descarga el CV del idioma activo, un control reservado para la Vista Rápida y un selector de idioma. Estos elementos SHALL estar presentes en el HTML del servidor sin depender de JavaScript.

#### Scenario: CV sin JavaScript
- **WHEN** el visitante tiene JavaScript desactivado y hace clic en "Descargar CV"
- **THEN** el navegador descarga el archivo PDF del CV

#### Scenario: Header visible en móvil
- **WHEN** la página se visualiza a 360 px de ancho
- **THEN** el nombre, "Descargar CV" y el control de Vista Rápida siguen accesibles sin desplazamiento horizontal

### Requirement: Idiomas español e inglés
El sitio SHALL estar disponible en español e inglés con rutas prefijadas por idioma (`/es/...`, `/en/...`). La raíz `/` SHALL redirigir al idioma preferido del navegador, usando español por defecto. El atributo `lang` del documento SHALL corresponder al idioma activo y todos los textos de interfaz SHALL provenir de catálogos de traducción.

#### Scenario: Redirección por idioma
- **WHEN** un navegador con idioma preferido inglés visita `/`
- **THEN** es redirigido a `/en` y el documento declara `lang="en"`

#### Scenario: Cambio de idioma
- **WHEN** el visitante en `/es` selecciona "English" en el selector
- **THEN** navega a la ruta equivalente en `/en` conservando la página actual

#### Scenario: Idioma no soportado
- **WHEN** se visita una ruta con un prefijo de idioma no soportado
- **THEN** se responde con la página de no encontrado

### Requirement: Estado global base
El sistema SHALL mantener un estado global de cliente con: fase actual, tema, sonido (apagado por defecto), elección de la puerta de arranque (sin elegir), modo debug (desactivado), Vista Rápida (desactivada), tier de calidad gráfica (automático), backend gráfico activo (pendiente hasta que el motor 3D lo determine; valores posibles: WebGPU, WebGL2 o ninguno) y logros desbloqueados (lista vacía). El estado SHALL inicializarse con esos valores por defecto y ser legible desde cualquier componente de cliente.

#### Scenario: Valores por defecto
- **WHEN** un visitante nuevo carga el sitio
- **THEN** el sonido está apagado, la puerta de arranque está sin elegir, el modo debug y la Vista Rápida están desactivados, la calidad gráfica está en automático, el backend gráfico está pendiente y no hay logros desbloqueados

### Requirement: Persistencia de preferencias de sesión y logros
La elección de la puerta de arranque (con o sin sonido) SHALL recordarse durante la sesión del navegador. Los logros desbloqueados SHALL persistir entre visitas en el mismo navegador. Si el almacenamiento del navegador no está disponible o falla, el sitio SHALL cargar con los valores por defecto sin errores visibles.

#### Scenario: Puerta recordada en la sesión
- **WHEN** el visitante eligió "Iniciar en silencio" y recarga la página en la misma sesión
- **THEN** el estado conserva la elección "silencio"

#### Scenario: Logros entre visitas
- **WHEN** el visitante desbloqueó un logro y vuelve otro día con el mismo navegador
- **THEN** el logro sigue figurando como desbloqueado

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador bloquea el acceso al almacenamiento local
- **THEN** la página carga con los valores por defecto y sin errores en consola que interrumpan la ejecución

### Requirement: Contenido esencial en el primer render
El HTML entregado por el servidor SHALL contener ya el contenido textual de la página; ningún texto esencial SHALL depender de la ejecución de JavaScript del cliente para aparecer.

#### Scenario: Sin JavaScript
- **WHEN** la página de inicio se carga con JavaScript desactivado
- **THEN** el header, el contenido principal y el footer son visibles y legibles
