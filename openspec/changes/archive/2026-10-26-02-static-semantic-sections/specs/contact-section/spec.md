## Purpose

Permitir que un visitante contacte al desarrollador (etapa DISPLAY) mediante un formulario usable y validado, con estados de envío claros y vías alternativas de contacto.

## ADDED Requirements

### Requirement: Formulario con labels visibles
La sección de contacto SHALL ofrecer un formulario con campos nombre, email y mensaje, cada uno con label visible y asociado, estética de terminal y orden de foco lógico.

#### Scenario: Labels presentes
- **WHEN** se renderiza el formulario
- **THEN** cada campo tiene un label visible asociado programáticamente

### Requirement: Validación en cliente y servidor
El formulario SHALL validar en vivo en el cliente (nombre requerido, email con formato válido, mensaje con longitud mínima y máxima) mostrando mensajes de error claros junto al campo, y el servidor SHALL aplicar la misma validación y rechazar envíos inválidos aunque se omita la del cliente.

#### Scenario: Email inválido
- **WHEN** el visitante escribe "foo@" en email y sale del campo
- **THEN** aparece un mensaje de error junto al campo, el campo se marca como inválido y el error se asocia al campo para lectores de pantalla

#### Scenario: Envío inválido directo al servidor
- **WHEN** llega al servidor una petición de contacto con email vacío
- **THEN** el servidor no envía el correo y devuelve errores por campo

### Requirement: Protección básica contra spam
El servidor SHALL descartar envíos que rellenen un campo trampa oculto y SHALL limitar la frecuencia de envíos por cliente.

#### Scenario: Campo trampa relleno
- **WHEN** un envío llega con el campo trampa relleno
- **THEN** el servidor no envía el correo y responde como éxito sin revelar el descarte

### Requirement: Estados de envío con anuncio accesible
Durante el envío el botón SHALL mostrar estado de carga y quedar deshabilitado; al terminar SHALL mostrarse `200 OK ✓ Mensaje recibido` en caso de éxito o `500` con botón de reintento y el email alternativo en caso de fallo; el resultado SHALL anunciarse en una región `aria-live`.

#### Scenario: Envío exitoso
- **WHEN** el visitante envía un formulario válido y el proveedor de email acepta el mensaje
- **THEN** se muestra `200 OK ✓ Mensaje recibido`, se anuncia por la región viva y el formulario se limpia

#### Scenario: Fallo del proveedor
- **WHEN** el proveedor de email devuelve error
- **THEN** se muestra `500`, un botón "Reintentar" que reenvía sin perder lo escrito y el email alternativo, y el error se anuncia por la región viva

### Requirement: Email copiable y enlaces de cierre
Bajo el formulario SHALL mostrarse el email con un botón que lo copia al portapapeles y muestra el feedback "Copiado al portapapeles", los enlaces a redes, el enlace al CV y la frase "Programa finalizado con código de salida 0".

#### Scenario: Copiar email
- **WHEN** el visitante activa el botón de copiar email
- **THEN** el email queda en el portapapeles y se muestra y anuncia "Copiado al portapapeles"

#### Scenario: Portapapeles no disponible
- **WHEN** el navegador deniega el acceso al portapapeles
- **THEN** se muestra un mensaje indicando que no se pudo copiar y el email sigue visible y seleccionable

### Requirement: Secretos fuera del cliente
Las credenciales del proveedor de email y el email destino MUST leerse de variables de entorno del servidor y MUST NOT aparecer en el código enviado al navegador ni en el repositorio.

#### Scenario: Inspección del bundle
- **WHEN** se inspecciona el JavaScript entregado al navegador
- **THEN** no contiene la clave del proveedor de email
