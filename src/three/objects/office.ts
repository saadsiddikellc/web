import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getMaterials, mulberry32 } from '../materials';
import type { FloorPlan } from './layout';

/**
 * Office furniture: desks, chairs, monitors with live screens, and paper stacks
 * that grow as manual work piles up — and clear once the system takes over.
 */
export interface Office {
  group: THREE.Group;
  update(time: number, chaos: number, resolve: number, dusk: number): void;
  dispose(): void;
}

const SCREEN_CALM = new THREE.Color('#dfe6f1');
const SCREEN_AI = new THREE.Color('#e9efff');
const SCREEN_ALERT = new THREE.Color('#f3c9c4');
const SCREEN_OFF = new THREE.Color('#2a2d35');

export function createOffice(plan: FloorPlan): Office {
  const m = getMaterials();
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const n = plan.seats.length;
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);

  // Desks (top + two end panels) in one geometry.
  const deskParts = [
    new THREE.BoxGeometry(1.5, 0.04, 0.78).translate(0, 0.74, 0),
    new THREE.BoxGeometry(0.04, 0.72, 0.7).translate(-0.72, 0.36, 0),
    new THREE.BoxGeometry(0.04, 0.72, 0.7).translate(0.72, 0.36, 0),
  ];
  const deskGeo = mergeGeometries(deskParts)!;
  deskParts.forEach((g) => g.dispose());
  const desks = new THREE.InstancedMesh(deskGeo, m.white, n);

  const chairParts = [
    new THREE.BoxGeometry(0.46, 0.07, 0.44).translate(0, 0.45, 0),
    new THREE.BoxGeometry(0.44, 0.5, 0.05).translate(0, 0.76, -0.23),
    new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6).translate(0, 0.21, 0),
  ];
  const chairGeo = mergeGeometries(chairParts)!;
  chairParts.forEach((g) => g.dispose());
  const chairs = new THREE.InstancedMesh(chairGeo, m.metalDark, n);

  const monitorGeo = new THREE.BoxGeometry(0.56, 0.34, 0.025).translate(0, 1.02, -0.014);
  const monitors = new THREE.InstancedMesh(monitorGeo, m.ink, n);
  const screenGeo = new THREE.PlaneGeometry(0.52, 0.3).translate(0, 1.02, 0.001);
  const screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const screens = new THREE.InstancedMesh(screenGeo, screenMat, n);

  const stackGeo = new THREE.BoxGeometry(0.24, 1, 0.32).translate(0, 0.5, 0);
  const stacks = new THREE.InstancedMesh(stackGeo, m.white, n);
  stacks.frustumCulled = false;

  const rand = mulberry32(21);
  const stackPos: THREE.Vector3[] = [];
  const stackRot: THREE.Quaternion[] = [];
  const stackWeight: number[] = [];
  const alertSeed: number[] = [];

  plan.seats.forEach((s, i) => {
    q.setFromAxisAngle(up, s.yaw);
    mtx.compose(pos.set(s.deskX, 0, s.deskZ), q, one);
    desks.setMatrixAt(i, mtx);

    mtx.compose(pos.set(s.x, 0, s.z), q, one);
    chairs.setMatrixAt(i, mtx);

    const mq = new THREE.Quaternion().setFromAxisAngle(up, s.yaw + Math.PI);
    const dir = s.yaw === 0 ? 1 : -1;
    mtx.compose(pos.set(s.deskX, 0, s.deskZ + dir * 0.18), mq, one);
    monitors.setMatrixAt(i, mtx);
    mtx.compose(pos.set(s.deskX, 0, s.deskZ + dir * 0.18 - dir * 0.002), mq, one);
    screens.setMatrixAt(i, mtx);
    screens.setColorAt(i, SCREEN_CALM);

    stackPos.push(new THREE.Vector3(s.deskX + (rand() > 0.5 ? 0.5 : -0.5), 0.76, s.deskZ - dir * 0.05));
    stackRot.push(new THREE.Quaternion().setFromAxisAngle(up, (rand() - 0.5) * 0.5));
    stackWeight.push(0.3 + rand() * 0.7);
    alertSeed.push(rand());
  });

  // Meeting tables
  const tableGeo = mergeGeometries([
    new THREE.CylinderGeometry(1.15, 1.15, 0.05, 32).translate(0, 0.74, 0),
    new THREE.CylinderGeometry(0.08, 0.2, 0.72, 12).translate(0, 0.36, 0),
  ])!;
  const tables = new THREE.InstancedMesh(tableGeo, m.white, plan.meetingTables.length);
  plan.meetingTables.forEach((t, i) => {
    mtx.compose(pos.set(t.x, 0, t.z), new THREE.Quaternion(), one);
    tables.setMatrixAt(i, mtx);
  });

  // Soft contact shadows under each desk pair (cheap ambient occlusion).
  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(40,38,34,0.55)');
    grd.addColorStop(1, 'rgba(40,38,34,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const blobGeo = new THREE.PlaneGeometry(2.6, 2.4).rotateX(-Math.PI / 2);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false });
  const blobs = new THREE.InstancedMesh(blobGeo, blobMat, n);
  plan.seats.forEach((s, i) => {
    const dir = s.yaw === 0 ? 1 : -1;
    mtx.compose(pos.set(s.deskX, 0.025, s.deskZ - dir * 0.25), new THREE.Quaternion(), one);
    blobs.setMatrixAt(i, mtx);
  });
  blobs.renderOrder = -1;

  group.add(blobs, desks, chairs, monitors, screens, stacks, tables);
  disposables.push(blobTex, blobGeo, blobMat, blobs, deskGeo, chairGeo, monitorGeo, screenGeo, screenMat, stackGeo, tableGeo, desks, chairs, monitors, screens, stacks, tables);

  const scale = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  let lastStackLevel = -1;
  let lastScreenTick = -1;

  return {
    group,
    update(time, chaos, resolve, dusk) {
      // Paper stacks: height follows the workload, then clears.
      const level = Math.round(chaos * 200) / 200;
      if (level !== lastStackLevel) {
        lastStackLevel = level;
        for (let i = 0; i < n; i++) {
          const h = Math.max(0.0001, chaos * stackWeight[i] * 0.42);
          scale.set(1, h, 1);
          mtx.compose(stackPos[i], stackRot[i], h < 0.002 ? scale.set(0.0001, 0.0001, 0.0001) : scale);
          stacks.setMatrixAt(i, mtx);
        }
        stacks.instanceMatrix.needsUpdate = true;
      }

      // Screens: calm → flashing alerts under pressure → uniform, quiet AI state → off at night.
      const tick = Math.floor(time * 3);
      if (tick !== lastScreenTick) {
        lastScreenTick = tick;
        for (let i = 0; i < n; i++) {
          const flicker = Math.sin(tick * 1.7 + alertSeed[i] * 40) > 1 - chaos * 0.9;
          tmpColor.copy(SCREEN_CALM).lerp(SCREEN_AI, resolve);
          if (flicker && chaos > 0.25) tmpColor.copy(SCREEN_ALERT);
          if (dusk > alertSeed[i] * 0.9 + 0.05) tmpColor.copy(SCREEN_OFF);
          screens.setColorAt(i, tmpColor);
        }
        if (screens.instanceColor) screens.instanceColor.needsUpdate = true;
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

