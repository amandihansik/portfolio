/* =========================================================
   HERO — a 3D iridescent glass object seen through a camera.
   Raymarched in WebGL (no libraries). Scroll morphs it:
   sphere (intro) → cube (design) → ring (video) → lens (photo)
   ========================================================= */
(() => {
  const hero = document.getElementById('top');
  if (!hero) return;
  const pin = hero.querySelector('.hero-pin');
  const cv = document.getElementById('gl');
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- phases ---------- */
  const PH = [
    { mode: 'AUTO',   expo: 'ISO 400 · ƒ/2.8 · 1/60 · 5600K' },
    { mode: 'DESIGN', expo: 'GRID 12 COL · 8 PT · RGB / CMYK' },
    { mode: 'VIDEO',  expo: '24 FPS · 180° SHUTTER · LOG' },
    { mode: 'PHOTO',  expo: 'ISO 100 · ƒ/1.8 · 1/250 · RAW' },
  ];
  // scroll position (0..1 through the pinned hero) → morph value 0..3
  const KEYS = [[0, 0], [.12, 0], [.24, 1], [.38, 1], [.5, 2], [.62, 2], [.74, 3], [1, 3]];
  const morphAt = r => {
    for (let i = 1; i < KEYS.length; i++) if (r <= KEYS[i][0]) {
      const [a, va] = KEYS[i - 1], [b, vb] = KEYS[i], t = (r - a) / (b - a || 1);
      return va + (vb - va) * (t * t * (3 - 2 * t));
    }
    return 3;
  };
  const phaseAt = r => r < .18 ? 0 : r < .44 ? 1 : r < .68 ? 2 : 3;
  const progress = () => clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight - innerHeight));

  /* ---------- WebGL ---------- */
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  let prog, U = {};
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 uR; uniform float uT,uM,uSpin,uEV,uOX,uOY,uFlash,uZ; uniform vec2 uMouse;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
vec3 tr(vec3 p){
  p.x-=uOX; p.y-=uOY;
  p.xz*=rot(uT*.22+uSpin+uMouse.x*.8);
  p.yz*=rot(.32+uMouse.y*.55+sin(uT*.3)*.1);
  return p;
}
float obj(vec3 p){
  vec3 q=tr(p);
  float s=length(q)-1.;
  float b=sdRBox(q,vec3(.66),.2);
  vec3 tq=q; tq.yz*=rot(1.5708);
  float t=sdTorus(tq,vec2(.9,.3));
  float d;
  if(uM<1.) d=mix(s,b,smoothstep(0.,1.,uM));
  else if(uM<2.) d=mix(b,t,smoothstep(0.,1.,uM-1.));
  else d=mix(t,s,smoothstep(0.,1.,uM-2.));
  d+=sin(q.x*3.+uT*.9)*sin(q.y*3.2+uT*1.1)*sin(q.z*2.8+uT*.7)*.035;
  return d;
}
float bub(vec3 p){
  float d=1e5;
  for(int i=0;i<5;i++){float f=float(i);
    vec3 c=vec3(uOX+sin(uT*.21+f*1.9)*2.15, uOY+cos(uT*.17+f*2.3)*1.3, sin(uT*.13+f*1.3)*1.1-.3);
    d=min(d,length(p-c)-(.08+.045*f));}
  return d;
}
float map(vec3 p){return min(obj(p),bub(p));}
vec3 nor(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
vec3 env(vec3 d){
  vec3 c=mix(vec3(.03,.025,.045),vec3(.2,.14,.28),clamp(d.y*.5+.5,0.,1.));
  c+=vec3(1.,.71,.62)*pow(max(dot(d,normalize(vec3(-.7,.55,.45))),0.),20.)*2.6;
  c+=vec3(.72,.64,1.)*pow(max(dot(d,normalize(vec3(.85,.15,.35))),0.),14.)*1.8;
  c+=vec3(1.)*smoothstep(.05,0.,abs(d.y-.62))*smoothstep(0.,.5,d.z)*1.4;
  c+=vec3(.48,.38,1.)*pow(max(-d.y,0.),3.)*.25;
  return c;
}
vec3 iri(float t){return .5+.5*cos(6.2831*(vec3(0.,.33,.67)+t));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uR)/uR.y;
  vec3 ro=vec3(0.,0.,uZ), rd=normalize(vec3(uv,-1.75));
  vec3 col=vec3(.022,.022,.03);
  col+=vec3(.48,.38,1.)*.11*exp(-3.*length(uv-vec2(uOX*.38,uOY*.38-.05)));
  col+=vec3(1.,.7,.6)*.05*exp(-4.*length(uv-vec2(-.6,.42)));
  float t=0.; bool hit=false;
  for(int i=0;i<80;i++){float d=map(ro+rd*t); if(d<.001){hit=true;break;} t+=d*.9; if(t>9.)break;}
  if(hit){
    vec3 p=ro+rd*t, n=nor(p);
    float fr=pow(1.-max(dot(-rd,n),0.),3.);
    vec3 rf=env(reflect(rd,n)), rr=env(refract(rd,n,.72));
    vec3 ir=iri(fr*1.4+dot(n,vec3(.2,.5,.3))*.6+uT*.03);
    vec3 tint=mix(vec3(1.,.78,.7),vec3(.75,.68,1.),n.y*.5+.5);
    col=rr*mix(tint,ir,.6)*1.15+rf*(.22+.78*fr)+ir*fr*.6+ir*.05;
  }
  col*=uEV;
  col*=1.-.3*dot(uv*.8,uv*.8);
  col=col/(1.+col);
  col=pow(col,vec3(.85));
  col+=uFlash;
  gl_FragColor=vec4(col,1.);
}`;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let ok = !!gl;
  if (ok) try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uR', 'uT', 'uM', 'uSpin', 'uEV', 'uOX', 'uOY', 'uFlash', 'uMouse', 'uZ'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  } catch (e) { console.warn('WebGL hero disabled:', e); ok = false; }
  if (!ok) document.documentElement.classList.add('no-gl');

  let W = 0, H = 0, scale = .6;
  function size() {
    W = pin.clientWidth; H = pin.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    scale = (W < 700 ? .55 : .62) * dpr;
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    if (ok) gl.viewport(0, 0, cv.width, cv.height);
  }
  size(); addEventListener('resize', size);

  /* ---------- interaction state ---------- */
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  let time = 0, spin = 0, flash = 0, morph = 0, visible = true, phase = -1, shots = 0, last = performance.now();
  pin.addEventListener('pointermove', e => {
    const r = pin.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    m.tx = nx * 2 - 1; m.ty = ny * 2 - 1;
    const over = e.target.closest('a,button');
    window.cursorText && window.cursorText(over ? '' : `AF · X ${(nx * 100).toFixed(1)} · Y ${(ny * 100).toFixed(1)}`);
  });
  pin.addEventListener('pointerleave', () => { m.tx = m.ty = 0; window.cursorText && window.cursorText(''); });

  /* shutter: click anywhere in the hero to "take a photo" */
  const iris = $('#iris');
  function shutter() {
    iris.classList.remove('snap'); void iris.offsetWidth; iris.classList.add('snap');
    setTimeout(() => { flash = .55; }, 230);
    shots++; $('#shots').textContent = 'SHOTS ' + String(shots).padStart(3, '0');
  }
  pin.addEventListener('click', e => { if (!e.target.closest('a,button')) shutter(); });

  /* phase nav */
  $$('#hsteps button').forEach(b => b.addEventListener('click', () => {
    const k = +b.dataset.k, targets = [0, .31, .56, .86];
    scrollTo({ top: hero.offsetTop + targets[k] * (hero.offsetHeight - innerHeight), behavior: 'smooth' });
  }));

  function setPhase(k) {
    if (k === phase) return;
    const prev = phase; phase = k;
    $$('.ph').forEach(p => p.classList.toggle('on', +p.dataset.ph === k));
    $$('#hsteps button').forEach(b => b.classList.toggle('on', +b.dataset.k === k));
    $('#mode').textContent = 'MODE · ' + PH[k].mode;
    $('#expo').textContent = PH[k].expo;
    pin.dataset.phase = k;
    if (k === 3 && prev !== -1 && prev < 3) shutter();
  }

  /* timecode (24 fps) */
  const tc = $('#tc'), t0 = performance.now();
  const pad = n => String(n).padStart(2, '0');

  /* ---------- loop ---------- */
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    const el = (now - t0) / 1000, f = Math.floor(el * 24);
    tc.textContent = `${pad(Math.floor(el / 3600))}:${pad(Math.floor(el / 60) % 60)}:${pad(Math.floor(el) % 60)}:${pad(f % 24)}`;
    if (!visible) return;
    if (!reduce) time += dt;

    const r = progress();
    morph += (morphAt(r) - morph) * Math.min(1, dt * 6);
    setPhase(phaseAt(r));
    $('#hbar').style.transform = `scaleX(${r})`;

    m.x += (m.tx - m.x) * Math.min(1, dt * 3); m.y += (m.ty - m.y) * Math.min(1, dt * 3);
    const ev = m.x * 1.5;                                    // exposure follows the cursor
    $('#evMark').style.left = `${50 + m.x * 45}%`;
    $('#ev').textContent = `${ev >= 0 ? '+' : '−'}${Math.abs(ev).toFixed(1)} EV`;

    const video = clamp(1 - Math.abs(morph - 2));            // spin fast while it's a reel
    spin += dt * (.15 + video * 2.4) * (reduce ? 0 : 1);
    flash *= Math.pow(.02, dt);

    if (!ok) return;
    const mob = W < 700;
    gl.uniform2f(U.uR, cv.width, cv.height);
    gl.uniform1f(U.uT, time);
    gl.uniform1f(U.uM, morph);
    gl.uniform1f(U.uSpin, spin);
    gl.uniform1f(U.uEV, 1 + m.x * .18);
    gl.uniform1f(U.uOX, mob ? 0 : 1.45);
    gl.uniform1f(U.uOY, mob ? 1.0 : .05);
    gl.uniform1f(U.uZ, mob ? 9.0 : 6.1);
    gl.uniform1f(U.uFlash, flash);
    gl.uniform2f(U.uMouse, m.x, m.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  setPhase(0);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => pin.classList.add('ready'));
})();
