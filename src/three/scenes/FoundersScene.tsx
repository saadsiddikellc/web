import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createFounderPair } from '../rig/founderPair';
import { getGlowTexture, getMaterials, PALETTE } from '../materials';
import { hasWebGL, useDeviceProfile, type DeviceProfile } from '../hooks/useDeviceTier';

interface Props {
  labels: { id: string; label: string; note: string }[];
}

interface Bridge {
  labels: (HTMLElement | null)[];
  trigger: number;
  /** Desired camera distance (zoom buttons). */
  distance: number;
}

const TARGET = new THREE.Vector3(0, 1.05, 0);
const _dir = new THREE.Vector3();

function Studio({ profile, bridge }: { profile: DeviceProfile; bridge: React.RefObject<Bridge> }) {
  const { gl, scene, camera, size } = useThree();
  const shadows = profile.tier !== 'low';
  const m = getMaterials();

  const obj = useMemo(() => {
    const pair = createFounderPair({ shadows });
    const plinthGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.22, 96);
    const plinth = new THREE.Mesh(plinthGeo, m.white);
    plinth.position.y = -0.11;
    plinth.receiveShadow = shadows;
    const ringGeo = new THREE.TorusGeometry(2.46, 0.008, 6, 160);
    const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.blue, toneMapped: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.002;
    const floorGeo = new THREE.CircleGeometry(40, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#e7e6e2', roughness: 0.35, metalness: 0.25 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = shadows;
    const glowMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: PALETTE.blueGlow,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.5);
    return { pair, plinth, ring, floor, glow, glowMat, dispose: [plinthGeo, ringGeo, ringMat, floorGeo, floorMat, glowMat] };
  }, [shadows, m.white]);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.background = new THREE.Color('#eceae5');
    scene.fog = new THREE.Fog('#eceae5', 12, 34);
    return () => {
      env.dispose();
      pmrem.dispose();
      obj.pair.dispose();
      obj.dispose.forEach((d) => d.dispose());
    };
  }, [gl, scene, obj]);

  const hf = useRef({ start: -10, lastTrigger: 0 });
  const proj = new THREE.Vector3();

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const b = bridge.current;
    // Trigger on request, and on a relaxed loop.
    if (b && b.trigger !== hf.current.lastTrigger) {
      hf.current.lastTrigger = b.trigger;
      hf.current.start = time;
    }
    if (!profile.reducedMotion && time - hf.current.start > 9 && time > 2.5) hf.current.start = time;
    const u = Math.min(1, Math.max(0, (time - hf.current.start) / 1.9));
    obj.pair.update({ x: 0, z: 0, yaw: 0, walkPhase: 0, walkAmount: 0, highFive: u < 1 ? u : 0, time, spacing: 0.44 });

    // Contact spark
    const contact = u > 0.4 && u < 0.62 ? 1 - Math.abs(u - 0.5) / 0.12 : 0;
    obj.glowMat.opacity = Math.max(0, contact) * 0.9;
    obj.glow.position.set(0, 1.8, 0.1);
    obj.glow.scale.setScalar(0.3 + Math.max(0, contact) * 0.6);

    if (b) {
      _dir.subVectors(camera.position, TARGET);
      const len = _dir.length();
      if (Math.abs(len - b.distance) > 0.005) {
        _dir.setLength(len + (b.distance - len) * 0.08);
        camera.position.copy(TARGET).add(_dir);
      }
      [obj.pair.a, obj.pair.b].forEach((rig, i) => {
        const el = b.labels[i];
        if (!el) return;
        rig.head.getWorldPosition(proj);
        proj.y += 0.35;
        proj.project(camera);
        const x = (proj.x * 0.5 + 0.5) * size.width;
        const y = (-proj.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
    }
  });

  return (
    <>
      <hemisphereLight args={['#ffffff', '#d6d2c9', 1.1]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-4, 3, -5]} intensity={2.4} color={PALETTE.blueGlow} />
      <pointLight position={[0, 0.3, -2.2]} intensity={6} distance={6} color={PALETTE.blue} />
      <primitive object={obj.pair.group} />
      <primitive object={obj.plinth} />
      <primitive object={obj.ring} />
      <primitive object={obj.floor} />
      <primitive object={obj.glow} />
      <OrbitControls
        target={TARGET}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.8}
        maxDistance={7.5}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate={!profile.reducedMotion}
        autoRotateSpeed={-0.45}
        enableZoom={false}
      />
    </>
  );
}

/** Interactive founders study: orbit, zoom, and trigger the high-five. */
export default function FoundersScene({ labels }: Props) {
  const profile = useDeviceProfile();
  const [ok, setOk] = useState<boolean | null>(null);
  const bridge = useRef<Bridge>({ labels: [], trigger: 0, distance: 5.8 });
  const [pressed, setPressed] = useState(0);

  useEffect(() => setOk(hasWebGL()), []);

  if (ok === false) {
    return <div className="founders-scene founders-scene--fallback" aria-hidden="true" />;
  }

  return (
    <div className="founders-scene">
      {ok && (
        <Canvas
          dpr={profile.dpr}
          shadows={profile.tier !== 'low' ? 'soft' : false}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 32, position: [-1.4, 1.7, 5.4] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
          }}
        >
          <Studio profile={profile} bridge={bridge} />
        </Canvas>
      )}
      <div className="founders-scene__labels" aria-hidden="true">
        {labels.map((l, i) => (
          <div
            key={l.id}
            className="founders-scene__label"
            ref={(el) => {
              bridge.current.labels[i] = el;
            }}
          >
            <span className="founders-scene__label-t">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="founders-scene__ui">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => {
            bridge.current.trigger += 1;
            setPressed((p) => p + 1);
          }}
        >
          <span>High-five</span>
        </button>
        <div className="founders-scene__zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom in" onClick={() => (bridge.current.distance = Math.max(2.8, bridge.current.distance - 1))}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => (bridge.current.distance = Math.min(7.5, bridge.current.distance + 1))}>
            −
          </button>
        </div>
        <span className="mono founders-scene__hint">Drag to orbit</span>
        <span className="sr-only" aria-live="polite">{pressed ? 'High-five.' : ''}</span>
      </div>
    </div>
  );
}
