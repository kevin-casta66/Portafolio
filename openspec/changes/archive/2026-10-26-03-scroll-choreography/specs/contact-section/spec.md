## ADDED Requirements

### Requirement: Animación de paquete de red en el envío
Al enviar el formulario válido, el mensaje SHALL representarse como un paquete que viaja por un cable animado hacia un "servidor" mientras la petición está en curso. La animación MUST reflejar el resultado real: con éxito el paquete regresa y se muestra `200 OK ✓ Mensaje recibido`; con error se muestra `500` con botón de reintento y email alternativo. El resultado MUST anunciarse por una región `aria-live`.

#### Scenario: Envío exitoso
- **WHEN** el servidor confirma el envío
- **THEN** el paquete completa ida y vuelta y se muestra y anuncia `200 OK ✓ Mensaje recibido`

#### Scenario: Envío fallido
- **WHEN** el servidor responde con error
- **THEN** el paquete no regresa, se muestra `500` con botón de reintento y el email alternativo, y se anuncia el error

#### Scenario: Respuesta rápida
- **WHEN** la respuesta llega antes de que termine la ida del paquete
- **THEN** la animación completa su recorrido mínimo y muestra el resultado real sin retrasarlo más de 700 ms
