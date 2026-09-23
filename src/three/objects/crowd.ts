import * as THREE from 'three';
import { mulberry32 } from '../materials';
import { DIMS } from '../rig/figure';
import { shuffledIndices, type FloorPlan } from './layout';
import { smooth } from '../timeline';
import type { Tier } from '../hooks/useDeviceTier';

/**
 * The office population, rendered as instanced articulated figures.
 * Each person has a role and a forward-kinematics pose evaluated per frame, so a
 * hundred people cost six draw calls. Behaviour intensifies with `chaos`.
 */

type Role = 'seated' | 'walker' | 'phone' | 'meeting' | 'runner' | 'mezz';

interface Person {
  role: Role;
  x: number;
  z: number;
  baseY: number;
  yaw: number;
  seed: number;
  leaveAt: number;
  showAt: number; // chaos threshold (runners)
  loop: [number, number][];
  loopLen: number;
  dist: number;
  speed: number;
  phase: number;
  phoneAmt: number;
  torso: THREE.Color;
  legs: THREE.Color;
  skin: THREE.Color;
  hair: THREE.Color;
}

export interface Crowd {
  group: THREE.Group;
  update(time: number, dt: number, chaos: number, leave: number): void;
  dispose(): void;
}

const TOPS = ['#f4f3ef', '#e7e5df', '#cfd0d3', '#9c9fa5', '#3b3d42', '#23252a', '#dcd6cb', '#b9bcc2', '#f8f8f6', '#5a5d63'];
const BOTTOMS = ['#2a2c31', '#1d1e22', '#8f9197', '#c3bdb2', '#46484e', '#e1ddd5'];
const SKINS = ['#e0bfa6', '#c9a187', '#a87b61', '#8a624d', '#d8b39a', '#6f4c3b'];
const HAIR = ['#1b1816', '#2b211b', '#3d2e24', '#141414', '#5a4636', '#8d8a86', '#23201e'];

const COUNTS: Record<Tier, { seated: number; walkers: number; phone: number; meeting: number; runners: number; mezz: number }> = {
  high: { seated: 0.82, walkers: 16, phone: 9, meeting: 10, runners: 14, mezz: 8 },
  mid: { seated: 0.66, walkers: 11, phone: 6, meeting: 8, runners: 9, mezz: 6 },
  low: { seated: 0.4, walkers: 7, phone: 4, meeting: 6, runners: 6, mezz: 4 },
};

function loopLength(loop: [number, number][]) {
  let len = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

function samplePath(loop: [number, number][], d: number, closed: boolean, out: { x: number; z: number; yaw: number }) {
  const segs = closed ? loop.length : loop.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= len || i === segs - 1) {
      const u = Math.min(1, d / len);
      out.x = a[0] + (b[0] - a[0]) * u;
      out.z = a[1] + (b[1] - a[1]) * u;
      out.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      return out;
    }
    d -= len;
  }
  return out;
}

