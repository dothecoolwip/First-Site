// World gameplay systems. The bespoke bout simulation remains authoritative in
// the lists; these libraries make travel, props and civilian movement sturdier.
const GAMEPLAY = { shapes: [], shapeGrid: new Map(), rapier: null, cannon: null, terrainBVH: false, generation: 0 };

function gameplayShape(x, z, hx, hz, yaw = 0, height = 2) {
  const polygon = new SAT.Polygon(new SAT.Vector(x, z), [
    new SAT.Vector(-hx, -hz), new SAT.Vector(hx, -hz),
    new SAT.Vector(hx, hz), new SAT.Vector(-hx, hz)
  ]);
  // THREE's Y rotation is clockwise in the X/Z plane; SAT's is counterclockwise.
  polygon.setAngle(-yaw);
  const shape = { x, z, hx, hz, yaw, height, polygon };
  GAMEPLAY.shapes.push(shape);
  const rx = Math.abs(Math.cos(yaw)) * hx + Math.abs(Math.sin(yaw)) * hz, rz = Math.abs(Math.sin(yaw)) * hx + Math.abs(Math.cos(yaw)) * hz;
  for (let i = Math.floor((x - rx) / 4); i <= Math.floor((x + rx) / 4); i++) for (let j = Math.floor((z - rz) / 4); j <= Math.floor((z + rz) / 4); j++) {
    const k = i + ',' + j; if (!GAMEPLAY.shapeGrid.has(k)) GAMEPLAY.shapeGrid.set(k, []); GAMEPLAY.shapeGrid.get(k).push(shape);
  }
}

// Register footprints from the actual asset bounds, including parent transforms.
// Open tents retain their front entrance and an interior passage.
function gameplayPropFootprint(object, openTent = false) {
  if (!object) return;
  object.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(object.matrixWorld).invert(), bounds = new THREE.Box3();
  object.traverse(child => {
    if (!child.geometry) return;
    child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld)));
  });
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const scale = object.getWorldScale(new THREE.Vector3()), rotation = new THREE.Euler().setFromQuaternion(object.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  const add = (x, z, hx, hz) => { const p = object.localToWorld(new THREE.Vector3(x, 0, z)); gameplayShape(p.x, p.z, hx * Math.abs(scale.x), hz * Math.abs(scale.z), rotation.y, size.y * Math.abs(scale.y)); };
  if (openTent) {
    const wall = Math.min(size.x * 0.22, 0.3);
    add(bounds.min.x + wall / 2, center.z, wall / 2, size.z / 2);
    add(bounds.max.x - wall / 2, center.z, wall / 2, size.z / 2);
    add(center.x, bounds.max.z - wall / 2, size.x / 2, wall / 2);
  } else add(center.x, center.z, size.x / 2, size.z / 2);
}
function gameplayShapeResponse(x, z, radius) {
  const circle = new SAT.Circle(new SAT.Vector(x, z), radius);
  const response = new SAT.Response();
  const candidates = new Set();
  for (let i = Math.floor((x - radius) / 4); i <= Math.floor((x + radius) / 4); i++) for (let j = Math.floor((z - radius) / 4); j <= Math.floor((z + radius) / 4); j++) for (const s of GAMEPLAY.shapeGrid.get(i + ',' + j) || []) candidates.add(s);
  for (const s of candidates) {
    if (Math.abs(x - s.x) > s.hx + s.hz + radius || Math.abs(z - s.z) > s.hx + s.hz + radius) continue;
    response.clear();
    if (SAT.testCirclePolygon(circle, s.polygon, response)) return response;
  }
  return null;
}
function gameplayShapeBlocked(x, z, radius) { return !!gameplayShapeResponse(x, z, radius); }
function gameplayShapePush(P, radius) {
  for (let i = 0; i < 3; i++) {
    const response = gameplayShapeResponse(P.x, P.z, radius);
    if (!response) break;
    P.x -= response.overlapV.x; P.z -= response.overlapV.y;
  }
}

