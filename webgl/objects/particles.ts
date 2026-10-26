import { InstancedBufferAttribute, PointsNodeMaterial, Sprite } from "three/webgpu";
import { TSL, type N } from "../nodes/tsl";

const { instancedBufferAttribute, mrt, vec4 } = TSL;

/**
 * Partículas instanciadas como sprites (WebGPU no admite puntos de más de 1 px): un `Sprite` con
 * `count` instancias y un `PointsNodeMaterial` cuyo `positionNode`/`sizeNode` salen de nodos TSL que
 * leen atributos por instancia. Todo el movimiento es una FUNCIÓN del progreso (uniform): reversible
 * y sin estado, así retroceder el scroll deshace la transición sin saltos.
 */
export interface ParticleSystem {
  sprite: Sprite;
  material: PointsNodeMaterial;
  dispose(): void;
}

/** Atributo por instancia como nodo TSL (se asocia a la geometría del sprite al compilar). */
export function instanceAttribute(array: Float32Array, itemSize: number): N {
  return instancedBufferAttribute(new InstancedBufferAttribute(array, itemSize));
}

export interface ParticleNodes {
  position: N;
  size: N;
  color: N;
  opacity: N;
  /** Salida emisiva (vec4) para el bloom selectivo; opcional. */
  glow?: N;
}

export function createParticles(count: number, nodes: ParticleNodes): ParticleSystem {
  const material = new PointsNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  material.positionNode = nodes.position;
  material.sizeNode = nodes.size;
  material.colorNode = nodes.color;
  material.opacityNode = nodes.opacity;
  material.mrtNode = mrt({ glow: nodes.glow ?? vec4(0, 0, 0, 0) });
  const sprite = new Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;
  return {
    sprite,
    material,
    dispose() {
      material.dispose();
    },
  };
}
