/* =========================================================
   Luso Futebol Clube — interações da página
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  let motionPaused = root.classList.contains('motion-paused');
  let refreshStageMotion = () => {};

  /* ---------- Preferência de animações ---------- */
  const motionToggle = $('.motion-toggle');
  const updateMotionToggle = () => {
    $('span', motionToggle).textContent = motionPaused ? 'Retomar animações' : 'Pausar animações';
  };
  motionToggle.hidden = false;
  updateMotionToggle();
  motionToggle.addEventListener('click', () => {
    motionPaused = !motionPaused;
    root.classList.toggle('motion-paused', motionPaused);
    updateMotionToggle();
    window.LusoPicto?.setPaused(motionPaused);
    refreshStageMotion();
    try { localStorage.setItem('luso-motion-paused', String(motionPaused)); } catch (e) {}
  });

  /* ---------- Cabeçalho ---------- */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu móvel ---------- */
  const toggle = $('.nav-toggle');
  const nav = $('#nav');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    $('.sr-only', toggle).textContent = open ? 'Fechar menu' : 'Abrir menu';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });

  /* ---------- Revelação ao fazer scroll ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Ligação ativa no menu ---------- */
  const links = $$('.nav a');
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('main section[id]').forEach(s => sectionIO.observe(s));

  /* ---------- Destaque: modalidades em rotação, com separadores ---------- */
  const stage = $('.stage');
  const stageSvg = $('#stageSvg');
  if (stage && stageSvg && window.LusoPicto) {
    const { mount, scenes } = window.LusoPicto;
    const tabs = $$('.stage__tabs [role="tab"]');
    let index = 0;
    let timer = null;
    let swapTimer = null;
    let inView = true;

    const schedule = () => {
      clearTimeout(timer);
      stage.classList.remove('is-auto');
      if (motionPaused || !inView) return;
      const ms = Math.max(5200, scenes[tabs[index].dataset.key].dur * 2);
      stage.style.setProperty('--dur', `${ms}ms`);
      void stage.offsetWidth; // reinicia a barra de progresso
      stage.classList.add('is-auto');
      timer = setTimeout(() => show(index + 1), ms);
    };

    const swap = () => {
      clearTimeout(swapTimer);
      swapTimer = null;
      mount(stageSvg, tabs[index].dataset.key);
      stage.classList.remove('is-out');
      schedule();
    };

    const show = (i, animate = true) => {
      clearTimeout(timer);
      clearTimeout(swapTimer);
      swapTimer = null;
      index = (i + tabs.length) % tabs.length;
      tabs.forEach((t, n) => {
        t.setAttribute('aria-selected', String(n === index));
        t.tabIndex = n === index ? 0 : -1;
      });
      if (animate && !motionPaused) {
        stage.classList.add('is-out');
        swapTimer = setTimeout(swap, 280);
      } else {
        swap();
      }
    };

    refreshStageMotion = () => {
      if (swapTimer !== null) swap(); else schedule();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { if (i !== index) show(i); else schedule(); });
      tab.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        show(index + step);
        tabs[index].focus();
      });
    });

    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) schedule(); else { clearTimeout(timer); stage.classList.remove('is-auto'); }
    }, { threshold: 0.3 }).observe(stage);

    show(0, false);
  }

  /* ---------- Equipamentos ---------- */
  const SHIRT = 'M105 22C122 38 178 38 195 22L262 50L286 120L240 136L228 108V256H72V108L60 136L14 120L38 50Z';
  const SHORTS = 'M76 272H224L236 352H162L150 322L138 352H64Z';
  const SOCKS = ['M88 366H128L126 420H90Z', 'M172 366H212L210 420H174Z'];
  const KITS = [
    { shirt: '#c62832', stripe: '#ffffff', trim: '#ffffff', shorts: null, socks: null, label: 'Camisola vermelha com riscas brancas; calções e meias sem registo' },
    { shirt: '#1d8a4b', stripe: '#f2b705', trim: '#f2b705', shorts: '#1f3f9a', socks: '#ffffff', label: 'Camisola verde e amarela, calções azuis e meias brancas' },
    { shirt: '#6a2c91', stripe: '#ffffff', trim: '#ffffff', shorts: '#16181d', socks: '#16181d', label: 'Camisola às riscas roxas e brancas, calções e meias pretos' },
    { shirt: '#1a49c4', stripe: null, trim: '#0b1f4b', shorts: '#16181d', socks: '#16181d', label: 'Camisola azul, calções e meias pretos' },
    { shirt: '#1a49c4', stripe: null, trim: '#ffffff', shorts: '#ffffff', socks: '#1a49c4', label: 'Camisola azul, calções brancos e meias azuis' }
  ];
  const OUTLINE = 'rgba(11,31,75,.28)';

  const piece = (d, fill) => fill
    ? `<path d="${d}" fill="${fill}" stroke="${OUTLINE}" stroke-width="2"/>`
    : `<path d="${d}" fill="none" stroke="rgba(11,31,75,.35)" stroke-width="2" stroke-dasharray="6 7"/>`;

  const jersey = (k, i) => {
    const id = `kitclip${i}`;
    const stripes = k.stripe
      ? [-3, 33, 69, 105, 141, 177, 213, 249, 285].map(x => `<rect x="${x}" width="18" height="270" fill="${k.stripe}"/>`).join('')
      : '';
    return `
      <svg viewBox="0 0 300 430" role="img" aria-label="${k.label}">
        <defs><clipPath id="${id}"><path d="${SHIRT}"/></clipPath></defs>
        <g clip-path="url(#${id})">
          <rect width="300" height="270" fill="${k.shirt}"/>${stripes}
          <rect width="300" height="270" fill="url(#jshade)"/>
        </g>
        <path d="${SHIRT}" fill="none" stroke="${OUTLINE}" stroke-width="2"/>
        <path d="M105 22C122 38 178 38 195 22L201 26C181 47 119 47 99 26Z" fill="${k.trim}"/>
        <path d="M14 120L60 136L63 127L17 111Z" fill="${k.trim}"/>
        <path d="M286 120L240 136L237 127L283 111Z" fill="${k.trim}"/>
        ${piece(SHORTS, k.shorts)}${piece(SOCKS[0], k.socks)}${piece(SOCKS[1], k.socks)}
      </svg>`;
  };
  $$('[data-kit]').forEach(el => { el.innerHTML = jersey(KITS[+el.dataset.kit], el.dataset.kit); });

  /* ---------- Imagens em falta ---------- */
  $$('.photo img').forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; }));

  /* ---------- Ano no rodapé ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
