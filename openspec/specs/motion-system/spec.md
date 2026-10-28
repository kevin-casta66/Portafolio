## Purpose

Define el lenguaje de movimiento común del sitio (easings, duraciones, stagger), el reloj y el scroll suave compartidos y las reglas coreográficas que toda animación debe cumplir para impresionar sin bloquear el contenido ni las interacciones.

## Requirements

### Requirement: Tokens de movimiento centralizados
El sistema SHALL definir como tokens únicos y reutilizables: easing de entrada `cubic-bezier(0.16, 1, 0.3, 1)`, easing de transición de escena `cubic-bezier(0.76, 0, 0.24, 1)`, spring de UI (stiffness ≈ 300, damping ≈ 30), duraciones micro 150 ms, UI 300 ms, revelado 700 ms, y stagger de 30-40 ms entre caracteres y 60-80 ms entre elementos de lista. Ninguna animación MUST declarar easings o duraciones literales fuera de estos tokens.

#### Scenario: Animación usa tokens
- **WHEN** se revisa cualquier animación de entrada de un título
- **THEN** su easing es el token de entrada y su duración es el token de revelado (700 ms)

#### Scenario: Valores literales prohibidos
- **WHEN** se ejecuta la revisión estática del código de animación
- **THEN** no aparecen curvas de easing ni duraciones literales fuera del módulo de tokens de movimiento

### Requirement: Reloj de frame único
El sistema SHALL usar un único bucle de frame para avanzar el scroll suave, todas las animaciones del DOM y cualquier render de escena 3D, de modo que todos lean la misma posición de scroll y el mismo tiempo en cada frame. Ningún módulo MUST registrar su propio bucle de frame independiente.

#### Scenario: Un solo bucle
- **WHEN** se graba un perfil de rendimiento mientras se hace scroll por una transición de fase
- **THEN** cada frame muestra una única cadena de callback de animación que actualiza scroll, animaciones y render

#### Scenario: Sin desfase entre capas
- **WHEN** una animación del DOM y una capa visual sincronizada con ella leen la posición de scroll en el mismo frame
- **THEN** ambas reciben el mismo valor y no se observa desfase de un frame entre ellas

### Requirement: Scroll suave sin scroll-jacking
El sistema SHALL proporcionar scroll suave sincronizado con todas las animaciones basadas en scroll, de modo que el progreso de las animaciones corresponda exactamente a la posición de scroll. El scroll MUST seguir siendo el nativo del navegador (el suavizado solo interpola la posición): nunca se bloquea, nunca se fuerza a una posición (sin snapping obligatorio) y retroceder invierte las animaciones scrubbed. Se permite fijar (pin) una sección durante una transición siempre que el usuario conserve el control de la velocidad y la dirección. Con rueda y puntero fino el avance SHALL estar acotado para que un giro rápido no salte fases enteras: cada evento avanza a lo sumo 80 px (tras un multiplicador de 0,6) y el destino nunca se adelanta más de 0,35 ventanas a la posición visible. Invertir la dirección MUST estar siempre permitido, y el teclado, la barra de scroll, el gesto táctil y las anclas MUST NOT limitarse.

#### Scenario: Giro rápido de rueda
- **WHEN** el usuario gira la rueda o el trackpad muy rápido sobre la página
- **THEN** la página avanza de forma continua sin adelantarse más de 0,35 ventanas a lo visible, y las animaciones de cada fase se ven al pasar

#### Scenario: Retroceder invierte la transición
- **WHEN** el usuario hace scroll hacia arriba en mitad de una transición de fase
- **THEN** la transición se reproduce en sentido inverso al mismo ritmo del scroll

#### Scenario: Sin bloqueo de scroll
- **WHEN** una animación está en curso y el usuario usa rueda, teclado (Espacio, AvPág, flechas) o gesto táctil
- **THEN** la página se desplaza inmediatamente sin esperar a que termine la animación

#### Scenario: Sección fijada
- **WHEN** una sección está fijada durante su transición y el usuario deja de hacer scroll
- **THEN** la transición se detiene en ese punto y no avanza sola

#### Scenario: Anclas y navegación por teclado
- **WHEN** el usuario activa un enlace interno (p. ej. "Ver proyectos") o tabula hacia un elemento fuera de pantalla
- **THEN** la página se desplaza hasta el destino y el foco queda en el elemento correcto

### Requirement: Señal global de velocidad de scroll
El sistema SHALL exponer la velocidad de scroll actual como una señal global normalizada y acotada al rango [-1, 1] (signo = dirección), suavizada y que vuelve a 0 de forma progresiva cuando el scroll se detiene. La señal MUST leerse sin provocar renders de la interfaz y MUST valer 0 de forma constante cuando el usuario prefiere movimiento reducido.

