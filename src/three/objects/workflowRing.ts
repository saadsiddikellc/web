import * as THREE from 'three';
import { getGlowTexture, getMaterials, PALETTE } from '../materials';
import { smooth } from '../timeline';

/**
 * One agent, many workflows: eight stages orbit the core on an elliptical track.
 * Data tokens travel stage to stage in restrained electric blue; each arrival
 * lights its stage and fires a spoke back to the core.
 */
export interface WorkflowRing {
  group: THREE.Group;
  /** World-space node positions (for DOM labels). */
  nodes: THREE.Vector3[];
  /** 0..1 activation per node, updated each frame. */
  activity: number[];
  update(time: number, reveal: number): void;
  dispose(): void;
}

export function createWorkflowRing(center: THREE.Vector3, count: number, rx = 8.6, ry = 4.1): WorkflowRing {
  const group = new THREE.Group();
  group.position.copy(center);
  const disposables: { dispose(): void }[] = [];
  const m = getMaterials();

  // Stage 0 at upper-left, running clockwise as seen from the camera (+Z side).
  const angleOf = (i: number) => Math.PI * 0.78 - (i / count) * Math.PI * 2;
  const local = (a: number, out = new THREE.Vector3()) => out.set(Math.cos(a) * rx, Math.sin(a) * ry, 0.6);
  const nodesLocal = Array.from({ length: count }, (_, i) => local(angleOf(i)));
  const nodes = nodesLocal.map((v) => v.clone().add(center));

  // Track
  const SEG = 240;
  const trackPts: THREE.Vector3[] = [];
  for (let i = 0; i <= SEG; i++) trackPts.push(local(angleOf(0) - (i / SEG) * Math.PI * 2));
  const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPts);
  const trackMat = new THREE.LineBasicMaterial({ color: '#8b8e93', transparent: true, opacity: 0.8 });
  const track = new THREE.Line(trackGeo, trackMat);
  group.add(track);

  // Spokes
  const spokePos: number[] = [];
  nodesLocal.forEach((v) => spokePos.push(0, 0, 0, v.x * 0.94, v.y * 0.94, v.z));
  const spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(spokePos, 3));
  const spokeMat = new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.22, toneMapped: false });
  group.add(new THREE.LineSegments(spokeGeo, spokeMat));

  // Nodes
  const ringGeo = new THREE.TorusGeometry(0.3, 0.022, 8, 48);
  const discGeo = new THREE.CircleGeometry(0.2, 32);
  const discMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true });
  const glowTex = getGlowTexture();
  const nodeObjs = nodesLocal.map((v) => {
    const g = new THREE.Group();
    g.position.copy(v);
    const ring = new THREE.Mesh(ringGeo, m.metal);
    const disc = new THREE.Mesh(discGeo, discMat);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: PALETTE.blueGlow,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(1.6);
    const dot = new THREE.Mesh(discGeo, m.blue);
    dot.scale.setScalar(0.45);
    dot.position.z = 0.01;
    g.add(ring, disc, dot, glow);
    group.add(g);
    disposables.push(glowMat);
    return { g, glowMat, dot };
  });

  // Tokens: three concurrent workflows on the same agent.
  const TOKENS = 3;
  const tokenGeo = new THREE.SphereGeometry(0.1, 12, 10);
  const tokenMat = new THREE.MeshBasicMaterial({ color: '#c9d6ff', toneMapped: false });
  const tokens = Array.from({ length: TOKENS }, () => {
    const mesh = new THREE.Mesh(tokenGeo, tokenMat);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: PALETTE.blue,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.9);
    mesh.add(glow);
    group.add(mesh);
    disposables.push(glowMat);
    return mesh;
  });

  // Spoke pulses (core → node on arrival)
  const pulses = Array.from({ length: count }, () => {
    const mesh = new THREE.Mesh(tokenGeo, tokenMat);
    mesh.scale.setScalar(0.6);
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  });

  disposables.push(trackGeo, trackMat, spokeGeo, spokeMat, ringGeo, discGeo, discMat, tokenGeo, tokenMat);

  const activity = new Array(count).fill(0);
  const tmp = new THREE.Vector3();

  return {
    group,
    nodes,
    activity,
    update(time, reveal) {
      group.visible = reveal > 0.001;
      if (!group.visible) return;
      trackGeo.setDrawRange(0, Math.floor((SEG + 1) * smooth(0, 0.7, reveal)));
      trackMat.opacity = 0.8 * reveal;
      spokeMat.opacity = 0.22 * reveal;

      activity.fill(0);
      const cycle = 9; // seconds for a token to complete the loop
      for (let k = 0; k < TOKENS; k++) {
        const u = (((time / cycle + k / TOKENS) % 1) + 1) % 1;
        const f = u * count;
        const i = Math.floor(f);
        const frac = f - i;
        // Dwell briefly at each stage, then travel.
        const travel = smooth(0.35, 1, frac);
        const a = angleOf(i) - (travel / count) * Math.PI * 2;
        local(a, tmp);
        tokens[k].position.copy(tmp);
        tokens[k].visible = reveal > 0.6;
        const arrive = 1 - smooth(0, 0.35, frac);
        activity[i] = Math.max(activity[i], arrive);
        const p = pulses[i];
        p.visible = reveal > 0.6 && frac < 0.35;
        p.position.copy(nodesLocal[i]).multiplyScalar(smooth(0, 0.35, frac));
      }

      nodeObjs.forEach((n, i) => {
        const appear = smooth(i / count * 0.6, i / count * 0.6 + 0.4, reveal);
        n.g.scale.setScalar(Math.max(0.001, appear));
        n.glowMat.opacity = activity[i] * 0.9 * appear;
        n.dot.scale.setScalar(0.45 + activity[i] * 0.35);
      });
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
