/* =========================================================
   MAGIC CURSOR — glass orb + glowing dot + sparkle trail
   Shared by every page. Add data-cur="Label" to any element
   to show a label inside the orb when hovering it.
   ========================================================= */
(() => {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = `
  @media (hover:hover) and (pointer:fine){html,body,a,button,[data-cur]{cursor:none!important}}
  .mc-orb,.mc-dot{position:fixed;left:0;top:0;pointer-events:none;z-index:9998;border-radius:50%;will-change:transform}
  .mc-orb{width:40px;height:40px;margin:-20px 0 0 -20px;border:1.5px solid rgba(255,255,255,.6);
    box-shadow:0 0 18px rgba(190,160,255,.55),inset 0 0 12px rgba(190,160,255,.3);
    display:grid;place-items:center;transition:width .35s cubic-bezier(.2,.8,.2,1),height .35s cubic-bezier(.2,.8,.2,1),margin .35s cubic-bezier(.2,.8,.2,1),background .35s,border-color .35s,opacity .3s;opacity:0}
  .mc-orb.on{opacity:1}
  .mc-orb.big{width:84px;height:84px;margin:-42px 0 0 -42px;border-color:#fff;
    background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.32),rgba(124,92,255,.16) 60%,rgba(255,92,122,.06));backdrop-filter:blur(2px)}
  .mc-orb span{font:600 .62rem/1 'Inter',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#fff;opacity:0;transition:opacity .25s}
  .mc-orb.big span{opacity:1}
  .mc-dot{width:6px;height:6px;margin:-3px 0 0 -3px;background:#fff;box-shadow:0 0 10px #fff,0 0 20px #FF8CDC;opacity:0;transition:opacity .3s}
  .mc-dot.on{opacity:1}
  .mc-orb.big~.mc-dot{opacity:0}
  #mc-trail{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9997}`;
  document.head.append(css);

  const orb = document.createElement('div'); orb.className = 'mc-orb'; orb.innerHTML = '<span></span>';
  const dot = document.createElement('div'); dot.className = 'mc-dot';
  const cv = document.createElement('canvas'); cv.id = 'mc-trail';
  document.body.append(cv, orb, dot);
  const lbl = orb.querySelector('span'), ctx = cv.getContext('2d');

  let x = -100, y = -100, ox = x, oy = y, W, H, DPR, trail = [], last = performance.now();
  const PAL = [[124, 92, 255], [255, 92, 122], [120, 200, 255], [255, 140, 220]];
  const size = () => { W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2); cv.width = W * DPR; cv.height = H * DPR; };
  size(); addEventListener('resize', size);

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY; orb.classList.add('on'); dot.classList.add('on');
    if (!reduce) for (let i = 0; i < 2; i++) trail.push({ x: x + (Math.random() - .5) * 12, y: y + (Math.random() - .5) * 12, vx: (Math.random() - .5) * 40, vy: Math.random() * 30 - 5, life: 1, s: 2 + Math.random() * 3, c: PAL[Math.random() * 4 | 0] });
    if (trail.length > 90) trail.splice(0, trail.length - 90);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { orb.classList.remove('on'); dot.classList.remove('on'); });
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('a,button,[data-cur]');
    orb.classList.toggle('big', !!t);
    lbl.textContent = t && t.dataset.cur ? t.dataset.cur : '';
  });

  const star = (px, py, s, a) => {
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath();
    ctx.moveTo(px, py - s); ctx.quadraticCurveTo(px, py, px + s, py); ctx.quadraticCurveTo(px, py, px, py + s);
    ctx.quadraticCurveTo(px, py, px - s, py); ctx.quadraticCurveTo(px, py, px, py - s); ctx.fill();
  };
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    ox += (x - ox) * .2; oy += (y - oy) * .2;
    orb.style.transform = `translate(${ox}px,${oy}px)`; dot.style.transform = `translate(${x}px,${y}px)`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!trail.length) return;
    ctx.globalCompositeOperation = 'lighter';
    trail.forEach(p => {
      p.life -= dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
      if (p.life <= 0) return;
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.life * .45})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 1.6 * p.life, 0, 6.283); ctx.fill();
      star(p.x, p.y, p.s * p.life, p.life);
    });
    trail = trail.filter(p => p.life > 0);
  })(last);
})();
