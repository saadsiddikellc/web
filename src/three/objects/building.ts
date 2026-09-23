import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getMaterials, mulberry32, PALETTE } from '../materials';
import { WORLD } from '../timeline';

/**
 * XUS headquarters + surrounding plaza, built procedurally as a clean
 * architectural model. Static parts are merged per material to keep draw calls low.
 */

type Box = [w: number, h: number, d: number, x: number, y: number, z: number, ry?: number, rz?: number];

function boxes(list: Box[]) {
  const geos = list.map(([w, h, d, x, y, z, ry = 0, rz = 0]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return g;
  });
  const merged = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  return merged;
}

export interface BuildingParts {
  group: THREE.Group;
  glass: THREE.MeshStandardMaterial;
  signGlow: THREE.MeshBasicMaterial;
  facadeSignals: THREE.InstancedMesh;
  update(time: number, dusk: number, activity: number): void;
  dispose(): void;
}

export function createBuilding({ shadows = false, detail = 1 }: { shadows?: boolean; detail?: number } = {}): BuildingParts {
  const m = getMaterials();
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, opts: { cast?: boolean; receive?: boolean } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = Boolean(opts.cast && shadows);
    mesh.receiveShadow = Boolean(opts.receive && shadows);
    group.add(mesh);
    disposables.push(geo);
    return mesh;
  };

  const W = WORLD.buildingWidth;
  const H = WORLD.buildingHeight;
  const D = WORLD.buildingDepth;
  const fz = WORLD.facadeZ;
  const backZ = fz - D;
  const half = W / 2;

  /* ---------------- Shell ---------------- */
  add(
    boxes([
      [0.6, H, D, -half, H / 2, fz - D / 2], // left wall
      [0.6, H, D, half, H / 2, fz - D / 2], // right wall
      [W + 0.6, H, 0.6, 0, H / 2, backZ], // back wall
    ]),
    new THREE.MeshStandardMaterial({ color: '#dedbd4', roughness: 0.92 }),
    { cast: true, receive: true },
  );
  add(
    boxes([
      [W + 1.2, 0.7, D + 0.6, 0, H + 0.35, fz - D / 2], // roof
      [W + 1.2, 3.4, 1.2, 0, H - 1.7, fz + 0.1], // top spandrel band (sign band)
      [W + 1.2, 0.35, 4.2, 0, 5.6, fz - 2.1], // mezzanine L1
      [W + 1.2, 0.35, 4.2, 0, 11.6, fz - 2.1], // mezzanine L2
    ]),
    m.white,
    { cast: true, receive: true },
  );

  // Interior floor (paper white) & ceiling light strips.
  const floor = new THREE.PlaneGeometry(W - 0.6, D - 0.6);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0.012, fz - D / 2);
  add(floor, new THREE.MeshStandardMaterial({ color: '#cdc9c1', roughness: 0.5, metalness: 0.05 }), { receive: true });
  // Floor joints give the hall scale and perspective.
  const joints: number[] = [];
  for (let x = -half + 3; x < half; x += 3) joints.push(x, 0.02, fz - 0.3, x, 0.02, backZ + 0.3);
  for (let z = fz - 3; z > backZ; z -= 3) joints.push(-half + 0.3, 0.02, z, half - 0.3, 0.02, z);
  const jointGeo = new THREE.BufferGeometry();
  jointGeo.setAttribute('position', new THREE.Float32BufferAttribute(joints, 3));
  const jointMat = new THREE.LineBasicMaterial({ color: '#b9b5ad', transparent: true, opacity: 0.6 });
  group.add(new THREE.LineSegments(jointGeo, jointMat));
  disposables.push(jointGeo, jointMat);

  // Suspended linear luminaires: a mid-ground layer between floor and roof.
  const pendants: Box[] = [];
  for (let z = fz - 8; z > backZ + 4; z -= 6.5) {
    for (const x of [-16, 16]) pendants.push([9, 0.12, 0.22, x, 9.5, z]);
  }
  add(boxes(pendants), m.metalDark);
  const cables: Box[] = [];
  pendants.forEach(([, , , x, , z]) => {
    cables.push([0.015, H - 9.6, 0.015, x - 4, 9.5 + (H - 9.6) / 2, z]);
    cables.push([0.015, H - 9.6, 0.015, x + 4, 9.5 + (H - 9.6) / 2, z]);
  });
  add(boxes(cables), m.metal);
  const pendantGlow: Box[] = pendants.map(([w, , d, x, y, z]) => [w - 0.1, 0.02, d - 0.08, x, y - 0.07, z]);
  add(boxes(pendantGlow), m.lightStrip);

  const strips: Box[] = [];
  for (let z = fz - 7; z > backZ + 2; z -= 4.5) strips.push([W - 6, 0.08, 0.35, 0, H - 0.1, z]);
  add(boxes(strips), m.lightStrip);

  // Structural columns
  const colGeos: THREE.BufferGeometry[] = [];
  for (const x of [-21, -7, 7, 21]) {
    for (const z of [-35, -47, -59]) {
      const g = new THREE.CylinderGeometry(0.34, 0.34, H, 16);
      g.translate(x, H / 2, z);
      colGeos.push(g);
    }
  }
  add(mergeGeometries(colGeos)!, m.white, { receive: true });
  colGeos.forEach((g) => g.dispose());

  // Mezzanine balustrades (glass) and handrails (metal)
  const rails: Box[] = [
    [W - 0.6, 0.05, 0.08, 0, 5.6 + 1.1, fz - 4.15],
    [W - 0.6, 0.05, 0.08, 0, 11.6 + 1.1, fz - 4.15],
  ];
  add(boxes(rails), m.metal);
  const balGeo = boxes([
    [W - 0.6, 1.05, 0.02, 0, 5.6 + 0.6, fz - 4.15],
    [W - 0.6, 1.05, 0.02, 0, 11.6 + 0.6, fz - 4.15],
  ]);
  add(balGeo, m.glass);

  /* ---------------- Facade ---------------- */
  const glassH = H - 3.4;
  const glassGeo = new THREE.PlaneGeometry(W, glassH);
  glassGeo.translate(0, glassH / 2, fz + 0.02);
  const glassMat = m.glass.clone();
  add(glassGeo, glassMat);

  const fins: Box[] = [];
  for (let x = -half + 1.5; x < half; x += 3) fins.push([0.12, glassH, 0.55, x, glassH / 2, fz + 0.3]);
  for (const y of [5.6, 11.6]) fins.push([W + 0.4, 0.36, 0.7, 0, y, fz + 0.25]);
  fins.push([W + 0.4, 0.3, 0.7, 0, 0.15, fz + 0.25]);
  add(boxes(fins), m.metal, { cast: true });

  // Entrance canopy + slender columns
  add(
    boxes([
      [14, 0.26, 5.5, 0, 4.4, fz + 2.75],
      [0.14, 4.3, 0.14, -6.6, 2.15, fz + 5.2],
      [0.14, 4.3, 0.14, 6.6, 2.15, fz + 5.2],
    ]),
    m.white,
    { cast: true, receive: true },
  );
  const doorMat = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.55 });
  disposables.push(doorMat);
  add(boxes([[6, 3.2, 0.05, 0, 1.6, fz + 0.12]]), doorMat);

  /* ---------------- XUS sign ---------------- */
  const signY = H - 1.7;
  const signZ = fz + 0.78;
  const t = 0.46; // stroke thickness
  const h = 2.3;
  const letterW = 2.0;
  const gap = 0.75;
  const totalW = letterW * 3 + gap * 2;
  const x0 = -totalW / 2 + letterW / 2;
  const diag = Math.atan2(letterW - t, h);
  const diagLen = Math.hypot(letterW - t, h);
  const sx = [x0, x0 + letterW + gap, x0 + 2 * (letterW + gap)];
  const sign: Box[] = [
    // X
    [t, diagLen, 0.28, sx[0], signY, signZ, 0, diag],
    [t, diagLen, 0.28, sx[0], signY, signZ, 0, -diag],
    // U
    [t, h, 0.28, sx[1] - letterW / 2 + t / 2, signY + 0.0, signZ],
    [t, h, 0.28, sx[1] + letterW / 2 - t / 2, signY + 0.0, signZ],
    [letterW, t, 0.28, sx[1], signY - h / 2 + t / 2, signZ],
    // S
    [letterW, t, 0.28, sx[2], signY + h / 2 - t / 2, signZ],
    [t, h / 2, 0.28, sx[2] - letterW / 2 + t / 2, signY + h / 4, signZ],
    [letterW, t, 0.28, sx[2], signY, signZ],
    [t, h / 2, 0.28, sx[2] + letterW / 2 - t / 2, signY - h / 4, signZ],
    [letterW, t, 0.28, sx[2], signY - h / 2 + t / 2, signZ],
  ];
  add(boxes(sign), m.metalDark, { cast: true });
  const signGlow = new THREE.MeshBasicMaterial({ color: PALETTE.blue, toneMapped: false, transparent: true, opacity: 0.9 });
  disposables.push(signGlow);
  add(boxes([[totalW + 1.2, 0.05, 0.05, 0, signY - h / 2 - 0.45, signZ + 0.1]]), signGlow);

  /* ---------------- Plaza ---------------- */
  const ground = new THREE.PlaneGeometry(420, 420);
  ground.rotateX(-Math.PI / 2);
  add(ground, m.ground, { receive: true });

  const walk = new THREE.PlaneGeometry(9, 70);
  walk.rotateX(-Math.PI / 2);
  walk.translate(0, 0.006, fz + 35);
  add(walk, new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 1 }), { receive: true });

  // Paving joints
  const pts: number[] = [];
  for (let z = fz + 1; z <= 60; z += 2.5) pts.push(-40, 0.01, z, 40, 0.01, z);
  for (let x = -40; x <= 40; x += 2.5) pts.push(x, 0.01, fz + 1, x, 0.01, 60);
  const paving = new THREE.BufferGeometry();
  paving.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const pavingMat = new THREE.LineBasicMaterial({ color: '#d2d0c9', transparent: true, opacity: 0.55 });
  disposables.push(pavingMat);
  const pavingLines = new THREE.LineSegments(paving, pavingMat);
  group.add(pavingLines);
  disposables.push(paving);

  // Maquette trees
  const rand = mulberry32(7);
  const treeSpots: [number, number, number][] = [];
  for (let z = -16; z <= 48; z += 8) {
    treeSpots.push([-8.5 + rand() * 0.6, z + rand(), 0.9 + rand() * 0.35]);
    treeSpots.push([8.5 + rand() * 0.6, z + rand(), 0.9 + rand() * 0.35]);
  }
  for (let i = 0; i < 26 * detail; i++) {
    const side = rand() > 0.5 ? 1 : -1;
    treeSpots.push([side * (16 + rand() * 30), fz + 6 + rand() * 60, 0.8 + rand() * 0.6]);
  }
  const canopyGeo = new THREE.IcosahedronGeometry(1.5, 2);
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.1, 2.6, 6);
  trunkGeo.translate(0, 1.3, 0);
  const canopy = new THREE.InstancedMesh(canopyGeo, m.white, treeSpots.length);
  const trunk = new THREE.InstancedMesh(trunkGeo, m.metal, treeSpots.length);
  const mtx = new THREE.Matrix4();
  treeSpots.forEach(([x, z, s], i) => {
    mtx.compose(new THREE.Vector3(x, 2.6 * s + 1.1 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.12, s));
    canopy.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    trunk.setMatrixAt(i, mtx);
  });
  canopy.castShadow = shadows;
  trunk.castShadow = shadows;
  group.add(canopy, trunk);
  disposables.push(canopyGeo, trunkGeo);

  // Distant context massing, dissolving into fog
  const ctx: Box[] = [];
  for (let i = 0; i < 22 * detail; i++) {
    const side = i % 2 ? 1 : -1;
    const w = 12 + rand() * 22;
    const hh = 8 + rand() * 30;
    ctx.push([w, hh, 14 + rand() * 20, side * (55 + rand() * 80), hh / 2, -30 - rand() * 130]);
  }
  for (let i = 0; i < 10 * detail; i++) {
    const w = 16 + rand() * 20;
    const hh = 10 + rand() * 26;
    ctx.push([w, hh, 18, -90 + i * 20 + rand() * 6, hh / 2, -110 - rand() * 40]);
  }
  add(boxes(ctx), m.concrete);

  /* ---------------- Facade signals (dusk) ---------------- */
  const SIGNALS = 14;
  const sigGeo = new THREE.BoxGeometry(1.6, 0.06, 0.06);
  const sigMat = new THREE.MeshBasicMaterial({ color: PALETTE.blueGlow, toneMapped: false, transparent: true, opacity: 0 });
  const facadeSignals = new THREE.InstancedMesh(sigGeo, sigMat, SIGNALS);
  facadeSignals.frustumCulled = false;
  group.add(facadeSignals);
  disposables.push(sigGeo, sigMat);
  const sigRows = [0.33, 5.6, 11.6, H - 3.45];
  const sig = Array.from({ length: SIGNALS }, (_, i) => ({
    row: sigRows[i % sigRows.length],
    speed: 3 + rand() * 5,
    offset: rand() * W,
    dir: rand() > 0.5 ? 1 : -1,
  }));
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3(1, 1, 1);

  return {
    group,
    glass: glassMat,
    signGlow,
    facadeSignals,
    update(time, dusk, activity) {
      glassMat.opacity = 0.2 - dusk * 0.08;
      signGlow.opacity = 0.35 + 0.65 * Math.max(dusk, 0.25 + 0.2 * Math.sin(time * 1.4));
      sigMat.opacity = dusk * activity;
      if (sigMat.opacity < 0.01) return;
      for (let i = 0; i < SIGNALS; i++) {
        const s = sig[i];
        const x = ((((s.offset + time * s.speed * s.dir) % W) + W) % W) - half;
        v.set(x, s.row, fz + 0.65);
        mtx.compose(v, q, sc);
        facadeSignals.setMatrixAt(i, mtx);
      }
      facadeSignals.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      glassMat.dispose();
      canopy.dispose();
      trunk.dispose();
      facadeSignals.dispose();
    },
  };
}