export function createCrowd(plan: FloorPlan, tier: Tier, facadeZ: number): Crowd {
  const rand = mulberry32(99);
  const counts = COUNTS[tier];
  const people: Person[] = [];
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const base = (role: Role, x: number, z: number, yaw: number, baseY = 0): Person => ({
    role,
    x,
    z,
    baseY,
    yaw,
    seed: rand() * 100,
    leaveAt: 0.05 + rand() * 0.85,
    showAt: 0,
    loop: [],
    loopLen: 0,
    dist: 0,
    speed: 1.2 + rand() * 0.3,
    phase: rand() * Math.PI * 2,
    phoneAmt: 0,
    torso: new THREE.Color(pick(TOPS)),
    legs: new THREE.Color(pick(BOTTOMS)),
    skin: new THREE.Color(pick(SKINS)),
    hair: new THREE.Color(pick(HAIR)),
  });

  const seatOrder = shuffledIndices(plan.seats.length, 3);
  const seatedCount = Math.round(plan.seats.length * counts.seated);
  for (let i = 0; i < seatedCount; i++) {
    const s = plan.seats[seatOrder[i]];
    people.push(base('seated', s.x, s.z, s.yaw));
  }

  for (let i = 0; i < counts.walkers; i++) {
    const loop = plan.walkLoops[i % plan.walkLoops.length];
    const p = base('walker', 0, 0, 0);
    p.loop = rand() > 0.5 ? loop : [...loop].reverse();
    p.loopLen = loopLength(p.loop);
    p.dist = rand() * p.loopLen;
    people.push(p);
  }

  for (let i = 0; i < counts.phone; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (8 + rand() * 20);
    const z = i % 3 === 0 ? -63 : -30.2 - rand() * 1.2;
    people.push(base('phone', x, z, rand() * Math.PI * 2));
  }

  plan.meetingTables.forEach((t, ti) => {
    const k = Math.ceil(counts.meeting / plan.meetingTables.length);
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + ti;
      const x = t.x + Math.sin(a) * 1.6;
      const z = t.z + Math.cos(a) * 1.6;
      people.push(base('meeting', x, z, a + Math.PI));
    }
  });

  for (let i = 0; i < counts.runners; i++) {
    const z = plan.crossings[i % plan.crossings.length] + (rand() - 0.5) * 0.8;
    const dir = rand() > 0.5 ? 1 : -1;
    const p = base('runner', 0, 0, 0);
    p.loop = dir > 0 ? [[-28, z], [28, z]] : [[28, z], [-28, z]];
    p.loopLen = 56;
    p.dist = rand() * 56;
    p.speed = 2 + rand() * 0.9;
    p.showAt = 0.35 + (i / counts.runners) * 0.5;
    people.push(p);
  }

  for (let i = 0; i < counts.mezz; i++) {
    const x = -24 + (i / Math.max(1, counts.mezz - 1)) * 48 + (rand() - 0.5) * 3;
    if (Math.abs(x) < 2.6) continue; // keep the camera's path clear
    people.push(base('mezz', x, facadeZ - 3.55, Math.PI + (rand() - 0.5) * 0.6, 5.78));
  }

  const N = people.length;

  /* ---------------- Instanced parts ---------------- */
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
  const g = {
    head: new THREE.SphereGeometry(0.104, 12, 10),
    hair: new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    torso: new THREE.CapsuleGeometry(0.165, 0.27, 3, 10),
    upper: new THREE.CapsuleGeometry(0.052, 0.2, 2, 6),
    fore: new THREE.CapsuleGeometry(0.044, 0.18, 2, 6),
    thigh: new THREE.CapsuleGeometry(0.075, 0.33, 2, 8),
    shin: new THREE.CapsuleGeometry(0.06, 0.33, 2, 8),
  };
  const mk = (geo: THREE.BufferGeometry, count: number) => {
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    return im;
  };
  const heads = mk(g.head, N);
  const hairs = mk(g.hair, N);
  const torsos = mk(g.torso, N);
  const uppers = mk(g.upper, N * 2);
  const fores = mk(g.fore, N * 2);
  const thighs = mk(g.thigh, N * 2);
  const shins = mk(g.shin, N * 2);

  people.forEach((p, i) => {
    heads.setColorAt(i, p.skin);
    hairs.setColorAt(i, p.hair);
    torsos.setColorAt(i, p.torso);
    for (const k of [0, 1]) {
      uppers.setColorAt(i * 2 + k, p.torso);
      fores.setColorAt(i * 2 + k, p.torso);
      thighs.setColorAt(i * 2 + k, p.legs);
      shins.setColorAt(i * 2 + k, p.legs);
    }
  });

  const group = new THREE.Group();
  group.add(heads, hairs, torsos, uppers, fores, thighs, shins);

  /* ---------------- FK scratch ---------------- */
  const R = new THREE.Matrix4();
  const H = new THREE.Matrix4();
  const S = new THREE.Matrix4();
  const J = new THREE.Matrix4();
  const K = new THREE.Matrix4();
  const T = new THREE.Matrix4();
  const out = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const torsoLocal = new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0.27, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1.12, 1, 0.66),
  );
  const headScale = new THREE.Matrix4().makeScale(0.92, 1.12, 1);
  const hairLocal = new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0.012, -0.01),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25, 0, 0)),
    new THREE.Vector3(1, 1.05, 1.04),
  );
  const pathOut = { x: 0, z: 0, yaw: 0 };

  const pose = {
    hipY: DIMS.hipHeight,
    lean: 0,
    twist: 0,
    headYaw: 0,
    headPitch: 0,
    thigh: [0, 0],
    knee: [0, 0],
    fwd: [0, 0],
    out: [0.06, 0.06],
    elbow: [0.15, 0.15],
    bob: 0,
  };

  function resetPose() {
    pose.hipY = DIMS.hipHeight;
    pose.lean = 0;
    pose.twist = 0;
    pose.headYaw = 0;
    pose.headPitch = 0;
    pose.thigh[0] = pose.thigh[1] = 0;
    pose.knee[0] = pose.knee[1] = 0.02;
    pose.fwd[0] = pose.fwd[1] = 0.02;
    pose.out[0] = pose.out[1] = 0.07;
    pose.elbow[0] = pose.elbow[1] = 0.15;
    pose.bob = 0;
  }

  function walkPose(phase: number, amt: number, hurry: number) {
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    pose.thigh[0] = s * 0.42 * amt;
    pose.thigh[1] = -s * 0.42 * amt;
    pose.knee[0] = amt * (0.08 + 0.85 * Math.pow(Math.max(0, c), 1.6));
    pose.knee[1] = amt * (0.08 + 0.85 * Math.pow(Math.max(0, -c), 1.6));
    pose.fwd[0] = -s * 0.34 * amt;
    pose.fwd[1] = s * 0.34 * amt;
    pose.elbow[0] = 0.2 + 0.3 * Math.max(0, s) + hurry * 0.5;
    pose.elbow[1] = 0.2 + 0.3 * Math.max(0, -s) + hurry * 0.5;
    pose.bob = -0.028 * Math.abs(s) * amt;
    pose.lean = 0.04 + hurry * 0.1;
    pose.twist = -s * 0.1 * amt;
  }

  function phonePose(side: 0 | 1, amt: number) {
    pose.fwd[side] = pose.fwd[side] * (1 - amt) + 0.35 * amt;
    pose.out[side] = pose.out[side] * (1 - amt) + 0.32 * amt;
    pose.elbow[side] = pose.elbow[side] * (1 - amt) + 2.55 * amt;
    pose.headPitch += 0.1 * amt;
  }

  function writePerson(i: number, p: Person, x: number, z: number, yaw: number) {
    R.makeRotationY(yaw).setPosition(x, p.baseY, z);
    H.makeTranslation(0, pose.hipY + pose.bob, 0).premultiply(R);
    // Spine
    S.copy(H).multiply(T.makeTranslation(0, 0.04, 0)).multiply(tmp.makeRotationY(pose.twist)).multiply(T.makeRotationX(pose.lean));
    out.copy(S).multiply(torsoLocal);
    torsos.setMatrixAt(i, out);
    out.copy(S)
      .multiply(T.makeTranslation(0, DIMS.neckY + 0.16, 0))
      .multiply(tmp.makeRotationY(pose.headYaw))
      .multiply(T.makeRotationX(pose.headPitch))
      .multiply(headScale);
    heads.setMatrixAt(i, out);
    out.multiply(hairLocal);
    hairs.setMatrixAt(i, out);

    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      // Arm
      J.copy(S)
        .multiply(T.makeTranslation(DIMS.shoulderX * side, DIMS.shoulderY, 0))
        .multiply(tmp.makeRotationX(-pose.fwd[k]))
        .multiply(T.makeRotationZ(side * pose.out[k]));
      out.copy(J).multiply(T.makeTranslation(0, -DIMS.upperArm / 2, 0));
      uppers.setMatrixAt(i * 2 + k, out);
      K.copy(J).multiply(T.makeTranslation(0, -DIMS.upperArm, 0)).multiply(tmp.makeRotationX(-pose.elbow[k]));
      out.copy(K).multiply(T.makeTranslation(0, -DIMS.forearm / 2, 0));
      fores.setMatrixAt(i * 2 + k, out);
      // Leg
      J.copy(H).multiply(T.makeTranslation(DIMS.hipX * side, 0, 0)).multiply(tmp.makeRotationX(-pose.thigh[k]));
      out.copy(J).multiply(T.makeTranslation(0, -DIMS.thigh / 2, 0));
      thighs.setMatrixAt(i * 2 + k, out);
      K.copy(J).multiply(T.makeTranslation(0, -DIMS.thigh, 0)).multiply(tmp.makeRotationX(pose.knee[k]));
      out.copy(K).multiply(T.makeTranslation(0, -DIMS.shin / 2, 0));
      shins.setMatrixAt(i * 2 + k, out);
    }
  }

  function hide(i: number) {
    heads.setMatrixAt(i, ZERO);
    hairs.setMatrixAt(i, ZERO);
    torsos.setMatrixAt(i, ZERO);
    for (const k of [0, 1]) {
      uppers.setMatrixAt(i * 2 + k, ZERO);
      fores.setMatrixAt(i * 2 + k, ZERO);
      thighs.setMatrixAt(i * 2 + k, ZERO);
      shins.setMatrixAt(i * 2 + k, ZERO);
    }
  }

  return {
    group,
    update(time, dt, chaos, leave) {
      const stride = 1.45;
      for (let i = 0; i < N; i++) {
        const p = people[i];
        if (leave > p.leaveAt || (p.role === 'runner' && chaos < p.showAt)) {
          hide(i);
          continue;
        }
        resetPose();
        let x = p.x;
        let z = p.z;
        let yaw = p.yaw;
        const sd = p.seed;

        switch (p.role) {
          case 'seated': {
            pose.hipY = 0.5;
            pose.lean = 0.12 + chaos * 0.16 + Math.sin(time * 0.7 + sd) * 0.02;
            pose.thigh[0] = pose.thigh[1] = 1.45;
            pose.knee[0] = 1.4 + Math.sin(sd) * 0.15;
            pose.knee[1] = 1.5 + Math.cos(sd) * 0.15;
            const typing = Math.sin(time * (11 + chaos * 9) + sd) * 0.035 * (1 + chaos);
            pose.fwd[0] = 0.55 + typing;
            pose.fwd[1] = 0.55 - typing;
            pose.out[0] = pose.out[1] = 0.1;
            pose.elbow[0] = pose.elbow[1] = 0.95;
            pose.headPitch = 0.12;
            pose.headYaw = Math.sin(time * 0.35 + sd) * 0.12 + chaos * 0.45 * Math.sin(time * (1.6 + (sd % 1.3)) + sd);
            const wantsPhone = chaos > 0.15 && Math.sin(time * 0.45 + sd * 7) > 1.05 - chaos * 0.95 ? 1 : 0;
            p.phoneAmt += (wantsPhone - p.phoneAmt) * Math.min(1, dt * 3);
            phonePose(1, p.phoneAmt);
            break;
          }
          case 'walker':
          case 'runner': {
            const hurry = p.role === 'runner' ? 1 : chaos;
            const speed = p.speed * (p.role === 'runner' ? 1 : 1 + chaos * 0.9);
            p.dist = (p.dist + speed * dt) % p.loopLen;
            samplePath(p.loop, p.dist, p.role === 'walker', pathOut);
            x = pathOut.x;
            z = pathOut.z;
            yaw = pathOut.yaw;
            p.phase += (speed * dt * Math.PI * 2) / stride;
            walkPose(p.phase, 1, hurry);
            if (sd % 1 > 0.7) phonePose(1, smooth(0.3, 0.6, chaos));
            break;
          }
          case 'phone': {
            const pace = Math.sin(time * (0.35 + chaos * 0.5) + sd);
            x = p.x + pace * (0.4 + chaos * 1.2);
            yaw = p.yaw + (Math.cos(time * (0.35 + chaos * 0.5) + sd) > 0 ? 1.57 : -1.57) * (0.3 + chaos * 0.7);
            walkPose(time * (3 + chaos * 3) + sd, Math.abs(Math.cos(time * (0.35 + chaos * 0.5) + sd)) * (0.25 + chaos * 0.6), chaos);
            phonePose(1, 1);
            pose.fwd[0] = 0.25;
            pose.out[0] = 0.5;
            pose.elbow[0] = 1.9; // hand on hip
            pose.headPitch = 0.2 + chaos * 0.1;
            break;
          }
          case 'meeting': {
            const talk = Math.max(0, Math.sin(time * (0.8 + chaos) + sd));
            pose.fwd[0] = 0.2 + talk * 0.5;
            pose.elbow[0] = 0.6 + talk * 0.7;
            pose.fwd[1] = 0.12;
            pose.elbow[1] = 0.3;
            pose.headYaw = Math.sin(time * 0.5 + sd) * (0.35 + chaos * 0.4);
            pose.lean = 0.05;
            pose.bob = Math.sin(time * 1.3 + sd) * 0.004;
            break;
          }
          case 'mezz': {
            pose.lean = 0.14;
            pose.fwd[0] = pose.fwd[1] = 0.55;
            pose.out[0] = pose.out[1] = 0.12;
            pose.elbow[0] = pose.elbow[1] = 0.65;
            pose.headPitch = 0.3 + chaos * 0.15;
            pose.headYaw = Math.sin(time * 0.25 + sd) * 0.3;
            break;
          }
        }
        writePerson(i, p, x, z, yaw);
      }
      heads.instanceMatrix.needsUpdate = true;
      hairs.instanceMatrix.needsUpdate = true;
      torsos.instanceMatrix.needsUpdate = true;
      uppers.instanceMatrix.needsUpdate = true;
      fores.instanceMatrix.needsUpdate = true;
      thighs.instanceMatrix.needsUpdate = true;
      shins.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      Object.values(g).forEach((geo) => geo.dispose());
      mat.dispose();
      [heads, hairs, torsos, uppers, fores, thighs, shins].forEach((m) => m.dispose());
    },
  };
}
