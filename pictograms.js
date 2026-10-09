/* =========================================================
   Luso Futebol Clube — pictogramas animados das modalidades

   Cada figura é um pequeno esqueleto (anca, ombro, cotovelo, joelho...)
   desenhado em SVG por cinemática direta, com tronco afunilado e membros
   de espessura variável. As animações são keyframes de ângulos
   interpolados com easing; algumas cenas usam cinemática inversa (remo).
   Extras: sombra no chão, rastos de movimento e cenas com duas figuras.

   Convenção de ângulos (graus): 0 = segmento a apontar para baixo,
   +90 = para a frente (a figura olha para a direita), 180 = para cima.
   ========================================================= */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const D2R = Math.PI / 180;
  const GROUND = 152;
  const L = { shoulder: 29, top: 32, head: 44, headR: 8.2, upperArm: 17, foreArm: 16, thigh: 22, shin: 22 };
  const REDUCE = document.documentElement.classList.contains('reduce-motion');

  /* ---------- utilitários ---------- */
  const make = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = v => clamp(v, 0, 1);
  const wrap = t => ((t % 1) + 1) % 1;
  const lerp = (a, b, k) => a + (b - a) * k;
  const EASE = {
    lin: k => k,
    io: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    in: k => k * k * k,
    out: k => 1 - Math.pow(1 - k, 3),
    in2: k => k * k,
    out2: k => 1 - (1 - k) * (1 - k),
    sine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    back: k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2)
  };
  const seg = (t, a, b, e = 'io') => EASE[e](clamp01((t - a) / (b - a)));
  const dir = (a, len) => [Math.sin(a * D2R) * len, Math.cos(a * D2R) * len];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  const qbez = (p0, p1, p2, k) => {
    const u = 1 - k;
    return [u * u * p0[0] + 2 * u * k * p1[0] + k * k * p2[0], u * u * p0[1] + 2 * u * k * p1[1] + k * k * p2[1]];
  };
  const unit = (from, to) => {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  const n1 = n => n.toFixed(1);
  const pt = p => `${n1(p[0])} ${n1(p[1])}`;
  const setLine = (node, a, b) => {
    node.setAttribute('x1', n1(a[0])); node.setAttribute('y1', n1(a[1]));
    node.setAttribute('x2', n1(b[0])); node.setAttribute('y2', n1(b[1]));
  };
  const place = (node, p, rot = 0, opacity = 1) => {
    node.setAttribute('transform', `translate(${pt(p)}) rotate(${rot.toFixed(1)})`);
    node.style.opacity = opacity.toFixed(3);
  };
  const fade = (nodes, o) => nodes.forEach(n => { n.style.opacity = o.toFixed(3); });

  /* Cinemática inversa de dois segmentos: devolve os ângulos [segmento 1, segmento 2]. */
  function ik(root, target, l1, l2, bend) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    const d = clamp(Math.hypot(dx, dy), 0.01, l1 + l2 - 0.01);
    const base = Math.atan2(dx, dy);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const a1 = base + bend * A;
    const joint = [root[0] + Math.sin(a1) * l1, root[1] + Math.cos(a1) * l1];
    return [a1 / D2R, Math.atan2(target[0] - joint[0], target[1] - joint[1]) / D2R];
  }

  /* ---------- esqueleto ---------- */
  const BASE = { x: 100, y: 108.5, lean: 0, nod: 0, rot: 0, sx: 1, ua1: 8, fa1: 12, ua2: -8, fa2: -4, th1: 6, sh1: 0, th2: -6, sh2: 0 };

  function solve(p) {
    const hip = [p.x, p.y];
    const up = 180 - p.lean;
    const s = { hip, top: add(hip, dir(up, L.top)), shoulder: add(hip, dir(up, L.shoulder)) };
    s.head = add(s.top, dir(up - p.nod, L.head - L.top));
    s.e1 = add(s.shoulder, dir(p.ua1, L.upperArm));
    s.h1 = add(s.e1, dir(p.fa1, L.foreArm));
    s.e2 = add(s.shoulder, dir(p.ua2, L.upperArm));
    s.h2 = add(s.e2, dir(p.fa2, L.foreArm));
    s.k1 = add(hip, dir(p.th1, L.thigh));
    s.f1 = add(s.k1, dir(p.sh1, L.shin));
    s.k2 = add(hip, dir(p.th2, L.thigh));
    s.f2 = add(s.k2, dir(p.sh2, L.shin));
    if (p.rot || p.sx !== 1) {
      const c = Math.cos(p.rot * D2R), sn = Math.sin(p.rot * D2R);
      for (const k in s) {
        const dx = s[k][0] - hip[0], dy = s[k][1] - hip[1];
        s[k] = [hip[0] + (dx * c - dy * sn) * p.sx, hip[1] + dx * sn + dy * c];
      }
    }
    return s;
  }

  function buildFigure(parent, cls) {
    const g = make('g', { class: cls ? `figure ${cls}` : 'figure' }, parent);
    const far = make('g', { class: 'far' }, g);
    const line = (c, par) => make('line', { class: `seg seg--${c}` }, par);
    const f = { g };
    f.uaF = line('ua', far); f.faF = line('fa', far);
    f.thF = line('th', far); f.shF = line('sh', far);
    f.torso = make('path', { class: 'torso' }, g);
    f.head = make('circle', { class: 'head', r: L.headR }, g);
    f.th = line('th', g); f.sh = line('sh', g);
    f.ua = line('ua', g); f.fa = line('fa', g);
    return f;
  }

  function drawFigure(f, s) {
    setLine(f.uaF, s.shoulder, s.e2); setLine(f.faF, s.e2, s.h2);
    setLine(f.thF, s.hip, s.k2); setLine(f.shF, s.k2, s.f2);
    const u = unit(s.hip, s.top), n = [-u[1], u[0]];
    const side = (p, w) => [add(p, [n[0] * w, n[1] * w]), add(p, [-n[0] * w, -n[1] * w])];
    const [a, b] = side(s.top, 7), [c, d] = side(s.hip, 5.5);
    f.torso.setAttribute('d', `M${pt(a)}L${pt(b)}L${pt(d)}L${pt(c)}Z`);
    f.head.setAttribute('cx', n1(s.head[0]));
    f.head.setAttribute('cy', n1(s.head[1]));
    setLine(f.th, s.hip, s.k1); setLine(f.sh, s.k1, s.f1);
    setLine(f.ua, s.shoulder, s.e1); setLine(f.fa, s.e1, s.h1);
  }

  function normalize(keys) {
    let prev = { ...BASE };
    const out = keys.map(k => {
      prev = { ...prev, ...k.p };
      return { t: k.t, e: k.e || 'io', p: prev };
    });
    if (out[out.length - 1].t < 1) out.push({ t: 1, e: 'io', p: { ...out[0].p } });
    return out;
  }

  function sample(keys, t) {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    const k = EASE[a.e](clamp01((t - a.t) / (b.t - a.t)));
    const out = {};
    for (const key in a.p) out[key] = lerp(a.p[key], b.p[key], k);
    return out;
  }

  /* ---------- efeitos ---------- */
  // Rasto de movimento: linhas cada vez mais finas e transparentes atrás de um ponto rápido
  const makeSmear = (parent, n = 7) => {
    const g = make('g', { class: 'smear' }, parent);
    return { lines: Array.from({ length: n - 1 }, () => make('line', {}, g)) };
  };
  const drawSmear = (sm, pts, width = 5) => {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const strength = clamp01((len - 10) / 30);
    sm.lines.forEach((ln, i) => {
      setLine(ln, pts[i], pts[i + 1]);
      const k = 1 - i / sm.lines.length;
      ln.style.opacity = (strength * k * 0.5).toFixed(3);
      ln.setAttribute('stroke-width', n1(width * (0.35 + 0.65 * k)));
    });
  };

  // Linhas de impacto à volta de um ponto
  const makeBurst = (parent, p) => make('path', {
    class: 'burst',
    d: `M${p[0] - 5} ${p[1] - 6}l-5-7M${p[0]} ${p[1] - 8}v-8M${p[0] + 5} ${p[1] - 6}l5-7`
  }, parent);

  /* ---------- adereços ---------- */
  const makeBall = parent => {
    const g = make('g', { class: 'ball' }, parent);
    make('circle', { r: 6.5 }, g);
    make('path', { d: 'M0-2.7 2.6-.8 1.6 2.2h-3.2l-1-3z' }, g);
    return g;
  };

  const makeBasketball = parent => {
    const g = make('g', { class: 'bball' }, parent);
    make('circle', { r: 6.8 }, g);
    make('path', { d: 'M-6.8 0H6.8M0-6.8V6.8M-4.8-4.8Q-1.5 0-4.8 4.8M4.8-4.8Q1.5 0 4.8 4.8' }, g);
    return g;
  };

  const makeRacket = parent => {
    const g = make('g', { class: 'racket' }, parent);
    return { handle: make('path', {}, g), head: make('ellipse', { rx: 5.6, ry: 8.4 }, g) };
  };
  const racketHead = s => {
    const u = unit(s.e1, s.h1);
    return add(s.h1, [u[0] * 16.5, u[1] * 16.5]);
  };
  const drawRacket = (r, s) => {
    const u = unit(s.e1, s.h1);
    const a = Math.atan2(u[0], u[1]) / D2R;
    r.handle.setAttribute('d', `M${pt(s.h1)}L${pt(add(s.h1, [u[0] * 8.5, u[1] * 8.5]))}`);
    r.head.setAttribute('transform', `translate(${pt(racketHead(s))}) rotate(${(-a).toFixed(1)})`);
  };

  const makeShuttle = parent => {
    const g = make('g', { class: 'shuttle' }, parent);
    make('path', { class: 'skirt', d: 'M-1.5-2.4-11-5.5v11l9.5-3.1z' }, g);
    make('circle', { class: 'cork', r: 2.8 }, g);
    return g;
  };

  /* =========================================================
     Cenas
     ========================================================= */
  const SCENES = {};

  /* Badminton — remate (smash) por cima da rede */
  {
    const K0 = { x: 70, y: 108.5, lean: 4, ua1: 200, fa1: 250, ua2: 150, fa2: 160, th1: 12, sh1: -4, th2: -12, sh2: 4 };
    const START = [198, 64], CTRL = [132, -30], LAND = [186, 148.5];
    const flight = (t, hit) => {
      if (t < 0.5) return qbez(START, CTRL, hit, t / 0.5);
      if (t < 0.6) return mix(hit, LAND, EASE.out2((t - 0.5) / 0.1));
      return LAND;
    };
    SCENES.badminton = {
      name: 'Badminton',
      aria: 'Animação: jogador de badminton salta e remata o volante por cima da rede',
      dur: 2400, poster: 0.52,
      keys: [
        { t: 0, p: K0 },
        { t: 0.36, e: 'in', p: { y: 112, th1: 24, sh1: -18, th2: -4, sh2: -28, ua1: 215, fa1: 290 } },
        { t: 0.50, e: 'out', p: { y: 100, lean: 10, ua1: 172, fa1: 168, ua2: 70, fa2: 40, th1: 30, sh1: -30, th2: -10, sh2: -40 } },
        { t: 0.62, p: { y: 106, lean: 18, ua1: 110, fa1: 80, ua2: 30, fa2: 10, th1: 14, sh1: -4, th2: -14, sh2: 2 } },
        { t: 0.86, p: K0 },
        { t: 1, p: K0 }
      ],
      trails: [{ point: racketHead, width: 5 }],
      setup(c, pic) {
        make('line', { class: 'frame', x1: 140, y1: GROUND, x2: 140, y2: 90 }, c.back);
        const net = make('g', { class: 'net' }, c.back);
        for (let y = 96; y <= 118; y += 5.5) make('line', { x1: 135, y1: y, x2: 145, y2: y }, net);
        make('path', { class: 'frame frame--thin', d: 'M135 93V119M145 93V119' }, c.back);
        c.s.streak = makeSmear(c.back, 6);
        c.s.racket = makeRacket(c.front);
        c.s.shuttle = makeShuttle(c.front);
        c.s.hit = racketHead(pic.skeletonsAt(0.5)[0]);
        c.s.ang = 180;
      },
      update(t, P, S, c) {
        drawRacket(c.s.racket, S[0]);
        const hit = c.s.hit;
        let pos, o;
        if (t >= 0.9) {
          pos = START;
          o = seg(t, 0.92, 1, 'lin');
          const q = flight(0.02, hit);
          c.s.ang = Math.atan2(q[1] - START[1], q[0] - START[0]) / D2R;
        } else {
          pos = flight(t, hit);
          o = 1 - seg(t, 0.72, 0.8, 'lin');
          if (t > 0.01 && t < 0.6) {
            const q = flight(t - 0.01, hit);
            c.s.ang = Math.atan2(pos[1] - q[1], pos[0] - q[0]) / D2R;
          }
        }
        place(c.s.shuttle, pos, c.s.ang, o);
        const pts = [0, 1, 2, 3, 4, 5].map(k => (t < 0.62 ? flight(Math.max(0, t - k * 0.008), hit) : LAND));
        drawSmear(c.s.streak, pts, 3);
      }
    };
  }

  /* Patinagem artística — arabesque, salto com duas rotações e receção */
  {
    const UP = { y: 106.5, lean: 6, ua1: 75, fa1: 85, ua2: -70, fa2: -80, th1: 2, sh1: 0, th2: -18, sh2: -14 };
    const ARAB = { y: 106.5, lean: 62, ua1: 105, fa1: 100, ua2: -110, fa2: -105, th1: 2, sh1: 0, th2: -98, sh2: -100 };
    const PREP = { y: 110.5, lean: 20, ua1: 40, fa1: 70, ua2: -40, fa2: -20, th1: 28, sh1: -26, th2: -40, sh2: -30 };
    const AIR = { y: 100, lean: 0, ua1: 30, fa1: 150, ua2: 25, fa2: 155, th1: 3, sh1: -3, th2: -5, sh2: 3 };
    const LANDING = { y: 108, lean: 18, ua1: 95, fa1: 95, ua2: -95, fa2: -95, th1: 10, sh1: -6, th2: -70, sh2: -75 };
    const xAt = t => 24 + 152 * t;
    const TAKEOFF = xAt(0.46), TOUCHDOWN = xAt(0.64);
    const SPRAY = [[-1, -0.45], [-0.85, -0.75], [-0.6, -0.95], [-1, -0.15], [-0.9, -0.55]];
    SCENES.patinagem = {
      name: 'Patinagem Artística',
      aria: 'Animação: patinadora desliza em arabesque, salta com duas rotações e aterra num pé',
      dur: 5600, poster: 0.24,
      keys: [
        { t: 0, p: UP },
        { t: 0.12, p: ARAB },
        { t: 0.32, p: ARAB },
        { t: 0.43, e: 'in', p: PREP },
        { t: 0.48, p: AIR },
        { t: 0.60, e: 'out', p: AIR },
        { t: 0.66, p: LANDING },
        { t: 0.82, p: LANDING },
        { t: 1, p: UP }
      ],
      mod(t, p) {
        p.x = xAt(t);
        if (t > 0.46 && t < 0.64) {
          const k = (t - 0.55) / 0.09;
          p.y = 107.5 - 28 * (1 - k * k);
        }
        p.sx = Math.cos(720 * EASE.io(clamp01((t - 0.47) / 0.16)) * D2R);
      },
      setup(c, pic) {
        c.s.trail = make('path', { class: 'ice-trail' }, c.back);
        c.s.blade = make('path', { class: 'blade' }, c.front);
        const land = pic.skeletonsAt(0.645)[0].f1;
        c.s.sprayOrigin = [land[0] + 4, GROUND - 1];
        c.s.spray = SPRAY.map(() => make('circle', { class: 'spray', r: 1.7 }, c.front));
      },
      update(t, P, S, c) {
        fade([c.figs, c.front, c.back, c.shadows], Math.min(seg(t, 0, 0.07, 'lin'), 1 - seg(t, 0.9, 0.98, 'lin')));
        const f = S[0].f1;
        c.s.blade.setAttribute('d', `M${n1(f[0] - 7)} ${n1(f[1] + 2)}H${n1(f[0] + 10)}`);
        // rasto no gelo, interrompido durante o salto
        const x = P[0].x, from = Math.max(14, x - 80), to = x - 8;
        let d = '';
        if (Math.min(to, TAKEOFF) > from) d += `M${n1(from)} ${GROUND - 0.5}H${n1(Math.min(to, TAKEOFF))}`;
        if (to > TOUCHDOWN) d += `M${n1(Math.max(from, TOUCHDOWN))} ${GROUND - 0.5}H${n1(to)}`;
        c.s.trail.setAttribute('d', d || 'M0 0');
        const k = seg(t, 0.64, 0.76, 'out'), o = t > 0.64 && t < 0.76 ? 1 - k : 0;
        c.s.spray.forEach((dot, i) => {
          const v = SPRAY[i];
          dot.setAttribute('cx', n1(c.s.sprayOrigin[0] + v[0] * 20 * k));
          dot.setAttribute('cy', n1(c.s.sprayOrigin[1] + v[1] * 14 * k + 12 * k * k));
          dot.style.opacity = o.toFixed(3);
        });
      }
    };
  }

  /* Remo — remada completa num barco individual (cinemática inversa) */
  {
    const WATER = 133, FOOT = [130, 123], SEAT_Y = 118;
    const CATCH = { hx: 108, lean: 26, hdx: 143, hdy: 113, blade: 0 };
    const FINISH = { hx: 84, lean: -22, hdx: 95, hdy: 107, blade: 1 };
    const drift = t => 48 * t + 4 * Math.sin(2 * Math.PI * t); // deslocamento da água (velocidade variável)
    const bladeAt = p => [118 - (p.hdx - 118) * 0.5, lerp(WATER - 6, WATER + 6, p.blade)];
    SCENES.remo = {
      name: 'Remo',
      aria: 'Animação: remador num barco individual a fazer uma remada completa',
      dur: 2600, poster: 0.2,
      ground: false, shadow: false,
      keys: [
        { t: 0, e: 'out', p: CATCH },
        { t: 0.06, p: { ...CATCH, hx: 106.5, blade: 1 } },
        { t: 0.30, e: 'out', p: { hx: 86, lean: -4, hdx: 112, hdy: 110, blade: 1 } },
        { t: 0.40, p: FINISH },
        { t: 0.46, p: { ...FINISH, hdx: 96, hdy: 111, blade: 0 } },
        { t: 0.58, p: { hx: 85, lean: -16, hdx: 117, hdy: 113, blade: 0 } },
        { t: 0.68, p: { hx: 88, lean: 22, hdx: 131, hdy: 113, blade: 0 } },
        { t: 0.96, p: CATCH },
        { t: 1, p: CATCH }
      ],
      mod(t, p) {
        p.x = p.hx;
        p.y = SEAT_Y;
        const legs = ik([p.x, p.y], FOOT, L.thigh, L.shin, 1);
        p.th1 = p.th2 = legs[0];
        p.sh1 = p.sh2 = legs[1];
        const shoulder = add([p.x, p.y], dir(180 - p.lean, L.shoulder));
        const arms = ik(shoulder, [p.hdx, p.hdy], L.upperArm, L.foreArm, -1);
        p.ua1 = p.ua2 = arms[0];
        p.fa1 = p.fa2 = arms[1];
      },
      setup(c) {
        make('path', { class: 'hull', d: 'M12 129Q34 122 64 123H178Q190 124 196 128Q189 134 172 135H58Q30 135 12 129Z' }, c.back);
        make('path', { class: 'frame', d: 'M128 124L134 113' }, c.back);
        c.s.seat = make('rect', { class: 'seat', width: 16, height: 3.5, rx: 1.5 }, c.back);
        const oar = make('g', { class: 'oar' }, c.front);
        c.s.shaft = make('line', { class: 'shaft' }, oar);
        c.s.bladeEl = make('line', { class: 'blade-oar' }, oar);
        make('rect', { class: 'water', x: 0, y: WATER, width: 200, height: 40 }, c.front);
        c.s.ripples = [[142, '14 10', 1], [150, '8 16', 0.5], [158, '20 4', 1.5]].map(([y, dash, f]) => ({
          el: make('path', { class: 'ripple', d: `M0 ${y}H200`, 'stroke-dasharray': dash }, c.front), f
        }));
        c.s.puddles = [make('ellipse', { class: 'puddle' }, c.front), make('ellipse', { class: 'puddle' }, c.front)];
        c.s.bow = make('path', { class: 'ripple', d: 'M12 131q-5 2-11 1' }, c.front);
      },
      update(t, P, S, c) {
        const p = P[0], s = S[0];
        c.s.seat.setAttribute('x', n1(p.x - 8));
        c.s.seat.setAttribute('y', n1(SEAT_Y + 2));
        const hand = s.h1, blade = bladeAt(p);
        const u = unit(hand, blade);
        setLine(c.s.shaft, hand, add(blade, [u[0] * 3, u[1] * 3]));
        setLine(c.s.bladeEl, add(blade, [-u[0] * 3, -u[1] * 3]), add(blade, [u[0] * 7, u[1] * 7]));
        c.s.bladeEl.setAttribute('stroke-width', n1(lerp(2.5, 6, p.blade)));
        c.s.ripples.forEach(r => r.el.setAttribute('stroke-dashoffset', n1(-drift(t) * r.f)));
        const age = wrap(t - 0.44);
        c.s.puddles.forEach((el, i) => {
          const a = wrap(age + i * 0.5);
          el.setAttribute('cx', n1(129 + 70 * a));
          el.setAttribute('cy', WATER + 2);
          el.setAttribute('rx', n1(4 + 7 * a));
          el.setAttribute('ry', n1(1.4 + 1.2 * a));
          el.style.opacity = ((1 - a) * 0.8).toFixed(3);
        });
        c.s.bow.style.opacity = (0.3 + 0.5 * (0.5 + 0.5 * Math.cos(2 * Math.PI * t))).toFixed(2);
      }
    };
  }

  /* Ballet e danças — grand jeté e pirueta, alternando a direção */
  {
    const PREP = { x: 69, y: 110, lean: 0, ua1: 60, fa1: 100, ua2: -55, fa2: -35, th1: 18, sh1: -14, th2: -22, sh2: -6 };
    const STEP = { x: 76, y: 109, lean: 6, ua1: 80, fa1: 110, ua2: -80, fa2: -100, th1: 30, sh1: 10, th2: -20, sh2: -10 };
    const TAKE = { x: 80, y: 112.5, lean: 12, ua1: 40, fa1: 60, ua2: -30, fa2: -10, th1: 40, sh1: -30, th2: -24, sh2: -14 };
    const LEAP = { x: 100, y: 86, lean: 4, ua1: 150, fa1: 140, ua2: -120, fa2: -110, th1: 95, sh1: 92, th2: -100, sh2: -104 };
    const LANDING = { x: 122, y: 111, lean: 10, ua1: 120, fa1: 100, ua2: -100, fa2: -90, th1: 30, sh1: -20, th2: -70, sh2: -80 };
    const PASSE = { x: 131, y: 104, lean: 0, ua1: 100, fa1: 112, ua2: -100, fa2: -112, th1: 75, sh1: -80, th2: 0, sh2: 0 };
    SCENES.ballet = {
      name: 'Ballet e Danças',
      aria: 'Animação: bailarina faz um grand jeté seguido de uma pirueta',
      dur: 7200, poster: 0.165,
      keys: [
        { t: 0, p: PREP },
        { t: 0.10, p: STEP },
        { t: 0.18, e: 'in', p: TAKE },
        { t: 0.30, p: LEAP },
        { t: 0.38, e: 'out', p: LEAP },
        { t: 0.48, p: LANDING },
        { t: 0.56, p: PASSE },
        { t: 0.86, p: PASSE },
        { t: 1, p: { ...PREP, x: 131 } }
      ],
      time: t => (t * 2) % 1,
      mod(t, p) {
        const second = t >= 0.5;
        const h = (t * 2) % 1;
        if (h > 0.2 && h < 0.46) {
          const k = (h - 0.33) / 0.13;
          p.y = 110 - 28 * (1 - k * k);
          p.x = lerp(80, 122, (h - 0.2) / 0.26);
        }
        p.sx = Math.cos(((second ? 540 : 0) + 540 * EASE.io(clamp01((h - 0.6) / 0.26))) * D2R);
        if (second) p.x = 200 - p.x;
      }
    };
  }

  /* Halterofilismo — arremesso (clean & jerk) */
  {
    const SET = { x: 86, y: 128, lean: 48, ua1: 2, fa1: 0, ua2: -2, fa2: 0, th1: 78, sh1: -36, th2: 72, sh2: -40 };
    const RACK = { x: 90, y: 108.5, lean: -4, ua1: 36, fa1: 160, ua2: 34, fa2: 158, th1: 4, sh1: 0, th2: -4, sh2: 0 };
    const JERK = { x: 90, y: 110, lean: 0, ua1: 178, fa1: 179, ua2: 176, fa2: 178, th1: 32, sh1: 8, th2: -34, sh2: -24 };
    SCENES.halterofilismo = {
      name: 'Halterofilismo',
      aria: 'Animação: halterofilista levanta a barra do chão até acima da cabeça',
      dur: 3400, poster: 0.72,
      keys: [
        { t: 0, p: SET },
        { t: 0.10, p: SET },
        { t: 0.32, p: RACK },
        { t: 0.46, e: 'out', p: RACK },
        { t: 0.54, e: 'back', p: { y: 113, th1: 24, sh1: -22, th2: 20, sh2: -24 } },
        { t: 0.64, p: JERK },
        { t: 0.86, p: JERK },
        { t: 1, p: SET }
      ],
      trails: [{ point: s => mix(s.h1, s.h2, 0.5), width: 7 }],
      setup(c) {
        make('rect', { class: 'platform', x: 36, y: GROUND, width: 128, height: 4 }, c.back);
        const plate = make('g', { class: 'plate' }, c.front);
        make('circle', { r: 11 }, plate);
        make('circle', { class: 'plate__ring', r: 7.5 }, plate);
        make('circle', { class: 'hub', r: 3 }, plate);
        c.s.plate = plate;
      },
      update(t, P, S, c) {
        place(c.s.plate, mix(S[0].h1, S[0].h2, 0.5));
      }
    };
  }

  /* Krav Maga — defesa e contra-ataque frente a um parceiro */
  {
    const STANCE = { y: 109.5, lean: 4, ua1: 40, fa1: 165, ua2: 30, fa2: 172, th1: 18, sh1: 4, th2: -18, sh2: -4 };
    const DS = { ...STANCE, x: 76 };
    const AS = { ...STANCE, x: 126, lean: 6, sx: -1 };
    SCENES.kravmaga = {
      name: 'Krav Maga',
      aria: 'Animação: praticante de krav maga desvia um soco e contra-ataca com soco e joelhada',
      dur: 2800, poster: 0.32,
      actors: [
        {
          cls: 'figure--partner',
          keys: [
            { t: 0, p: AS },
            { t: 0.06, e: 'out', p: AS },
            { t: 0.16, p: { x: 122, lean: 14, ua1: 92, fa1: 94 } },
            { t: 0.24, p: { ua1: 112, fa1: 130, lean: 8 } },
            { t: 0.34, e: 'out', p: { x: 127, lean: -14, nod: -14, ua1: 60, fa1: 120, ua2: 40, fa2: 150 } },
            { t: 0.44, p: { x: 126, lean: -6, nod: -4 } },
            { t: 0.55, e: 'out', p: { x: 125, lean: 34, nod: 12, ua1: 20, fa1: 40, ua2: 15, fa2: 35, th1: 12, sh1: 8, th2: -12, sh2: -8 } },
            { t: 0.74, p: { ...AS, x: 128 } },
            { t: 1, p: AS }
          ]
        },
        {
          keys: [
            { t: 0, p: DS },
            { t: 0.12, p: DS },
            { t: 0.20, e: 'back', p: { ua2: 118, fa2: 150, lean: 2 } },
            { t: 0.30, p: { x: 80, lean: 10, ua1: 110, fa1: 108, ua2: 100, fa2: 140 } },
            { t: 0.38, p: {} },
            { t: 0.45, e: 'back', p: { x: 90, lean: -2, ua1: 105, fa1: 160, ua2: 100, fa2: 160 } },
            { t: 0.53, p: { x: 95, lean: -8, th1: 115, sh1: -10, th2: -10, sh2: -6 } },
            { t: 0.63, p: { x: 92, lean: 2, th1: 20, sh1: 4, th2: -18, sh2: -4 } },
            { t: 0.82, p: DS },
            { t: 1, p: DS }
          ]
        }
      ],
      trails: [{ actor: 1, point: s => s.h1, width: 5 }, { actor: 1, point: s => s.k1, width: 6 }],
      setup(c) {
        make('rect', { class: 'platform', x: 30, y: GROUND, width: 140, height: 4 }, c.back);
        c.s.punch = makeBurst(c.front, [114, 66]);
        c.s.knee = makeBurst(c.front, [110, 95]);
      },
      update(t, P, S, c) {
        c.s.punch.style.opacity = Math.sin(seg(t, 0.28, 0.40, 'lin') * Math.PI).toFixed(3);
        c.s.knee.style.opacity = Math.sin(seg(t, 0.51, 0.63, 'lin') * Math.PI).toFixed(3);
      }
    };
  }

  /* Futebol (memória) — remate à baliza */
  {
    const K0 = { x: 58, y: 108.5, lean: 6, ua1: -25, fa1: -10, ua2: 25, fa2: 40, th1: 6, sh1: 0, th2: -8, sh2: -4 };
    const REST = [105, 145.5];
    const ballAt = t => {
      if (t >= 0.40 && t < 0.58) return qbez(REST, [140, 70], [178, 112], seg(t, 0.40, 0.58, 'out'));
      if (t >= 0.58 && t < 0.80) return mix([178, 112], [182, 145.5], seg(t, 0.58, 0.66, 'in2'));
      return REST;
    };
    SCENES.futebol = {
      name: 'Futebol',
      aria: 'Animação: jogador de futebol remata e a bola entra na baliza',
      dur: 2600, poster: 0.42,
      keys: [
        { t: 0, p: K0 },
        { t: 0.28, e: 'in', p: { x: 62, y: 109, lean: 2, ua1: -45, fa1: -30, ua2: 60, fa2: 85, th1: -30, sh1: -100, th2: 6, sh2: 0 } },
        { t: 0.40, e: 'out', p: { x: 66, y: 108, lean: -8, ua1: -60, fa1: -50, ua2: 80, fa2: 100, th1: 45, sh1: 55, th2: -6, sh2: -6 } },
        { t: 0.52, p: { x: 68, y: 107, lean: -14, ua1: -55, fa1: -40, ua2: 75, fa2: 95, th1: 85, sh1: 95, th2: -8, sh2: -8 } },
        { t: 0.78, p: { x: 62, y: 108.5, lean: 4, ua1: -20, fa1: -5, ua2: 20, fa2: 35, th1: 5, sh1: 0, th2: -6, sh2: -3 } },
        { t: 1, p: K0 }
      ],
      trails: [{ point: s => s.f1, width: 7 }],
      setup(c) {
        const goal = make('g', {}, c.back);
        c.s.net = make('g', { class: 'net' }, goal);
        for (let x = 172; x < 192; x += 6) make('line', { x1: x, y1: n1(84 + (x - 166) * 8 / 26), x2: x, y2: GROUND }, c.s.net);
        for (let y = 96; y <= 140; y += 11) make('line', { x1: 166, y1: y, x2: 192, y2: y + 8 }, c.s.net);
        make('path', { class: 'frame', d: `M166 ${GROUND}V84L192 92V${GROUND}` }, goal);
        c.s.streak = makeSmear(c.back, 6);
        c.s.ball = makeBall(c.front);
      },
      update(t, P, S, c) {
        let rot = 0, o = 1;
        if (t >= 0.40 && t < 0.58) rot = seg(t, 0.40, 0.58, 'out') * 540;
        else if (t >= 0.58 && t < 0.80) { rot = 540; o = 1 - seg(t, 0.66, 0.74, 'lin'); }
        else if (t >= 0.80) o = seg(t, 0.86, 0.96, 'lin');
        place(c.s.ball, ballAt(t), rot, o);
        drawSmear(c.s.streak, [0, 1, 2, 3, 4, 5].map(k => ballAt(Math.max(0, t - k * 0.01))), 5);
        const ripple = Math.sin(seg(t, 0.56, 0.76, 'lin') * Math.PI) * 3;
        c.s.net.setAttribute('transform', `translate(${ripple.toFixed(2)} 0)`);
      }
    };
  }

  /* Basquetebol (memória) — drible e lançamento em suspensão */
  {
    const B0 = { x: 62, y: 110, lean: 8, ua1: 40, fa1: 60, ua2: -20, fa2: 10, th1: 16, sh1: -10, th2: -14, sh2: -8 };
    const RIM = [174, 52];
    SCENES.basquetebol = {
      name: 'Basquetebol',
      aria: 'Animação: jogador de basquetebol dribla, salta e encesta',
      dur: 3200, poster: 0.5,
      keys: [
        { t: 0, p: B0 },
        { t: 0.075, p: { ua1: 30, fa1: 25 } },
        { t: 0.15, p: B0 },
        { t: 0.225, p: { ua1: 30, fa1: 25 } },
        { t: 0.30, p: B0 },
        { t: 0.40, e: 'out', p: { y: 111, lean: 6, ua1: 150, fa1: 205, ua2: 140, fa2: 200, th1: 26, sh1: -22, th2: -10, sh2: -24 } },
        { t: 0.52, p: { y: 96, lean: 0, ua1: 172, fa1: 160, ua2: 160, fa2: 175, th1: 4, sh1: -8, th2: -6, sh2: -12 } },
        { t: 0.62, e: 'out', p: { y: 111, ua1: 165, fa1: 140, ua2: 155, fa2: 170, th1: 20, sh1: -14, th2: -10, sh2: -16 } },
        { t: 0.72, p: {} },
        { t: 0.86, p: B0 },
        { t: 1, p: B0 }
      ],
      mod(t, p) {
        if (t > 0.44 && t < 0.60) { const k = (t - 0.52) / 0.08; p.y = 111 - 16 * (1 - k * k); }
      },
      setup(c, pic) {
        make('path', { class: 'frame', d: 'M188 47H194V152' }, c.back);
        make('line', { class: 'frame', x1: 188, y1: 28, x2: 188, y2: 66 }, c.back);
        c.s.net = make('path', { class: 'hoop-net', d: 'M164 52L168 70M169 52L171 70M174 52V70M179 52L177 70M184 52L180 70M166 60H182M168 67H180' }, c.back);
        make('line', { class: 'rim', x1: 163, y1: RIM[1], x2: 185, y2: RIM[1] }, c.front);
        c.s.streak = makeSmear(c.back, 6);
        c.s.ball = makeBasketball(c.front);
        const sk = pic.skeletonsAt(0.52)[0];
        c.s.release = add(mix(sk.h1, sk.h2, 0.5), [2, -7]);
      },
      update(t, P, S, c) {
        const at = (tt, s) => {
          if (tt < 0.30) {
            const k = (tt / 0.15) % 1, top = s.h1[1] + 7;
            return [s.h1[0] + 2, lerp(top, GROUND - 6.8, 1 - Math.abs(Math.cos(Math.PI * k)))];
          }
          if (tt < 0.52) return add(mix(s.h1, s.h2, 0.5), [2, -7]);
          if (tt < 0.76) return qbez(c.s.release, [128, -6], RIM, seg(tt, 0.52, 0.76, 'lin'));
          if (tt < 0.84) return mix(RIM, [RIM[0], 84], seg(tt, 0.76, 0.84, 'in2'));
          if (tt < 0.90) return mix([RIM[0], 84], [RIM[0] + 2, GROUND - 6.8], seg(tt, 0.84, 0.90, 'in2'));
          return [RIM[0] + 2, GROUND - 6.8 - Math.sin(seg(tt, 0.90, 0.95, 'lin') * Math.PI) * 8];
        };
        const s = S[0];
        const o = t < 0.9 ? 1 : t < 0.96 ? 1 - seg(t, 0.9, 0.96, 'lin') : seg(t, 0.96, 1, 'lin');
        place(c.s.ball, t >= 0.96 ? at(0, s) : at(t, s), t > 0.52 && t < 0.9 ? (t - 0.52) * 900 : 0, o);
        drawSmear(c.s.streak, [0, 1, 2, 3, 4, 5].map(k => {
          const tt = t - k * 0.01;
          return tt > 0.52 && tt < 0.84 ? at(tt, s) : at(t, s);
        }), 5);
        const swish = Math.sin(seg(t, 0.76, 0.88, 'lin') * Math.PI) * 0.18;
        c.s.net.setAttribute('transform', `translate(0 ${RIM[1]}) scale(1 ${(1 + swish).toFixed(3)}) translate(0 ${-RIM[1]})`);
      }
    };
  }

  const ORDER = ['badminton', 'patinagem', 'remo', 'ballet', 'halterofilismo', 'kravmaga'];

  /* =========================================================
     Instâncias e ciclo de animação
     ========================================================= */
  class Picto {
    constructor(svg, key) {
      const def = SCENES[key];
      this.def = def;
      svg.setAttribute('viewBox', '0 0 200 170');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', def.aria);
      svg.classList.add('picto');
      svg.replaceChildren();
      if (def.ground !== false) make('line', { class: 'ground', x1: 6, y1: GROUND + 0.5, x2: 194, y2: GROUND + 0.5 }, svg);
      const c = {
        svg,
        shadows: make('g', {}, svg),
        back: make('g', {}, svg),
        figs: make('g', {}, svg),
        front: make('g', {}, svg),
        s: {}
      };
      this.c = c;
      const actorDefs = def.actors || [{ keys: def.keys, mod: def.mod, time: def.time }];
      this.actors = actorDefs.map(a => ({
        keys: normalize(a.keys),
        mod: a.mod,
        time: a.time,
        fig: buildFigure(c.figs, a.cls),
        shadow: def.shadow === false ? null : make('ellipse', { class: 'shadow', ry: 3 }, c.shadows)
      }));
      this.trails = (def.trails || []).map(tr => ({ actor: 0, dt: 0.012, n: 7, ...tr, fx: makeSmear(c.back, tr.n || 7) }));
      if (def.setup) def.setup(c, this);
      this.render(def.poster || 0);
    }
    poses(t) {
      return this.actors.map(a => {
        const p = sample(a.keys, a.time ? a.time(t) : t);
        if (a.mod) a.mod(t, p);
        return p;
      });
    }
    skeletonsAt(t) { return this.poses(wrap(t)).map(solve); }
    render(t) {
      this.t = t;
      const P = this.poses(t);
      const S = P.map(solve);
      this.actors.forEach((a, i) => {
        drawFigure(a.fig, S[i]);
        if (a.shadow) {
          const h = GROUND - Math.max(S[i].f1[1], S[i].f2[1]);
          const k = clamp(1 - h / 70, 0.35, 1);
          a.shadow.setAttribute('cx', n1(S[i].hip[0]));
          a.shadow.setAttribute('cy', GROUND + 0.5);
          a.shadow.setAttribute('rx', n1(17 * k));
          a.shadow.style.opacity = k.toFixed(2);
        }
      });
      this.trails.forEach(tr => {
        const pts = [];
        for (let k = 0; k < tr.n; k++) pts.push(tr.point(k ? this.skeletonsAt(t - k * tr.dt)[tr.actor] : S[tr.actor]));
        drawSmear(tr.fx, pts, tr.width);
      });
      if (this.def.update) this.def.update(t, P, S, this.c, this);
    }
  }

  const running = new Set();
  let frame = 0;
  const tick = now => {
    running.forEach(pic => pic.render(((now - pic.start) % pic.def.dur) / pic.def.dur));
    frame = running.size ? requestAnimationFrame(tick) : 0;
  };
  const play = pic => {
    if (REDUCE || !pic || running.has(pic)) return;
    pic.start = performance.now() - pic.t * pic.def.dur;
    running.add(pic);
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const pause = pic => { if (pic) running.delete(pic); };

  // Só anima o que está visível no ecrã
  const bySvg = new WeakMap();
  const visible = new WeakSet();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const pic = bySvg.get(e.target);
      if (e.isIntersecting) { visible.add(e.target); play(pic); }
      else { visible.delete(e.target); pause(pic); }
    });
  }, { rootMargin: '80px 0px' });

  function mount(svg, key) {
    const old = bySvg.get(svg);
    pause(old);
    const pic = new Picto(svg, key);
    bySvg.set(svg, pic);
    if (!old) io.observe(svg);
    else if (visible.has(svg)) play(pic);
    return pic;
  }

  document.querySelectorAll('svg[data-picto]').forEach(svg => mount(svg, svg.dataset.picto));

  window.LusoPicto = { mount, scenes: SCENES, order: ORDER };
})();
