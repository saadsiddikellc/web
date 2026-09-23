/**
 * Work page demonstrations: a signal travels the workflow graph, nodes light up
 * and a sample event log writes itself. Autoplays in view; replayable; tilts
 * gently with the pointer on devices that hover.
 */
export function initDemos() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  document.querySelectorAll<HTMLElement>('[data-demo]').forEach((demo) => {
    const plane = demo.querySelector<HTMLElement>('[data-demo-plane]')!;
    const inner = demo.querySelector<HTMLElement>('[data-demo-inner]')!;
    const signal = demo.querySelector<HTMLElement>('[data-demo-signal]')!;
    const edges = Array.from(demo.querySelectorAll<SVGPathElement>('[data-edge]'));
    const log = demo.querySelector<HTMLOListElement>('[data-demo-log]')!;
    const lines: string[] = JSON.parse(log.dataset.lines || '[]');
    const runBtn = demo.querySelector<HTMLButtonElement>('[data-demo-run]');
    const runLabel = demo.querySelector<HTMLElement>('[data-demo-run-label]');
    const nodeEls = Array.from(demo.querySelectorAll<HTMLElement>('[data-node]'));
    // Node order along the signal path.
    const pathNodes: HTMLElement[] = [];
    const idsInPath = demo.dataset.path?.split(',') ?? [];
    idsInPath.forEach((id) => {
      const el = nodeEls.find((n) => n.dataset.node === id);
      if (el) pathNodes.push(el);
    });

    let running = false;
    let raf = 0;
    let visible = false;
    let loopTimer = 0;
    let runId = 0;

    const reset = () => {
      nodeEls.forEach((n) => n.classList.remove('is-lit'));
      edges.forEach((e) => e.classList.remove('is-lit'));
      log.innerHTML = '';
      signal.style.opacity = '0';
    };

    const stamp = (i: number) => {
      const d = new Date(Date.UTC(2026, 0, 1, 9, 0, i * 7));
      return d.toISOString().slice(11, 19);
    };
    let logged = 0;
    const writeLog = (upTo: number) => {
      while (logged < Math.min(upTo, lines.length)) {
        const li = document.createElement('li');
        const time = document.createElement('time');
        time.textContent = stamp(logged);
        li.append(time, document.createTextNode(lines[logged]));
        log.append(li);
        logged++;
      }
    };

    const place = (x: number, y: number) => {
      const w = inner.clientWidth;
      const h = inner.clientHeight;
      const left = (x / 100) * w;
      const top = (y / 60) * h;
      signal.style.transform = `translate3d(${left}px, ${top}px, 24px)`;
    };

    const finish = () => {
      running = false;
      writeLog(lines.length);
      signal.style.opacity = '0';
      if (runLabel) runLabel.textContent = 'Replay';
      if (!reduced) {
        loopTimer = window.setTimeout(() => {
          if (visible) run();
        }, 4200);
      }
    };

    const run = () => {
      window.clearTimeout(loopTimer);
      cancelAnimationFrame(raf);
      reset();
      logged = 0;
      running = true;
      const id = ++runId;
      if (runLabel) runLabel.textContent = 'Running…';

      if (reduced || !edges.length) {
        pathNodes.forEach((n) => n.classList.add('is-lit'));
        edges.forEach((e) => e.classList.add('is-lit'));
        finish();
        return;
      }

      const per = 1100;
      const perLine = lines.length / Math.max(1, pathNodes.length);
      pathNodes[0]?.classList.add('is-lit');
      writeLog(Math.round(perLine));
      signal.style.opacity = '1';
      let start = performance.now();
      let seg = 0;
      const step = (now: number) => {
        if (id !== runId) return;
        const edge = edges[seg];
        const u = Math.min(1, (now - start) / per);
        const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const len = edge.getTotalLength();
        const pt = edge.getPointAtLength(eased * len);
        place(pt.x, pt.y);
        if (u >= 1) {
          edge.classList.add('is-lit');
          pathNodes[seg + 1]?.classList.add('is-lit');
          writeLog(Math.round(perLine * (seg + 2)));
          seg++;
          start = now + 180;
          if (seg >= edges.length) {
            finish();
            return;
          }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    runBtn?.addEventListener('click', () => run());

    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !running && !log.childElementCount) run();
      },
      { threshold: 0.45 },
    ).observe(plane);

    if (canHover && !reduced) {
      const stage = demo.querySelector<HTMLElement>('[data-demo-stage]')!;
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        plane.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        plane.style.setProperty('--rx', `${(18 - y * 10).toFixed(2)}deg`);
      });
      stage.addEventListener('pointerleave', () => {
        plane.style.setProperty('--ry', '0deg');
        plane.style.setProperty('--rx', '18deg');
      });
    }
  });
}
