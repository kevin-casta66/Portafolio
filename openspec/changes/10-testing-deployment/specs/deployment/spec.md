## Purpose

Define cómo se integra, previsualiza, despliega, observa y documenta el portafolio para que cada versión publicada esté verificada y el repositorio pueda mostrarse públicamente.

## ADDED Requirements

### Requirement: Integración continua en cada PR
El sistema SHALL ejecutar en cada PR la comprobación de tipos, el lint, las pruebas unitarias, las pruebas end-to-end y la auditoría de calidad, y MUST impedir el merge si alguna falla.

#### Scenario: Comprobación fallida
- **WHEN** un PR introduce un error de tipos
- **THEN** el pipeline falla y el PR no puede fusionarse en la rama principal

### Requirement: Previews por PR
El sistema SHALL generar un despliegue de preview con URL única para cada PR, enlazado desde el PR.

#### Scenario: Preview disponible
- **WHEN** se abre un PR
- **THEN** el PR muestra la URL de un despliegue de preview con esos cambios

### Requirement: Producción desde la rama principal
El sistema SHALL desplegar a producción automáticamente cada commit de la rama principal que haya pasado el pipeline, y MUST permitir volver a un despliegue anterior.

#### Scenario: Merge a la rama principal
- **WHEN** se fusiona un PR aprobado en la rama principal
- **THEN** la nueva versión se publica en el dominio de producción

#### Scenario: Rollback
- **WHEN** se detecta un problema en producción
- **THEN** se puede restaurar el despliegue anterior sin un nuevo build

### Requirement: Secretos solo en servidor
Las credenciales del servicio de email MUST existir únicamente como variables de entorno del servidor, nunca en el repositorio ni en el bundle del cliente; el repositorio SHALL incluir un archivo de ejemplo con los nombres de variables sin valores.

#### Scenario: Bundle del cliente
- **WHEN** se inspecciona el JavaScript enviado al navegador
- **THEN** no contiene ninguna credencial del servicio de email

#### Scenario: Archivo de entorno
- **WHEN** se revisa el repositorio
- **THEN** los archivos de entorno con valores están ignorados y solo existe el archivo de ejemplo

### Requirement: Observabilidad
El sitio de producción SHALL recopilar analítica de visitas respetuosa con la privacidad y métricas reales de Core Web Vitals, sin incumplir el presupuesto de JS inicial.

#### Scenario: Métricas reales
- **WHEN** usuarios reales visitan producción
- **THEN** las métricas LCP, CLS e INP quedan registradas en el panel de rendimiento

### Requirement: Documentación pública del repositorio
El repositorio SHALL incluir un README técnico que describa el concepto, la arquitectura de render (lienzo persistente único, registro de escenas con renderizado selectivo, gemelos DOM↔3D, texturas intermedias para transiciones, tiers de calidad, shaders y cálculo en GPU, reloj de animación único) con un diagrama, las decisiones técnicas principales, los presupuestos y cómo se verifican, cómo ejecutar el proyecto y los tests, cómo editar el contenido en `content/` sin tocar componentes, y enlaces a `docs/TECHNIQUE-TEARDOWN.md`, `docs/MOTION-SPEC.md` y `docs/DEVICE-MATRIX.md`.

#### Scenario: Nuevo lector
- **WHEN** alguien abre el repositorio público
- **THEN** el README le permite entender la arquitectura de render y ejecutar el proyecto localmente

#### Scenario: Enlaces de documentación
- **WHEN** se siguen los enlaces del README a la documentación técnica
- **THEN** todos resuelven a documentos existentes en el repositorio

### Requirement: Checklist previa al lanzamiento
El sistema MUST bloquear el despliegue a producción mientras quede contenido marcado como placeholder en `content/`, y SHALL documentar una checklist de lanzamiento (datos personales, CV, dominio, metadatos, imágenes Open Graph, matriz de dispositivos completada y revisión de que cada técnica tomada de un referente está reinterpretada sin copiar su diseño, assets, textos ni código).

#### Scenario: Placeholder restante
- **WHEN** un build de producción encuentra contenido marcado como placeholder
- **THEN** el build falla listando los archivos y campos pendientes

#### Scenario: Revisión de originalidad
- **WHEN** se completa la checklist de lanzamiento
- **THEN** cada técnica listada en el Technique Teardown tiene marcada la verificación de que no reutiliza diseño, assets, textos ni código del referente

#### Scenario: Preview con placeholders
- **WHEN** un build de preview encuentra contenido marcado como placeholder
- **THEN** el build continúa y muestra una advertencia
