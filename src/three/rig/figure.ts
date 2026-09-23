import * as THREE from 'three';
import { PALETTE } from '../materials';

/**
 * A hand-built, stylised human rig (≈1.78 m) in the language of architectural
 * scale models: clean volumes, believable proportions, subtle faces.
 * Built imperatively so poses and IK can drive joints directly every frame.
 */

export interface Outfit {
  top: THREE.ColorRepresentation;
  coat?: THREE.ColorRepresentation;
  trousers: THREE.ColorRepresentation;
  shoes: THREE.ColorRepresentation;
  skin?: THREE.ColorRepresentation;
  hair: THREE.ColorRepresentation;
  hairStyle?: 'short' | 'crop' | 'swept';
  build?: number; // shoulder width multiplier
  height?: number; // overall scale multiplier
}

export interface Rig {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  wristL: THREE.Group;
  wristR: THREE.Group;
  handL: THREE.Mesh;
  handR: THREE.Mesh;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  ankleL: THREE.Group;
  ankleR: THREE.Group;
  dims: typeof DIMS;
  materials: THREE.Material[];
}

export const DIMS = {
  hipHeight: 0.93,
  thigh: 0.45,
  shin: 0.43,
  upperArm: 0.29,
  forearm: 0.25,
  hand: 0.17,
  shoulderY: 0.45,
  shoulderX: 0.185,
  hipX: 0.095,
  neckY: 0.53,
};

