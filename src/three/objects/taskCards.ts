import * as THREE from 'three';
import { mulberry32, PALETTE } from '../materials';
import { smooth, WORLD } from '../timeline';
import type { FloorPlan } from './layout';

/**
 * Floating task cards — emails, leads, follow-ups, forms. They multiply and swirl
 * as manual work overwhelms the office; missed ones fall to the floor. When the AI
 * arrives, every card is drawn into the core in an orderly spiral.
 */
export interface TaskCards {
  mesh: THREE.InstancedMesh;
  update(time: number, load: number, chaos: number, absorb: number): void;
  dispose(): void;
}

function makeCardTexture() {
  const w = 160;
  const h = 104;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(12,12,13,0.18)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#2450ff';
  g.fillRect(12, 12, 14, 14);
  g.fillStyle = 'rgba(12,12,13,0.55)';
  g.fillRect(34, 14, 70, 8);
  g.fillStyle = 'rgba(12,12,13,0.18)';
  for (let i = 0; i < 4; i++) g.fillRect(12, 40 + i * 14, w - 24 - (i === 3 ? 50 : 0), 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createTaskCards(plan: FloorPlan, count: number): TaskCards {
  const tex = makeCardTexture();
  const geo = new THREE.PlaneGeometry(0.62, 0.4);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const rand = mulberry32(5);
  const cards = Array.from({ length: count }, (_, i) => {
    const seat = plan.seats[Math.floor(rand() * plan.seats.length)];
    return {
      ax: seat.deskX + (rand() - 0.5) * 1.2,
      az: seat.deskZ + (rand() - 0.5) * 1.2,
      h: 1.25 + rand() * 1.8,
      r: 0.2 + rand() * 0.9,
      w: (0.4 + rand() * 0.9) * (rand() > 0.5 ? 1 : -1),
      ph: rand() * Math.PI * 2,
      spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(3),
      order: i / count,
      missed: i % 6 === 0,
      fallRot: rand() * Math.PI,
    };
  });

  const white = new THREE.Color('#ffffff');
  const blush = PALETTE.blush.clone();
  const tmpC = new THREE.Color();
  cards.forEach((_, i) => mesh.setColorAt(i, white));

  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const core = WORLD.core;
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  return {
    mesh,
    update(time, load, chaos, absorb) {
      const fall = smooth(0.55, 0.95, load) * (1 - absorb);
      for (let i = 0; i < count; i++) {
        const c = cards[i];
        const visible = c.order < load * 1.15;
        if (!visible || absorb > 0.995) {
          mesh.setMatrixAt(i, ZERO);
          continue;
        }
        const appear = smooth(c.order, c.order + 0.12, load * 1.15);
        const orbit = c.r * (0.4 + chaos * 1.4);
        const a = time * c.w * (0.4 + chaos) + c.ph;
        p.set(c.ax + Math.cos(a) * orbit, c.h + Math.sin(time * 1.3 + c.ph) * 0.18 * (0.3 + chaos), c.az + Math.sin(a) * orbit);
        e.set(time * c.spin.x * chaos * 0.4 + c.ph, time * c.spin.y * (0.2 + chaos * 0.5) + c.ph, time * c.spin.z * chaos * 0.3);

        if (c.missed && fall > 0) {
          const f = fall;
          p.y = p.y * (1 - f) + 0.02 * f;
          e.set(e.x * (1 - f) - (Math.PI / 2) * f, e.y * (1 - f) + c.fallRot * f, e.z * (1 - f));
          tmpC.copy(white).lerp(blush, f);
          mesh.setColorAt(i, tmpC);
        } else if (c.missed) {
          mesh.setColorAt(i, white);
        }

        if (absorb > 0) {
          // Spiral inward toward the core, arriving in order.
          const k = smooth(c.order * 0.5, c.order * 0.5 + 0.5, absorb);
          const ang = c.ph + k * 7 + time * 0.6;
          const rad = (1 - k) * (6 + c.r * 4);
          const sx = core.x + Math.cos(ang) * rad;
          const sy = core.y + Math.sin(ang * 0.5) * rad * 0.25;
          const sz = core.z + Math.sin(ang) * rad;
          p.set(p.x + (sx - p.x) * k, p.y + (sy - p.y) * k, p.z + (sz - p.z) * k);
          e.set(e.x * (1 - k), ang, e.z * (1 - k));
          s.setScalar(appear * (1 - smooth(0.75, 1, k)));
        } else {
          s.setScalar(appear);
        }
        q.setFromEuler(e);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      tex.dispose();
      mesh.dispose();
    },
  };
}
