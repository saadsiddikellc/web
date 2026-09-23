import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import StoryWorld, { type StageBridge } from './StoryWorld';
import { storyState } from '../store';
import { hasWebGL, useDeviceProfile } from '../hooks/useDeviceTier';

interface Props {
  steps: string[];
}

/**
 * Homepage cinematic. Mounted inside the sticky stage of the story section; reads
 * scroll position from the chapter elements and renders the 3D film behind them.
 */
export default function HomeStory({ steps }: Props) {
  const profile = useDeviceProfile();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(true);
  const bridge = useRef<StageBridge>({ root: null, labels: [] });
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(hasWebGL());
  }, []);

  // Scroll → timeline target, in chapter units.
  useEffect(() => {
    const story = document.querySelector<HTMLElement>('[data-story]');
    if (!story) return;
    bridge.current.root = story;
    storyState.reducedMotion = profile.reducedMotion;

    let tops: number[] = [];
    let heights: number[] = [];
    const measure = () => {
      const chapters = Array.from(story.querySelectorAll<HTMLElement>('[data-chapter]'));
      const sy = window.scrollY;
      tops = chapters.map((c) => c.getBoundingClientRect().top + sy);
      heights = chapters.map((c) => c.offsetHeight);
      update();
    };
    const update = () => {
      const y = window.scrollY;
      let t = 0;
      for (let i = 0; i < tops.length; i++) {
        if (y >= tops[i]) t = i + Math.min(1, (y - tops[i]) / Math.max(1, heights[i]));
      }
      storyState.target = t;
    };
    measure();
    storyState.t = storyState.target;
    // Debug hook for visual QA (append ?debug to the URL).
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __xusStory: typeof storyState }).__xusStory = storyState;
    }

    const ro = new ResizeObserver(measure);
    ro.observe(story);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '10% 0px' });
    io.observe(story);
    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
    };
  }, [profile.reducedMotion]);

  useEffect(() => {
    if (supported === false) hostRef.current?.closest('[data-story]')?.classList.add('no-webgl');
    if (supported) hostRef.current?.closest('[data-story]')?.classList.add('has-webgl');
  }, [supported]);

  if (!supported) return <div ref={hostRef} className="story-canvas story-canvas--fallback" aria-hidden="true" />;

  return (
    <div ref={hostRef} className="story-canvas" aria-hidden="true">
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={profile.dpr}
        shadows={profile.tier === 'high' ? 'soft' : false}
        gl={{
          antialias: profile.tier !== 'low',
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
        }}
        camera={{ fov: 40, near: 0.05, far: 420, position: [2.3, 1.55, 24.5] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.02;
          hostRef.current?.classList.add('is-ready');
        }}
      >
        <Suspense fallback={null}>
          <StoryWorld profile={profile} bridge={bridge} stepCount={steps.length} />
        </Suspense>
      </Canvas>
      <div className="story-labels">
        {steps.map((s, i) => (
          <div
            key={s}
            className="story-label"
            ref={(el) => {
              bridge.current.labels[i] = el;
            }}
            style={{ opacity: 0 }}
          >
            <span className="story-label__i">{String(i + 1).padStart(2, '0')}</span>
            <span className="story-label__t">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
