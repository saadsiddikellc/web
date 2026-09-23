import * as THREE from 'three';

/**
 * Shared palette & materials. One instance of each keeps draw state cheap and the
 * look consistent: an architectural-maquette world in whites and metallic grays,
 * with electric blue reserved for intelligence and signals.
 */
export const PALETTE = {
  bg: new THREE.Color('#efeee9'),
  bgAI: new THREE.Color('#eef0f3'),
  bgDusk: new THREE.Color('#15161b'),
  ground: new THREE.Color('#d9d7d0'),
  white: new THREE.Color('#f3f2ee'),
  paper: new THREE.Color('#f6f5f1'),
  concrete: new THREE.Color('#cfccc5'),
  metal: new THREE.Color('#9a9da3'),
  metalDark: new THREE.Color('#3c3e43'),
  ink: new THREE.Color('#141416'),
  blue: new THREE.Color('#2450ff'),
  blueGlow: new THREE.Color('#5d86ff'),
  blush: new THREE.Color('#efc9c6'),
  skin: new THREE.Color('#c7a18a'),
};

let cache: ReturnType<typeof build> | null = null;

function build() {
  return {
    white: new THREE.MeshStandardMaterial({ color: PALETTE.white, roughness: 0.88, metalness: 0 }),
    concrete: new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.95, metalness: 0 }),
    ground: new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.32, metalness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: PALETTE.metalDark, roughness: 0.4, metalness: 0.8 }),
    ink: new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.55, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dfe5ec'),
      roughness: 0.04,
      metalness: 0.2,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 1.6,
    }),
    blue: new THREE.MeshStandardMaterial({
      color: PALETTE.blue,
      emissive: PALETTE.blue,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      toneMapped: false,
    }),
    lightStrip: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), toneMapped: false }),
  };
}

export function getMaterials() {
  if (!cache) cache = build();
  return cache;
}

/** Soft radial sprite used for glows (no post-processing needed). */
let glowTex: THREE.Texture | null = null;
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Deterministic PRNG so the world is identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
