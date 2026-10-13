/* Replay the OOD bars on each visit; the underlying values remain visible. */
(() => {
  const charts = [...document.querySelectorAll('[data-ood-chart]')];
  if (!charts.length || !('IntersectionObserver' in window) ||
      !('animate' in Element.prototype)) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const animations = new Map();

  const stop = (chart) => {
    (animations.get(chart) || []).forEach((animation) => animation.cancel());
    animations.delete(chart);
  };

  const play = (chart) => {
    stop(chart);
    if (motion.matches || document.hidden) return;
    animations.set(chart, [...chart.querySelectorAll('.ood-bar-fill')].map((bar, index) =>
      bar.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 850, delay: index * 35, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' }
      )
    ));
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      if (!isIntersecting) {
        visible.delete(target);
        stop(target);
      } else if (intersectionRatio >= .18 && !visible.has(target)) {
        visible.add(target);
        play(target);
      }
    });
  }, { threshold: [0, .18] });

  charts.forEach((chart) => observer.observe(chart));
  motion.addEventListener('change', () => {
    charts.forEach(stop);
    if (!motion.matches) visible.forEach(play);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) charts.forEach(stop);
    else visible.forEach(play);
  });
})();

/* Show the scalability rows of the selected team size. */
(() => {
  const section = document.querySelector('#scalability-results');
  if (!section) return;
  const buttons = [...section.querySelectorAll('.robot-toggle-button')];
  const rows = [...section.querySelectorAll('tbody tr[data-robots]')];
  const select = (count) => {
    buttons.forEach((button) => {
      const active = button.dataset.robots === count;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    rows.forEach((row) => { row.hidden = row.dataset.robots !== count; });
  };
  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.robots)));
})();

/* Show the shifted-conditions chart of the selected test condition. */
(() => {
  const section = document.querySelector('#ood-results');
  if (!section) return;
  const buttons = [...section.querySelectorAll('.robot-toggle-button')];
  const charts = [...section.querySelectorAll('.vbar-chart[data-scenario]')];
  const select = (scenario) => {
    buttons.forEach((button) => {
      const active = button.dataset.scenario === scenario;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    charts.forEach((chart) => { chart.hidden = chart.dataset.scenario !== scenario; });
  };
  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.scenario)));
})();

/* Show the simulation comparisons of the selected test condition. */
(() => {
  const section = document.querySelector('#simulation');
  if (!section) return;
  const buttons = [...section.querySelectorAll('.robot-toggle-button')];
  const groups = [...section.querySelectorAll('.navigation-group[data-scenario]')];
  const select = (scenario) => {
    buttons.forEach((button) => {
      const active = button.dataset.scenario === scenario;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    groups.forEach((group) => { group.hidden = group.dataset.scenario !== scenario; });
  };
  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.scenario)));
})();