#### Scenario: Scroll rápido
- **WHEN** el usuario hace scroll muy rápido hacia abajo
- **THEN** la señal se acerca a 1 sin superarlo

#### Scenario: Reposo
- **WHEN** el usuario deja de hacer scroll
- **THEN** la señal decae suavemente hasta 0 en un tiempo del orden del token de revelado

#### Scenario: Movimiento reducido
- **WHEN** el usuario prefiere movimiento reducido
- **THEN** la señal permanece en 0 durante todo el scroll

### Requirement: Animación cargada después del contenido
El código de animación y de scroll suave SHALL cargarse de forma diferida después del pintado del elemento LCP y fuera del JS inicial; el LCP MUST NOT depender de ningún código de animación.

#### Scenario: Orden de carga
- **WHEN** se analiza la carga de la página en un perfil móvil
- **THEN** los recursos de animación se solicitan después del LCP y no cuentan en el presupuesto de JS inicial

### Requirement: Efectos ligeros nativos con mejora progresiva
Los efectos solo-DOM ligeros (barras de progreso, revelados sutiles) SHALL implementarse con animaciones vinculadas al scroll nativas del navegador cuando estén soportadas y MUST mostrarse en su estado final estático cuando no lo estén.

#### Scenario: Navegador sin soporte
- **WHEN** el navegador no soporta animaciones vinculadas al scroll nativas
- **THEN** el elemento se muestra en su estado final y no hay errores ni contenido oculto

### Requirement: Solo propiedades de composición
Las animaciones del DOM SHALL modificar únicamente `transform`, `opacity` y `filter` (y trazos SVG equivalentes como el desplazamiento del trazo). Ninguna animación MUST provocar recálculo de layout.

#### Scenario: Sin layout shift por animación
- **WHEN** se recorre la página completa haciendo scroll con las animaciones activas
- **THEN** el CLS medido permanece < 0,05 y el perfil de rendimiento no muestra layout forzado causado por animaciones

### Requirement: Interacciones nunca bloqueadas por animación
Ninguna animación ni cálculo asociado SHALL bloquear el hilo principal de forma que retrase la respuesta a una interacción; la latencia de interacción MUST mantenerse < 200 ms durante cualquier transición.

#### Scenario: Clic durante una transición
- **WHEN** el usuario pulsa un botón mientras se reproduce una transición de fase
- **THEN** el botón responde con feedback visible en menos de 200 ms

### Requirement: Máximo tres focos de animación simultáneos
El sistema SHALL limitar a un máximo de 3 focos de animación simultáneos visibles en pantalla en cualquier momento.

#### Scenario: Transición de fase activa
- **WHEN** una transición de fase está en curso
- **THEN** las animaciones ambientales no relacionadas de la sección saliente se pausan para no superar 3 focos

### Requirement: Las animaciones revelan, no ocultan
Todo texto importante SHALL ser legible sin depender de que una animación se ejecute o termine. Si el script de animación no carga o falla, el contenido MUST permanecer visible en su estado final.

#### Scenario: JS de animación no disponible
- **WHEN** el bundle de animación falla al cargar
- **THEN** todas las secciones muestran su contenido completo y legible en su posición final

#### Scenario: Estado inicial de animaciones
- **WHEN** el HTML se renderiza en servidor
- **THEN** ningún texto esencial se entrega con opacidad 0 o fuera de pantalla en el HTML inicial

### Requirement: Ciclo de vida y limpieza de animaciones
Toda animación, línea de tiempo, disparador de scroll y listener SHALL liberarse cuando su componente se desmonta o cambia de ruta, sin dejar disparadores huérfanos ni fugas de memoria.

#### Scenario: Navegación ida y vuelta
- **WHEN** el usuario navega del home a un caso de estudio y vuelve 10 veces
- **THEN** el número de disparadores de scroll activos es el mismo que tras la primera carga y no hay errores en consola

### Requirement: Narrativa de transformación de datos
Cada animación SHALL representar una transformación de datos de la narrativa (token → nodo → instrucción → proceso → vértice → píxel) o un feedback de interacción; no se añaden animaciones puramente decorativas. Cada transición del catálogo T1–T11 implementada en este change MUST corresponder a su fila de la tabla de especificación de movimiento (disparador, duración, easing, técnica y fallback).

#### Scenario: Revisión coreográfica
- **WHEN** se revisa el inventario de animaciones documentado
- **THEN** cada entrada indica qué dato transforma o qué interacción retroalimenta y, si es una transición del catálogo, su identificador T1–T11

#### Scenario: Coherencia con la tabla de movimiento
- **WHEN** se compara una transición implementada con su fila de la tabla de especificación de movimiento
- **THEN** disparador, duración, easing y fallback coinciden
