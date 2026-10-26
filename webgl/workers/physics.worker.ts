import RAPIER from "@dimforge/rapier3d-compat";
import {
  BODY_COUNT,
  STEP_HZ,
  WORLD_H,
  WORLD_W,
  bodySpec,
  bodyStart,
  type FromWorker,
  type ToWorker,
} from "../lab/physics-protocol";

/**
 * Worker de física del laboratorio: Rapier (`@dimforge/rapier3d-compat`, usado DIRECTAMENTE, sin
 * `@react-three/rapier`) con paso FIJO a 60 Hz. Envía las transformaciones al hilo principal en un
 * `Float32Array` transferible, así la simulación nunca bloquea las interacciones (INP).
 */
const post = (message: FromWorker, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

let world: RAPIER.World | null = null;
let bodies: RAPIER.RigidBody[] = [];
let params = { gravity: 1, bounce: 0.45 };
let drag: { index: number; x: number; y: number } | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let steps = 0;
let wasAwake = true;

function build() {
  world?.free();
  world = new RAPIER.World({ x: 0, y: -9.8 * params.gravity, z: 0 });
  world.timestep = 1 / STEP_HZ;
  bodies = [];

  // Suelo, techo y paredes (cajas estáticas gruesas alrededor del escenario).
  const walls: [number, number, number, number][] = [
    [WORLD_W / 2, -0.25, WORLD_W / 2 + 1, 0.25],
    [WORLD_W / 2, WORLD_H + 0.25, WORLD_W / 2 + 1, 0.25],
    [-0.25, WORLD_H / 2, 0.25, WORLD_H / 2 + 1],
    [WORLD_W + 0.25, WORLD_H / 2, 0.25, WORLD_H / 2 + 1],
  ];
  for (const [x, y, hx, hy] of walls) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, 0.5).setRestitution(params.bounce), body);
  }

  for (let i = 0; i < BODY_COUNT; i++) {
    const spec = bodySpec(i);
    const start = bodyStart(i);
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(start.x, start.y, 0)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, true)
      .setLinearDamping(0.05)
      .setAngularDamping(0.2)
      .setCcdEnabled(true);
    const body = world.createRigidBody(desc);
    const shape =
      spec.shape === "ball"
        ? RAPIER.ColliderDesc.ball(spec.size)
        : RAPIER.ColliderDesc.cuboid(spec.size, spec.size, spec.size);
    world.createCollider(shape.setRestitution(params.bounce).setFriction(0.6).setDensity(1), body);
    bodies.push(body);
  }
}

function applyParams() {
  if (!world) return;
  world.gravity = { x: 0, y: -9.8 * params.gravity, z: 0 };
  for (const body of bodies)
    for (let c = 0; c < body.numColliders(); c++) body.collider(c).setRestitution(params.bounce);
}

function step() {
  if (!world) return;
  if (drag) {
    const body = bodies[drag.index];
    if (body) {
      const p = body.translation();
      // El cuerpo arrastrado persigue al puntero con una velocidad proporcional a la distancia.
      body.setLinvel({ x: (drag.x - p.x) * 14, y: (drag.y - p.y) * 14, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
  world.step();
  steps++;
  // Con todos los cuerpos dormidos no se envía nada: el render se detiene (escena estática).
  const awake = bodies.some((b) => !b.isSleeping());
  if (!awake && !wasAwake) return;
  wasAwake = awake;
  const out = new Float32Array(bodies.length * 4);
  bodies.forEach((body, i) => {
    const t = body.translation();
    const q = body.rotation();
    // Ángulo en z a partir del cuaternión.
    const angle = 2 * Math.atan2(q.z, q.w);
    out.set([t.x, t.y, angle, bodySpec(i).size], i * 4);
  });
  post({ type: "state", bodies: out, step: steps }, [out.buffer]);
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  switch (msg.type) {
    case "init":
      params = { gravity: msg.gravity, bounce: msg.bounce };
      void RAPIER.init().then(() => {
        build();
        post({ type: "ready" });
        clearInterval(timer);
        timer = setInterval(step, 1000 / STEP_HZ);
      });
      break;
    case "params":
      params = { gravity: msg.gravity, bounce: msg.bounce };
      applyParams();
      wasAwake = true;
      for (const body of bodies) body.wakeUp();
      break;
    case "drag":
      drag = { index: msg.index, x: msg.x, y: msg.y };
      break;
    case "release":
      drag = null;
      wasAwake = true;
      break;
    case "impulse":
      wasAwake = true;
      for (const body of bodies) body.applyImpulse({ x: msg.x * 0.4, y: msg.y * 0.4, z: 0 }, true);
      break;
    case "reset":
      drag = null;
      wasAwake = true;
      build();
      break;
    case "stop":
      clearInterval(timer);
      world?.free();
      world = null;
      break;
  }
};
