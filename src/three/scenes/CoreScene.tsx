import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAICore } from '../objects/aiCore';
import { createWorkflowRing } from '../objects/workflowRing';
import { hasWebGL, useDeviceProfile, type DeviceProfile } from '../hooks/useDeviceTier';

interface Props {
  /** Show the workflow ring around the core. */
  ring?: boolean;
  steps?: number;
  className?: string;
}

function CoreWorld({ ring, steps, profile }: { ring: boolean; steps: number; profile: DeviceProfile }) {
  const { gl, scene, camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const obj = useMemo(() => {
    const core = createAICore({ detail: profile.tier === 'low' ? 0.5 : 1 });
    const wf = ring ? createWorkflowRing(new THREE.Vector3(0, 0, 0), steps, 5.2, 2.6) : null;
    return { core, wf };
  }, [ring, steps, profile.tier]);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      env.dispose();
      pmrem.dispose();
      obj.core.dispose();
      obj.wf?.dispose();
    };
  }, [gl, scene, obj]);

  const reveal = useRef(0);
  useFrame((state, dt) => {
    const time = state.clock.elapsedTime * (profile.reducedMotion ? 0.3 : 1);
    reveal.current = Math.min(1, reveal.current + dt * 0.6);
    obj.core.update(time, profile.reducedMotion ? 1 : reveal.current, 0.3);
    obj.wf?.update(time, profile.reducedMotion ? 1 : Math.max(0, reveal.current * 1.4 - 0.4));
    const px = profile.reducedMotion ? 0 : pointer.current.x;
    const py = profile.reducedMotion ? 0 : pointer.current.y;
    camera.position.x += (px * 2.2 - camera.position.x) * 0.04;
    camera.position.y += (-py * 1.4 + 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <hemisphereLight args={['#ffffff', '#d9d6cf', 1.2]} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <primitive object={obj.core.group} />
      {obj.wf && <primitive object={obj.wf.group} />}
    </>
  );
}

/** Standalone, transparent-background view of the XUS core (Work & Services pages). */
export default function CoreScene({ ring = false, steps = 8, className = '' }: Props) {
  const profile = useDeviceProfile();
  const [ok, setOk] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOk(hasWebGL());
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '15% 0px' });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={`core-scene ${className}`} aria-hidden="true">
      {ok && (
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={profile.dpr}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 35, position: [0, 0.4, ring ? 15 : 9.5] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.setClearColor(0x000000, 0);
          }}
        >
          <CoreWorld ring={ring} steps={steps} profile={profile} />
        </Canvas>
      )}
    </div>
  );
}
