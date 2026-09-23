/**
 * Mutable, render-loop-friendly state shared between the DOM scroll driver and the
 * 3D scene. Deliberately outside React state so scrolling never triggers re-renders.
 */
export const storyState = {
  /** Target timeline position from scroll (chapter units). */
  target: 0,
  /** Smoothed timeline position used for rendering. */
  t: 0,
  /** Smoothed scroll speed in chapter-units per second (for gait amplitude). */
  velocity: 0,
  reducedMotion: false,
};
