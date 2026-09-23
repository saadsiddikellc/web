import * as THREE from 'three';
import { createFigure, disposeFigure, type Rig } from './figure';
import { applyIdle, applyWalk, orientHand, resetPose, solveArmIK } from './poses';
import { smooth } from '../timeline';

/**
 * The two founders as a choreographed pair: walking side by side, then a
 * physically-plausible high-five (IK-driven so palms genuinely meet).
 */

export const FOUNDER_OUTFITS = {
  production: {
    top: '#f1f0ec',
    coat: '#2a2b2f',
    trousers: '#b7b2a8',
    shoes: '#ecebe7',
    skin: '#b88c72',
    hair: '#1b1816',
    hairStyle: 'crop' as const,
    build: 1.04,
    height: 1.01,
  },
  sales: {
    top: '#fafaf8',
    coat: '#c3c5c9',
    trousers: '#1b1c20',
    shoes: '#1e1e21',
    skin: '#d1aa90',
    hair: '#3a2a20',
    hairStyle: 'swept' as const,
    build: 0.98,
    height: 0.985,
  },
};

export interface PairState {
  /** Position of the pair's centre on the ground. */
  x: number;
  z: number;
  /** Heading (radians). π = walking toward −Z. */
  yaw: number;
  walkPhase: number;
  walkAmount: number;
  /** 0..1 progress through the high-five gesture. */
  highFive: number;
  time: number;
  /** Half distance between the two figures. */
  spacing?: number;
}

export interface FounderPair {
  group: THREE.Group;
  a: Rig;
  b: Rig;
  update(s: PairState): void;
  dispose(): void;
}

const _c = new THREE.Vector3();
const _sa = new THREE.Vector3();
const _sb = new THREE.Vector3();
const _restA = new THREE.Vector3();
const _restB = new THREE.Vector3();
const _ta = new THREE.Vector3();
const _tb = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
// Pair-local frame: +Z forward, figures' own left is +X. A stands at −X, so B is on
// A's left: A high-fives with its LEFT hand, B with its RIGHT. Elbows point down and in.
const POLE_A = new THREE.Vector3(0.5, -1, 0.2);
const POLE_B = new THREE.Vector3(-0.5, -1, 0.2);

export function createFounderPair({ shadows = false } = {}): FounderPair {
  const group = new THREE.Group();
  const a = createFigure(FOUNDER_OUTFITS.production, { shadows });
  const b = createFigure(FOUNDER_OUTFITS.sales, { shadows });
  group.add(a.root, b.root);

  function update(s: PairState) {
    const spacing = s.spacing ?? 0.46;
    group.position.set(s.x, 0, s.z);
    group.rotation.y = s.yaw;

    const u = s.highFive;
    const gesture = smooth(0.0, 0.4, u) * (1 - smooth(0.62, 0.96, u));
    const turn = smooth(0.0, 0.32, u) * (1 - smooth(0.7, 1, u));
    const lean = gesture;

    a.root.position.set(-spacing + turn * 0.05, 0, 0.05 * Math.sin(s.walkPhase * 0.5));
    b.root.position.set(spacing - turn * 0.05, 0, -0.04);

    for (const [rig, seed] of [
      [a, 0],
      [b, 1.7],
    ] as const) {
      resetPose(rig);
      applyIdle(rig, s.time, seed);
      applyWalk(rig, s.walkPhase + seed * 0.35, s.walkAmount);
    }

    // Idle conversation: glance at each other while walking.
    const chat = (1 - turn) * 0.18 * (0.5 + 0.5 * Math.sin(s.time * 0.6));
    a.head.rotation.y += chat + turn * 0.5;
    b.head.rotation.y += -chat * 0.8 - turn * 0.5;
    a.spine.rotation.y += turn * 0.38;
    b.spine.rotation.y += -turn * 0.38;
    a.spine.rotation.z += -lean * 0.05;
    b.spine.rotation.z += lean * 0.05;
    a.head.rotation.x += -lean * 0.12;
    b.head.rotation.x += -lean * 0.12;

    if (gesture > 0.001) {
      group.updateMatrixWorld(true);
      a.shoulderL.getWorldPosition(_sa);
      b.shoulderR.getWorldPosition(_sb);
      a.wristL.getWorldPosition(_restA);
      b.wristR.getWorldPosition(_restB);

      _fwd.set(0, 0, 1).applyQuaternion(group.quaternion);
      _right.set(1, 0, 0).applyQuaternion(group.quaternion);
      _c.addVectors(_sa, _sb).multiplyScalar(0.5);
      _c.y += 0.34;
      _c.addScaledVector(_fwd, 0.1);

      // Palms meet with a small elastic recoil right after contact.
      const recoil = smooth(0.42, 0.5, u) * (1 - smooth(0.5, 0.66, u));
      const gap = 0.034 + recoil * 0.03;
      _ta.copy(_c).addScaledVector(_right, -gap);
      _tb.copy(_c).addScaledVector(_right, gap);
      // Wrist sits below the palm centre.
      _ta.y -= 0.085 - recoil * 0.015;
      _tb.y -= 0.085 - recoil * 0.015;

      const e = gesture * gesture * (3 - 2 * gesture);
      _ta.lerpVectors(_restA, _ta, e);
      _tb.lerpVectors(_restB, _tb, e);

      solveArmIK(a, 'L', _ta, POLE_A);
      solveArmIK(b, 'R', _tb, POLE_B);
      orientHand(a, 'L', _tb.clone().setY(_ta.y), e);
      orientHand(b, 'R', _ta.clone().setY(_tb.y), e);
    }
  }

  return {
    group,
    a,
    b,
    update,
    dispose() {
      disposeFigure(a);
      disposeFigure(b);
    },
  };
}
