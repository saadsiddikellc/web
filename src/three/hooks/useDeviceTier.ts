import { useEffect, useState } from 'react';

export type Tier = 'low' | 'mid' | 'high';

export interface DeviceProfile {
  tier: Tier;
  reducedMotion: boolean;
  touch: boolean;
  dpr: [number, number];
}

/** Heuristic GPU/CPU tiering — keeps 3D ambitious on desktop and lean on phones. */
export function detectProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return { tier: 'mid', reducedMotion: false, touch: false, dpr: [1, 1.5] };
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const w = Math.min(window.innerWidth, window.innerHeight * 2);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  let tier: Tier = 'high';
  if (touch || w < 900 || cores <= 4 || memory <= 4) tier = 'mid';
  if ((touch && (cores <= 4 || memory <= 3)) || w < 520) tier = 'low';

  const dpr: [number, number] = tier === 'high' ? [1, 1.75] : tier === 'mid' ? [1, 1.5] : [1, 1.25];
  return { tier, reducedMotion, touch, dpr };
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile>(() => detectProfile());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setProfile(detectProfile());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return profile;
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
