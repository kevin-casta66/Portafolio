## Purpose

Proporciona un único entorno de render 3D, persistente entre rutas, que elige el mejor backend gráfico disponible, renderiza solo lo que el scroll hace visible y mantiene cada elemento 3D sincronizado con su equivalente DOM.

## ADDED Requirements

### Requirement: Contexto gráfico único y persistente
El sistema SHALL usar un único lienzo y contexto gráfico para todo el sitio, que MUST sobrevivir a la navegación entre rutas sin recrearse.

#### Scenario: Una sola instancia en el home
- **WHEN** el home termina de cargar todas sus escenas
- **THEN** existe exactamente un lienzo de render 3D activo en el documento

#### Scenario: Navegación a un caso de estudio
- **WHEN** el usuario navega del home a `/projects/[slug]` y vuelve
- **THEN** el lienzo no se destruye ni se crea uno nuevo

### Requirement: Backend preferente con fallback automático
El sistema SHALL usar el backend gráfico de nueva generación cuando el navegador lo soporte y MUST recurrir automáticamente al backend gráfico clásico cuando no, sin diferencias de contenido entre ambos. El backend activo MUST ser consultable por otros sistemas del sitio.

#### Scenario: Navegador con backend de nueva generación
- **WHEN** el sitio se abre en un navegador que soporta el backend de nueva generación
- **THEN** las escenas se renderizan con ese backend y el estado global indica cuál está activo

#### Scenario: Navegador sin backend de nueva generación
- **WHEN** el sitio se abre en un navegador que solo soporta el backend clásico
- **THEN** las mismas escenas y el mismo contenido se muestran sin errores y el estado global indica el backend clásico

#### Scenario: Ningún backend disponible
- **WHEN** el navegador no soporta ningún backend 3D
- **THEN** no se monta el lienzo y el sitio muestra su contenido DOM completo

### Requirement: Registro de escenas con render selectivo
Cada escena SHALL declarar el rango de scroll en el que está activa, y en cada frame el sistema MUST renderizar únicamente las escenas cuyo rango contiene la posición actual. Las escenas inactivas MUST NOT consumir tiempo de render.

#### Scenario: Scroll dentro de RUNTIME
- **WHEN** la posición de scroll está dentro del rango de la fase RUNTIME
- **THEN** solo se renderizan la escena del chip y las transiciones que solapan ese rango

#### Scenario: Escena estática
- **WHEN** ninguna escena activa está animándose ni recibe interacción ni cambio de scroll
- **THEN** no se producen frames nuevos hasta el siguiente cambio

### Requirement: Gemelos DOM↔3D
Las tarjetas de proyecto, imágenes y títulos marcados como gemelos SHALL tener un plano 3D que reproduce la posición y el tamaño de su elemento DOM en cada frame, sincronizado con el scroll suave, sin desfase perceptible.

#### Scenario: Scroll con tarjetas visibles
- **WHEN** el usuario hace scroll con tarjetas de proyecto en pantalla
- **THEN** cada plano gemelo permanece alineado con su tarjeta DOM sin retraso visible

#### Scenario: Cambio de layout
- **WHEN** el layout de las tarjetas cambia (filtro, redimensionado o cambio de vista)
- **THEN** los planos gemelos siguen a sus tarjetas durante la animación sin saltos

### Requirement: Señal global de velocidad de scroll acotada
El sistema SHALL exponer a las escenas una señal derivada de la velocidad de scroll que aumente el estiramiento de partículas y la aberración cromática, y que vuelva suavemente a reposo al detenerse. La intensidad MUST estar acotada de forma que ningún texto pierda legibilidad.

#### Scenario: Scroll rápido
- **WHEN** el usuario hace scroll rápido
- **THEN** las partículas se estiran y la aberración aumenta hasta el límite configurado, nunca por encima

#### Scenario: Scroll detenido
- **WHEN** el usuario deja de hacer scroll
- **THEN** los efectos vuelven gradualmente a su estado de reposo

### Requirement: Carga después del contenido principal
El código y los assets 3D MUST cargarse después del Largest Contentful Paint y MUST NOT formar parte del JavaScript inicial.

#### Scenario: Primer render sin 3D
- **WHEN** se carga el home con la red limitada
- **THEN** el contenido del hero es visible y los CTAs funcionan antes de que se descargue el código 3D

#### Scenario: Escena por fase
- **WHEN** una fase se acerca por primera vez a su rango activo
- **THEN** se cargan solo el código y los assets de esa escena

### Requirement: Liberación de recursos
Al salir una escena de su rango de forma prolongada o al desmontarse, el sistema MUST liberar sus geometrías, texturas y render targets, y la memoria de GPU MUST NOT crecer al recorrer el sitio repetidamente.

#### Scenario: Recorrido completo repetido
- **WHEN** el usuario recorre el home de principio a fin tres veces
- **THEN** el número de geometrías, texturas y render targets vivos vuelve al mismo valor tras cada recorrido

#### Scenario: Desmontaje o reinicio del contexto gráfico
- **WHEN** el contexto gráfico se desmonta o se reinicia (pérdida de dispositivo, desactivación del 3D)
- **THEN** la liberación del anterior termina antes de crear uno nuevo y nunca existen dos contextos gráficos a la vez

### Requirement: Límite de densidad de píxeles
La densidad de píxeles del render MUST NOT superar 2.

#### Scenario: Pantalla de densidad 3
- **WHEN** el sitio se abre en un dispositivo con densidad de píxeles 3
- **THEN** el render 3D usa como máximo densidad 2

### Requirement: Equivalente DOM del contenido 3D
Toda información transmitida por una escena 3D SHALL existir también en el DOM como contenido accesible, y el lienzo MUST ocultarse a tecnologías de asistencia.

#### Scenario: Lector de pantalla en RUNTIME
- **WHEN** un lector de pantalla recorre la sección de proyectos
- **THEN** lee las tarjetas de proyectos del DOM y no anuncia el lienzo

#### Scenario: Fallo al cargar una escena
- **WHEN** la carga de una escena falla o se pierde el contexto gráfico
- **THEN** la sección sigue mostrando su contenido DOM completo sin errores visibles
