/**
 * Filtro SVG de la refracción de borde (se monta una vez en el layout). Un desplazamiento suave por
 * ruido de baja frecuencia: la zona de contenido casi no se toca (escala pequeña) y el borde ondula.
 */
export function GlassFilters() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute size-0">
      <filter id="glass-refraction" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
