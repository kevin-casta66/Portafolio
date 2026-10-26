## 1. Estado global y registros

- [ ] 1.1 Ampliar el store global con slices `prefs` (tema, sonido, cursor; localStorage), `session` (debug y elección de la puerta; sessionStorage), `achievements` (localStorage) y `ui` (terminal/panel abiertos); verificar con un test unitario que la persistencia sobrevive a recarga y que un storage que lanza excepción no rompe la app
- [ ] 1.2 Crear `lib/commands.ts` con el registro de comandos (help, about, projects, skills, cv, contact, theme, debug, clear) y atajos; verificar con tests unitarios que cada comando produce su salida desde `content/`
- [ ] 1.3 Implementar autocompletado por prefijo y sugerencia por distancia de edición; verificar con tests (`sk`→`skills`, `c`→opciones, `projetcs`→sugiere `projects`)
- [ ] 1.4 Crear el hook `useGlobalShortcuts` con un único listener que ignora campos editables; verificar con test que `?` y `~` escritos en un textarea no disparan acciones

## 2. Logros

- [ ] 2.1 Crear `lib/achievements.ts` (`defineAchievement`, `unlock` idempotente) y `content/achievements.ts` con `root_access`, `process_executed`, `heap_explorer`, `kernel_panic` y `debugger_attached`; verificar con tests que un segundo `unlock` no cambia el estado y que un id duplicado hace fallar la suite
- [ ] 2.2 Implementar el contenedor de avisos `ACHIEVEMENT_UNLOCKED: <id>` (`role="status"`, sin foco, cola FIFO, descartable, fundido con movimiento reducido); verificar que dos desbloqueos seguidos se muestran en cola y que el foco del formulario no se mueve
- [ ] 2.3 Conectar los disparadores: `kernel_panic` en la 404 y `process_executed` al completar el primer Hold-to-Execute (los de terminal y Debug se conectan en sus grupos); verificar en navegador que cada uno se desbloquea una sola vez
- [ ] 2.4 Verificar con almacenamiento bloqueado (modo privado o storage que lanza excepción) que los logros funcionan durante la visita sin errores en consola

## 3. Vidrio líquido

- [ ] 3.1 Implementar `components/ui/Glass` con tokens `--glass-bg`/`--glass-bg-strong`, refracción de borde y degradación opaca con `@supports` y `prefers-reduced-transparency`; verificar en un navegador sin `backdrop-filter` (o forzándolo) que se ve la superficie opaca
- [ ] 3.2 Extender el script de contraste del change 01 para calcular la opacidad mínima del vidrio por tema contra el peor caso; verificar que el script falla si un token de vidrio no alcanza 4,5:1
- [ ] 3.3 Añadir regla de lint que restringe los imports de `Glass` a CallStack, Terminal y la lente del Heap; verificar que un import desde otro componente falla el lint

## 4. Call Stack

- [ ] 4.1 Implementar `components/systems/CallStack` sobre `Glass` (nav lateral con frames enlazados, `aria-current` en la fase activa, acento por fase vía tokens); verificar en navegador que el frame activo cambia al hacer scroll
- [ ] 4.2 Implementar el salto con scroll suave y foco en el encabezado de la sección; verificar con teclado (Tab + Enter) que el foco llega al encabezado
- [ ] 4.3 Añadir el contador `n/total` de logros y la lista con estado y pistas, operable con teclado; verificar que el contador pasa de `0/5` a `1/5` al abrir la terminal
- [ ] 4.4 Implementar la barra inferior móvil con indicador de progreso por `transform`, lista desplegable de fases y contador de logros; verificar en viewport de 375 px que no tapa contenido interactivo

## 5. Terminal

- [ ] 5.1 Implementar `components/systems/Terminal` sobre `Glass` como `<dialog>` cargado de forma diferida, abierto con `~`/botón y cerrado con Escape devolviendo el foco; verificar manualmente apertura, trampa de foco y devolución
- [ ] 5.2 Conectar entrada, salida (`role="log"`, `aria-live="polite"`), Tab e historial con flechas al registro de comandos; verificar con un lector de pantalla que la salida de `about` se anuncia
- [ ] 5.3 Conectar `cv`, `theme`, `debug` y `contact` a sus efectos reales (descarga, cambio de tema, store, scroll a DISPLAY) y desbloquear `root_access` en la primera apertura; verificar cada comando y el logro en navegador

