## Purpose

Dar a los CTAs principales una atracción magnética hacia el puntero que refuerce su importancia sin alterar su usabilidad ni accesibilidad.

## Requirements

### Requirement: Atracción magnética en CTAs principales
Los CTAs principales ("Ver proyectos", "Descargar CV", enviar formulario) SHALL desplazarse levemente hacia el puntero cuando este se acerca y SHALL volver a su posición con un resorte al alejarse, en dispositivos con puntero fino.

#### Scenario: Puntero cerca
- **WHEN** el puntero entra en la zona de influencia de "Ver proyectos"
- **THEN** el botón se desplaza hacia el puntero sin superar un desplazamiento máximo acotado

#### Scenario: Puntero se aleja
- **WHEN** el puntero sale de la zona de influencia
- **THEN** el botón vuelve a su posición original

### Requirement: Área de clic y foco intactos
El efecto magnético SHALL limitarse a una transformación visual que no modifique el layout, el área de clic efectiva ni el anillo de foco, y SHALL desactivarse en táctil y con movimiento reducido.

#### Scenario: Foco por teclado
- **WHEN** el visitante enfoca un CTA con Tab
- **THEN** el CTA muestra el foco visible en su posición original sin desplazamiento

#### Scenario: Movimiento reducido
- **WHEN** el usuario prefiere movimiento reducido
- **THEN** los CTAs no se desplazan hacia el puntero
