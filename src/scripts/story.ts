import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Editorial choreography for the homepage story copy. The 3D film is driven
 * separately (src/three); this only handles text entering, holding and leaving.
 */
export function initStoryScroll() {
  const story = document.querySelector<HTMLElement>('[data-story]');
  if (!story) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapters = Array.from(story.querySelectorAll<HTMLElement>('[data-chapter]'));

  // Mark annotations as drawn when their chapter is on screen.
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        e.target.querySelectorAll('[data-annot]').forEach((a) => a.classList.toggle('is-in', e.isIntersecting));
      }),
    { threshold: 0.35 },
  );
  chapters.forEach((c) => io.observe(c));

  if (reduced) {
    story.querySelectorAll('.flow-list__item').forEach((el) => el.classList.add('is-on'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  chapters.forEach((chapter) => {
    const content = chapter.querySelector<HTMLElement>('[data-chapter-content]');
    if (!content) return;
    const isStatic = content.hasAttribute('data-static');

    if (!isStatic) {
      gsap.fromTo(
        content,
        { autoAlpha: 0, y: 48 },
        {
          autoAlpha: 1,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger: chapter, start: 'top 82%', end: 'top 30%', scrub: 0.6 },
        },
      );
    }
    gsap.to(content, {
      autoAlpha: 0,
      y: -40,
      ease: 'power1.in',
      immediateRender: false,
      scrollTrigger: { trigger: chapter, start: 'bottom 88%', end: 'bottom 40%', scrub: 0.6 },
    });
  });

  // Hero title lines rise on load.
  gsap.from('.chapter--hero .line, .chapter--hero .lede, .chapter--hero .chapter__actions, .chapter--hero .eyebrow', {
    y: 36,
    autoAlpha: 0,
    duration: 1.3,
    ease: 'expo.out',
    stagger: 0.09,
    delay: 0.15,
  });

  // Manual tasks pile up.
  const tags = story.querySelectorAll('[data-task-tags] .task-tag');
  if (tags.length) {
    gsap.fromTo(
      tags,
      { autoAlpha: 0, y: 14, rotate: () => gsap.utils.random(-4, 4) },
      {
        autoAlpha: 1,
        y: 0,
        rotate: 0,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: { trigger: '[data-chapter="manual"]', start: 'top 55%', end: 'top -20%', scrub: 0.5 },
      },
    );
  }

  // Problem statements land one at a time.
  const lines = story.querySelectorAll<HTMLElement>('[data-problem-lines] .problem-line');
  if (lines.length) {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '[data-chapter="problem"]', start: 'top 40%', end: 'bottom 110%', scrub: 0.5 },
    });
    lines.forEach((line, i) => {
      tl.fromTo(line, { autoAlpha: 0.06, y: 20 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' }, i * 0.9);
      if (i < lines.length - 1) tl.to(line, { autoAlpha: 0.22, duration: 0.8 }, i * 0.9 + 1.2);
    });
    tl.add(() => {
      lines[lines.length - 1].querySelector('[data-annot]')?.classList.add('is-in');
    }, lines.length * 0.9);
  }

  // Workflow list lights up step by step.
  const steps = story.querySelectorAll<HTMLElement>('[data-flow-list] .flow-list__item');
  if (steps.length) {
    ScrollTrigger.create({
      trigger: '[data-chapter="workflow"]',
      start: 'top 50%',
      end: 'bottom 100%',
      onUpdate: (self) => {
        const n = Math.round(self.progress * steps.length);
        steps.forEach((s, i) => s.classList.toggle('is-on', i < n));
      },
    });
  }

  // Re-measure once fonts and the canvas settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
