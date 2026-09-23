import * as THREE from 'three';
import type { Rig } from './figure';

/**
 * Pose library. Conventions: limbs hang along −Y from their joint; a figure faces +Z.
 * A negative rotation.x swings a limb forward.
 */

export function resetPose(r: Rig) {
  r.hips.position.y = r.dims.hipHeight;
  for (const j of [
    r.hips,
    r.spine,
    r.neck,
    r.head,
    r.shoulderL,
    r.shoulderR,
    r.elbowL,
    r.elbowR,
    r.wristL,
    r.wristR,
    r.hipL,
    r.hipR,
    r.kneeL,
    r.kneeR,
    r.ankleL,
    r.ankleR,
  ]) {
    j.rotation.set(0, 0, 0);
    j.quaternion.setFromEuler(j.rotation);
  }
}

/** Relaxed standing with breathing and weight shift. */
export function applyIdle(r: Rig, time: number, seed = 0) {
  const b = Math.sin(time * 1.35 + seed);
  const sway = Math.sin(time * 0.45 + seed * 2);
  r.spine.rotation.x = 0.015 * b;
  r.hips.rotation.z = 0.012 * sway;
  r.spine.rotation.z = -0.014 * sway;
  r.shoulderL.rotation.set(0.02, 0, 0.07 + 0.01 * b);
  r.shoulderR.rotation.set(0.02, 0, -0.07 - 0.01 * b);
  r.elbowL.rotation.x = -0.14;
  r.elbowR.rotation.x = -0.14;
  r.hipL.rotation.set(0, 0, 0.012 * sway);
  r.hipR.rotation.set(0, 0, 0.012 * sway);
  r.head.rotation.x = 0.02 * b;
}

/**
 * Walk cycle. `phase` advances 2π per stride (two steps); `amount` blends from
 * standing (0) to a full natural gait (1) so figures ease in and out of motion.
 */
export function applyWalk(r: Rig, phase: number, amount: number) {
  if (amount <= 0.001) return;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const a = amount;

  const thigh = 0.44 * a;
  r.hipL.rotation.x = -s * thigh;
  r.hipR.rotation.x = s * thigh;
  const kneeL = a * (0.08 + 0.85 * Math.pow(Math.max(0, c), 1.6));
  const kneeR = a * (0.08 + 0.85 * Math.pow(Math.max(0, -c), 1.6));
  r.kneeL.rotation.x = kneeL;
  r.kneeR.rotation.x = kneeR;
  r.ankleL.rotation.x = -(r.hipL.rotation.x + kneeL) * 0.55;
  r.ankleR.rotation.x = -(r.hipR.rotation.x + kneeR) * 0.55;

  r.hips.position.y = r.dims.hipHeight - a * (0.028 * Math.abs(s) - 0.008);
  r.hips.rotation.y = s * 0.09 * a;
  r.spine.rotation.y = -s * 0.12 * a;
  r.spine.rotation.x = 0.04 * a;
  r.head.rotation.y = s * 0.04 * a;

  r.shoulderL.rotation.x = s * 0.36 * a;
  r.shoulderR.rotation.x = -s * 0.36 * a;
  r.shoulderL.rotation.z = 0.06;
  r.shoulderR.rotation.z = -0.06;
  r.elbowL.rotation.x = -(0.18 + 0.32 * Math.max(0, -s)) * a - 0.06;
  r.elbowR.rotation.x = -(0.18 + 0.32 * Math.max(0, s)) * a - 0.06;
}

