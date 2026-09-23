/**
 * Lightweight reveal-on-scroll for [data-reveal] and [data-annot] elements.
 * Uses IntersectionObserver only — no animation library on non-3D pages.
 */
export function initReveal(root: ParentNode = document) {
  const targets = root.querySelectorAll<HTMLElement>('[data-reveal], [data-annot]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );
  targets.forEach((el) => io.observe(el));
}
