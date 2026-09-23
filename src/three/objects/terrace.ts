import * as THREE from 'three';
import { createFigure, disposeFigure, type Rig } from '../rig/figure';
import { applyLounge, resetPose } from '../rig/poses';
import { getGlowTexture, getMaterials, PALETTE } from '../materials';

/**
 * The final beat: the owner, away from the office, resting on a terrace at dusk
 * while the building keeps working in the distance. A phone on the side table
 * lights up quietly with each completed task.
 */
export interface Terrace {
  group: THREE.Group;
  owner: Rig;
  update(time: number, visible: number, activity: number): void;
  dispose(): void;
}

export function createTerrace(position: THREE.Vector3, facing: THREE.Vector3, { shadows = false } = {}): Terrace {
  const m = getMaterials();
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = Math.atan2(facing.x - position.x, facing.z - position.z);
  const disposables: { dispose(): void }[] = [];
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    group.add(mesh);
    disposables.push(g);
    return mesh;
  };

  // Deck, planters, balustrade (all in terrace-local space: +Z faces the building)
  box(7.2, 0.25, 6.4, m.concrete, 0.4, 0.125, 0.9);
  box(7.2, 0.45, 0.5, m.white, 0.4, 0.47, 3.85);
  box(0.5, 0.45, 3.2, m.white, 3.75, 0.47, 2.1);
  box(7.2, 0.8, 0.02, m.glass, 0.4, 0.65, 4.12);
  const shrubGeo = new THREE.IcosahedronGeometry(0.34, 1);
  disposables.push(shrubGeo);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(shrubGeo, m.white);
    s.position.set(-2.9 + i * 0.78, 0.78 + (i % 2) * 0.04, 3.85);
    s.scale.setScalar(0.5 + (i % 3) * 0.08);
    group.add(s);
  }

  // Lounge chair
  const cushion = new THREE.MeshStandardMaterial({ color: '#f3f2ee', roughness: 0.95 });
  disposables.push(cushion);
  const chair = new THREE.Group();
  chair.position.y = 0.25;
  group.add(chair);
  const cbox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    chair.add(mesh);
    disposables.push(g);
  };
  cbox(0.64, 0.1, 0.66, cushion, 0, 0.38, 0.18);
  cbox(0.64, 0.08, 0.72, cushion, 0, 0.33, 0.85, 0.1);
  cbox(0.64, 0.9, 0.08, cushion, 0, 0.77, -0.4, -0.62);
  cbox(0.04, 0.04, 1.95, m.metalDark, 0.33, 0.24, 0.35);
  cbox(0.04, 0.04, 1.95, m.metalDark, -0.33, 0.24, 0.35);
  for (const z of [-0.5, 1.2]) for (const x of [0.33, -0.33]) cbox(0.04, 0.24, 0.04, m.metalDark, x, 0.12, z);

  // Side table + phone
  const tableGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24);
  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
  disposables.push(tableGeo, legGeo);
  const table = new THREE.Mesh(tableGeo, m.white);
  table.position.set(-0.62, 0.25 + 0.52, 0.2);
  const leg = new THREE.Mesh(legGeo, m.metalDark);
  leg.position.set(-0.62, 0.25 + 0.25, 0.2);
  group.add(table, leg);
  const phoneGeo = new THREE.BoxGeometry(0.08, 0.01, 0.16);
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: '#dfe7ff', toneMapped: false });
  disposables.push(phoneGeo, phoneScreenMat);
  const phone = new THREE.Mesh(phoneGeo, phoneScreenMat);
  phone.position.set(-0.6, 0.25 + 0.55, 0.22);
  phone.rotation.y = 0.4;
  group.add(phone);
  const glowMat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: PALETTE.blue,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  disposables.push(glowMat);
  const glow = new THREE.Sprite(glowMat);
  glow.position.copy(phone.position).add(new THREE.Vector3(0, 0.03, 0));
  glow.scale.setScalar(0.7);
  group.add(glow);

  // Warm terrace lamp so the owner reads against the dusk
  const lamp = new THREE.PointLight('#ffe6cc', 0, 7, 1.5);
  lamp.position.set(-1.4, 2.2, -0.6);
  group.add(lamp);

  const owner = createFigure(
    { top: '#d9d7d2', trousers: '#2a2b30', shoes: '#efeeea', hair: '#201a17', skin: '#b8917a', hairStyle: 'short', build: 1 },
    { shadows },
  );
  owner.root.position.set(0, 0.25, 0.02);
  group.add(owner.root);

  return {
    group,
    owner,
    update(time, visible, activity) {
      group.visible = visible > 0.001;
      if (!group.visible) return;
      resetPose(owner);
      applyLounge(owner, time);
      const ping = Math.pow(Math.max(0, Math.sin(time * 1.4)), 12) * activity;
      glowMat.opacity = 0.25 + ping * 0.75;
      phoneScreenMat.color.setRGB(0.85 + ping * 0.1, 0.9 + ping * 0.05, 1);
      lamp.intensity = visible * 3.2;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      disposeFigure(owner);
    },
  };
}
