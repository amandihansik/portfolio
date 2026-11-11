/* =========================================================
   HERO — "the design ocean"
   Layer 1 (WebGL): glowing deep-violet water, light rays, caustics
   Layer 2 (canvas): vector jellyfish (bezier tentacles + anchor points),
                     a school of tiny glowing shapes, bubbles, sparkles
   One screen, no scroll-jacking. Mouse moves the light; click = bubbles.
   ========================================================= */
(() => {
  const hero = document.getElementById('top');
  if (!hero) return;
  const bg = document.getElementById('sea'), fx = document.getElementById('life');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = { x: .5, y: .5, tx: .5, ty: .5, px: -9999, py: -9999 };
  let W = 0, H = 0, visible = true, t = 0, last = performance.now();

  /* ================= WebGL water ================= */
  const gl = bg.getContext('webgl', { antialias: false, alpha: false });
  let U = {}, glOK = !!gl;
  const FS = `
precision highp float;
uniform vec2 uR; uniform float uT; uniform vec2 uM;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
float caustic(vec2 uv,float time){
  vec2 p=mod(uv*6.28318,6.28318)-250.; vec2 i=p; float c=1.; float inten=.005;
  for(int n=0;n<4;n++){float tt=time*(1.-(3.5/float(n+1)));
    i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
  c/=4.; c=1.17-pow(c,1.4); return pow(abs(c),8.);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uR; vec2 p=(gl_FragCoord.xy-.5*uR)/uR.y;
  vec3 deep=vec3(.045,.035,.09), mid=vec3(.15,.08,.40), top=vec3(.42,.30,.86);
  vec3 col=mix(deep,mid,smoothstep(.0,.62,uv.y));
  col=mix(col,top,smoothstep(.5,1.05,uv.y));
  // coral / pink glows at the sides (like reefs lit from inside)
  col+=vec3(1.,.36,.52)*.34*smoothstep(.62,0.,length(vec2(uv.x*1.25,(uv.y-.30)*1.1)));
  col+=vec3(.95,.32,.78)*.28*smoothstep(.58,0.,length(vec2((uv.x-1.)*1.25,(uv.y-.26)*1.1)));
  col+=vec3(.30,.62,1.)*.10*smoothstep(.7,0.,length(vec2((uv.x-.5)*.9,uv.y-.55)));
  // drifting haze
  float h=fbm(p*1.6+vec2(uT*.025,-uT*.018));
  col+=vec3(.55,.45,1.)*.14*h;
  // light rays from the surface, steered by the mouse
  vec2 ls=vec2(.5+(uM.x-.5)*.35,1.25);
  vec2 d=uv-ls; float ang=atan(d.x,-d.y);
  float rays=pow(noise(vec2(ang*9.,uT*.12)),3.)+.8*pow(noise(vec2(ang*23.+4.,uT*.2)),4.);
  float fall=smoothstep(1.45,.1,length(d*vec2(1.,.9)))*smoothstep(-.1,.7,uv.y);
  col+=vec3(.78,.86,1.)*rays*fall*.62;
  // shimmering caustics near the top
  float c=caustic(vec2(p.x*.42,p.y*.42+uT*.015),uT*.33);
  col+=vec3(.75,.85,1.)*c*.42*smoothstep(.4,1.,uv.y);
  // soft depth, then fade into the page background at the bottom
  col*=1.-.22*length(p*vec2(.65,1.));
  col=mix(col,vec3(.086,.063,.227),smoothstep(.2,0.,uv.y));
  col=pow(col,vec3(.95));
  gl_FragColor=vec4(col,1.);
}`;
  if (glOK) try {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uR', 'uT', 'uM'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  } catch (e) { console.warn('Hero water disabled:', e); glOK = false; }
  if (!glOK) hero.classList.add('no-gl');

  /* ================= canvas life ================= */
  const ctx = fx.getContext('2d');
  let DPR = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = [[124, 92, 255], [255, 92, 122], [120, 200, 255], [255, 140, 220]];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let jellies = [], school = [], bubbles = [], motes = [], glints = [];

  function makeJelly(i, fresh) {
    const s = rnd(38, 70) * (W < 700 ? .7 : 1);
    return {
      x: fresh ? rnd(.08, .92) * W : rnd(.1, .9) * W,
      y: fresh ? rnd(.15, .95) * H : H + s * 2,
      s, c: PAL[i % PAL.length], c2: PAL[(i + 2) % PAL.length],
      ph: rnd(0, 6.28), sp: rnd(.7, 1.1), sway: rnd(.2, .5),
      vector: i === 0,            // one jellyfish shows its pen-tool anchors
      ox: 0, oy: 0, tent: Math.round(rnd(7, 10)),
    };
  }
  function build() {
    const n = W < 700 ? 3 : 5;
    jellies = Array.from({ length: n }, (_, i) => makeJelly(i, true));
    // keep the centre clear for the title
    jellies.forEach((j, i) => { j.x = (i % 2 ? rnd(.8, .95) : rnd(.05, .2)) * W; });
    school = Array.from({ length: W < 700 ? 26 : 46 }, (_, i) => ({ o: rnd(0, 1), dx: rnd(-40, 40), dy: rnd(-26, 26), k: i % 3, sz: rnd(3, 6), ph: rnd(0, 6.28) }));
    bubbles = Array.from({ length: W < 700 ? 14 : 26 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(2, 9), v: rnd(12, 34), ph: rnd(0, 6.28) }));
    motes = Array.from({ length: W < 700 ? 70 : 140 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.5, 1.8), v: rnd(3, 12), ph: rnd(0, 6.28), a: rnd(.25, .8) }));
    glints = Array.from({ length: W < 700 ? 8 : 16 }, () => ({ x: rnd(0, W), y: rnd(0, H * .8), s: rnd(4, 10), ph: rnd(0, 6.28), sp: rnd(.6, 1.4) }));
  }

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    DPR = Math.min(devicePixelRatio || 1, 1.75);
    fx.width = W * DPR; fx.height = H * DPR; fx.style.width = W + 'px'; fx.style.height = H + 'px';
    const s = Math.min(devicePixelRatio || 1, 2) * (W < 700 ? .5 : .55);
    bg.width = Math.round(W * s); bg.height = Math.round(H * s);
    if (glOK) gl.viewport(0, 0, bg.width, bg.height);
    build();
  }

  /* ---- a jellyfish made of vector curves ---- */
  function drawJelly(j, time) {
    const pulse = Math.sin(time * 1.6 * j.sp + j.ph);        // -1..1
    const push = Math.max(0, pulse);
    j.y -= (8 + push * 26) * j.sp * dt;                      // swim up in pulses
    j.x += Math.sin(time * .3 + j.ph) * j.sway * 12 * dt;
    // drift away from the cursor
    const dx = j.x - mouse.px, dy = j.y - mouse.py, d = Math.hypot(dx, dy);
    if (d < 180) { j.ox += dx / d * (180 - d) * .02; j.oy += dy / d * (180 - d) * .02; }
    j.ox *= .94; j.oy *= .94;
    if (j.y < -j.s * 4) Object.assign(j, makeJelly(jellies.indexOf(j), false), { x: (Math.random() < .5 ? rnd(.05, .2) : rnd(.8, .95)) * W });

    const x = j.x + j.ox, y = j.y + j.oy, s = j.s;
    const bw = s * (1 + .1 * pulse), bh = s * (.82 - .1 * pulse);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * .5 + j.ph) * .08);

    // tentacles: bezier curves (+ pen-tool handles on the "vector" jelly)
    const n = j.tent;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - .5, sx = u * bw * 1.6, len = s * (2.6 + (i % 3) * .5);
      const w1 = Math.sin(time * 1.3 + i * .7 + j.ph) * s * .35, w2 = Math.sin(time * 1.1 + i * .9 + j.ph + 1.4) * s * .5;
      const c1 = [sx + w1, len * .35], c2 = [sx * .6 + w2, len * .7], e = [sx * .4 + w2 * .7, len];
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, rgba(j.c, .75)); g.addColorStop(1, rgba(j.c2, 0));
      ctx.strokeStyle = g; ctx.lineWidth = i % 3 ? 1 : 1.6;
      ctx.beginPath(); ctx.moveTo(sx, bh * .15); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]); ctx.stroke();
      if (j.vector && i % 3 === 1) {
        ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(sx, bh * .15); ctx.lineTo(c1[0], c1[1]); ctx.moveTo(e[0], e[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        [c1, c2].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, 6.283); ctx.fill(); });
        ctx.fillStyle = 'rgba(14,14,18,.9)'; ctx.strokeStyle = 'rgba(255,255,255,.9)';
        [[sx, bh * .15], e].forEach(q => { ctx.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5); ctx.strokeRect(q[0] - 2.5, q[1] - 2.5, 5, 5); });
      }
    }
    // oral arms: soft ribbons
    for (let k = -1; k <= 1; k++) {
      const len = s * 1.7, wv = Math.sin(time * 1.5 + k + j.ph) * s * .25;
      ctx.strokeStyle = rgba(j.c, .35); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(k * s * .15, bh * .1); ctx.bezierCurveTo(k * s * .3 + wv, len * .4, k * s * .1 - wv, len * .7, k * s * .2 + wv * .5, len); ctx.stroke();
    }
    // the bell: glowing translucent dome with a scalloped rim
    ctx.beginPath();
    ctx.moveTo(-bw, bh * .1);
    ctx.bezierCurveTo(-bw, -bh * 1.25, bw, -bh * 1.25, bw, bh * .1);
    for (let k = 8; k >= 0; k--) { const xx = -bw + (k / 8) * bw * 2; ctx.lineTo(xx, bh * .1 + (k % 2 ? bh * .16 : 0) + Math.sin(time * 3 + k) * 1.5); }
    ctx.closePath();
    const rg = ctx.createRadialGradient(-bw * .25, -bh * .55, 2, 0, -bh * .2, bw * 1.25);
    rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(.35, rgba(j.c, .45)); rg.addColorStop(1, rgba(j.c2, .08));
    ctx.fillStyle = rg; ctx.shadowColor = rgba(j.c, 1); ctx.shadowBlur = 38; ctx.fill(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = rgba([255, 255, 255], .55); ctx.lineWidth = 1.2; ctx.stroke();
    // inner shine + "organs"
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-bw * .35, -bh * .55, bw * .28, bh * .14, -.5, 3.6, 5.2); ctx.stroke();
    ctx.strokeStyle = rgba(j.c2, .55); ctx.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse((k - 1.5) * bw * .22, -bh * .25, bw * .1, bh * .14, 0, 0, 6.283); ctx.stroke(); }
    ctx.restore();
  }

  /* ---- a school of tiny glowing shapes ("fish") ---- */
  function drawSchool(time) {
    const cx = W * (.5 + .4 * Math.sin(time * .11)), cy = H * (.2 + .06 * Math.sin(time * .17 + 1));
    const vx = Math.cos(time * .11) * .4 * W * .11, vy = Math.cos(time * .17 + 1) * .06 * H * .17;
    const heading = Math.atan2(vy, vx);
    school.forEach(f => {
      const wob = Math.sin(time * 2 + f.ph) * 6;
      const x = cx + f.dx * 2.2 + Math.cos(heading + 1.57) * wob, y = cy + f.dy * 2 + Math.sin(heading + 1.57) * wob;
      ctx.save(); ctx.translate(x, y); ctx.rotate(heading);
      ctx.fillStyle = f.k === 0 ? 'rgba(170,225,255,.85)' : f.k === 1 ? 'rgba(255,170,200,.85)' : 'rgba(255,255,255,.8)';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
      ctx.beginPath();
      if (f.k === 0) { ctx.moveTo(f.sz, 0); ctx.lineTo(-f.sz, -f.sz * .6); ctx.lineTo(-f.sz, f.sz * .6); }      // triangle
      else if (f.k === 1) ctx.arc(0, 0, f.sz * .55, 0, 6.283);                                                     // circle
      else ctx.rect(-f.sz * .45, -f.sz * .45, f.sz * .9, f.sz * .9);                                             // square
      ctx.fill(); ctx.restore();
    });
  }

  function drawBubbles() {
    bubbles.forEach(b => {
      b.y -= b.v * dt; b.x += Math.sin(t * 1.4 + b.ph) * .3;
      if (b.y < -20) { b.y = H + 20; b.x = rnd(0, W); }
      ctx.strokeStyle = 'rgba(220,235,255,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(b.x - b.r * .35, b.y - b.r * .35, Math.max(.8, b.r * .22), 0, 6.283); ctx.fill();
    });
  }
  function drawMotes() {
    motes.forEach(m => {
      m.y -= m.v * dt; m.x += Math.sin(t * .6 + m.ph) * .15;
      if (m.y < -4) { m.y = H + 4; m.x = rnd(0, W); }
      ctx.fillStyle = `rgba(230,225,255,${m.a * (.6 + .4 * Math.sin(t * 2 + m.ph))})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    });
  }
  function drawGlints() {
    glints.forEach(g => {
      const a = Math.max(0, Math.sin(t * g.sp + g.ph)); if (a < .05) return;
      const s = g.s * a;
      ctx.fillStyle = `rgba(255,255,255,${a * .9})`;
      ctx.beginPath(); ctx.moveTo(g.x, g.y - s); ctx.quadraticCurveTo(g.x, g.y, g.x + s, g.y); ctx.quadraticCurveTo(g.x, g.y, g.x, g.y + s);
      ctx.quadraticCurveTo(g.x, g.y, g.x - s, g.y); ctx.quadraticCurveTo(g.x, g.y, g.x, g.y - s); ctx.fill();
    });
  }

  /* ---- input ---- */
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height;
    mouse.px = e.clientX - r.left; mouse.py = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { mouse.tx = .5; mouse.ty = .5; mouse.px = mouse.py = -9999; });
  hero.addEventListener('click', e => {
    if (e.target.closest('a,button')) return;
    const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < 12; i++) bubbles.push({ x: x + rnd(-20, 20), y: y + rnd(-10, 10), r: rnd(2, 8), v: rnd(40, 90), ph: rnd(0, 6.28), tmp: 1 });
    if (bubbles.length > 90) bubbles.splice(0, bubbles.length - 90);
  });

  /* ---- loop ---- */
  let dt = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  function frame(now) {
    requestAnimationFrame(frame);
    dt = Math.min((now - last) / 1000, .05); last = now;
    if (!visible) return;
    if (reduce) dt = 0;
    t += dt;
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;

    if (glOK) {
      gl.uniform2f(U.uR, bg.width, bg.height); gl.uniform1f(U.uT, t + 20); gl.uniform2f(U.uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawMotes(); drawSchool(t); drawGlints();
    ctx.globalCompositeOperation = 'source-over';
    jellies.forEach(j => drawJelly(j, t));
    drawBubbles();
    // parallax the title a little with the mouse (3D feel)
    hero.style.setProperty('--px', ((mouse.x - .5) * 2).toFixed(3));
    hero.style.setProperty('--py', ((mouse.y - .5) * 2).toFixed(3));
  }
  size(); addEventListener('resize', size);
  requestAnimationFrame(frame);
})();
