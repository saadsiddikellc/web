import { mulberry32 } from '../materials';

/** Office floor plan shared by furniture, crowd and task cards. */

export interface Seat {
  x: number;
  z: number;
  /** Yaw the seated person faces (toward their desk). */
  yaw: number;
  deskX: number;
  deskZ: number;
}

export interface FloorPlan {
  seats: Seat[];
  meetingTables: { x: number; z: number }[];
  walkLoops: [number, number][][];
  crossings: number[];
}

export function createFloorPlan(): FloorPlan {
  const seats: Seat[] = [];
  const clusterXs = [-19, -12.5, 12.5, 19];
  const clusterZs = [-33, -39.5, -46, -52.5, -59];
  const clusters: [number, number][] = [];
  for (const cx of clusterXs) for (const cz of clusterZs) clusters.push([cx, cz]);
  for (const cx of [-5, 5]) for (const cz of [-33, -58.5]) clusters.push([cx, cz]);

  for (const [cx, cz] of clusters) {
    for (const dx of [-0.78, 0.78]) {
      // North row faces +Z toward its desk; south row faces −Z.
      seats.push({ x: cx + dx, z: cz - 1.05, yaw: 0, deskX: cx + dx, deskZ: cz - 0.4 });
      seats.push({ x: cx + dx, z: cz + 1.05, yaw: Math.PI, deskX: cx + dx, deskZ: cz + 0.4 });
    }
  }

  return {
    seats,
    meetingTables: [
      { x: -25.5, z: -41 },
      { x: 25.5, z: -50 },
    ],
    walkLoops: [
      [
        [-23.5, -30.5],
        [23.5, -30.5],
        [23.5, -62],
        [-23.5, -62],
      ],
      [
        [-8.8, -36],
        [8.8, -36],
        [8.8, -55],
        [-8.8, -55],
      ],
      [
        [-15.8, -31],
        [-15.8, -61],
        [15.8, -61],
        [15.8, -31],
      ],
    ],
    crossings: [-36.2, -42.8, -49.2, -55.8],
  };
}

export function shuffledIndices(n: number, seed: number) {
  const r = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