const geo = {
  torso: new THREE.CapsuleGeometry(0.165, 0.27, 6, 16),
  pelvis: new THREE.CapsuleGeometry(0.14, 0.06, 4, 14),
  coat: new THREE.CylinderGeometry(0.2, 0.225, 0.46, 18, 1, true),
  neck: new THREE.CylinderGeometry(0.05, 0.058, 0.1, 10),
  head: new THREE.SphereGeometry(0.104, 24, 18),
  hairShort: new THREE.SphereGeometry(0.11, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
  hairSwept: new THREE.SphereGeometry(0.114, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
  nose: new THREE.ConeGeometry(0.016, 0.042, 6),
  ear: new THREE.SphereGeometry(0.022, 8, 6),
  upperArm: new THREE.CapsuleGeometry(0.055, 0.2, 4, 10),
  forearm: new THREE.CapsuleGeometry(0.045, 0.18, 4, 10),
  hand: new THREE.BoxGeometry(0.078, 0.15, 0.03, 1, 1, 1),
  thigh: new THREE.CapsuleGeometry(0.078, 0.33, 4, 12),
  shin: new THREE.CapsuleGeometry(0.062, 0.33, 4, 12),
  foot: new THREE.BoxGeometry(0.1, 0.07, 0.25),
};
// Round the hand box slightly by translating so the wrist is at the origin and fingers point -Y.
geo.hand.translate(0, -0.075, 0);
geo.foot.translate(0, -0.035, 0.065);

function mat(color: THREE.ColorRepresentation, rough = 0.78, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, castShadow: boolean) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = castShadow;
  o.receiveShadow = false;
  return o;
}

export function createFigure(outfit: Outfit, { shadows = false } = {}): Rig {
  const build = outfit.build ?? 1;
  const topM = mat(outfit.top, 0.82);
  const coatM = outfit.coat ? mat(outfit.coat, 0.7) : null;
  const trousersM = mat(outfit.trousers, 0.85);
  const shoesM = mat(outfit.shoes, 0.45, 0.2);
  const skinM = mat(outfit.skin ?? PALETTE.skin, 0.62);
  const hairM = mat(outfit.hair, 0.9);

  const root = new THREE.Group();
  root.scale.setScalar(outfit.height ?? 1);

  const hips = new THREE.Group();
  hips.position.y = DIMS.hipHeight;
  root.add(hips);
  const pelvis = mesh(geo.pelvis, trousersM, shadows);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(0.7, 1, 0.75);
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.position.y = 0.04;
  hips.add(spine);
  const torso = mesh(geo.torso, topM, shadows);
  torso.position.y = 0.27;
  torso.scale.set(1.12 * build, 1, 0.66);
  spine.add(torso);
  if (coatM) {
    const coatTorso = mesh(geo.torso, coatM, shadows);
    coatTorso.position.y = 0.275;
    coatTorso.scale.set(1.2 * build, 1.03, 0.74);
    spine.add(coatTorso);
    const hem = mesh(geo.coat, coatM, shadows);
    hem.position.y = 0.13;
    hem.scale.set(build, 1, 0.68);
    spine.add(hem);
    (coatM as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  }

  const neck = new THREE.Group();
  neck.position.y = DIMS.neckY;
  spine.add(neck);
  const neckMesh = mesh(geo.neck, skinM, shadows);
  neckMesh.position.y = 0.03;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.16;
  neck.add(head);
  const skull = mesh(geo.head, skinM, shadows);
  skull.scale.set(0.92, 1.12, 1);
  head.add(skull);
  const hair = mesh(outfit.hairStyle === 'swept' ? geo.hairSwept : geo.hairShort, hairM, shadows);
  hair.scale.set(0.97, outfit.hairStyle === 'crop' ? 1.02 : 1.12, 1.04);
  hair.position.set(0, 0.012, -0.008);
  hair.rotation.x = outfit.hairStyle === 'swept' ? -0.35 : -0.22;
  head.add(hair);
  // Subtle features: nose and ears only — suggestion, not portraiture.
  const nose = mesh(geo.nose, skinM, false);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.012, 0.106);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(geo.ear, skinM, false);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(0.096 * s, -0.004, -0.005);
    head.add(ear);
  }

  const arm = (side: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(DIMS.shoulderX * side * build, DIMS.shoulderY, 0);
    spine.add(shoulder);
    const upper = mesh(geo.upperArm, coatM ?? topM, shadows);
    upper.position.y = -DIMS.upperArm / 2;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -DIMS.upperArm;
    shoulder.add(elbow);
    const fore = mesh(geo.forearm, coatM ?? topM, shadows);
    fore.position.y = -DIMS.forearm / 2;
    elbow.add(fore);
    const wrist = new THREE.Group();
    wrist.position.y = -DIMS.forearm;
    elbow.add(wrist);
    const hand = mesh(geo.hand, skinM, shadows);
    wrist.add(hand);
    return { shoulder, elbow, wrist, hand };
  };
  const L = arm(1);
  const R = arm(-1);

  const leg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(DIMS.hipX * side, 0, 0);
    hips.add(hip);
    const thigh = mesh(geo.thigh, trousersM, shadows);
    thigh.position.y = -DIMS.thigh / 2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -DIMS.thigh;
    hip.add(knee);
    const shin = mesh(geo.shin, trousersM, shadows);
    shin.position.y = -DIMS.shin / 2;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -DIMS.shin;
    knee.add(ankle);
    const foot = mesh(geo.foot, shoesM, shadows);
    ankle.add(foot);
    return { hip, knee, ankle };
  };
  const LL = leg(1);
  const RL = leg(-1);

  return {
    root,
    hips,
    spine,
    neck,
    head,
    shoulderL: L.shoulder,
    shoulderR: R.shoulder,
    elbowL: L.elbow,
    elbowR: R.elbow,
    wristL: L.wrist,
    wristR: R.wrist,
    handL: L.hand,
    handR: R.hand,
    hipL: LL.hip,
    hipR: RL.hip,
    kneeL: LL.knee,
    kneeR: RL.knee,
    ankleL: LL.ankle,
    ankleR: RL.ankle,
    dims: DIMS,
    materials: [topM, trousersM, shoesM, skinM, hairM, ...(coatM ? [coatM] : [])],
  };
}

export function disposeFigure(rig: Rig) {
  rig.materials.forEach((m) => m.dispose());
}