## 6. Modo Debug

- [ ] 6.1 Implementar el botón y el overlay de Debug (`pointer-events: none` fuera de sus paneles, persistido en sesión) y desbloquear `debugger_attached`; verificar que los CTAs siguen siendo clicables con Debug activo
- [ ] 6.2 Importar stats-gl de forma dinámica al activar Debug y mostrar FPS, CPU y GPU ("GPU: n/d" sin extensión); verificar en la pestaña de red que no se descarga nada sin activar Debug y que las métricas se actualizan con Debug activo
- [ ] 6.3 Mostrar backend activo (WebGPU/WebGL2) y tier, suscrito a cambios en caliente; verificar en Chrome (WebGPU) y forzando el fallback WebGL2 que el panel muestra el backend correcto y el mismo contenido
- [ ] 6.4 Añadir el flag de wireframe leído por los `NodeMaterial` de las escenas; verificar visualmente que las escenas se ven en wireframe
- [ ] 6.5 Crear el registro `registerTweakables` y generar con Tweakpane los controles de la escena activa, con "Restablecer"; verificar que cambiar `bloomStrength` se refleja en el siguiente frame, que los controles se manejan con teclado y que al recargar vuelven los valores por defecto
- [ ] 6.6 Marcar componentes principales con `data-debug-name` y dibujar sus contornos con `outline`; verificar que no hay desplazamiento de layout (CLS 0 al alternar) y el mensaje "sin escenas 3D" sin aceleración gráfica

## 7. Vista Rápida

- [ ] 7.1 Añadir al header el toggle "Vista Rápida ⚡" y la descarga del CV en todas las páginas (home, caso de estudio, 404); verificar visualmente en las tres rutas
- [ ] 7.2 Implementar el layout de currículum renderizado por SSR cuando `?view=quick` está presente, con los datos de `content/`; verificar que el HTML del servidor ya contiene el currículum (sin JS)
- [ ] 7.3 Propagar el parámetro en la navegación interna y volver a la fase equivalente al desactivar; verificar navegando a un caso y volviendo
- [ ] 7.4 Crear los estilos de impresión y el botón imprimir/PDF; verificar con la vista previa de impresión que no aparecen controles y se muestran las URLs

## 8. Cursor y botones magnéticos

- [ ] 8.1 Implementar `components/systems/Cursor` (caret, mira, ⟨/⟩, arrastre) solo con puntero fino, `aria-hidden` y sin capturar eventos; verificar en escritorio y emulación táctil
- [ ] 8.2 Añadir la preferencia "usar cursor del sistema" persistida y el modo sin inercia con movimiento reducido; verificar ambas preferencias
- [ ] 8.3 Implementar el componente `Magnetic` y aplicarlo a "Ver proyectos", "Descargar CV" y enviar; verificar que el anillo de foco no se desplaza y que se desactiva con movimiento reducido

## 9. Diseño sonoro

- [ ] 9.1 Implementar `components/systems/SoundManager` con Web Audio (master + buses ambience/ui) y botón de silencio en el header; verificar que silenciar detiene todo el audio en < 150 ms
- [ ] 9.2 Tomar la preferencia inicial de la puerta de arranque y crear/reanudar el `AudioContext` en ese gesto; verificar que "Iniciar con sonido" suena sin otra interacción y "Iniciar en silencio" no descarga audio (pestaña de red)
- [ ] 9.3 Añadir loops de ambiente por fase con fundido cruzado y precarga solo de la fase actual y la siguiente; verificar al hacer scroll RUNTIME→GPU que no hay cortes audibles y que la pestaña oculta pausa el audio
- [ ] 9.4 Añadir el tono modulado por la velocidad de scroll con límites y retorno suave al reposo, y los sonidos de UI (tecleo, controles, logros); verificar que el tono sube con scroll rápido y vuelve al reposo al detenerse

## 10. Panel de atajos e integración

- [ ] 10.1 Implementar el panel `?` generado desde el registro de comandos; verificar que lista todos los atajos y que cada uno produce el mismo efecto que su control
- [ ] 10.2 Montar todos los sistemas en el layout raíz y comprobar que sobreviven a la navegación entre home y casos de estudio sin perder estado (debug, sonido, logros)
- [ ] 10.3 Medir el bundle inicial tras el change y verificar que sigue por debajo de 180 KB gzip con terminal, herramientas de Debug, cursor, sonido y avisos fuera del chunk inicial
