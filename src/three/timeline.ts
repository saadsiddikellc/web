import * as THREE from 'three';

/**
 * Homepage story timeline.
 *
 * `t` is measured in chapter units: chapter i of src/content/story.ts spans t ∈ [i, i+1).
 * 0 vision · 1 headquarters · 2 enter · 3 office · 4 manual · 5 problem · 6 ai · 7 workflow · 8 autonomous
 *
 * Everything the 3D scene does is a pure function of `t` (plus wall-clock time for idle life),
 * so the whole film scrubs forwards and backwards with the scroll.
 */

export const WORLD = {
  facadeZ: -25,
  buildingWidth: 60,
  buildingDepth: 40,
  buildingHeight: 22,
  core: new THREE.Vector3(0, 8, -44),
  hallCenter: new THREE.Vector3(0, 0, -45),
} as const;

type Key = { t: number; pos: [number, number, number]; look: [number, number, number] };

export const CAMERA_KEYS: Key[] = [
  { t: 0.0, pos: [-1.2, 1.5, 24.6], look: [-3.5, 4.3, 0] },
  { t: 0.45, pos: [2.4, 1.6, 17.4], look: [0.1, 2.1, 5] },
  { t: 0.8, pos: [3.7, 1.75, 11.6], look: [0.0, 1.6, 6.6] },
  { t: 1.3, pos: [1.6, 3.0, 17.5], look: [0, 6.5, -18] },
  { t: 1.8, pos: [0, 5.6, 11], look: [0, 9.4, -25] },
  { t: 2.25, pos: [0, 7.0, -12.5], look: [0, 7.0, -30] },
  { t: 2.6, pos: [0, 7.1, -23.6], look: [0, 6.2, -34] },
  { t: 2.95, pos: [0, 7.7, -27.4], look: [-4, 2.6, -50] },
  { t: 3.2, pos: [-5, 6.3, -32.6], look: [-9, 1.6, -48] },
  { t: 3.55, pos: [-8.8, 2.7, -31.8], look: [-13.5, 1.1, -45] },
  { t: 4.3, pos: [-8.8, 2.15, -37.6], look: [-2, 1.2, -50] },
  { t: 5.0, pos: [9.3, 2.4, -35.6], look: [15, 1.1, -48] },
  { t: 5.6, pos: [4, 3.8, -34], look: [0, 2.6, -46] },
  { t: 6.25, pos: [0, 5.4, -31.4], look: [-3.4, 7.4, -44] },
  { t: 6.95, pos: [0, 8.4, -27.3], look: [5.6, 7.7, -44] },
  { t: 7.45, pos: [0, 8.0, -20.5], look: [2, 7.8, -40] },
  { t: 8.05, pos: [8.6, 2.6, 27.6], look: [-3, 4.8, -24] },
  { t: 9.0, pos: [8.2, 2.45, 26.8], look: [-2.6, 4.8, -24] },
];

const posCurve = new THREE.CatmullRomCurve3(
  CAMERA_KEYS.map((k) => new THREE.Vector3(...k.pos)),
  false,
  'centripetal',
);
const lookCurve = new THREE.CatmullRomCurve3(
  CAMERA_KEYS.map((k) => new THREE.Vector3(...k.look)),
  false,
  'centripetal',
);

/** Keyframe index as a float, eased inside each segment so the camera settles on each beat. */
function keyIndex(t: number) {
  const n = CAMERA_KEYS.length;
  if (t <= CAMERA_KEYS[0].t) return 0;
  if (t >= CAMERA_KEYS[n - 1].t) return n - 1;
  let i = 0;
  while (i < n - 2 && t > CAMERA_KEYS[i + 1].t) i++;
  const a = CAMERA_KEYS[i].t;
  const b = CAMERA_KEYS[i + 1].t;
  const u = (t - a) / (b - a);
  // Gentle ease: mostly linear through the middle so motion stays continuous.
  const eased = u * u * (3 - 2 * u) * 0.55 + u * 0.45;
  return i + eased;
}

export function sampleCamera(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const k = keyIndex(t) / (CAMERA_KEYS.length - 1);
  posCurve.getPoint(k, outPos);
  lookCurve.getPoint(k, outLook);
}

/** Nearest "resting" keyframe for reduced-motion mode. */
export function snapT(t: number) {
  const beats = [0, 0.8, 1.8, 2.95, 3.55, 4.8, 5.6, 6.25, 6.95, 8.2];
  let best = beats[0];
  for (const b of beats) if (Math.abs(b - t) < Math.abs(best - t)) best = b;
  return best;
}

/* -------------------------------------------------------------------------- */
/* Envelope helpers                                                           */
/* -------------------------------------------------------------------------- */
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** Rises over [a,b], holds, falls over [c,d]. */
export const plateau = (a: number, b: number, c: number, d: number, x: number) =>
  smooth(a, b, x) * (1 - smooth(c, d, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Story envelopes — all 0..1. */
export function envelopes(t: number) {
  // normal → busy → overloaded → chaotic, then resolved by the AI.
  const chaosUp = smooth(3.25, 3.9, t) * 0.35 + smooth(3.9, 4.55, t) * 0.4 + smooth(4.55, 5.15, t) * 0.25;
  const resolve = smooth(5.9, 6.6, t);
  const chaos = chaosUp * (1 - resolve);
  return {
    chaos,
    /** Accumulated workload (does not reset when the AI resolves it). */
    load: chaosUp,
    resolve,
    highFive: clamp01((t - 0.52) / 0.5),
    flash: plateau(2.46, 2.58, 2.62, 2.74, t),
    dim: plateau(4.7, 5.02, 5.8, 6.05, t),
    aiReveal: smooth(5.85, 6.45, t),
    absorb: smooth(5.95, 6.55, t),
    workflow: smooth(6.55, 7.1, t),
    dusk: smooth(7.4, 8.1, t),
    leave: smooth(7.3, 7.9, t),
    exterior: 1 - smooth(2.3, 2.7, t) + smooth(7.35, 7.6, t),
  };
}
export type Envelopes = ReturnType<typeof envelopes>;
