## Purpose

Exponer el funcionamiento interno del sitio (backend gráfico, escenas 3D, componentes, rendimiento y parámetros de shaders) mediante una superposición técnica que demuestra dominio y orgullo por el rendimiento.

## ADDED Requirements

### Requirement: Activación
El sistema SHALL permitir activar y desactivar el modo Debug desde la terminal (comando `debug`) y desde un botón visible, y SHALL conservar su estado durante la sesión del navegador.

#### Scenario: Activar con botón
- **WHEN** el visitante activa el botón de Debug
- **THEN** la superposición de Debug aparece y el botón indica el estado activo

#### Scenario: Persistencia en la sesión
- **WHEN** el modo Debug está activo y el visitante navega a un caso de estudio y vuelve
- **THEN** el modo Debug sigue activo

#### Scenario: Nueva sesión
- **WHEN** el visitante abre el sitio en una sesión nueva
- **THEN** el modo Debug está desactivado

#### Scenario: Logro al activar
- **WHEN** el visitante activa el modo Debug por primera vez
- **THEN** se desbloquea el logro `debugger_attached`

### Requirement: Backend gráfico activo
Con el modo Debug activo el sistema SHALL indicar qué backend gráfico está renderizando (nueva generación o fallback de compatibilidad) y el tier de calidad vigente, actualizándolo si cambia en caliente.

#### Scenario: Navegador con soporte de nueva generación
- **WHEN** el modo Debug está activo en un navegador con el backend de nueva generación disponible
- **THEN** el panel indica ese backend y el tier actual

#### Scenario: Fallback
- **WHEN** el backend de nueva generación no está disponible
- **THEN** el panel indica que se usa el backend de compatibilidad, sin diferencias en el contenido mostrado

#### Scenario: Cambio de tier
- **WHEN** el sistema baja el tier de calidad por caída de FPS
- **THEN** el panel refleja el nuevo tier en menos de 1 s

### Requirement: Información mostrada
Con el modo Debug activo el sistema SHALL mostrar los wireframes de las escenas 3D, el contorno de los componentes principales con su nombre, un contador de FPS y los tiempos de renderizado por frame, incluidos los tiempos de GPU cuando el navegador los exponga.

#### Scenario: Escenas en wireframe
- **WHEN** el modo Debug está activo y hay una escena 3D visible
- **THEN** la escena se renderiza en modo wireframe

#### Scenario: Métricas en vivo
- **WHEN** el modo Debug está activo
- **THEN** un panel muestra FPS, tiempo de CPU por frame y, si está disponible, tiempo de GPU, actualizados al menos una vez por segundo

#### Scenario: Tiempo de GPU no disponible
- **WHEN** el navegador no expone medición de tiempo de GPU
- **THEN** el panel indica "GPU: n/d" en lugar de un valor inventado

#### Scenario: Sin escenas 3D
- **WHEN** el modo Debug se activa en un dispositivo sin aceleración gráfica
- **THEN** se muestran las cajas de componentes y métricas disponibles, y el panel indica que no hay escenas 3D activas

### Requirement: Ajuste de parámetros de shaders en vivo
Con el modo Debug activo el sistema SHALL ofrecer un panel que lista los parámetros expuestos de la escena visible (por ejemplo intensidad de bloom, aberración, ruido) y permite modificarlos en vivo, con un control para restablecer los valores por defecto. Los cambios SHALL aplicarse solo a la sesión actual.

#### Scenario: Ajustar un parámetro
- **WHEN** el visitante mueve el control de intensidad de bloom en el panel
- **THEN** la escena visible refleja el nuevo valor en el siguiente frame

#### Scenario: Restablecer
- **WHEN** el visitante pulsa "Restablecer"
- **THEN** todos los parámetros vuelven a sus valores por defecto

#### Scenario: Controles accesibles
- **WHEN** el visitante navega el panel con teclado
- **THEN** cada control es enfocable, tiene etiqueta y se ajusta con las flechas

### Requirement: Herramientas cargadas bajo demanda
Las herramientas de medición y ajuste del modo Debug SHALL descargarse solo al activar el modo por primera vez y SHALL no formar parte de la carga inicial del sitio.

#### Scenario: Visita sin Debug
- **WHEN** el visitante navega sin activar el modo Debug
- **THEN** no se descarga ningún recurso de las herramientas de Debug

### Requirement: No interferir con la interacción
La superposición de Debug SHALL no bloquear clics ni foco sobre el contenido subyacente (salvo dentro de sus propios paneles) y SHALL no alterar el layout de la página.

#### Scenario: Interacción con Debug activo
- **WHEN** el modo Debug está activo y el visitante hace clic en un CTA fuera de los paneles de Debug
- **THEN** el CTA responde normalmente
