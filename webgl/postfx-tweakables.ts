import { uBloomStrength, uChromaGain, uGrainGain } from "./nodes/globals";
import { ALL_SCENES, registerTweakables, type Tweakable } from "./tweakables";

const param = (
  id: string,
  uniformNode: { value: number },
  range: { min: number; max: number; step: number },
  extra: Partial<Pick<Tweakable, "onlyTiers">> = {},
): Tweakable => {
  const defaultValue = uniformNode.value;
  return {
    id,
    ...range,
    defaultValue,
    get: () => uniformNode.value,
    set: (value) => {
      uniformNode.value = value;
    },
    ...extra,
  };
};

/**
 * Parámetros del postprocesado (aplican a TODAS las escenas): intensidad del bloom, aberración
 * cromática y grano. Los uniforms son de módulo, así que sobreviven a los cambios de tier.
 */
export function registerPostTweakables(): () => void {
  return registerTweakables(ALL_SCENES, [
    param("bloomStrength", uBloomStrength, { min: 0, max: 3, step: 0.05 }, { onlyTiers: ["high"] }),
    param("aberration", uChromaGain, { min: 0, max: 4, step: 0.1 }),
    param("noise", uGrainGain, { min: 0, max: 6, step: 0.1 }),
  ]);
}
