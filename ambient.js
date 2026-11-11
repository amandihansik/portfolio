/* =========================================================
   AMBIENT — the deep sea behind the whole site
   · glowing plankton in 3 depth layers (parallax while scrolling)
   · distant jellyfish drifting along the sides
   · rising bubbles and twinkling glints
   · a trail of sparkles behind the cursor (on a top layer)
   ========================================================= */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const mk = (id, z) => { const c = document.createElement('canvas'); c.id = id; c.setAttribute('aria-hidden', 'true'); c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`; document.body.prepend(c); return c; };
  const back = mk('ambient', 0), top = mk('sparkle', 95);
  const bx = back.getContext('2d'), tx = top.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = [[124, 92, 255], [255, 92, 122], [120, 200, 255], [255, 140, 220]];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  let W, H, DPR, motes = [], bubbles = [], glints = [], jellies = [], trail = [];
  let t = 0, last = performance.now(), sy = scrollY;

  function size() {
    W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 1.5);
    [back, top].forEach(c => { c.width = W * DPR; c.height = H * DPR; });
    const k = Math.min(1, (W * H) / (1440 * 900));
    motes = Array.from({ length: Math.round(150 * k + 40) }, () => ({ x: rnd(0, W), y: rnd(0, H), z: [.25, .55, 1][Math.floor(Math.random() * 3)], ph: rnd(0, 6.28), c: Math.random() < .2 ? PAL[1] : Math.random() < .5 ? PAL[2] : [230, 225, 255] }));
    bubbles = Array.from({ length: Math.round(16 * k + 6) }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1.5, 6), v: rnd(10, 26), ph: rnd(0, 6.28) }));
    glints = Array.from({ length: Math.round(14 * k + 4) }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(3, 8), ph: rnd(0, 6.28), sp: rnd(.5, 1.2) }));
    jellies = Array.from({ length: W < 700 ? 2 : 4 }, (_, i) => newJelly(i, true));
  }
  function newJelly(i, fresh) {
    return { i, x: (i % 2 ? rnd(.82, .96) : rnd(.04, .18)) * W, y: fresh ? rnd(.1, 1) * H : H + 120, s: rnd(18, 34) * (W < 700 ? .8 : 1), c: PAL[i % 4], c2: PAL[(i + 2) % 4], ph: rnd(0, 6.28), sp: rnd(.6, 1) };
  }

  function jelly(j, dt, dScroll) {
    const pulse = Math.sin(t * 1.5 * j.sp + j.ph), push = Math.max(0, pulse);
    j.y -= (6 + push * 16) * j.sp * dt + dScroll * .25;          // swims up; scrolling sinks you past it
    if (j.y < -160) Object.assign(j, newJelly(j.i, false));
    if (j.y > H + 160) { j.y = -140; }
    const s = j.s, bw = s * (1 + .1 * pulse), bh = s * (.82 - .1 * pulse);
    bx.save(); bx.translate(j.x + Math.sin(t * .3 + j.ph) * 10, j.y); bx.globalAlpha = .55;
    for (let k = 0; k < 7; k++) {
      const u = k / 6 - .5, sx = u * bw * 1.6, len = s * (2.6 + (k % 3) * .5), w = Math.sin(t * 1.2 + k + j.ph) * s * .4;
      const g = bx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, rgba(j.c, .7)); g.addColorStop(1, rgba(j.c2, 0));
      bx.strokeStyle = g; bx.lineWidth = 1;
      bx.beginPath(); bx.moveTo(sx, bh * .1); bx.bezierCurveTo(sx + w, len * .35, sx * .6 - w, len * .7, sx * .4 + w * .6, len); bx.stroke();
    }
    bx.beginPath(); bx.moveTo(-bw, bh * .1); bx.bezierCurveTo(-bw, -bh * 1.25, bw, -bh * 1.25, bw, bh * .1); bx.closePath();
    const rg = bx.createRadialGradient(-bw * .25, -bh * .5, 1, 0, -bh * .2, bw * 1.2);
    rg.addColorStop(0, 'rgba(255,255,255,.7)'); rg.addColorStop(.4, rgba(j.c, .4)); rg.addColorStop(1, rgba(j.c2, .05));
    bx.fillStyle = rg; bx.shadowColor = rgba(j.c, 1); bx.shadowBlur = 24; bx.fill(); bx.shadowBlur = 0;
    bx.restore();
  }
  function star(ctx, x, y, s, a) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }

  if (fine && !reduce) addEventListener('pointermove', e => {
    for (let i = 0; i < 2; i++) trail.push({ x: e.clientX + rnd(-6, 6), y: e.clientY + rnd(-6, 6), vx: rnd(-20, 20), vy: rnd(-10, 30), life: 1, s: rnd(2, 5), c: PAL[Math.floor(Math.random() * 4)] });
    if (trail.length > 80) trail.splice(0, trail.length - 80);
  }, { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = reduce ? 0 : Math.min((now - last) / 1000, .05); last = now; t += dt;
    const dScroll = scrollY - sy; sy = scrollY;

    bx.setTransform(DPR, 0, 0, DPR, 0, 0); bx.clearRect(0, 0, W, H);
    bx.globalCompositeOperation = 'lighter';
    motes.forEach(m => {
      m.y -= (4 + 6 * m.z) * dt + dScroll * m.z * .35;             // nearer specks move faster = depth
      m.x += Math.sin(t * .5 + m.ph) * .12 * m.z;
      if (m.y < -6) { m.y = H + 6; m.x = rnd(0, W); } else if (m.y > H + 6) { m.y = -6; m.x = rnd(0, W); }
      const a = (.25 + .55 * m.z) * (.6 + .4 * Math.sin(t * 2 + m.ph));
      bx.fillStyle = rgba(m.c, a); bx.beginPath(); bx.arc(m.x, m.y, .6 + 1.4 * m.z, 0, 6.283); bx.fill();
    });
    glints.forEach(g => { const a = Math.max(0, Math.sin(t * g.sp + g.ph)); if (a > .05) star(bx, g.x, g.y, g.s * a, a * .8); });
    bx.globalCompositeOperation = 'source-over';
    jellies.forEach(j => jelly(j, dt, dScroll));
    bubbles.forEach(b => {
      b.y -= b.v * dt + dScroll * .2; b.x += Math.sin(t * 1.3 + b.ph) * .25;
      if (b.y < -12) { b.y = H + 12; b.x = rnd(0, W); } else if (b.y > H + 12) b.y = -12;
      bx.strokeStyle = 'rgba(220,235,255,.4)'; bx.lineWidth = 1; bx.beginPath(); bx.arc(b.x, b.y, b.r, 0, 6.283); bx.stroke();
      bx.fillStyle = 'rgba(255,255,255,.7)'; bx.beginPath(); bx.arc(b.x - b.r * .35, b.y - b.r * .35, Math.max(.6, b.r * .22), 0, 6.283); bx.fill();
    });

    // sparkle trail on top of everything
    tx.setTransform(DPR, 0, 0, DPR, 0, 0); tx.clearRect(0, 0, W, H);
    tx.globalCompositeOperation = 'lighter';
    trail.forEach(p => {
      p.life -= dt * 1.4; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
      if (p.life <= 0) return;
      tx.fillStyle = rgba(p.c, p.life * .5); tx.beginPath(); tx.arc(p.x, p.y, p.s * 1.6 * p.life, 0, 6.283); tx.fill();
      star(tx, p.x, p.y, p.s * p.life, p.life);
    });
    trail = trail.filter(p => p.life > 0);
  }
  size(); addEventListener('resize', size);
  requestAnimationFrame(frame);
})();
