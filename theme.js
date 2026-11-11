/* shared: nav, reveal-on-scroll, reticle cursor */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  /* nav */
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), links = $('.links');
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
    $$('.links a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  window.revealObserve = el => io.observe(el);
  $$('.rv').forEach(el => io.observe(el));

  /* reticle cursor (camera focus brackets) */
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) { window.cursorText = () => {}; return; }
  const ret = document.createElement('div');
  ret.className = 'ret'; ret.innerHTML = '<span></span><em></em><b></b>';
  document.body.append(ret);
  const lbl = ret.querySelector('b');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, over = null, free = '';
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; ret.classList.add('live'); }, { passive: true });
  document.addEventListener('pointerleave', () => ret.classList.remove('live'));
  (function loop() {
    cx += (x - cx) * .24; cy += (y - cy) * .24;
    ret.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  const paint = () => {
    ret.classList.toggle('big', !!over);
    ret.classList.toggle('lbl', !over && !!free);
    lbl.textContent = over ? (over.dataset.cur || (over.tagName === 'A' ? 'Open' : 'Click')) : free;
  };
  document.addEventListener('pointerover', e => { over = e.target.closest('a,button,[data-cur]'); paint(); });
  window.cursorText = t => { free = t || ''; paint(); };
})();
