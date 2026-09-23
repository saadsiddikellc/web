import * as THREE from 'three';
import { getGlowTexture, mulberry32, PALETTE } from '../materials';

/**
 * The XUS intelligence core — an original, non-humanoid form:
 * a luminous nucleus inside nested geometric shells, a lattice of signal points,
 * and three orbital rings carrying data beads. Precise, calm, architectural.
 */
export interface AICore {
  group: THREE.Group;
  update(time: number, reveal: number, pulse?: number): void;
  dispose(): void;
}

function fibonacciSphere(n: number, r: number) {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = phi * i;
    pts.push(new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r));
  }
  return pts;
}

export function createAICore({ detail = 1 }: { detail?: number } = {}): AICore {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  const disposables: { dispose(): void }[] = [];
  const glowTex = getGlowTexture();

  // Nucleus
  const nucleusGeo = new THREE.IcosahedronGeometry(0.46, 4);
  const nucleusMat = new THREE.MeshBasicMaterial({ color: '#eaf0ff', toneMapped: false });
  const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
  inner.add(nucleus);

  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: PALETTE.blueGlow,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(4.2);
  inner.add(glow);
  const glowCoreMat = glowMat.clone();
  glowCoreMat.color = new THREE.Color('#ffffff');
  const glowCore = new THREE.Sprite(glowCoreMat);
  glowCore.scale.setScalar(1.7);
  inner.add(glowCore);

  // Shells
  const shellAGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.55, 1));
  const shellAMat = new THREE.LineBasicMaterial({ color: '#7d8087', transparent: true, opacity: 0.9 });
  const shellA = new THREE.LineSegments(shellAGeo, shellAMat);
  inner.add(shellA);

  const shellBGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.08, 0));
  const shellBMat = new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.85, toneMapped: false });
  const shellB = new THREE.LineSegments(shellBGeo, shellBMat);
  inner.add(shellB);

  // Faceted metallic plates on the outer shell (sparse)
  const plateGeo = new THREE.IcosahedronGeometry(1.53, 1);
  const plateMat = new THREE.MeshStandardMaterial({
    color: '#dfe1e5',
    metalness: 0.9,
    roughness: 0.22,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    flatShading: true,
  });
  const plates = new THREE.Mesh(plateGeo, plateMat);
  inner.add(plates);

  // Lattice points + synapses
  const rand = mulberry32(11);
  const pts = fibonacciSphere(Math.round(150 * detail), 2.35);
  const pointsGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const pointsMat = new THREE.PointsMaterial({ color: '#8fa9ff', size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.9, toneMapped: false });
  const points = new THREE.Points(pointsGeo, pointsMat);
  inner.add(points);

  const syn: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) < 0.62 && rand() > 0.55) {
        syn.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      }
    }
  }
  const synGeo = new THREE.BufferGeometry();
  synGeo.setAttribute('position', new THREE.Float32BufferAttribute(syn, 3));
  const synMat = new THREE.LineBasicMaterial({ color: '#a9b8e8', transparent: true, opacity: 0.35 });
  const synapses = new THREE.LineSegments(synGeo, synMat);
  inner.add(synapses);

  // Orbital rings with beads
  const ringGeo = new THREE.TorusGeometry(2.85, 0.009, 6, 200);
  const ringMat = new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 0.9, roughness: 0.25 });
  const beadGeo = new THREE.SphereGeometry(0.055, 12, 10);
  const beadMat = new THREE.MeshBasicMaterial({ color: PALETTE.blue, toneMapped: false });
  const rings = [0, 1, 2].map((i) => {
    const pivot = new THREE.Group();
    pivot.rotation.set([1.2, 0.4, -0.7][i], [0.2, 1.1, 0.5][i], [0.3, -0.2, 0.9][i]);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.scale.setScalar([1, 1.08, 0.93][i]);
    pivot.add(ring);
    const bead = new THREE.Mesh(beadGeo, beadMat);
    pivot.add(bead);
    group.add(pivot);
    return { pivot, ring, bead, r: 2.85 * [1, 1.08, 0.93][i], speed: [0.6, -0.45, 0.8][i] };
  });

  const light = new THREE.PointLight(PALETTE.blueGlow, 0, 26, 1.6);
  group.add(light);

  disposables.push(
    nucleusGeo,
    nucleusMat,
    glowMat,
    glowCoreMat,
    shellAGeo,
    shellAMat,
    shellBGeo,
    shellBMat,
    plateGeo,
    plateMat,
    pointsGeo,
    pointsMat,
    synGeo,
    synMat,
    ringGeo,
    ringMat,
    beadGeo,
    beadMat,
  );

  return {
    group,
    update(time, reveal, pulse = 0) {
      const r = reveal;
      group.visible = r > 0.001;
      if (!group.visible) return;
      // Ease-out-back entrance, then a slow breathing scale.
      const c1 = 1.4;
      const back = 1 + (c1 + 1) * Math.pow(r - 1, 3) + c1 * Math.pow(r - 1, 2);
      group.scale.setScalar(Math.max(0.001, back) * (1 + Math.sin(time * 1.1) * 0.012));

      inner.rotation.y = time * 0.12;
      shellA.rotation.set(time * 0.07, time * 0.1, 0);
      plates.rotation.copy(shellA.rotation);
      shellB.rotation.set(-time * 0.2, -time * 0.16, time * 0.1);
      points.rotation.y = -time * 0.05;
      synapses.rotation.y = points.rotation.y;

      const beat = 0.5 + 0.5 * Math.sin(time * 2.2);
      glowMat.opacity = r * (0.55 + 0.25 * beat + pulse * 0.3);
      glowCoreMat.opacity = r * (0.8 + 0.2 * beat);
      nucleus.scale.setScalar(1 + 0.05 * beat + pulse * 0.1);
      shellAMat.opacity = 0.9 * r;
      shellBMat.opacity = 0.85 * r;
      pointsMat.opacity = 0.9 * r;
      synMat.opacity = 0.35 * r;
      plateMat.opacity = 0.18 * r;
      light.intensity = r * (22 + beat * 6 + pulse * 10);

      for (const ring of rings) {
        ring.pivot.rotation.z += 0.0015;
        const a = time * ring.speed;
        ring.bead.position.set(Math.cos(a) * ring.r, Math.sin(a) * ring.r, 0);
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
