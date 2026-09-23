import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { storyState } from '../store';
import { envelopes, lerp, sampleCamera, smooth, snapT, WORLD } from '../timeline';
import { PALETTE } from '../materials';
import { createBuilding } from '../objects/building';
import { createFloorPlan } from '../objects/layout';
import { createOffice } from '../objects/office';
import { createCrowd } from '../objects/crowd';
import { createTaskCards } from '../objects/taskCards';
import { createAICore } from '../objects/aiCore';
import { createWorkflowRing } from '../objects/workflowRing';
import { createTerrace } from '../objects/terrace';
import { createFounderPair } from '../rig/founderPair';
import type { DeviceProfile } from '../hooks/useDeviceTier';

export interface StageBridge {
  /** Element receiving --dim / --flash / --dusk CSS variables. */
  root: HTMLElement | null;
  labels: (HTMLElement | null)[];
}

interface Props {
  profile: DeviceProfile;
  bridge: React.RefObject<StageBridge>;
  stepCount: number;
}

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _bg = new THREE.Color();

/** Founders' ground position along the story. */
function foundersZ(t: number) {
  if (t < 0.55) {
    const u = t / 0.55;
    return 17 - 10.4 * (1 - Math.pow(1 - u, 2.2));
  }
  if (t < 1.02) return 6.6;
  const u = Math.min(1, (t - 1.02) / 1.3);
  return 6.6 - 30.4 * (u * u * (3 - 2 * u) * 0.4 + u * 0.6);
}