function gameplayGroundAt(x, z) {
  // The raycast mesh is the continuous country below the castle. The raised
  // courtyards and ramps are separate meshes and use gy() for their floor.
  if (tierOf(x, z) || rampAt(x, z)) return gy(x, z);
  if (!GAMEPLAY.terrainBVH || !TOWN.terrain) return gy(x, z);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 90, z), new THREE.Vector3(0, -1, 0), 0, 150);
  ray.firstHitOnly = true;
  const hits = ray.intersectObject(TOWN.terrain, false);
  return hits.length ? hits[0].point.y + 0.055 : gy(x, z);
}
function gameplayTerrainBuild() {
  GAMEPLAY.terrainBVH = false;
  if (!TOWN.terrain) return;
  try {
    TOWN.terrain.geometry.boundsTree = new BVH.MeshBVH(TOWN.terrain.geometry, { maxLeafTris: 20 });
    TOWN.terrain.raycast = BVH.acceleratedRaycast;
    GAMEPLAY.terrainBVH = true;
  } catch (e) { console.warn('terrain collision tree', e); }
}

function gameplayRapierBuild(generation) {
  if (generation !== GAMEPLAY.generation || !TOWN.root) return;
  try {
    if (GAMEPLAY.rapier && GAMEPLAY.rapier.world) GAMEPLAY.rapier.world.free();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    for (const s of GAMEPLAY.shapes) {
      const h = Math.max(0.8, s.height), y = gameplayGroundAt(s.x, s.z) + h / 2;
      const desc = RAPIER.ColliderDesc.cuboid(s.hx, h / 2, s.hz)
        .setTranslation(s.x, y, s.z)
        .setRotation({ x: 0, y: Math.sin(s.yaw / 2), z: 0, w: Math.cos(s.yaw / 2) });
      world.createCollider(desc);
    }
    const P = TOWN.pos;
    const player = world.createCollider(RAPIER.ColliderDesc.capsule(0.58, 0.4)
      .setTranslation(P.x, gameplayGroundAt(P.x, P.z) + 1, P.z));
    const controller = world.createCharacterController(0.015);
    controller.enableAutostep(0.35, 0.25, false);
    controller.enableSnapToGround(0.28);
    world.step();
    GAMEPLAY.rapier = { world, player, controller, ready: true };
  } catch (e) { GAMEPLAY.rapier = { ready: false, error: String(e) }; console.warn('world character physics', e); }
}
function gameplayMove(P, dx, dz) {
  const sim = GAMEPLAY.rapier;
  if (!sim || !sim.ready || TOWN.mineOn || TOWN.spec || !GAMEPLAY.shapes.length) {
    P.x += dx; P.z += dz; return;
  }
  try {
    const y0 = gameplayGroundAt(P.x, P.z);
    sim.player.setTranslation({ x: P.x, y: y0 + 1, z: P.z });
    sim.controller.computeColliderMovement(sim.player, {
      x: dx, y: gameplayGroundAt(P.x + dx, P.z + dz) - y0, z: dz
    });
    const delta = sim.controller.computedMovement();
    P.x += delta.x; P.z += delta.z;
    sim.player.setTranslation({ x: P.x, y: gameplayGroundAt(P.x, P.z) + 1, z: P.z });
  } catch (e) { sim.ready = false; console.warn('world character movement', e); P.x += dx; P.z += dz; }
}

