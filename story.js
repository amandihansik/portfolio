/* ==========================================================
   HERO STORY — "How a design comes to life", in six scenes.
   A pinned, scroll-driven particle film:
   dust → dot → line → shape → colour → type → amandi.
   ========================================================== */
(() => {
  const story = document.getElementById('top');
  if (!story) return;
  const pin = story.querySelector('.pin');
  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  /* ---------- the story ---------- */
  const SCENES = [
    { t: 'The dot',    h: 'Every design begins with a single point.', p: 'A spark of an idea, waiting in the dark. Move your cursor through it, or click to stir it up.' },
    { t: 'The line',   h: 'Then the point starts to move.',            p: 'It stretches into a line and bends into a curve, pulled by the pen tool.' },
    { t: 'The shape',  h: 'Lines close into shapes.',                  p: 'Circles, squares and triangles: the alphabet behind every layout I make.' },
    { t: 'Colour',     h: 'Then colour arrives.',                      p: 'And the shapes start to feel something: calm, loud, warm or bold.' },
    { t: 'Type',       h: 'Letters give it a voice.',                  p: 'Grid, weight and rhythm turn marks into a message people can read.' },
    { t: 'The signature', h: 'And the dot became a full stop.',        p: "I'm Amandi, a graphic designer and multimedia creator. I turn ideas into brands, posts and films.", last: true },
  ];
  const SEG = SCENES.length;          // morph segments (scatter → … → signature)
  const SPAN = SEG + 0.6;             // extra hold at the end before the page continues

  /* ---------- palette ---------- */
  const C = {
    white: [244, 244, 246], silver: [160, 160, 182],
    violet: [124, 92, 255], coral: [255, 92, 122], amber: [255, 184, 76], mint: [61, 219, 180],
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const grad3 = t => t < .5 ? mix(C.violet, C.coral, t * 2) : mix(C.coral, C.amber, (t - .5) * 2);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- build captions + HUD ---------- */
  const words = s => s.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
  $('#caps').innerHTML = SCENES.map((s, i) => `
    <div class="cap" data-s="${i + 1}">
      <small>${String(i + 1).padStart(2, '0')} — ${s.t}</small>
      <h2>${words(s.h)}</h2>
      <p>${s.p}</p>
      ${s.last ? `<div class="cta"><a href="#work" class="btn primary">View my work ↓</a><a href="#contact" class="btn">Get in touch</a></div>` : ''}
    </div>`).join('');
  $('#sceneNav').innerHTML = SCENES.map((s, i) => `<button data-s="${i + 1}" aria-label="Scene ${i + 1}: ${s.t}"><i></i><span>${s.t}</span></button>`).join('');
  const caps = $$('.cap'), dots = $$('#sceneNav button');

  /* ---------- canvas + particles ---------- */
  let W = 0, H = 0, DPR = 1, N = 0, P = [], SETS = [], ready = false, visible = true;
  let prog = 0, target = 0, time = 0, auto = false, autoAcc = 0;
  const mouse = { x: -9999, y: -9999 };

  function size() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = pin.clientWidth; H = pin.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const mobile = () => W < 700;
  const centre = () => ({ cx: W / 2, cy: H * (mobile() ? .34 : .38) });

  function makeParticles() {
    N = mobile() ? 1100 : 2000;
    P = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
      a: Math.random(), b: Math.random(), c: Math.random(),
      d: Math.random() * .35,                     // stagger
      sw: (Math.random() - .5) * 140,             // curved flight
      ph: Math.random() * 6.28, f: .6 + Math.random() * 1.2,
      sz: .9 + Math.random() * 1.6,
    }));
  }

  /* sample the pixels of a word into points */
  function sampleText(str, maxH, dotColour) {
    const { cx, cy } = centre();
    const oc = document.createElement('canvas'); oc.width = W; oc.height = H;
    const o = oc.getContext('2d');
    o.font = '800 100px Syne, "Arial Black", sans-serif';
    const fs = Math.min(100 * (W * (mobile() ? .86 : .74)) / o.measureText(str).width, maxH);
    o.font = `800 ${fs}px Syne, "Arial Black", sans-serif`;
    o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#fff';
    o.fillText(str, cx, cy);
    const full = o.measureText(str).width, left = cx - full / 2;
    const dotX = dotColour ? left + o.measureText(str.slice(0, -1)).width : Infinity;
    const data = o.getImageData(0, 0, W, H).data, pts = [];
    const step = mobile() ? 2 : 3;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step)
      if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    let top = H, base = 0, dx = 0, dy = 0, dn = 0;
    pts.forEach(([x, y]) => { if (y < top) top = y; if (y > base) base = y; if (x >= dotX - 2) { dx += x; dy += y; dn++; } });
    return { pts, left, full, dotX, fs, cy, top, base, dot: dn ? [dx / dn, dy / dn] : [cx, cy] };
  }

  function buildSets() {
    const { cx, cy } = centre();
    const s = Math.min(W * (mobile() ? .11 : .1), H * .13, 125), gap = s * 2.9;
    const shapes = [cx - gap, cx, cx + gap];
    const tri = x => [[x, cy - s * 1.08], [x - s * 1.02, cy + s * .78], [x + s * 1.02, cy + s * .78]];
    const sq = s * .88;
    const perim = (k, u) => {
      const x0 = shapes[k];
      if (k === 0) { const a = u * Math.PI * 2; return [x0 + Math.cos(a) * s, cy + Math.sin(a) * s]; }
      if (k === 1) { const e = u * 4, i = e | 0, f = e - i; const c = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]; return [x0 + (c[i][0] + (c[i + 1][0] - c[i][0]) * f) * sq, cy + (c[i][1] + (c[i + 1][1] - c[i][1]) * f) * sq]; }
      const v = tri(x0), e = u * 3, i = e | 0, f = e - i, A = v[i], B = v[(i + 1) % 3];
      return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
    };
    const inside = (k, a, b) => {
      const x0 = shapes[k];
      if (k === 0) { const r = Math.sqrt(b) * s, t = a * Math.PI * 2; return [x0 + Math.cos(t) * r, cy + Math.sin(t) * r]; }
      if (k === 1) return [x0 + (a - .5) * 2 * sq, cy + (b - .5) * 2 * sq];
      let u = a, v = b; if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const [A, B, Cc] = tri(x0); return [A[0] + u * (B[0] - A[0]) + v * (Cc[0] - A[0]), A[1] + u * (B[1] - A[1]) + v * (Cc[1] - A[1])];
    };
    // pen-tool curve
    const L = { p0: [W * .1, cy + H * .11], p1: [W * .36, cy - H * .24], p2: [W * .62, cy + H * .24], p3: [W * .9, cy - H * .09] };
    const bez = t => { const m = 1 - t; return [0, 1].map(j => m * m * m * L.p0[j] + 3 * m * m * t * L.p1[j] + 3 * m * t * t * L.p2[j] + t * t * t * L.p3[j]); };
    const fill = [C.violet, C.coral, C.amber];
    const design = sampleText('DESIGN', H * (mobile() ? .14 : .24));
    const sign = sampleText('amandi.', H * (mobile() ? .16 : .28), true);

    const scatter = [], dot = [], line = [], outline = [], colour = [], type = [], me = [];
    P.forEach((p, i) => {
      scatter.push([p.a * W, p.b * H, p.c < .72 ? C.white : p.c < .86 ? C.violet : C.coral, 10]);
      const r = Math.sqrt(p.b) * 7, an = p.a * 6.283;
      dot.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r, p.b < .25 ? C.white : C.coral, 1.2]);
      const t = i / N, q = bez(t);
      line.push([q[0] + (p.b - .5) * 3.2, q[1] + (p.c - .5) * 3.2, mix(C.violet, C.coral, t), 1]);
      const k = i % 3, o = perim(k, p.a);
      outline.push([o[0] + (p.b - .5) * 2.4, o[1] + (p.c - .5) * 2.4, p.c < .5 ? C.white : C.silver, 1]);
      const f = inside(k, p.a, p.b);
      colour.push([f[0], f[1], p.c < .06 ? C.mint : p.c < .1 ? C.white : fill[k], 1]);
      const dp = design.pts[i % design.pts.length];
      type.push([dp[0], dp[1], grad3(clamp((dp[0] - design.left) / design.full)), .9]);
      const sp = sign.pts[i % sign.pts.length];
      me.push([sp[0], sp[1], sp[0] >= sign.dotX - 2 ? C.coral : (p.c < .12 ? C.violet : C.white), .9]);
    });
    SETS = [scatter, dot, line, outline, colour, type, me];
    SETS.meta = { cx, cy, s, gap, shapes, tri, sq, L, design, sign };
  }

  /* ---------- scroll → progress ---------- */
  const total = () => story.offsetHeight - innerHeight;
  const readTarget = () => {
    const raw = clamp(-story.getBoundingClientRect().top / total());
    return { raw, p: Math.min(raw * SPAN, SEG) };
  };
  const scrollToP = (p, smooth = true) => {
    const y = story.offsetTop + (p / SPAN) * total();
    scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });
  };
  // weight of a scene's "hold" (its finished picture) for overlays
  const hold = (k, p) => clamp((p - (k - 1 + .45)) / .2) * (k === SEG ? 1 : clamp((k + .25 - p) / .2));

  /* ---------- overlays drawn on top of the particles ---------- */
  function overlays(p) {
    const m = SETS.meta; if (!m) return;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';

    // 1 dot: ripple rings + glow
    let w = Math.max(hold(1, p), p < 1.2 ? clamp(p / .9) * .6 : 0);
    if (w > .01) {
      const g = ctx.createRadialGradient(m.cx, m.cy, 0, m.cx, m.cy, 120);
      g.addColorStop(0, `rgba(255,92,122,${.35 * w})`); g.addColorStop(1, 'rgba(255,92,122,0)');
      ctx.fillStyle = g; ctx.fillRect(m.cx - 120, m.cy - 120, 240, 240);
      for (let r = 0; r < 3; r++) {
        const k = ((time * .35 + r / 3) % 1);
        ctx.strokeStyle = `rgba(255,92,122,${(1 - k) * .5 * w})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(m.cx, m.cy, 14 + k * 150, 0, 6.283); ctx.stroke();
      }
    }
    // 2 line: pen-tool anchors + handles
    w = hold(2, p);
    if (w > .01) {
      const { p0, p1, p2, p3 } = m.L;
      ctx.strokeStyle = `rgba(160,160,182,${.6 * w})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.moveTo(...p3); ctx.lineTo(...p2); ctx.stroke();
      ctx.fillStyle = `rgba(14,14,18,${w})`; ctx.strokeStyle = `rgba(244,244,246,${w})`;
      [p0, p3].forEach(q => { ctx.fillRect(q[0] - 5, q[1] - 5, 10, 10); ctx.strokeRect(q[0] - 5, q[1] - 5, 10, 10); });
      ctx.fillStyle = `rgba(255,92,122,${w})`;
      [p1, p2].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 4.5, 0, 6.283); ctx.fill(); });
      ctx.fillStyle = `rgba(160,160,182,${.9 * w})`; ctx.fillText('ANCHOR', p0[0] - 8, p0[1] + 20); ctx.fillText('HANDLE', p1[0] + 10, p1[1]);
    }
    // 3 shape: guides + labels
    w = hold(3, p);
    if (w > .01) {
      ctx.setLineDash([3, 5]); ctx.strokeStyle = `rgba(124,92,255,${.55 * w})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.shapes[0] - m.s * 1.6, m.cy); ctx.lineTo(m.shapes[2] + m.s * 1.6, m.cy);
      m.shapes.forEach(x => { ctx.moveTo(x, m.cy - m.s * 1.4); ctx.lineTo(x, m.cy + m.s * 1.4); }); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(160,160,182,${w})`; ctx.textAlign = 'center';
      ['ELLIPSE', 'RECTANGLE', 'POLYGON'].forEach((t, i) => ctx.fillText(t, m.shapes[i], m.cy + m.s * 1.45 + 12));
      ctx.textAlign = 'start';
    }
    // 4 colour: hex chips
    w = hold(4, p);
    if (w > .01) {
      ctx.textAlign = 'center';
      [['#7C5CFF', C.violet], ['#FF5C7A', C.coral], ['#FFB84C', C.amber]].forEach(([hx, c], i) => {
        const x = m.shapes[i], y = m.cy + m.s * 1.45 + 12;
        ctx.fillStyle = `rgba(${c},${w})`; ctx.fillRect(x - 38, y - 7, 14, 14);
        ctx.fillStyle = `rgba(244,244,246,${w})`; ctx.fillText(hx, x + 8, y);
      });
      ctx.textAlign = 'start';
    }
    // 5 type: cap line, x-height, baseline
    w = hold(5, p);
    if (w > .01) {
      const d = m.design, top = d.top, base = d.base, xh = top + (base - top) * .5;
      ctx.strokeStyle = `rgba(124,92,255,${.5 * w})`; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); [top, xh, base].forEach(y => { ctx.moveTo(W * .04, y); ctx.lineTo(W * .96, y); }); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(160,160,182,${w})`;
      ctx.fillText('CAP HEIGHT', W * .04, top - 10); if (!mobile()) ctx.fillText('MEAN LINE', W * .04, xh - 10); ctx.fillText('BASELINE', W * .04, base + 12);
      ctx.textAlign = 'end'; ctx.fillText('SYNE · 800', W * .96, top - 10); ctx.textAlign = 'start';
    }
    // 6 signature: glow behind the full stop
    w = hold(6, p);
    if (w > .01) {
      const sg = m.sign, [x, y] = sg.dot;
      const g = ctx.createRadialGradient(x, y, 0, x, y, sg.fs * .7);
      g.addColorStop(0, `rgba(255,92,122,${.4 * w * (.75 + Math.sin(time * 2.4) * .25)})`); g.addColorStop(1, 'rgba(255,92,122,0)');
      ctx.fillStyle = g; ctx.fillRect(x - sg.fs, y - sg.fs, sg.fs * 2, sg.fs * 2);
    }
    ctx.restore();
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; time += dt;
    requestAnimationFrame(frame);
    if (!ready || !visible) return;

    // autoplay: glide through the story
    if (auto) {
      autoAcc += (total() / SPAN) / 4.6 * dt;
      const step = autoAcc | 0;
      if (step) { scrollBy({ top: step, behavior: 'instant' }); autoAcc -= step; }
      if (readTarget().raw >= .999) setAuto(false);
    }

    target = readTarget().p;
    prog += (target - prog) * Math.min(1, dt * 7);
    const p = prog;
    ui(p);

    // fade the previous frame (soft motion trails)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const k = Math.min(Math.floor(p), SEG - 1), t = clamp((p - k) / .6);
    const A = SETS[k], B = SETS[k + 1];
    const R = mobile() ? 70 : 110, R2 = R * R;
    for (let i = 0; i < N; i++) {
      const q = P[i], a = A[i], b = B[i];
      const e = ease(clamp((t - q.d) / .65));
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1, arc = Math.sin(e * Math.PI) * q.sw;
      let tx = a[0] + dx * e - dy / len * arc, ty = a[1] + dy * e + dx / len * arc;
      const amp = a[3] + (b[3] - a[3]) * e;
      tx += Math.sin(time * q.f + q.ph) * amp; ty += Math.cos(time * q.f * .8 + q.ph) * amp;
      if (k === 0) { const drift = (1 - e) * 18; tx += Math.sin(time * .15 + q.a * 9) * drift; ty += Math.cos(time * .12 + q.b * 9) * drift; }
      // cursor pushes the particles away
      const mx = q.x - mouse.x, my = q.y - mouse.y, d2 = mx * mx + my * my;
      if (d2 < R2) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 2.6; q.vx += mx / d * f; q.vy += my / d * f; }
      q.vx = q.vx * .82 + (tx - q.x) * .07; q.vy = q.vy * .82 + (ty - q.y) * .07;
      q.x += q.vx; q.y += q.vy;
      const c = mix(a[2], b[2], e), al = k === 0 ? .45 + .5 * e : .9;
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
      const s = q.sz * (k === 0 && e < .5 ? .9 : 1);
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    overlays(p);
  }

  /* ---------- UI state from progress ---------- */
  let lastScene = -1;
  function ui(p) {
    document.body.classList.toggle('story-intro', p < .12);
    $('#intro').classList.toggle('on', p < .12);
    caps.forEach((c, i) => {
      const s = i + 1, on = s === SEG ? p >= s - .5 : (p >= s - 1 + .5 && p < s + .12);
      c.classList.toggle('on', on);
    });
    const cur = p < .5 ? 0 : Math.min(SEG, Math.round(p + .02));
    if (cur !== lastScene) {
      lastScene = cur;
      dots.forEach((d, i) => d.classList.toggle('on', i + 1 === cur));
      $('#sceneLbl').textContent = `${String(cur).padStart(2, '0')} / ${String(SEG).padStart(2, '0')}${cur ? ' · ' + SCENES[cur - 1].t : ''}`;
    }
    $('#storyBar').style.transform = `scaleX(${p / SEG})`;
    pin.style.setProperty('--glow', (.12 + .1 * Math.sin(p * 1.2)).toFixed(3));
    pin.style.setProperty('--hue', (p * 22).toFixed(1) + 'deg');
  }

  /* ---------- controls ---------- */
  function setAuto(on) {
    auto = on; autoAcc = 0;
    $$('.js-auto').forEach(b => b.textContent = on ? '❚❚ Pause' : '▶ Play by itself');
  }
  $$('.js-auto').forEach(b => b.addEventListener('click', () => {
    if (!auto && readTarget().raw >= .999) scrollToP(0, false);
    setAuto(!auto);
  }));
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, e => { if (auto && !(e.target.closest && e.target.closest('.js-auto'))) setAuto(false); }, { passive: true }));
  $('#begin').addEventListener('click', () => scrollToP(.85));
  dots.forEach(d => d.addEventListener('click', () => { setAuto(false); scrollToP(+d.dataset.s - .15); }));

  const pointer = (x, y) => { const r = pin.getBoundingClientRect(); mouse.x = x - r.left; mouse.y = y - r.top; };
  pin.addEventListener('pointermove', e => pointer(e.clientX, e.clientY));
  pin.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  pin.addEventListener('touchmove', e => { const t = e.touches[0]; pointer(t.clientX, t.clientY); }, { passive: true });
  pin.addEventListener('touchend', () => { mouse.x = mouse.y = -9999; });
  pin.addEventListener('click', e => {           // click = shockwave
    if (e.target.closest('a,button')) return;
    const r = pin.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    P.forEach(q => { const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1; if (d < 260) { const f = (1 - d / 260) * 26; q.vx += dx / d * f; q.vy += dy / d * f; } });
  });

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(story);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const n = mobile(); size(); if (n !== mobile()) makeParticles(); buildSets(); }, 150); });

  /* ---------- loader ---------- */
  const pct = $('#slPct'), ring = $('#slRing'), t0 = performance.now();
  let shown = 0;
  size(); makeParticles();
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('800 100px Syne'), document.fonts.load('600 11px Inter')]),
    new Promise(r => setTimeout(r, 2500)),
  ]);
  fontsReady.then(() => { buildSets(); ready = true; if (reduce) { prog = target = 0; } });

  (function load() {
    const el = performance.now() - t0;
    const goal = ready ? 100 : Math.min(92, el / 18);
    shown += (goal - shown) * .12;
    if (goal === 100 && 100 - shown < .6) shown = 100;
    pct.textContent = Math.round(shown) + '%';
    ring.style.strokeDashoffset = 100 - shown;
    if (shown >= 100 && el > (reduce ? 0 : 1500)) {
      $('#sl').classList.add('done'); pin.classList.add('loaded');
      return;
    }
    requestAnimationFrame(load);
  })();

  requestAnimationFrame(frame);
})();