/** Leaning back in a lounge chair, arms resting, legs extended. */
export function applyLounge(r: Rig, time: number) {
  const b = Math.sin(time * 1.1);
  r.hips.position.y = 0.44;
  r.hips.rotation.x = 0.05;
  r.spine.rotation.x = -0.62 + 0.01 * b;
  r.neck.rotation.x = 0.38;
  r.head.rotation.set(0.08, 0.16 + 0.04 * Math.sin(time * 0.3), 0);
  r.hipL.rotation.set(-1.25, 0, 0.07);
  r.hipR.rotation.set(-1.18, 0, -0.1);
  r.kneeL.rotation.x = 0.55;
  r.kneeR.rotation.x = 0.72;
  r.ankleL.rotation.x = 0.1;
  r.ankleR.rotation.x = 0.05;
  r.shoulderL.rotation.set(-0.18, 0, 0.28);
  r.shoulderR.rotation.set(-0.3, 0, -0.3);
  r.elbowL.rotation.x = -0.95;
  r.elbowR.rotation.x = -1.55; // holding the phone loosely
}

/* -------------------------------------------------------------------------- */
/* Two-bone arm IK                                                             */
/* -------------------------------------------------------------------------- */
const _S = new THREE.Vector3();
const _T = new THREE.Vector3();
const _D = new THREE.Vector3();
const _N = new THREE.Vector3();
const _U = new THREE.Vector3();
const _E = new THREE.Vector3();
const _F = new THREE.Vector3();
const _P = new THREE.Vector3();
const _Q = new THREE.Quaternion();
const _Qi = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Places the wrist of one arm on `targetWorld`. `pole` (in spine space) decides
 * which way the elbow points. Blend with the current pose via `weight`.
 */
export function solveArmIK(r: Rig, side: 'L' | 'R', targetWorld: THREE.Vector3, pole: THREE.Vector3, weight = 1) {
  const shoulder = side === 'L' ? r.shoulderL : r.shoulderR;
  const elbow = side === 'L' ? r.elbowL : r.elbowR;
  const L1 = r.dims.upperArm;
  const L2 = r.dims.forearm;

  r.spine.updateWorldMatrix(true, false);
  _S.copy(shoulder.position);
  _T.copy(targetWorld);
  r.spine.worldToLocal(_T);

  _D.subVectors(_T, _S);
  const dist = THREE.MathUtils.clamp(_D.length(), 0.08, L1 + L2 - 0.002);
  _D.normalize();

  const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
  const a = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));

  _N.crossVectors(_D, _P.copy(pole).normalize());
  if (_N.lengthSq() < 1e-6) _N.set(1, 0, 0);
  _N.normalize();
  _U.copy(_D).applyAxisAngle(_N, a);

  _Q.setFromUnitVectors(DOWN, _U);
  if (weight >= 1) shoulder.quaternion.copy(_Q);
  else shoulder.quaternion.slerp(_Q, weight);

  _E.copy(_S).addScaledVector(_U, L1);
  _F.subVectors(_T, _E).normalize();
  _Qi.copy(shoulder.quaternion).invert();
  _F.applyQuaternion(_Qi);
  _Q.setFromUnitVectors(DOWN, _F);
  if (weight >= 1) elbow.quaternion.copy(_Q);
  else elbow.quaternion.slerp(_Q, weight);
}

const _m = new THREE.Matrix4();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _wp = new THREE.Vector3();
const _pq = new THREE.Quaternion();

/**
 * Orients a hand so its fingers continue the forearm and its palm faces `facingWorld`.
 */
export function orientHand(r: Rig, side: 'L' | 'R', facingWorld: THREE.Vector3, weight = 1) {
  const wrist = side === 'L' ? r.wristL : r.wristR;
  const elbow = side === 'L' ? r.elbowL : r.elbowR;
  elbow.updateWorldMatrix(true, false);
  wrist.updateWorldMatrix(false, false);
  wrist.getWorldPosition(_wp);
  elbow.getWorldPosition(_y);
  // Fingers point along −Y, so +Y points back toward the elbow.
  _y.sub(_wp).normalize();
  _z.subVectors(facingWorld, _wp);
  _z.addScaledVector(_y, -_z.dot(_y)).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  _Q.setFromRotationMatrix(_m);
  elbow.getWorldQuaternion(_pq).invert();
  _Q.premultiply(_pq);
  if (weight >= 1) wrist.quaternion.copy(_Q);
  else wrist.quaternion.slerp(_Q, weight);
}