function gameplayCannonBuild() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.allowSleep = true;
  const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0); floor.position.set(0, gameplayGroundAt(-63, -49), 0);
  world.addBody(floor);
  // Keep the drill props within the yard rails, leaving its walk-in opening clear.
  for (const [x, z, hx, hz] of [[-68, -56, 0.28, 15], [-48, -56, 0.28, 15], [-58, -71, 10, 0.28], [-64, -41, 4, 0.28], [-52, -41, 4, 0.28]]) {
    const rail = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, 0.75, hz)) });
    rail.position.set(x, gameplayGroundAt(x, z) + 0.75, z); world.addBody(rail);
  }
  const props = [];
  for (const [x, z, yaw] of [[-63, -48, 0.2], [-61.5, -49.5, -0.35], [-64.5, -51, 0.5]]) {
    const body = new CANNON.Body({ mass: 6, shape: new CANNON.Box(new CANNON.Vec3(0.48, 0.46, 0.48)) });
    body.position.set(x, gameplayGroundAt(x, z) + 0.48, z);
    body.quaternion.setFromEuler(0, yaw, 0); body.linearDamping = 0.55; body.angularDamping = 0.7;
    world.addBody(body);
    const pivot = new THREE.Group(); TOWN.root.add(pivot);
    kpiece(pivot, 'mk_Crate_Wooden', 0, -0.46, 0, 0, 1);
    props.push({ body, pivot, pushT: 0 });
  }
  GAMEPLAY.cannon = { world, props };
}
function gameplayCannonTick(dt) {
  const sim = GAMEPLAY.cannon;
  if (!sim || TOWN.mineOn) return;
  const P = TOWN.pos;
  for (const prop of sim.props) {
    prop.pushT = Math.max(0, prop.pushT - dt);
    const B = prop.body, dx = B.position.x - P.x, dz = B.position.z - P.z, d = Math.hypot(dx, dz);
    if (d < 1.25 && d > 0.05 && TOWN.speed > 0.6 && !prop.pushT) {
      B.wakeUp(); B.applyImpulse(new CANNON.Vec3(dx / d * 2.1, 0.45, dz / d * 2.1), B.position);
      prop.pushT = 0.22;
    }
  }
  sim.world.step(1 / 60, Math.min(dt, 0.05), 3);
  for (const prop of sim.props) {
    const B = prop.body;
    prop.pivot.position.set(B.position.x, B.position.y, B.position.z);
    prop.pivot.quaternion.set(B.quaternion.x, B.quaternion.y, B.quaternion.z, B.quaternion.w);
  }
}

function gameplayStart() {
  const generation = ++GAMEPLAY.generation;
  GAMEPLAY.rapier = null; GAMEPLAY.cannon = null;
  gameplayTerrainBuild(); gameplayCannonBuild();
  RAPIER.init().then(() => gameplayRapierBuild(generation)).catch(e => {
    GAMEPLAY.rapier = { ready: false, error: String(e) }; console.warn('world physics init', e);
  });
}
function gameplayStop() {
  GAMEPLAY.generation++;
  if (GAMEPLAY.rapier && GAMEPLAY.rapier.world) GAMEPLAY.rapier.world.free();
  GAMEPLAY.rapier = null; GAMEPLAY.cannon = null; GAMEPLAY.terrainBVH = false; GAMEPLAY.shapes = []; GAMEPLAY.shapeGrid.clear();
}

function gameplayFolkDirection(N, tx, tz, dt, steerX, steerZ) {
  if (!N.gameVehicle) {
    const vehicle = new YUKA.Vehicle(), target = new YUKA.Vector3(tx, 0, tz);
    vehicle.position.set(N.x, 0, N.z); vehicle.maxSpeed = N.spd; vehicle.maxForce = 4;
    vehicle.steering.add(new YUKA.ArriveBehavior(target, 1.6, 0.25));
    N.gameVehicle = vehicle; N.gameTarget = target;
  }
  const V = N.gameVehicle;
  V.position.set(N.x, 0, N.z); N.gameTarget.set(tx, 0, tz); V.maxSpeed = N.spd;
  V.update(Math.min(dt, 0.05));
  const n = Math.hypot(V.velocity.x, V.velocity.z);
  if (n < 0.05) return [steerX, steerZ];
  const wx = steerX * 0.72 + V.velocity.x / n * 0.28;
  const wz = steerZ * 0.72 + V.velocity.z / n * 0.28;
  const L = Math.hypot(wx, wz) || 1;
  return [wx / L, wz / L];
}