export default function StoryWorld({ profile, bridge, stepCount }: Props) {
  const { scene, gl, camera, size } = useThree();
  const tier = profile.tier;
  const shadows = tier !== 'low';
  const detail = tier === 'high' ? 1 : tier === 'mid' ? 0.7 : 0.45;

  const world = useMemo(() => {
    const plan = createFloorPlan();
    const building = createBuilding({ shadows, detail });
    const office = createOffice(plan);
    const crowd = createCrowd(plan, tier, WORLD.facadeZ);
    const cards = createTaskCards(plan, tier === 'high' ? 150 : tier === 'mid' ? 90 : 48);
    const core = createAICore({ detail });
    core.group.position.copy(WORLD.core);
    const ring = createWorkflowRing(WORLD.core, stepCount);
    const founders = createFounderPair({ shadows });
    const terrace = createTerrace(new THREE.Vector3(4.5, 0, 21), new THREE.Vector3(1.5, 0, -24), { shadows });
    return { plan, building, office, crowd, cards, core, ring, founders, terrace };
  }, [shadows, detail, tier, stepCount]);

  useEffect(() => () => {
    world.building.dispose();
    world.office.dispose();
    world.crowd.dispose();
    world.cards.dispose();
    world.core.dispose();
    world.ring.dispose();
    world.founders.dispose();
    world.terrace.dispose();
  }, [world]);

  // Procedural studio environment for metallic reflections (no network assets).
  useEffect(() => {
    if (tier === 'low') return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, tier]);

  const fog = useMemo(() => new THREE.Fog(PALETTE.bg.clone(), 40, 220), []);
  useEffect(() => {
    scene.fog = fog;
    scene.background = new THREE.Color().copy(PALETTE.bg);
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  const night = useRef<THREE.PointLight>(null);
  const founderMotion = useRef({ lastZ: foundersZ(0), phase: 0, amount: 0 });
  const lastVars = useRef({ dim: -1, flash: -1, dusk: -1 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const reduced = profile.reducedMotion;
    const time = state.clock.elapsedTime * (reduced ? 0.35 : 1);

    // Smooth scroll → timeline (inertia gives the camera weight).
    const target = reduced ? snapT(storyState.target) : storyState.target;
    const prev = storyState.t;
    storyState.t = reduced ? target : lerp(prev, target, 1 - Math.exp(-dt * 3.2));
    if (Math.abs(storyState.t - target) < 0.0004) storyState.t = target;
    const t = storyState.t;
    const e = envelopes(t);

    /* Camera */
    sampleCamera(t, _pos, _look);
    if (!reduced) {
      // Barely-there handheld drift; builds with chaos.
      const drift = 0.04 + e.chaos * 0.07;
      _pos.x += Math.sin(time * 0.31) * drift;
      _pos.y += Math.sin(time * 0.47 + 1) * drift * 0.6;
      _look.x += Math.sin(time * 0.23 + 2) * drift * 1.5 + Math.sin(time * 7.3) * e.chaos * 0.025;
      _look.y += Math.sin(time * 5.1) * e.chaos * 0.02;
    }
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(_pos);
    cam.lookAt(_look);
    const aspect = size.width / Math.max(1, size.height);
    const fov = aspect >= 1 ? 40 : lerp(40, 64, smooth(1, 0.5, aspect));
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    /* Atmosphere */
    _bg.copy(PALETTE.bg).lerp(PALETTE.bgAI, e.resolve * 0.8).lerp(PALETTE.bgDusk, e.dusk);
    (scene.background as THREE.Color).copy(_bg);
    fog.color.copy(_bg);
    const interior = 1 - e.exterior;
    fog.near = lerp(45, 38, interior) + e.dusk * 10;
    fog.far = lerp(230, 150, interior) + e.dusk * 40;
    scene.environmentIntensity = lerp(0.9, 0.03, e.dusk);
    if (hemi.current) hemi.current.intensity = lerp(1.05, 0.03, e.dusk) * (1 - e.chaos * 0.1) + e.resolve * 0.12 * (1 - e.dusk);
    if (sun.current) sun.current.intensity = lerp(2.6, 0.03, e.dusk);
    if (fill.current) fill.current.intensity = lerp(0.2, 0.03, e.dusk) + e.resolve * 0.1 * (1 - e.dusk);
    if (night.current) night.current.intensity = e.dusk * 260;

    /* Founders */
    const fz = foundersZ(t);
    const fm = founderMotion.current;
    const dz = fz - fm.lastZ;
    fm.lastZ = fz;
    const dist = Math.min(Math.abs(dz), 0.12);
    fm.phase += (dist / 1.42) * Math.PI * 2;
    const speed = Math.abs(dz) / Math.max(dt, 1e-3);
    fm.amount = lerp(fm.amount, Math.min(1, speed / 0.9), 1 - Math.exp(-dt * 8));
    world.founders.group.visible = fz > WORLD.facadeZ + 1.2 && t < 2.6;
    if (world.founders.group.visible) {
      world.founders.update({
        x: 0.15,
        z: fz,
        yaw: Math.PI,
        walkPhase: fm.phase,
        walkAmount: fm.amount,
        highFive: e.highFive,
        time,
      });
    }

    /* Building & interior */
    world.building.update(time, e.dusk, 1);
    world.office.update(time, e.chaos, e.resolve, e.dusk);
    if (t > 0.9 && e.leave < 1) world.crowd.update(time, dt, e.chaos, e.leave);
    if (e.load > 0.001) world.cards.update(time, e.load, e.chaos, e.absorb);
    world.cards.mesh.visible = e.load > 0.001 && e.absorb < 0.999;
    world.core.update(time, e.aiReveal, e.workflow * 0.5);
    world.ring.update(time, e.workflow);
    world.terrace.update(time, t > 7.5 ? 1 : 0, e.dusk);

    /* DOM bridge: overlays and workflow labels */
    const b = bridge.current;
    if (b?.root) {
      const lv = lastVars.current;
      if (Math.abs(lv.dim - e.dim) > 0.002) b.root.style.setProperty('--dim', e.dim.toFixed(3));
      if (Math.abs(lv.flash - e.flash) > 0.002) b.root.style.setProperty('--flash', e.flash.toFixed(3));
      if (Math.abs(lv.dusk - e.dusk) > 0.002) b.root.style.setProperty('--dusk', e.dusk.toFixed(3));
      lv.dim = e.dim;
      lv.flash = e.flash;
      lv.dusk = e.dusk;

      const labelVis = e.workflow * (1 - smooth(7.25, 7.5, t));
      world.ring.nodes.forEach((n, i) => {
        const el = b.labels[i];
        if (!el) return;
        if (labelVis < 0.01) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          return;
        }
        _proj.copy(n).project(cam);
        const x = (_proj.x * 0.5 + 0.5) * size.width;
        const y = (-_proj.y * 0.5 + 0.5) * size.height;
        const appear = smooth((i / stepCount) * 0.6, (i / stepCount) * 0.6 + 0.4, e.workflow);
        el.style.opacity = String(labelVis * appear);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.classList.toggle('is-active', world.ring.activity[i] > 0.5);
      });
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffffff', '#cfcac0', 1.05]} />
      <ambientLight ref={fill} intensity={0.2} />
      {/* Interior lights left on after hours — the building glows while it works. */}
      <pointLight ref={night} position={[0, 15, -42]} intensity={0} distance={42} decay={1.2} color="#e8eeff" />
      <directionalLight
        ref={sun}
        position={[-18, 30, 26]}
        intensity={2.6}
        color="#fff6ea"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <primitive object={world.building.group} />
      <primitive object={world.office.group} />
      <primitive object={world.crowd.group} />
      <primitive object={world.cards.mesh} />
      <primitive object={world.core.group} />
      <primitive object={world.ring.group} />
      <primitive object={world.founders.group} />
      <primitive object={world.terrace.group} />
    </>
  );
}
